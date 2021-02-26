/* global tgMain, tgProto */

import {
  auth
} from './auth';

import {
  randomInt,
  deferred
} from '../helpers';

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
  getUpdates,
  handleUpdates
} from './updates';

import {
  randomBytes,
  hexToBytes,
  bytesToHex,
  isBytesCompare,
  generateMessageId
} from './utils';

const isTestMode = tgMain.isTestMode;

let isMessagesHandling = true;

const getAesKeyIv = async (authKey, msgKey, isFromServer) => {
  const offset = isFromServer ? 8 : 0;
  const sha2aText = new Uint8Array(52);
  const sha2bText = new Uint8Array(52);

  sha2aText.set(msgKey, 0);
  sha2aText.set(authKey.subarray(offset, offset + 36), 16);
  const sha2a = await tgMain.callWorker('sha256', sha2aText);

  sha2bText.set(authKey.subarray(40 + offset, 40 + offset + 36), 0);
  sha2bText.set(msgKey, 36);
  const sha2b = await tgMain.callWorker('sha256', sha2bText);

  const aesKey = new Uint8Array(32);
  const aesIv = new Uint8Array(32);

  aesKey.set(sha2a.subarray(0, 8));
  aesKey.set(sha2b.subarray(8, 24), 8);
  aesKey.set(sha2a.subarray(24, 32), 24);

  aesIv.set(sha2b.subarray(0, 8));
  aesIv.set(sha2a.subarray(8, 24), 8);
  aesIv.set(sha2b.subarray(24, 32), 24);

  return [ aesKey, aesIv ];
};

const transports = {};
export let mainDcId;

const handshakeStartsBlackList = [
  0x44414548,
  0x54534f50,
  0x20544547,
  0x4954504f,
  0xdddddddd,
  0xeeeeeeee
];

const subdomains = [ 'pluto', 'venus', 'aurora', 'vesta', 'flora' ];

