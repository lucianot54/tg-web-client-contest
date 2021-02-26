import {
  bytesToStr
} from '../helpers/utils';

export const randomInt = max => {
  return Math.floor(Math.random() * max);
};

export const randomBytes = length => {
  const bytes = [];
  for(let i = 0; i < length; i++) {
    bytes.push(randomInt(255));
  }
  return bytes;
};

export const createAesCtrEncryptor = (key, iv) => {
  var counter = new aesjs.Counter();
  counter.setBytes(iv);
  var aesCtr = new aesjs.ModeOfOperation.ctr(key, counter);

  return data => {
    return aesCtr.encrypt(new Uint8Array(data));
  };
};

export const createAesCtrDecryptor = (key, iv) => {
  var counter = new aesjs.Counter();
  counter.setBytes(iv);
  var aesCtr = new aesjs.ModeOfOperation.ctr(key, counter);

  return data => {
    return aesCtr.decrypt(new Uint8Array(data));
  };
};

export function hexToBytes (hexString) {
  var len = hexString.length,
    i
  var start = 0
  var bytes = []

  if (hexString.length % 2) {
    bytes.push(parseInt(hexString.charAt(0), 16))
    start++
  }

  for (i = start; i < len; i += 2) {
    bytes.push(parseInt(hexString.substr(i, 2), 16))
  }

  return bytes
}

export const strToBytes = (str) => {
  var buf = new ArrayBuffer(str.length); // 2 bytes for each char
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  //const byteView = new Uint8Array(buf);
  return Array.from(bufView);
}

export const bytesToHex = byteArray => {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
};

const strToHex = str => {
  return bytesToHex(strToBytes(str));
}

var _fillUp = function (value, count, fillWith) {
  var l = count - value.length;
  var ret = "";
  while (--l > -1)
      ret += fillWith;
  return ret + value;
}

export function hexdump(arrayBuffer, offset, length) {
  var view = new DataView(arrayBuffer);
  offset = offset || 0;
  length = length || arrayBuffer.byteLength;

  var out = _fillUp("Offset", 8, " ") + "  00 01 02 03 04 05 06 07 08 09 0A 0B 0C 0D 0E 0F\n";
  var row = "";
  for (var i = 0; i < length; i += 16) {
      row += _fillUp(offset.toString(16).toUpperCase(), 8, "0") + "  ";
      var n = Math.min(16, length - offset);
      var string = "";
      for (var j = 0; j < 16; ++j) {
          if (j < n) {
              var value = view.getUint8(offset);
              string += value >= 32 ? String.fromCharCode(value) : ".";
              row += _fillUp(value.toString(16).toUpperCase(), 2, "0") + " ";
              offset++;
          }
          else {
              row += "   ";
              string += " ";
          }
      }
      row += " " + string + "\n";
  }
  out += row;
  return out;
}

export const factorize = pqString => {
  const pq = bigInt.fromArray(strToBytes(pqString), 256);

  let y = bigInt.randBetween(bigInt.one, pq.prev());
  let c = bigInt.randBetween(bigInt.one, pq.prev());
  let m = bigInt.randBetween(bigInt.one, pq.prev());

  let g = bigInt('1');
  let r = bigInt('1');
  let s = bigInt('1');

  let x = bigInt('0');
  let ys = bigInt('0');

  while(g.equals(bigInt.one)) {
    x = bigInt(y);

    for(let i = bigInt(bigInt.zero); i.lesser(r); i = i.next()) {
      y = y.modPow(2, pq).add(c).remainder(pq);
    }

    let k = bigInt('0');

    while(k.lesser(r) && g.equals(bigInt.one)) {
      ys = bigInt(y);

      const count = bigInt.min(m, r.subtract(k));
      for(let i = bigInt(bigInt.zero); i.lesser(count); i = i.next()) {
        y = y.modPow(2, pq).add(c).remainder(pq);
        s = s.multiply(x.subtract(y).abs()).remainder(pq);
      }

      g = bigInt.gcd(s, pq);
      k = k.add(m);
    }

    r = r.multiply(2);
  }

  if(g.equals(pq)) {
    while(true) {
      ys = ys.modPow(2, pq).add(c).remainder(pq);
      g = bigInt.gcd(x.subtract(ys).abs(), pq);

      if(g > 1) break;
    }
  }

  let p = g;
  let q = pq.divide(p);

  if(p.greater(q)) {
    const temp = p;
    p = q;
    q = temp;
  }

  return {
    p: bytesToStr(hexToBytes(p.toString(16))),
    q: bytesToStr(hexToBytes(q.toString(16)))
  };
};

