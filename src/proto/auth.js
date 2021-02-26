/* global tgMain */

import {
  createTL,
  readObject,
  serializeMethod,
  serializeObject
} from './tl';

import {
  randomBytes,
  isBytesCompare,
  hexToBytes,
  bytesToHex,
  applyServerTime
} from './utils';

const publicKey =
  'c150023e2f70db7985ded064759cfecf0af328e69a41daf4d6f01b538135a6f9' +
  '1f8f8b2a0ec9ba9720ce352efcf6c5680ffc424bd634864902de0b4bd6d49f4e' +
  '580230e3ae97d95c8b19442b3c0a10d8f5633fecedd6926a7f6dab0ddb7d457f' +
  '9ea81b8465fcd6fffeed114011df91c059caedaf97625f6c96ecc74725556934' +
  'ef781d866b34f011fce4d835a090196e9a5f0e4449af7eb697ddb9076494ca5f' +
  '81104a305b6dd27665722c46b60e5df680fb16b210607ef217652e60236c255f' +
  '6a28315f4083a96791d7214bf64c1df4fd0db1944fb26a2a57031b32eee64ad1' +
  '5a8ba68885cde74a5bfc920f6abf59ba5c75506373e7130f9042da922179251f';

const isTestMode = tgMain.isTestMode;

const bytesXor = (bytes1, bytes2) => {
  return new Uint8Array(bytes1.length).map((b, i) => bytes1[i] ^ bytes2[i]);
};

const setClientDhParams = async (transport, authData) => {
  authData.b = randomBytes(256);

  const gBytes = hexToBytes(authData.g.toString(16));
  const gB = await tgMain.callWorker('bytesModPow', {
    x: gBytes,
    y: authData.b,
    m: authData.dhPrime
  });

  const clientDhInnerDataBuffer = serializeObject('Client_DH_Inner_Data', {
    _: 'client_DH_inner_data',
    nonce: authData.initNonce,
    server_nonce: authData.serverNonce,
    retry_id: [ 0, authData.retryId ],
    g_b: gB
  }, 'proto');

  const dataWithHash = new Uint8Array([
    ... await tgMain.callWorker('sha1', clientDhInnerDataBuffer),
    ... new Uint8Array(clientDhInnerDataBuffer)
  ]);

  const setClientDhParamsBuffer = serializeMethod('set_client_DH_params', {
    nonce: authData.initNonce,
    server_nonce: authData.serverNonce,
    encrypted_data: await tgMain.callWorker('cryptAesIge', {
      key: authData.tempAesKey,
      iv: authData.tempAesIv,
      data: dataWithHash
    })
  }, 'proto');

  const setClientDhParamsRes = await transport.send(
    setClientDhParamsBuffer, true
  );

  const setClietnDhParams = await readObject(
    setClientDhParamsRes.tl, 'Set_client_DH_params_answer'
  );

  if(!setClietnDhParams) {
    throw 'DH generation fail';
  }

  if(!isBytesCompare(authData.initNonce, setClietnDhParams.nonce)) {
    throw 'Nonce not compare';
  }
  if(!isBytesCompare(authData.serverNonce, setClietnDhParams.server_nonce)) {
    throw 'Server nonce not compare';
  }
  if(setClietnDhParams._ == 'dh_gen_retry') {
    authData.retryId++;
    return await setClientDhParams(transport, authData);
  }

  const authKey = new Uint8Array(await tgMain.callWorker('bytesModPow', {
    x: authData.gA,
    y: authData.b,
    m: authData.dhPrime
  }));
  const authKeyHash = await tgMain.callWorker('sha1', authKey);
  const authKeyAux = authKeyHash.slice(0, 8);

  const newNonceHash1 = (await tgMain.callWorker('sha1',
    new Uint8Array([
      ... authData.newNonce,
      1,
      ... authKeyAux
    ])
  )).slice(-16);

  if(!isBytesCompare(newNonceHash1, setClietnDhParams.new_nonce_hash1)) {
    throw 'New nonce hash not compare';
  }

  authData.authKey = authKey;
  authData.authKeyId = authKeyHash.slice(-8);
  authData.serverSalt = bytesXor(
    authData.newNonce.slice(0, 8),
    authData.serverNonce.slice(0, 8)
  );

  return {
    authKey: authKey,
    authKeyId: authKeyHash.slice(-8),
    serverSalt: bytesXor(
      authData.newNonce.slice(0, 8),
      authData.serverNonce.slice(0, 8)
    )
  };
};

