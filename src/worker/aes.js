import { addPadding } from './helpers';

const tables = [
  [ [], [], [], [], [] ],
  [ [], [], [], [], [] ]
];

const encTable = tables[0];
const decTable = tables[1];
const sbox = encTable[4];
const sboxInv = decTable[4];
const d = [];
const th = [];

for(let i = 0; i < 256; i++) {
  th[(d[i] = i << 1 ^ (i >> 7) * 283) ^ i] = i;
}

for(let x = 0, xInv = 0, x2 = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
  let s = xInv ^ xInv << 1 ^ xInv << 2 ^ xInv << 3 ^ xInv << 4;
  s = s >> 8 ^ s & 255 ^ 99;
  sbox[x] = s;
  sboxInv[s] = x;

  let x4 = 0;
  const x8 = d[x4 = d[x2 = d[x]]];
  let tDec = x8 * 0x1010101 ^ x4 * 0x10001 ^ x2 * 0x101 ^ x * 0x1010100;
  let tEnc = d[s] * 0x101 ^ s * 0x1010100;

  for(let i = 0; i < 4; i++) {
    encTable[i][x] = tEnc = tEnc << 24 ^ tEnc >>> 8;
    decTable[i][s] = tDec = tDec << 24 ^ tDec >>> 8;
  }
}

for(let i = 0; i < 5; i++) {
  encTable[i] = encTable[i].slice(0);
  decTable[i] = decTable[i].slice(0);
}

const uint8ToInt32 = bytes => {
  const result = [];
  for(let i = 0; i < bytes.length; i += 4) {
    result.push(
      (bytes[i] << 24) |
      (bytes[i + 1] << 16) |
      (bytes[i + 2] << 8) |
      bytes[i + 3]
    );
  }
  return result;
};

const int32ToUint8 = ints => {
  const result = [];
  for(let i = 0; i < ints.length; i++) {
    result.push(ints[i] >> 24 & 255);
    result.push(ints[i] >> 16 & 255);
    result.push(ints[i] >> 8 & 255);
    result.push(ints[i] >> 0 & 255);
  }
  return result;
};

const xorBlock = (words, block, offset) => {
  for(var i = 0; i < 16; i++) {
    words[offset + i] ^= block[i];
  }
};

const crypt = (key, data, dir) => {
  let a = data[0] ^ key[0];
  let b = data[dir ? 3 : 1] ^ key[1];
  let c = data[2] ^ key[2];
  let d = data[dir ? 1 : 3] ^ key[3];

  let a2 = 0;
  let b2 = 0;
  let c2 = 0;
  let kIndex = 4;

  const table = tables[dir];
  const t0 = table[0];
  const t1 = table[1];
  const t2 = table[2];
  const t3 = table[3];
  const sbox = table[4];

  const out = [ 0, 0, 0, 0 ];

  for(let i = 0; i < 13; i++) {
    a2 =
      t0[a >>> 24] ^
      t1[b >> 16 & 255] ^
      t2[c >> 8 & 255] ^
      t3[d & 255] ^
      key[kIndex];
    b2 =
      t0[b >>> 24] ^
      t1[c >> 16 & 255] ^
      t2[d >> 8 & 255] ^
      t3[a & 255] ^
      key[kIndex + 1];
    c2 =
      t0[c >>> 24] ^
      t1[d >> 16 & 255] ^
      t2[a >> 8 & 255] ^
      t3[b & 255] ^
      key[kIndex + 2];
    d =
      t0[d >>> 24] ^
      t1[a >> 16 & 255] ^
      t2[b >> 8 & 255] ^
      t3[c & 255] ^
      key[kIndex + 3];

    kIndex += 4;
    a = a2;
    b = b2;
    c = c2;
  }

  for(let i = 0; i < 4; i++) {
    out[dir ? 3 & -i : i] =
      sbox[a >>> 24 ]<<24 ^
      sbox[b >> 16 & 255]<<16 ^
      sbox[c >> 8 & 255]<<8 ^
      sbox[d & 255] ^
      key[kIndex++];
    a2 = a; a = b; b = c; c = d; d = a2;
  }

  return out;
};

const processKey = (keyUint8, type) => {
  const keyInt32 = uint8ToInt32(keyUint8);
  const encKey = keyInt32.slice(0);

  const sbox = tables[0][4];
  let tmp = 0;
  let rcon = 1;
  let i;

  for(i = 8; i < 4 * 8 + 28; i++) {
    let tmp = encKey[i - 1];

    if(i % 8 === 0 || i % 8 === 4) {
      tmp =
        sbox[tmp >>> 24] << 24 ^
        sbox[tmp >> 16 & 255] << 16 ^
        sbox[tmp >> 8 & 255] << 8 ^
        sbox[tmp & 255];

      if(i % 8 === 0) {
        tmp = tmp << 8 ^ tmp >>> 24 ^ rcon << 24;
        rcon = rcon << 1 ^ (rcon >> 7) * 283;
      }
    }

    encKey[i] = encKey[i - 8] ^ tmp;
  }

  if(type == 0) return encKey;

  const decKey = [];
  const decTable = tables[1];

  for(let j = 0; i; j++, i--) {
    tmp = encKey[j & 3 ? i : i - 4];
    if(i <= 4 || j < 4) {
      decKey[j] = tmp;
    } else {
      decKey[j] =
        decTable[0][sbox[tmp >>> 24]] ^
        decTable[1][sbox[tmp >> 16 & 255]] ^
        decTable[2][sbox[tmp >> 8 & 255]] ^
        decTable[3][sbox[tmp & 255]];
    }
  }

  return decKey;
};

let nextKeyId = 0;
const keys = {};

const importAesCtrData = params => {
  const processedKey = processKey(params.key, params.type || 0);

  const keyId = nextKeyId++;
  keys[keyId] = {
    key: processedKey,
    iv: params.iv,
    rc: null,
    rcIndex: 16
  };

  return keyId;
};

const cryptAesCtr = params => {
  const key = keys[params.id];
  const counter = key.iv;

  const data = new Uint8Array(params.data);

  for(let i = 0, l = data.length; i < l; i++) {
    if(key.rcIndex == 16) {
      key.rc = int32ToUint8(crypt(key.key, uint8ToInt32(counter), 0));

      key.rcIndex = 0;

      for(let j = 15; j >= 0; j--) {
        if(counter[j] === 255) {
          counter[j] = 0;
        } else {
          counter[j]++;
          break;
        }
      }
    }

    data[i] ^= key.rc[key.rcIndex++];
  }

  return data;
};

const cryptAesIge = params => {
  const type = params.type || 0;
  const key = processKey(params.key, type);
  const data = addPadding(params.data, 16);

  let ivp = params.iv.slice(0, 16);
  let iv2p = params.iv.slice(16, 32);

  for(let offset = 0, length = data.length; offset < length; offset += 16) {
    const nextIvBefore = data.slice(offset, offset + 16);

    xorBlock(data, type == 0 ? ivp : iv2p, offset);
    const dataParam = uint8ToInt32(data.slice(offset, offset + 16));
    data.set(int32ToUint8(crypt(key, dataParam, type)), offset);
    xorBlock(data, type == 0 ? iv2p : ivp, offset);

    const nextIvAfter = data.slice(offset, offset + 16);

    ivp = type == 0 ? nextIvAfter : nextIvBefore;
    iv2p = type == 0 ? nextIvBefore : nextIvAfter;
  }

  return data;
};

export {
  importAesCtrData,
  cryptAesCtr,
  cryptAesIge
};