export const isBytesCompare = (arr1, arr2) => {
  return arr1.toString() == arr2.toString();
};

export const bufferConcat = (buffer1, buffer2) => {
  const l1 = buffer1.byteLength || buffer1.length;
  const l2 = buffer2.byteLength || buffer2.length;
  const tmp = new Uint8Array(l1 + l2);
  tmp.set(buffer1 instanceof ArrayBuffer ? new Uint8Array(buffer1) : buffer1, 0);
  tmp.set(buffer2 instanceof ArrayBuffer ? new Uint8Array(buffer2) : buffer2, l1);

  return tmp.buffer;
};

export function addPadding (bytes, blockSize, zeroes) {
  blockSize = blockSize || 16
  var len = bytes.byteLength || bytes.length
  var needPadding = blockSize - (len % blockSize)
  if (needPadding > 0 && needPadding < blockSize) {
    var padding = new Array(needPadding)
    if (zeroes) {
      for (var i = 0; i < needPadding; i++) {
        padding[i] = 0
      }
    } else {
      padding = randomBytes(needPadding);
    }

    if (bytes instanceof ArrayBuffer) {
      bytes = bufferConcat(bytes, padding)
    } else {
      bytes = bytes.concat(padding)
    }
  }

  return bytes
}

export const rsaEncrypt = (publicKey, buffer) => {
  const dataWithHash = sha1.array(buffer)
      .concat(Array.from(new Uint8Array(buffer)));

  const bytes = addPadding(dataWithHash, 255)

  var NN = bigInt(publicKey.m, 16);
  var EE = bigInt(publicKey.e, 16);
  var XX = bigInt.fromArray(bytes, 256)
  var enc = XX.modPow(EE, NN);

  return hexToBytes(enc.toString(16));
};

const xorBlock = (words, block, offset, blockSize) => {
  for(var i = 0; i < blockSize; i++) {
    words[offset + i] ^= block[i];
  }
};

export function bytesXor(bytes1, bytes2) {
  var len = bytes1.length
  var bytes = []

  for (var i = 0; i < len; ++i) {
    bytes[i] = bytes1[i] ^ bytes2[i]
  }

  return bytes
}

export const aesIgeDecrypt = (key, iv, encrypted_answer) => {
  const aes = new aesjs.AES(key);
  const blockSize = 16;
  let ivp = iv.slice(0, blockSize);
  let iv2p = iv.slice(blockSize, blockSize * 2);

  const decrypted = Uint8Array.from(strToBytes(encrypted_answer));

  for(let offset = 0, length = decrypted.length; offset < length; offset += blockSize) {
    const nextIvp = decrypted.slice(offset, offset + blockSize);

    xorBlock(decrypted, iv2p, offset, blockSize);
    decrypted.set(aes.decrypt(decrypted.slice(offset, offset + blockSize)), offset);
    xorBlock(decrypted, ivp, offset, blockSize);

    ivp = nextIvp;
    iv2p = decrypted.slice(offset, offset + blockSize);
  }

  return decrypted;
};

