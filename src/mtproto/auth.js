import {
  deferred,
  bytesToStr
} from '../helpers/utils';

import {
  randomBytes,
  isBytesCompare,
  factorize,
  rsaEncrypt,
  aesIgeDecrypt,
  aesIgeEncrypt,
  verifyDhParams,
  hexToBytes,
  strToBytes,
  bytesModPow,
  bytesXor,
  bytesToHex
} from './bin';

import {
  createTL,
  readObject,
  serializeMethod,
  serializeObject
} from './tl';

import {
  getPublicKey,
  applyServerTime
} from './utils';

const setClientDhParams = (transport, authData) => {
  const defer = deferred();

  Promise.resolve()
  .then(() => {
    authData.b = randomBytes(256);

    const gBytes = hexToBytes(authData.g.toString(16));
    const gB = bytesModPow(gBytes, authData.b, strToBytes(authData.dhPrime));

    const clientDhInnerDataBuffer = serializeObject('Client_DH_Inner_Data', {
      _: 'client_DH_inner_data',
      nonce: authData.initNonce,
      server_nonce: authData.serverNonce,
      retry_id: [0, authData.retryId],
      g_b: bytesToStr(gB)
    }, 'mtproto');

    const dataWithHash = sha1.array(clientDhInnerDataBuffer)
      .concat(Array.from(new Uint8Array(clientDhInnerDataBuffer)));

    const setClientDhParamsBuffer = serializeMethod('set_client_DH_params', {
      nonce: authData.initNonce,
      server_nonce: authData.serverNonce,
      encrypted_data: bytesToStr(aesIgeEncrypt(
        authData.tempAesKey, authData.tempAesIv,
        dataWithHash
      ))
    }, 'mtproto');

    return transport.send(setClientDhParamsBuffer, true);
  })
  .then(setClientDhParamsRes => {
    const setClietnDhParamsAnswerData = readObject(
      setClientDhParamsRes.tl, 'Set_client_DH_params_answer'
    );

    if(!setClietnDhParamsAnswerData) {
      throw 'DH generation fail';
    }

    if(!isBytesCompare(authData.initNonce, setClietnDhParamsAnswerData.nonce)) {
      throw 'Nonce not compare';
    }
    if(!isBytesCompare(authData.serverNonce, setClietnDhParamsAnswerData.server_nonce)) {
      throw 'Server nonce not compare';
    }
    if(setClietnDhParamsAnswerData._ == 'dh_gen_retry') {
      authData.retryId++;
      defer.resolve(setClientDhParams(transport, authData));
      return;
    }

    const authKey = bytesModPow(
      strToBytes(authData.gA), authData.b, strToBytes(authData.dhPrime)
    );
    const authKeyHash = sha1.array(authKey);
    const authKeyAux = authKeyHash.slice(0, 8);

    const newNonceHash1 = sha1.array(authData.newNonce.concat([1], authKeyAux)).slice(-16);

    if(!isBytesCompare(newNonceHash1, setClietnDhParamsAnswerData.new_nonce_hash1)) {
      throw 'New nonce hash not compare';
    }

    authData.authKey = authKey;
    authData.authKeyId = authKeyHash.slice(-8);
    authData.serverSalt = bytesXor(
      authData.newNonce.slice(0, 8),
      authData.serverNonce.slice(0, 8)
    );

    defer.resolve({
      authKey: authKey,
      authKeyId: authKeyHash.slice(-8),
      serverSalt: bytesXor(
        authData.newNonce.slice(0, 8),
        authData.serverNonce.slice(0, 8)
      )
    });
  })
  .catch(err => {
    console.error(err);
  });

  return defer.promise;
};