class Transport {
  constructor(dcId, sendedMessages, callback) {
    const self = this;

    this.dcId = dcId;
    this.sendedMessages = {};
    this.lastActivity = Date.now();

    const subdomain = subdomains[dcId - 1];
    const path = `/apiws${ isTestMode ? '_test' : '' }`;
    const socket = new WebSocket(
      `wss://${subdomain}.web.telegram.org:443${path}`,
      [ 'binary' ]
    );

    socket.binaryType = 'arraybuffer';

    let noAuthError = true;
    let handledErrorClose = false;

    socket.onopen = async () => {
      await self.handshake();

      try {
        await auth(self);
      } catch(err) {
        noAuthError = false;
        console.log(err);
        handledErrorClose = true;
        socket.close();
        return;
      }

      if(tgProto.onConnect && this.dcId == mainDcId) tgProto.onConnect();
      callback(self);

      if(sendedMessages) {
        Object.values(sendedMessages).forEach(sendedMessage => {
          sendedMessage.defer.resolve(this.send(sendedMessage.body));
        });
      }
    };

    socket.onmessage = e => {
      self.handleMessage(e.data);
    };

    socket.onclose = async e => {
      if(!e.wasClean || handledErrorClose) {
        if(noAuthError && tgProto.onDisconnect) tgProto.onDisconnect();

        let passSendedMessages = sendedMessages;
        if(transports[this.dcId]) {
          passSendedMessages = transports[this.dcId].sendedMessages;
        }
        delete(transports[this.dcId]);
        getTransport(this.dcId, this.dcId == mainDcId, passSendedMessages);
      }
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
    tgMain.setStorage(`s${this.dcId}${ isTestMode ? 't' : '' }`, salt);
  }

  setAuthData(key, keyId, salt) {
    this.authKey = new Uint8Array(hexToBytes(key));
    this.authKeyId = new Uint8Array(hexToBytes(keyId));
    this.applyServerSalt(salt);
    this.updateSession();
    this.needInitConnection = true;
  }

  async sendToSocket(dataBuffer, notWrap) {
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

    const mergedBuffer = new ArrayBuffer(
      lengthByteView.byteLength + dataByteView.byteLength
    );
    const mergedByteView = new Uint8Array(mergedBuffer);
    mergedByteView.set(lengthByteView);
    mergedByteView.set(dataByteView, lengthByteView.byteLength);

    this.socket.send(await tgMain.callWorker('cryptAesCtr', {
      id: this.encryptionKeyId,
      data: mergedByteView
    }));
  }

  async send(bodyBuffer, notWaitResult, notAddToSended) {
    this.lastActivity = Date.now();

    if(this.needInitConnection) {
      if(!bodyBuffer._wrapped) {
        const resType = bodyBuffer._resType;

        bodyBuffer = serializeMethod('invokeWithLayer', {
          layer: 108,
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

        bodyBuffer._resType = resType;
        bodyBuffer._wrapped = true;
      }

      this.needInitConnection = false;
    }

    // Тут могла быть ваша gzip

    const bodyLength = bodyBuffer.byteLength;
    const bodyByteView = new Uint8Array(bodyBuffer);

    const headerTl = createTL();

    const msgId = generateMessageId();

    if(this.serverSalt && !notAddToSended) {
      this.sendedMessages[msgId.toString()] = {
        id: msgId,
        body: bodyBuffer,
        defer: deferred(),
        waitResult: !notWaitResult
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

    let resultBuffer = new ArrayBuffer(
      headerLength + bodyLength + paddingLength
    );
    const resultByteView = new Uint8Array(resultBuffer);

    resultByteView.set(headerByteView);
    resultByteView.set(bodyByteView, headerLength);
    resultByteView.set(randomBytes(paddingLength), headerLength + bodyLength);

    if(this.serverSalt) {
      const msgKeyLargePlain = new Uint8Array([
        ... this.authKey.subarray(88, 88 + 32),
        ... resultByteView
      ]);
      const msgKeyLarge = await tgMain.callWorker('sha256', msgKeyLargePlain);
      const msgKey = new Uint8Array(msgKeyLarge).subarray(8, 24);

      const keyIv = await getAesKeyIv(this.authKey, msgKey);

      const encrypted = await tgMain.callWorker('cryptAesIge', {
        key: keyIv[0],
        iv: keyIv[1],
        data: resultByteView
      });

      const dataTl = createTL(encrypted.byteLength + 256);
      writeIntBytes(dataTl, this.authKeyId, 64);
      writeIntBytes(dataTl, msgKey, 128);
      writeBytes(dataTl, encrypted, true);

      await this.sendToSocket(getBuffer(dataTl));

      return !notAddToSended
        ? this.sendedMessages[msgId.toString()].defer.promise
        : null;
    } else {
      await this.sendToSocket(resultBuffer);

      this.plainResponseDefer = deferred();
      return this.plainResponseDefer.promise;
    }
  }

  async handshake() {
    const randomBuffer = new ArrayBuffer(64);
    const randomIntView = new Uint32Array(randomBuffer);
    const randomByteView = new Uint8Array(randomBuffer);

    // eslint-disable-next-line no-constant-condition
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

    this.encryptionKeyId = await tgMain.callWorker('importAesCtrData', {
      key: encryptKey,
      iv: encryptIv
    });
    this.decryptionKeyId = await tgMain.callWorker('importAesCtrData', {
      key: decryptKey,
      iv: decryptIv
    });

    const encryptedRandom = await tgMain.callWorker('cryptAesCtr', {
      id: this.encryptionKeyId,
      data: randomBuffer
    });
    const encryptedRandomByteView = new Uint8Array(encryptedRandom);

    randomByteView.set(encryptedRandomByteView.slice(56, 64), 56);

    await this.sendToSocket(randomBuffer, true);
  }

  sendMsgsAck(msgId) {
    this.send(serializeObject('MsgsAck', {
      _: 'msgs_ack',
      msg_ids: [ msgId ]
    }, 'proto'), true, true);
  }

  async processMessage(messageId, message) {
    if(message._type == 'Updates') {
      handleUpdates(message);
      return;
    }

    if(message._ == 'rpc_result' && message.result._type == 'Updates') {
      handleUpdates(message.result);
      return;
    }

    if(message._ == 'bad_server_salt') {
      this.applyServerSalt(bytesToHex(new Uint8Array(
        Int32Array.from(message.new_server_salt).buffer
      )));

      const badMsg = this.sendedMessages[message.bad_msg_id.toString()];

      if(badMsg != undefined) {
        badMsg.defer.resolve(this.send(badMsg.body));
        delete(this.sendedMessages[message.bad_msg_id.toString()]);
      }
    }

    if(message._ == 'new_session_created') {
      this.applyServerSalt(bytesToHex(new Uint8Array(
        Int32Array.from(message.server_salt).buffer
      )));
      this.sendMsgsAck(messageId);

      getUpdates();
    }

    if(message._ == 'msgs_ack') {
      message.msg_ids.forEach(msgId => {
        if(this.sendedMessages[msgId.toString()] &&
           !this.sendedMessages[msgId.toString()].waitResult) {
          delete(this.sendedMessages[msgId.toString()]);
        }
      });
    }

    if(message._ == 'rpc_result') {
      if(message.result.error_code == 303) {
        const newDc = parseInt(message.result.error_message.split('_')[2]);
        const prevMainDc = mainDcId;

        tgMain.setStorage('nd', newDc);

        await getTransport(newDc, true, this.sendedMessages);
        destroyTransport(prevMainDc);
        return;
      }

      if(message.result.error_code == 401 &&
         message.result.error_message != 'SESSION_PASSWORD_NEEDED') {
        tgProto.logOut();
        return;
      }

      if(this.sendedMessages[message.req_msg_id.toString()]) {
        if(message.result._ == 'rpc_error') {
          console.log(
            'rpc_error', message,
            this.sendedMessages[message.req_msg_id.toString()]
          );
        }

        this.sendedMessages[message.req_msg_id.toString()]
          .defer.resolve(message.result);
        delete(this.sendedMessages[message.req_msg_id.toString()]);
      }
    }

    if(message._ == 'rpc_error') {
      if(this.sendedMessages[message.req_msg_id.toString()]) {
        console.log(
          'rpc_error', message,
          this.sendedMessages[message.req_msg_id.toString()]
        );
        delete(this.sendedMessages[message.req_msg_id.toString()]);
      }
    }
  }

  async handleMessage(encryptedDataBuffer) {
    this.lastActivity = Date.now();

    const dataByteView = await tgMain.callWorker('cryptAesCtr', {
      id: this.decryptionKeyId,
      data: encryptedDataBuffer
    });

    let startWith = 1;
    if(dataByteView[0] == 127) startWith = 4;

    if(!this.serverSalt) {
      if(this.plainResponseDefer) {
        const resTl = createTL(
          dataByteView.slice(startWith).buffer, { schema: 'proto' }
        );

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
      console.log(
        'Received error ' +
        new Int32Array(dataByteView.slice(startWith).buffer)[0]
      );
      return;
    }

    const msgKey = readIntBytes(resTl, 128, true);
    const encryptedData = readBytes(resTl, true);
    const keyIv = await getAesKeyIv(this.authKey, msgKey, true);

    const dataWithPadding = await tgMain.callWorker('cryptAesIge', {
      type: 1,
      key: keyIv[0],
      iv: keyIv[1],
      data: encryptedData
    });

    const dataTl = createTL(dataWithPadding.buffer);
    readIntBytes(dataTl, 64, false);
    const dataSessionId = readIntBytes(dataTl, 64, false);
    const dataMessageId = readLong(dataTl);
    readInt(dataTl);

    if(!isBytesCompare(this.sessionId, dataSessionId)) {
      console.log('Bad session id from server');
      return;
    }

    const messageBodyLength = readInt(dataTl);
    const messageBody = readBytes(dataTl, true, messageBodyLength);

    const bodyTl = createTL(
      Uint8Array.from(messageBody).buffer, { schema: 'proto' }
    );
    const body = await readObject(bodyTl, '', this.sendedMessages);
    if(!body) {
      getUpdates();
      return;
    }

    console.log(body);

    /*if(body._ == 'rpc_result') console.log(body.result);
    else if(body._ == 'msg_container') {
      for(let i = 0, l = body.messages.length; i < l; i++) {
        const localBody = body.messages[i].body;
        if(localBody._ == 'rpc_result') console.log(localBody.result);
      }
    }
    else console.log(body);*/

    if(!isMessagesHandling) {
      console.log('not handle');
      return;
    }

    if(body._ && body._ == 'msg_container') {
      for(let i = 0, l = body.messages.length; i < l; i++) {
        await this.processMessage(
          body.messages[i].msg_id, body.messages[i].body
        );
      }
    } else {
      await this.processMessage(dataMessageId, body);
    }
  }
}

let isPingPongStarted = false;
const pingPong = () => {
  send(serializeMethod('ping', {
    ping_id: [ randomInt(0xFFFFFFFF), randomInt(0xFFFFFFFF) ]
  }, 'proto'));
};

const dcsDefers = {};

export const getTransport = (dcId, isMain, sendedMessages) => {
  if(!dcsDefers[dcId]) dcsDefers[dcId] = deferred();

  if(isMain || !mainDcId) mainDcId = dcId;

  if(transports[dcId]) {
    dcsDefers[dcId].resolve(transports[dcId]);
  } else {
    new Transport(dcId, sendedMessages, transport => {
      transports[dcId] = transport;
      if(dcsDefers[dcId]) dcsDefers[dcId].resolve(transport);

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

  transports[dcId].socket.close();
  delete(transports[dcId]);
  delete(dcsDefers[dcId]);
};

export const send = async (data, dcId) => {
  dcId = dcId || mainDcId;
  if(!transports[dcId]) await getTransport(dcId);

  return transports[dcId].send(data);
};

export const setMessagesHandling = state => {
  isMessagesHandling = state;
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