import {
  auth
} from './auth';

import {
  deferred,
  bytesToStr
} from '../helpers/utils';

import {
  randomInt,
  randomBytes,
  createAesCtrEncryptor,
  createAesCtrDecryptor,
  aesIgeEncrypt,
  hexToBytes,
  bytesToHex,
  bufferConcat,
  isBytesCompare,
  aesIgeDecrypt,
  getAesKeyIv
} from './bin';

import {
  createTL,
  writeLong,
  readLong,
  writeInt,
  readInt,
  writeIntBytes,
  readIntBytes,
  writeBytes,
  readBytes,
  readObject,
  getBuffer,
  serializeMethod,
  serializeObject
} from './tl';

import {
  generateMessageId
} from './utils';

const transports = [];
export let mainDcId;

const handshakeStartsBlackList = [
  0x44414548,
  0x54534f50,
  0x20544547,
  0x4954504f,
  0xdddddddd,
  0xeeeeeeee
];

const subdomains = ['pluto', 'venus', 'aurora', 'vesta', 'flora']

class Transport {
  constructor(dcId, callback) {
    const self = this;

    this.dcId = dcId;
    this.sendedMessages = {};
    this.lastActivity = Date.now();

    let socket;

    try {
      socket = new WebSocket(`ws://${subdomains[dcId - 1]}.web.telegram.org:443/apiws`, [ 'binary' ]);
    }
    catch(err) {}

    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
      self.handshake();
      auth(self)
      .then(() => {
        callback(self);
      });
    };

    socket.onmessage = e => {
      self.handleMessage(e.data);
    };

    socket.onclose = e => {
      console.log('WS close', e);
      if(!e.wasClean) {
        delete(transports[this.dcId]);
        getTransport(this.dcId, this.dcId == mainDcId);
      }
    };

    socket.onerror = err => {
      console.log('WS error', err);
    };