const createAuthKeys = transport => {
  const defer = deferred();

  const authData = {};

  Promise.resolve()
  .then(() => {
    authData.initNonce = randomBytes(16);

    const data = serializeMethod('req_pq_multi', {
      nonce: authData.initNonce
    }, 'mtproto');
    return transport.send(data);
  })
  .then(reqPqMultiRes => {
    const resPqData = readObject(reqPqMultiRes.tl, 'ResPQ');
    authData.pq = resPqData.pq;
    authData.serverNonce = resPqData.server_nonce;
    authData.publicKey = getPublicKey(resPqData.server_public_key_fingerprints);

    if(!isBytesCompare(authData.initNonce, resPqData.nonce)) {
      throw 'Nonce not compare';
    }

    const pAndQ = factorize(resPqData.pq);
    authData.p = pAndQ.p;
    authData.q = pAndQ.q;
    authData.newNonce = randomBytes(32);

    const pqInnerDataBuffer = serializeObject('P_Q_inner_data', {
      _: 'p_q_inner_data',
      pq: authData.pq,
      p: authData.p,
      q: authData.q,
      nonce: authData.initNonce,
      server_nonce: authData.serverNonce,
      new_nonce: authData.newNonce
    }, 'mtproto');

    let reqDhParamsBuffer = serializeMethod('req_DH_params', {
      nonce: authData.initNonce,
      server_nonce: authData.serverNonce,
      p: authData.p,
      q: authData.q,
      public_key_fingerprint: authData.publicKey.fp,
      encrypted_data: bytesToStr(rsaEncrypt(authData.publicKey, pqInnerDataBuffer))
    }, 'mtproto');

    return transport.send(reqDhParamsBuffer);
  })
  .then(reqDhParamsRes => {
    const serverDhParamsData = readObject(reqDhParamsRes.tl, 'Server_DH_Params');

    if(!serverDhParamsData) {
      throw 'Server DH params error';
    }
    if(!isBytesCompare(authData.initNonce, serverDhParamsData.nonce)) {
      throw 'Nonce not compare';
    }
    if(!isBytesCompare(authData.serverNonce, serverDhParamsData.server_nonce)) {
      throw 'Server nonce not compare';
    }

    const serverNewConcat = authData.serverNonce.concat(authData.newNonce);
    authData.tempAesKey = sha1.array(authData.newNonce.concat(authData.serverNonce))
      .concat(sha1.array(serverNewConcat).slice(0, 12));
    authData.tempAesIv = sha1.array(serverNewConcat).slice(12)
      .concat(
        sha1.array(authData.newNonce.concat(authData.newNonce)),
        authData.newNonce.slice(0, 4)
      );

    const answerWithHash = aesIgeDecrypt(
      authData.tempAesKey, authData.tempAesIv, serverDhParamsData.encrypted_answer
    );
    const hash = answerWithHash.slice(0, 20);
    const answerWithPadding = answerWithHash.slice(20);

    const answerTl = createTL(
      (new Uint8Array(answerWithPadding)).buffer,
      { schema: 'mtproto' }
    );
    const serverDhInnerData = readObject(answerTl, 'Server_DH_inner_data');

    if(!isBytesCompare(hash, sha1.array(answerWithPadding.slice(0, answerTl.offset)))) {
      throw 'Check server DH params hash error';
    }
    if(serverDhInnerData._ != 'server_DH_inner_data') {
      throw 'Server DH inner data error';
    }
    if(!isBytesCompare(authData.initNonce, serverDhInnerData.nonce)) {
      throw 'Nonce not compare';
    }
    if(!isBytesCompare(authData.serverNonce, serverDhInnerData.server_nonce)) {
      throw 'Server nonce not compare';
    }

    applyServerTime(serverDhInnerData.server_time);

    const verifyDhParamsResult = verifyDhParams(
      serverDhInnerData.g, serverDhInnerData.dh_prime, serverDhInnerData.g_a
    );
    if(!verifyDhParamsResult) {
      throw 'Verify DH params error';
    }

    authData.g = serverDhInnerData.g;
    authData.gA = serverDhInnerData.g_a;
    authData.dhPrime = serverDhInnerData.dh_prime;
    authData.retryId = 0;

    return setClientDhParams(transport, authData);
  })
  .then(auth => {
    TGInit.setStorage(`auth_key_${transport.dcId}`, bytesToHex(auth.authKey));
    TGInit.setStorage(`auth_key_id_${transport.dcId}`, bytesToHex(auth.authKeyId));
    TGInit.setStorage(`server_salt_${transport.dcId}`, bytesToHex(auth.serverSalt));

    defer.resolve();
  })
  .catch(err => {
    console.error(err);
  });

  return defer.promise;
};

export const auth = transport => {
  const defer = deferred();

  const caller = TGInit.getStorage(`auth_key_${transport.dcId}`)
               ? Promise.resolve.bind(Promise)
               : createAuthKeys;

  caller(transport)
  .then(() => {
    const authKey = TGInit.getStorage(`auth_key_${transport.dcId}`);
    const authKeyId = TGInit.getStorage(`auth_key_id_${transport.dcId}`);
    const serverSalt = TGInit.getStorage(`server_salt_${transport.dcId}`);

    transport.setAuthData(authKey, authKeyId, serverSalt);

    defer.resolve();
  });

  return defer.promise;
};