export const aesIgeEncrypt = (key, iv, decrypted) => {
  decrypted = addPadding(decrypted)

  const aes = new aesjs.AES(key);
  const blockSize = 16;
  let ivp = iv.slice(0, blockSize);
  let iv2p = iv.slice(blockSize, blockSize * 2);

  const encrypted = Uint8Array.from(decrypted);

  for(let offset = 0, length = encrypted.length; offset < length; offset += blockSize) {
    const nextIv2p = encrypted.slice(offset, offset + blockSize);

    xorBlock(encrypted, ivp, offset, blockSize);
    encrypted.set(aes.encrypt(encrypted.slice(offset, offset + blockSize)), offset);
    xorBlock(encrypted, iv2p, offset, blockSize);

    ivp = encrypted.slice(offset, offset + blockSize);
    iv2p = nextIv2p;
  }

  return encrypted;
};

export const verifyDhParams = (g, dhPrime, gA) => {
  const dhPrimeHex = strToHex(dhPrime);
  if(g != 3 || dhPrimeHex != 'c71caeb9c6b1c9048e6c522f70f13f73980d40238e3e21c14934d037563d930f48198a0aa7c14058229493d22530f4dbfa336f6e0ac925139543aed44cce7c3720fd51f69458705ac68cd4fe6b6b13abdc9746512969328454f18faf8c595f642477fe96bb2a941d5bcd1d4ac8cc49880708fa9b378e3c4f3a9060bee67cf9a4a4a695811051907e162753b56b0f6b410dba74d8a84b2a14b3144e0ef1284754fd17ed950d5965b4b9dd46582db1178d169c6bc465b0d6ff9ca3928fef5b9ae4e418fc15e83ebea0f87fa9ff5eed70050ded2849f47bf959d956850ce929851f0d8115f635b105ee2e4e15d04b2454bf6f4fadf034b10403119cd8e3b92fcc5b') {
    return false;
  }

  const gABigInt = bigInt(strToHex(gA), 16);
  const dhPrimeBigInt = bigInt(dhPrimeHex, 16);

  if(gABigInt.compare(bigInt.one) <= 0) return false;
  if(gABigInt.compare(dhPrimeBigInt.prev()) >= 0) return false;

  const twoPow = bigInt[2].pow(2048 - 64);

  if(gABigInt.compare(twoPow) < 0) return false;
  if(gABigInt.compare(dhPrimeBigInt.subtract(twoPow)) >= 0) return false;

  return true;
};






export const intToUint = int => {
  int = parseInt(int);
  if(int < 0) int = int + 4294967296;
  return int;
};

export const uintToInt = uint => {
  if(uint > 2147483647) uint = uint - 4294967296;
  return uint;
};

export const longFromInts = (high, low) => {
  return bigInt(high).shiftLeft(32).xor(bigInt(low)).toString(10);
};

export const bytesModPow = (x, y, m) => {
  const result =
    bigInt.fromArray(x, 256)
    .modPow(bigInt.fromArray(y, 256), bigInt.fromArray(m, 256))
    .toArray(256);
  return result.value;
};

export const getAesKeyIv = (authKey, msgKey, isFromServer) => {
  const offset = isFromServer ? 8 : 0;
  const sha2aText = new Uint8Array(52);
  const sha2bText = new Uint8Array(52);

  sha2aText.set(msgKey, 0);
  sha2aText.set(authKey.subarray(offset, offset + 36), 16);
  const sha2a = new Uint8Array(hexToBytes(sha256(bytesToStr(sha2aText))));

  sha2bText.set(authKey.subarray(40 + offset, 40 + offset + 36), 0);
  sha2bText.set(msgKey, 36);
  const sha2b = new Uint8Array(hexToBytes(sha256(bytesToStr(sha2bText))));

  const aesKey = new Uint8Array(32)
  const aesIv = new Uint8Array(32)

  aesKey.set(sha2a.subarray(0, 8));
  aesKey.set(sha2b.subarray(8, 24), 8);
  aesKey.set(sha2a.subarray(24, 32), 24);

  aesIv.set(sha2b.subarray(0, 8));
  aesIv.set(sha2a.subarray(8, 24), 8);
  aesIv.set(sha2b.subarray(24, 32), 24);

  return [ aesKey, aesIv ];
};