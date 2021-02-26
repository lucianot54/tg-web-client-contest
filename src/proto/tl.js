/* global tgMain */

import schemaProtoSource from './proto.tl';

// TODO: проверить необходимость конвертации int в uint и обратно

const intToUint = int => {
  int = parseInt(int);
  if(int < 0) int = int + 4294967296;
  return int;
};

const uintToInt = uint => {
  if(uint > 2147483647) uint = uint - 4294967296;
  return uint;
};

/* eslint-disable no-useless-escape */
const tlIdentfierRegExp = /([A-z0-9_\.]+)(#([a-f0-9]+))?/;
const tlParameterRegExp = /([A-z0-9_]+):([A-z0-9_\#\?\.<>%\!]+)/g;
const tlReturnRegExp = /= (.+);/;
/* eslint-enable no-useless-escape */

const parseTl = tl => {
  const constructors = [];
  const methods = [];

  let isFunctions = false;

  tl.split(';').forEach(element => {
    if(element == '') {
      isFunctions = true;
      return;
    }
    element += ';';

    const identifier = tlIdentfierRegExp.exec(element);
    if(!identifier) return;

    const indetifierParsed = {
      id: parseInt(identifier[3], 16),
      name: identifier[1]
    };

    const parameters = [];
    let lastMatch;
    while((lastMatch = tlParameterRegExp.exec(element)) !== null) {
      parameters.push({
        name: lastMatch[1],
        type: lastMatch[2]
      });
    }

    const result = tlReturnRegExp.exec(element)[1];

    if(isFunctions) {
      methods.push({
        id: uintToInt(indetifierParsed.id),
        method: indetifierParsed.name,
        params: parameters,
        type: result
      });
    } else {
      constructors.push({
        id: uintToInt(indetifierParsed.id),
        predicate: indetifierParsed.name,
        params: parameters,
        type: result
      });
    }
  });

  const cIdIndexes = {};
  const cTypeIndexes = {};
  const cPredIndexes = {};
  for(let i = 0, l = constructors.length; i < l; i++) {
    cIdIndexes[constructors[i].id] = i;
    cTypeIndexes[constructors[i].type] = i;
    cPredIndexes[constructors[i].predicate] = i;
  }

  const mIndexes = {};
  for(let i = 0, l = methods.length; i < l; i++) {
    mIndexes[methods[i].method] = i;
  }

  return {
    constructors,
    cIdIndexes,
    cTypeIndexes,
    cPredIndexes,
    methods,
    mIndexes
  };
};

const schemaProto = parseTl(schemaProtoSource);
let schemaApi;

export const setApiScheme = tl => {
  schemaApi = parseTl(tl);
};

export const createTL = (initBuffer, opts) => {
  const hasInitBuffer = initBuffer && initBuffer.byteLength !== undefined;

  if(!hasInitBuffer) opts = initBuffer;
  opts = opts || {};

  const length = hasInitBuffer ? initBuffer.byteLength : opts.length || 2048;
  const schema = opts.schema || 'api';

  let buffer;
  if(hasInitBuffer) buffer = initBuffer;
  else buffer = new ArrayBuffer(length);

  const intView = new Int32Array(buffer);
  const byteView = new Uint8Array(buffer);

  return {
    buffer,
    intView,
    byteView,
    length,
    schema,
    offset: 0
  };
};

const checkLength = (tl, need) => {
  if(tl.offset + need < tl.length) return;

  const newLength = Math.ceil(
    Math.max(tl.length * 2, tl.offset + need + 16) / 4
  ) * 4;

  const prevIntView = tl.intView;

  tl.length = newLength;
  tl.buffer = new ArrayBuffer(newLength);
  tl.intView = new Int32Array(tl.buffer);
  tl.byteView = new Uint8Array(tl.buffer);

  tl.intView.set(prevIntView);
};

const writeBool = (tl, bool) => {
  if(bool) writeInt(tl, 0x997275b5);
  else writeInt(tl, 0xbc799737);
};

const readBool = async tl => {
  const int = intToUint(readInt(tl));
  if(int == 0x997275b5) return true;
  else if(int == 0xbc799737) return false;

  tl.offset -= 4;
  return await readObject(tl, 'Object');
};

export const writeInt = (tl, int) => {
  checkLength(tl, 4);

  tl.intView[tl.offset / 4] = int;
  tl.offset += 4;
};

export const readInt = tl => {
  const int = tl.intView[tl.offset / 4];
  tl.offset += 4;
  return int;
};

export const writeLong = (tl, long) => {
  writeInt(tl, long[0]);
  writeInt(tl, long[1]);
};

export const readLong = tl => {
  return [ readInt(tl), readInt(tl) ];
};

const writeDouble = (tl, double) => {
  const buffer = new ArrayBuffer(8);
  const intView = new Int32Array(buffer);
  const doubleView = new Float64Array(buffer);

  doubleView[0] = double;

  writeInt(tl, intView[0]);
  writeInt(tl, intView[1]);
};

const readDouble = tl => {
  const buffer = new ArrayBuffer(8);
  const intView = new Int32Array(buffer);
  const doubleView = new Float64Array(buffer);

  intView[0] = readInt(tl);
  intView[1] = readInt(tl);

  return doubleView[0];
};

export const writeIntBytes = (tl, bytes, bits) => {
  if(bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);

  const length = bytes.length;
  if((bits % 32) || (length * 8) != bits) return;

  checkLength(tl, length);

  tl.byteView.set(bytes, tl.offset);
  tl.offset += length;
};

export const readIntBytes = (tl, bits, typed) => {
  const length = bits / 8;
  if(typed) {
    const result = tl.byteView.subarray(tl.offset, tl.offset + length);
    tl.offset += length;
    return result;
  }

  const bytes = [];
  for(let i = 0; i < length; i++) {
    bytes.push(tl.byteView[tl.offset++]);
  }

  return bytes;
};

export const writeBytes = (tl, bytes, isRaw) => {
  if(bytes instanceof ArrayBuffer) bytes = new Uint8Array(bytes);
  else if(!bytes) bytes = [];

  const length = bytes.byteLength || bytes.length;

  checkLength(tl, length + 8);

  if(!isRaw) {
    if(length < 253) tl.byteView[tl.offset++] = length;
    else {
      tl.byteView[tl.offset++] = 254;
      tl.byteView[tl.offset++] = length & 0xFF;
      tl.byteView[tl.offset++] = (length & 0xFF00) >> 8;
      tl.byteView[tl.offset++] = (length & 0xFF0000) >> 16;
    }
  }

  tl.byteView.set(bytes, tl.offset);
  tl.offset += length;

  while(tl.offset % 4) tl.byteView[tl.offset++] = 0;
};

export const readBytes = (tl, isRaw, length) => {
  if(!isRaw) {
    length = tl.byteView[tl.offset++];

    if(length == 254) {
      length =
        tl.byteView[tl.offset++] |
        (tl.byteView[tl.offset++] << 8) |
        (tl.byteView[tl.offset++] << 16);
    }
  } else {
    length = length || tl.byteView.byteLength - tl.offset;
  }

  const bytes = tl.byteView.subarray(tl.offset, tl.offset + length);

  tl.offset += length;
  while(tl.offset % 4) tl.offset++;

  return bytes;
};

export const writeString = (tl, string) => {
  string = string || '';
  string = unescape(encodeURIComponent(string));

  const length = string.length;

  checkLength(tl, length + 8);
  if(length < 253) tl.byteView[tl.offset++] = length;
  else {
    tl.byteView[tl.offset++] = 254;
    tl.byteView[tl.offset++] = length & 0xFF;
    tl.byteView[tl.offset++] = (length & 0xFF00) >> 8;
    tl.byteView[tl.offset++] = (length & 0xFF0000) >> 16;
  }

  for(let i = 0; i < length; i++) {
    tl.byteView[tl.offset++] = string.charCodeAt(i);
  }

  while(tl.offset % 4) tl.byteView[tl.offset++] = 0;
};

const readString = tl => {
  let length = tl.byteView[tl.offset++];

  if(length == 254) {
    length =
      tl.byteView[tl.offset++] |
      (tl.byteView[tl.offset++] << 8) |
      (tl.byteView[tl.offset++] << 16);
  }

  let string = '';
  for(let i = 0; i < length; i++) {
    string += String.fromCharCode(tl.byteView[tl.offset++]);
  }

  while(tl.offset % 4) tl.offset++;

  let result;
  try {
    result = decodeURIComponent(escape(string));
  } catch(err) {
    result = string;
  }

  return result;
};

export const writeObject = (tl, type, obj) => {
  switch(type) {
    case '#':
    case 'int':
      return writeInt(tl, obj);
    case 'long':
      return writeLong(tl, obj);
    case 'int128':
      return writeIntBytes(tl, obj, 128);
    case 'int256':
      return writeIntBytes(tl, obj, 256);
    case 'int512':
      return writeIntBytes(tl, obj, 512);
    case 'string':
      return writeString(tl, obj);
    case 'bytes':
      return writeBytes(tl, obj);
    case 'double':
      return writeDouble(tl, obj);
    case 'Bool':
      return writeBool(tl, obj);
    case '!X':
      return writeBytes(tl, new Uint8Array(obj), true);
    case 'true':
      return;
  }

  if(Array.isArray(obj)) {
    if(type.substr(0, 6) == 'Vector') writeInt(tl, 0x1cb5c415);

    const itemType = type.substr(7, type.length - 8);
    writeInt(tl, obj.length);

    obj.forEach(elem => {
      writeObject(tl, itemType, elem);
    });

    return;
  }

  if(typeof(obj) == 'object') {
    let isBare = type.charAt(0) == '%';
    if(isBare) type = type.substr(1);

    const schema = tl.schema == 'api' ? schemaApi : schemaProto;

    const predicate = obj._;
    let constructorData = schema.constructors[schema.cPredIndexes[predicate]];

    if(!constructorData) {
      constructorData = schema.constructors[schema.cTypeIndexes[type]];
    }

    if(!constructorData) return;

    if(predicate == type) isBare = true;

    if(!isBare) writeInt(tl, intToUint(constructorData.id));

    for(let i = 0, l = constructorData.params.length; i < l; i++) {
      const param = constructorData.params[i];
      let type = param.type;

      if(type.includes('?')) {
        const condType = type.split('?');
        const fieldBit = condType[0].split('.');

        if(!(obj[fieldBit[0]] & (1 << fieldBit[1]))) continue;

        type = condType[1];
      }

      writeObject(tl, type, obj[param.name]);
    }
  }
};

export const readObject = async (tl, type, sendedMessages) => {
  type = type || '';

  switch(type) {
    case '#':
    case 'int':
      return readInt(tl);
    case 'long':
      return readLong(tl);
    case 'int128':
      return readIntBytes(tl, 128, false);
    case 'int256':
      return readIntBytes(tl, 256, false);
    case 'int512':
      return readIntBytes(tl, 512, false);
    case 'string':
      return readString(tl);
    case 'bytes':
      return readBytes(tl);
    case 'double':
      return readDouble(tl);
    case 'Bool':
      return await readBool(tl);
    case 'true':
      return true;
  }

  if(type.substr(0, 6).toLowerCase() == 'vector') {
    if(type.charAt(0) == 'V') {
      const constructor = readInt(tl);

      if(constructor == 0x3072cfa1) {
        const uncompressed = await tgMain.callWorker('gunzip', readBytes(tl));

        const newTl = createTL(uncompressed.buffer);
        return await readObject(newTl, type, sendedMessages);
      }

      if(constructor != 0x1cb5c415) return;
    }

    const length = readInt(tl);
    const result = [];

    if(length > 0) {
      const itemType = type.substr(7, type.length - 8);
      for(let i = 0; i < length; i++) {
        result.push(await readObject(tl, itemType, sendedMessages));
      }
    }

    return result;
  }

  const schema = tl.schema == 'api' ? schemaApi : schemaProto;

  let constructorData;

  if(type.charAt(0) == '%') {
    const checkType = type.substr(1);

    constructorData = schema.constructors[schema.cTypeIndexes[checkType]];

    if(!constructorData) {
      if(tl.schemaChanged) return;
      else {
        tl.schema = tl.schema == 'proto' ? 'api' : 'proto';
        tl.schemaChanged = true;
        return await readObject(tl, type, sendedMessages);
      }
    }
  }
  else if(type.charAt(0) >= 97 && type.charAt(0) <= 122) {
    constructorData = schema.constructors[schema.cPredIndexes[type]];

    if(!constructorData) {
      if(tl.schemaChanged) return;
      else {
        tl.schema = tl.schema == 'proto' ? 'api' : 'proto';
        tl.schemaChanged = true;
        return await readObject(tl, type, sendedMessages);
      }
    }
  }
  else {
    const constructor = readInt(tl);

    if(constructor == 0x3072cfa1) {
      const uncompressed = await tgMain.callWorker('gunzip', readBytes(tl));

      const newTl = createTL(uncompressed.buffer);
      return await readObject(newTl, type, sendedMessages);
    }

    constructorData = schema.constructors[schema.cIdIndexes[constructor]];

    if(!constructorData) {
      if(tl.schemaChanged) return;
      else {
        tl.offset -= 4;
        tl.schema = tl.schema == 'proto' ? 'api' : 'proto';
        tl.schemaChanged = true;

        const result = await readObject(tl, type, sendedMessages);

        tl.schema = tl.schema == 'proto' ? 'api' : 'proto';
        tl.schemaChanged = false;

        return result;
      }
    }
  }

  let predicate = constructorData.predicate;
  //if(predicate == 'message') debugger;

  const result = { _: predicate, _type: constructorData.type };

  for(let i = 0, l = constructorData.params.length; i < l; i++) {
    const param = constructorData.params[i];
    let type = param.type;

    const isCond = type.includes('?');
    if(isCond) {
      const condType = type.split('?');
      const fieldBit = condType[0].split('.');

      if(!(result[fieldBit[0]] & (1 << fieldBit[1]))) continue;

      type = condType[1];
    }

    if(predicate == 'rpc_result' &&
       param.name == 'result' &&
       sendedMessages[result.req_msg_id.toString()]) {
      type = sendedMessages[result.req_msg_id.toString()].body._resType;
    }

    const value = await readObject(tl, type, sendedMessages);

    result[param.name] = value;
  }

  return result;
};

export const writeMethod = (tl, method, params) => {
  const schema = tl.schema == 'api' ? schemaApi : schemaProto;

  const methodData = schema.methods[schema.mIndexes[method]];

  writeInt(tl, intToUint(methodData.id));

  for(let i = 0, l = methodData.params.length; i < l; i++) {
    const param = methodData.params[i];
    let type = param.type;

    if(type.includes('?')) {
      const condType = type.split('?');
      const fieldBit = condType[0].split('.');

      if(!(params[fieldBit[0]] & (1 << fieldBit[1]))) continue;

      type = condType[1];
    }

    writeObject(tl, type, params[param.name]);
  }

  return methodData.type;
};

export const getBuffer = tl => {
  const resultBuffer = new ArrayBuffer(tl.offset);
  const resultArray = new Int32Array(resultBuffer);

  resultArray.set(tl.intView.subarray(0, tl.offset / 4));

  return resultArray.buffer;
};

export const serializeMethod = (method, data, schema) => {
  schema = schema || 'api';

  if(schema == 'api') console.log('serializeMethod', method, data);

  const tl = createTL({ schema: schema });
  const resType = writeMethod(tl, method, data);
  const buffer = getBuffer(tl);
  buffer._resType = resType;

  return buffer;
};

export const serializeObject = (type, data, schema) => {
  schema = schema || 'api';

  const tl = createTL({ schema: schema });
  writeObject(tl, type, data);
  return getBuffer(tl);
};