const createAuthKeys = async transport => {
  const authData = {};
  authData.initNonce = randomBytes(16);

  const data = serializeMethod('req_pq', {
    nonce: authData.initNonce
  }, 'proto');

  const reqPqMultiRes = await transport.send(data);

  const resPqData = await readObject(reqPqMultiRes.tl, 'ResPQ');
  authData.pq = resPqData.pq;
  authData.serverNonce = resPqData.server_nonce;

  if(!isBytesCompare(authData.initNonce, resPqData.nonce)) {
    throw 'Nonce not compare';
  }

  const pAndQ = await tgMain.callWorker('factorize', resPqData.pq);
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
  }, 'proto');

  let reqDhParamsBuffer = serializeMethod('req_DH_params', {
    nonce: authData.initNonce,
    server_nonce: authData.serverNonce,
    p: authData.p,
    q: authData.q,
    public_key_fingerprint: [ 1827171105, -1011602686 ],
    encrypted_data: await tgMain.callWorker(
      'rsaEncrypt', { key: publicKey, data: pqInnerDataBuffer }
    )
  }, 'proto');

  const reqDhParamsRes = await transport.send(reqDhParamsBuffer);

  const serverDhParamsData = await readObject(
    reqDhParamsRes.tl, 'Server_DH_Params'
  );

  if(!serverDhParamsData) {
    throw 'Server DH params error';
  }
  if(!isBytesCompare(authData.initNonce, serverDhParamsData.nonce)) {
    throw 'Nonce not compare';
  }
  if(!isBytesCompare(authData.serverNonce, serverDhParamsData.server_nonce)) {
    throw 'Server nonce not compare';
  }

  const serverNewConcat = new Uint8Array([
    ... authData.serverNonce,
    ... authData.newNonce
  ]);

  authData.tempAesKey = new Uint8Array([
    ... await tgMain.callWorker('sha1', new Uint8Array([
      ... authData.newNonce,
      ... authData.serverNonce
    ])),
    ... (await tgMain.callWorker('sha1', serverNewConcat)).slice(0, 12)
  ]);

  authData.tempAesIv = new Uint8Array([
    ... (await tgMain.callWorker('sha1', serverNewConcat)).slice(12),
    ... await tgMain.callWorker('sha1', new Uint8Array([
      ... authData.newNonce,
      ... authData.newNonce
    ])),
    ... authData.newNonce.slice(0, 4)
  ]);

  const answerWithHash = await tgMain.callWorker('cryptAesIge', {
    type: 1,
    key: authData.tempAesKey,
    iv: authData.tempAesIv,
    data: serverDhParamsData.encrypted_answer
  });
  const hash = answerWithHash.slice(0, 20);
  const answerWithPadding = answerWithHash.slice(20);

  const answerTl = createTL(
    (new Uint8Array(answerWithPadding)).buffer,
    { schema: 'proto' }
  );
  const serverDhInnerData = await readObject(answerTl, 'Server_DH_inner_data');

  const answerHash = await tgMain.callWorker('sha1',
    answerWithPadding.slice(0, answerTl.offset)
  );
  if(!isBytesCompare(hash, answerHash)) {
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

  /*const verifyDhParamsResult = verifyDhParams(
    serverDhInnerData.g, serverDhInnerData.dh_prime, serverDhInnerData.g_a
  );*/
  const verifyDhParamsResult = await tgMain.callWorker('verifyDhParams', {
    g: serverDhInnerData.g,
    dhPrime: serverDhInnerData.dh_prime,
    gA: serverDhInnerData.g_a
  });
  if(!verifyDhParamsResult) {
    throw 'Verify DH params error';
  }

  authData.g = serverDhInnerData.g;
  authData.gA = serverDhInnerData.g_a;
  authData.dhPrime = serverDhInnerData.dh_prime;
  authData.retryId = 0;

  const auth = await setClientDhParams(transport, authData);

  const suffix = `${transport.dcId}${ isTestMode ? 't' : '' }`;
  tgMain.setStorage(`ak${suffix}`, bytesToHex(auth.authKey));
  tgMain.setStorage(`aki${suffix}`, bytesToHex(auth.authKeyId));
  tgMain.setStorage(`s${suffix}`, bytesToHex(auth.serverSalt));
};

export const auth = async transport => {
  const hasKeyInStorage = tgMain.getStorage(
    `ak${transport.dcId}${ isTestMode ? 't' : '' }`
  );

  if(!hasKeyInStorage) await createAuthKeys(transport);

  const suffix = `${transport.dcId}${ isTestMode ? 't' : '' }`;
  const authKey = tgMain.getStorage(`ak${suffix}`);
  const authKeyId = tgMain.getStorage(`aki${suffix}`);
  const serverSalt = tgMain.getStorage(`s${suffix}`);

  transport.setAuthData(authKey, authKeyId, serverSalt);
};