    this.socket = socket;
  }

  updateSession() {
    this.seqNo = 0;
    this.sessionId = randomBytes(8);
  }

  nextSeqNo() {
    let returnSeqNo = this.seqNo * 2;
    returnSeqNo++;
    this.seqNo++;
    return returnSeqNo;
  }

  applyServerSalt(salt) {
    this.serverSalt = hexToBytes(salt);
    TGInit.setStorage(`server_salt_${this.dcId}`, salt);
  }

  setAuthData(key, keyId, salt) {
    this.authKey = new Uint8Array(hexToBytes(key));
    this.authKeyId = new Uint8Array(hexToBytes(keyId));
    this.applyServerSalt(salt);
    this.updateSession();
    this.needInitConnection = true;
  }

  sendToSocket(dataBuffer, notWrap) {
    if(notWrap) {
      this.socket.send(dataBuffer);
      return;
    }

    const length = dataBuffer.byteLength / 4;
    let lengthByteView;

    if(length < 127) lengthByteView = Uint8Array.from([ length ]);
    else {
      lengthByteView = new Uint8Array(4);
      lengthByteView.set([
        127,
        length >> 0 & 255,
        length >> 8 & 255,
        length >> 16 & 255
      ]);
    }

    const dataByteView = new Uint8Array(dataBuffer);

    const mergedBuffer = new ArrayBuffer(lengthByteView.byteLength + dataByteView.byteLength);
    const mergedByteView = new Uint8Array(mergedBuffer);
    mergedByteView.set(lengthByteView);
    mergedByteView.set(dataByteView, lengthByteView.byteLength);

    this.socket.send(this.encryptor(mergedByteView));
  };

  send(bodyBuffer, notWaitResult, notAddToSended) {
    this.lastActivity = Date.now();
    const resType = bodyBuffer._resType;

    if(this.needInitConnection) {
      bodyBuffer = serializeMethod('invokeWithLayer', {
        layer: 105,
        query: serializeMethod('initConnection', {
          api_id: 832266,
          device_model: 'Unknown',
          system_version: 'Unknown',
          app_version: '0.0.1',
          lang_code: 'en',
          lang_pack: '',
          system_lang_code: 'en',
          query: bodyBuffer
        })
      });

      this.needInitConnection = false;
    }

    // Тут могла быть ваша gzip

    const bodyLength = bodyBuffer.byteLength;
    const bodyByteView = new Uint8Array(bodyBuffer);

    const headerTl = createTL();

    const msgId = generateMessageId();

    if(this.serverSalt && !notAddToSended) {
      this.sendedMessages[msgId] = {
        id: msgId,
        body: bodyBuffer,
        defer: deferred(),
        waitResult: !notWaitResult,
        resType
      };
    }

    if(this.serverSalt) {
      writeIntBytes(headerTl, this.serverSalt, 64);
      writeIntBytes(headerTl, this.sessionId, 64);
      writeLong(headerTl, msgId);
      writeInt(headerTl, this.nextSeqNo());
    } else {
      writeLong(headerTl, [ 0, 0 ]);
      writeLong(headerTl, msgId);
    }

    writeInt(headerTl, bodyLength);

    const headerBuffer = getBuffer(headerTl);

    const headerLength = headerBuffer.byteLength;
    const headerByteView = new Uint8Array(headerBuffer);

    const paddingLength = (-bodyLength & 15) + 16 * (randomInt(15) + 1);

    if(paddingLength == 4) debugger;

    let resultBuffer = new ArrayBuffer(headerLength + bodyLength + paddingLength);
    const resultByteView = new Uint8Array(resultBuffer);

    resultByteView.set(headerByteView);
    resultByteView.set(bodyByteView, headerLength);
    resultByteView.set(randomBytes(paddingLength), headerLength + bodyLength);

    if(this.serverSalt) {
      const msgKeyLargePlain = bufferConcat(
        this.authKey.subarray(88, 88 + 32),
        resultBuffer
      );
      const msgKeyLarge = sha256(bytesToStr(new Uint8Array(msgKeyLargePlain)));
      const msgKey = new Uint8Array(hexToBytes(msgKeyLarge)).subarray(8, 24);

      const keyIv = getAesKeyIv(this.authKey, msgKey);

      const encrypted = aesIgeEncrypt(keyIv[0], keyIv[1], Array.from(resultByteView));

      const dataTl = createTL(encrypted.byteLength + 256);
      writeIntBytes(dataTl, this.authKeyId, 64);
      writeIntBytes(dataTl, msgKey, 128);
      writeBytes(dataTl, encrypted, true);

      this.sendToSocket(getBuffer(dataTl));

      return !notAddToSended ? this.sendedMessages[msgId].defer.promise : null;
    } else {
      this.sendToSocket(resultBuffer);

      this.plainResponseDefer = deferred();
      return this.plainResponseDefer.promise;
    }
  }

  handshake() {
    const randomBuffer = new ArrayBuffer(64);
    const randomIntView = new Uint32Array(randomBuffer);
    const randomByteView = new Uint8Array(randomBuffer);

    while(true) {
      randomByteView.set(randomBytes(64));

      if(randomByteView[0] == 0xef) continue;
      if(handshakeStartsBlackList.includes(randomIntView[0])) continue;
      if(randomIntView[1] == 0x00000000) continue;

      break;
    }

    randomIntView.set([ 0xefefefef ], 14);

    const encryptKey = randomByteView.slice(8, 40);
    const encryptIv = randomByteView.slice(40, 56);

    const randomReversedByteView = Uint8Array.from(randomByteView).reverse();
    const decryptKey = randomReversedByteView.slice(8, 40);
    const decryptIv = randomReversedByteView.slice(40, 56);

    this.encryptor = createAesCtrEncryptor(encryptKey, encryptIv);
    this.decryptor = createAesCtrDecryptor(decryptKey, decryptIv);

    const encryptedRandom = this.encryptor(randomBuffer);
    const encryptedRandomByteView = new Uint8Array(encryptedRandom);

    randomByteView.set(encryptedRandomByteView.slice(56, 64), 56);

    this.sendToSocket(randomBuffer, true);
  }

  sendMsgsAck(msgId) {
    this.send(serializeObject('MsgsAck', {
      _: 'msgs_ack',
      msg_ids: [ msgId ]
    }, 'mtproto'), true, true);
  }

  processMessage(messageId, message) {
    if(message._ == 'bad_server_salt') {
      this.applyServerSalt(bytesToHex(message.new_server_salt._bytes));

      const badMsg = this.sendedMessages[message.bad_msg_id];

      if(badMsg != undefined) {
        badMsg.defer.resolve(this.send(badMsg.body));
        delete(this.sendedMessages[message.bad_msg_id]);
      }
    }

    if(message._ == 'new_session_created') {
      this.applyServerSalt(bytesToHex(message.server_salt._bytes));
      this.sendMsgsAck(messageId);
    }

    if(message._ == 'msgs_ack') {
      message.msg_ids.forEach(msgId => {
        if(this.sendedMessages[msgId] && !this.sendedMessages[msgId].waitResult) {
          delete(this.sendedMessages[msgId]);
        }
      });
    }

    if(message._ == 'rpc_result') {
      if(this.sendedMessages[message.req_msg_id]) {
        this.sendedMessages[message.req_msg_id].defer.resolve(message.result);
        delete(this.sendedMessages[message.req_msg_id]);
      }
    }
  }

  handleMessage(encryptedDataBuffer) {
    this.lastActivity = Date.now();

    const dataBuffer = this.decryptor(encryptedDataBuffer).buffer;
    const dataByteView = new Uint8Array(dataBuffer);

    let startWith = 1;
    if(dataByteView[0] == 127) startWith = 4;

    if(!this.serverSalt) {
      if(this.plainResponseDefer) {
        const resTl = createTL(dataByteView.slice(startWith).buffer, { schema: 'mtproto' });

        const authKeyId = readLong(resTl);
        const msgId = readLong(resTl);
        const msgLength = readInt(resTl);

        this.plainResponseDefer.resolve({
          authKeyId,
          msgId,
          msgLength,
          tl: resTl
        });
        this.plainResponseDefer = null;
      }
      return;
    }

    const resTl = createTL(dataByteView.slice(startWith).buffer);
    const resAuthKeyId = readIntBytes(resTl, 64, false);

    if(!isBytesCompare(this.authKeyId, resAuthKeyId)) {
      console.error('Received error ' + new Int32Array(dataByteView.slice(startWith).buffer)[0]);
      return;
    }

    const msgKey = readIntBytes(resTl, 128, true);
    const encryptedData = readBytes(resTl, true);
    const keyIv = getAesKeyIv(this.authKey, msgKey, true);

    const dataWithPadding = aesIgeDecrypt(keyIv[0], keyIv[1], bytesToStr(encryptedData));

    const dataTl = createTL(dataWithPadding.buffer);
    const dataSalt = readIntBytes(dataTl, 64, false);
    const dataSessionId = readIntBytes(dataTl, 64, false);
    const dataMessageId = readLong(dataTl);
    const dataSeqNo = readInt(dataTl);

    if(!isBytesCompare(this.sessionId, dataSessionId)) {
      console.error('Bad session id from server');
      return;
    }

    const messageBodyLength = readInt(dataTl);
    const messageBody = readBytes(dataTl, true, messageBodyLength);

    const bodyTl = createTL(Uint8Array.from(messageBody).buffer, { schema: 'mtproto' });
    const body = readObject(bodyTl, '', this.sendedMessages);
    if(!body) return;

    console.log(body);

    if(body._ && body._ == 'msg_container') {
      for(let i = 0, l = body.messages.length; i < l; i++) {
        this.processMessage(body.messages[i].msg_id, body.messages[i].body);
      }
    } else {
      this.processMessage(dataMessageId, body);
    }
  }
}

