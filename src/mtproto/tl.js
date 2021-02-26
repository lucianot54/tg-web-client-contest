import {
  intToUint,
  uintToInt,
  longFromInts
} from './bin';

export const createTL = (initBuffer, opts) => {
  const hasInitBuffer = initBuffer && initBuffer.byteLength !== undefined;

  if(!hasInitBuffer) opts = initBuffer;
  opts = opts || {};

  length = hasInitBuffer ? initBuffer.byteLength : opts.length || 2048;
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

const readBool = tl => {
  const int = intToUint(readInt(tl));
  if(int == 0x997275b5) return true;
  else if(int == 0xbc799737) return false;

  tl.offset -= 4;
  return readObject(tl, 'Object');
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
  if(long._bytes) {
    writeBytes(tl, long._bytes, true);
    return;
  }

  if(Array.isArray(long)) {
    if(long.length == 2) {
      writeInt(tl, long[1]);
      writeInt(tl, long[0]);
    } else {
      writeIntBytes(tl, long, 64);
    }

    return;
  }

  if(typeof(long) != 'string') long = long ? long.toString() : '0';

  const divMod = bigInt(long).divmod(bigInt('100000000', 16));
  const high = divMod.quotient.valueOf();

  writeInt(tl, intToUint(divMod.remainder.valueOf()));
  writeInt(tl, high < 0 ? high - 1 : high);
};

export const readLong = tl => {
  const low = readInt(tl);
  const high = readInt(tl);

  const long = new String(longFromInts(high, low));
  long._bytes = tl.byteView.slice(tl.offset - 8, tl.offset);

  return long;
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

  if(isRaw) tl.offset += length;
  else while(tl.offset % 4) tl.offset++;

  return bytes;
};

export const writeString = (tl, string) => {
  string = string || '';
  //string = unescape(encodeURIComponent(string));

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
    const isBare = type.charAt(0) == '%';
    if(isBare) type = type.substr(1);

    const schema = TGInit.resources['schema-' + tl.schema];

    const predicate = obj._;
    let constructorData;
    for(let i = 0, l = schema.constructors.length; i < l; i++) {
      if(schema.constructors[i].predicate == predicate) {
        constructorData = schema.constructors[i];
        break;
      }
    }

    if(!constructorData) {
      for(let i = 0, l = schema.constructors.length; i < l; i++) {
        if(schema.constructors[i].type == type) {
          constructorData = schema.constructors[i];
          break;
        }
      }
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

export const readObject = (tl, type, sendedMessages) => {
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
      return readBool(tl);
    case 'true':
      return true;
  }

  if(type.substr(0, 6).toLowerCase() == 'vector') {
    if(type.charAt(0) == 'V') {
      const constructor = readInt(tl);
      const constructorInt = uintToInt(constructor);

      if(constructorInt == 0x3072cfa1) {
        const compressed = readBytes(tl);
        const gunzip = new Zlib.Gunzip(compressed);
        const uncompressed = gunzip.decompress();
        const buffer = (new Uint8Array(uncompressed)).buffer;

        const newTl = createTL(buffer);
        return readObject(newTl, type);
      }

      if(constructorInt == 0x73f1f8dc) {
        debugger;
      }

      if(constructorInt != 0x1cb5c415) return;
    }

    const length = readInt(tl);
    const result = [];

    if(length > 0) {
      const itemType = type.substr(7, type.length - 8);
      for(let i = 0; i < length; i++) {
        result.push(readObject(tl, itemType));
      }
    }

    return result;
  }

  const schema = TGInit.resources['schema-' + tl.schema];

  let constructorData;

  if(type.charAt(0) == '%') {
    const checkType = type.substr(1);

    for(let i = 0, l = schema.constructors.length; i < l; i++) {
      if(schema.constructors[i].type == checkType) {
        constructorData = schema.constructors[i];
        break;
      }
    }

    if(!constructorData) {
      if(tl.schemaChanged) return;
      else {
        tl.schema = tl.schema == 'mtproto' ? 'api' : 'mtproto';
        tl.schemaChanged = true;
        return readObject(tl, type);
      }
    }
  }
  else if(type.charAt(0) >= 97 && type.charAt(0) <= 122) {
    for(let i = 0, l = schema.constructors.length; i < l; i++) {
      if(schema.constructors[i].predicate == type) {
        constructorData = schema.constructors[i];
        break;
      }
    }

    if(!constructorData) {
      if(tl.schemaChanged) return;
      else {
        tl.schema = tl.schema == 'mtproto' ? 'api' : 'mtproto';
        tl.schemaChanged = true;
        return readObject(tl, type);
      }
    }
  }
  else {
    const constructor = readInt(tl);
    const constructorInt = uintToInt(constructor);

    if(constructorInt == 0x3072cfa1) {
      const compressed = readBytes(tl);
      const gunzip = new Zlib.Gunzip(compressed);
      const uncompressed = gunzip.decompress();
      const buffer = (new Uint8Array(uncompressed)).buffer;

      const newTl = createTL(buffer);
      return readObject(newTl, type);
    }

    let indexes = schema.indexes;
    if(!indexes) {
      schema.indexes = indexes = {};
      for(let i = 0, l = schema.constructors.length; i < l; i++) {
        indexes[schema.constructors[i].id] = i;
      }
    }

    let index = indexes[constructorInt];
    if(index != undefined) constructorData = schema.constructors[index];

    if(!constructorData) {
      if(tl.schemaChanged) return;
      else {
        tl.offset -= 4;
        tl.schema = tl.schema == 'mtproto' ? 'api' : 'mtproto';
        tl.schemaChanged = true;
        return readObject(tl, type);
      }
    }
  }

  let predicate = constructorData.predicate;
  //if(predicate == 'message') debugger;

  const result = { _: predicate };

  for(let i = 0, l = constructorData.params.length; i < l; i++) {
    const param = constructorData.params[i];
    let type = param.type;

    if(type == '#' && !result.pFlags) result.pFlags = {};

    const isCond = type.includes('?');
    if(isCond) {
      const condType = type.split('?');
      const fieldBit = condType[0].split('.');

      if(!(result[fieldBit[0]] & (1 << fieldBit[1]))) continue;

      type = condType[1];
    }

    if(predicate == 'rpc_result' && param.name == 'result' && sendedMessages[result.req_msg_id]) {
      type = sendedMessages[result.req_msg_id].resType;
    }

    const value = readObject(tl, type);

    if(isCond && type == 'true') result.pFlags[param.name] = value;
    else result[param.name] = value;
  }

  return result;
};

export const writeMethod = (tl, method, params) => {
  const schema = TGInit.resources['schema-' + tl.schema];

  let methodData;
  for(let i = 0, l = schema.methods.length; i < l; i++) {
    if(schema.methods[i].method == method) {
      methodData = schema.methods[i];
      break;
    }
  }

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

/*export const getBytes = (tl, typed) => {
  if(typed) {
    var resultBuffer = new ArrayBuffer(tl.offset)
    var resultArray = new Uint8Array(resultBuffer)

    resultArray.set(tl.byteView.subarray(0, tl.offset))

    return resultArray
  }

  var bytes = []
  for(var i = 0; i < tl.offset; i++) {
    bytes.push(tl.byteView[i])
  }
  return bytes
};*/