let isPingPongStarted = false;
const pingPong = () => {
  send(serializeMethod('ping', {
    ping_id: [randomInt(0xFFFFFFFF), randomInt(0xFFFFFFFF)]
  }, 'mtproto'));
};

const dcsDefers = {};

export const getTransport = (dcId, isMain) => {
  if(!dcsDefers[dcId]) dcsDefers[dcId] = deferred();

  if(isMain || !mainDcId) mainDcId = dcId;

  if(transports[dcId]) {
    dcsDefers[dcId].resolve(transports[dcId]);
  } else {
    new Transport(dcId, transport => {
      transports[dcId] = transport;
      dcsDefers[dcId].resolve(transport);

      if(!isPingPongStarted) {
        isPingPongStarted = true;
        setInterval(pingPong, 60000);
      }
    });
  }

  return dcsDefers[dcId].promise;
};

export const destroyTransport = dcId => {
  if(dcId == mainDcId) return;

  transports[dcId].socket.close(1000);
  delete(transports[dcId]);
  delete(dcsDefers[dcId]);
};

export const send = (data, dcId) => {
  dcId = dcId || mainDcId;

  return transports[dcId].send(data);
};

setInterval(() => {
  const now = Date.now();

  const dcIdsToDestroy = [];

  for(let dcId in transports) {
    if(dcId == mainDcId) continue;

    const transport = transports[dcId];

    if(now - transport.lastActivity > 60000) {
      dcIdsToDestroy.push(dcId);
    }
  }

  dcIdsToDestroy.forEach(dcId => {
    destroyTransport(dcId);
  });
}, 10000);