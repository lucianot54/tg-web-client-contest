import { sha1 } from './hash';

import {
  randomBytes,
  addPadding
} from './helpers';

import { sha256 } from './hash';

import {
  bpe,
  one,
  str2bigInt,
  bigInt2str,
  int2bigInt,
  copy_,
  copyInt_,
  isZero,
  greater,
  equals,
  equalsInt,
  add,
  add_,
  sub,
  sub_,
  mult,
  multInt_,
  divide_,
  rightShift_,
  eGCD_,
  mod,
  powMod,
  multMod
} from './leemon';

const randomInt = max => {
  return Math.floor(Math.random() * max);
};

const bytesToHex = bytes => {
  return bytes.reduce((str, byte) => {
    return str + byte.toString(16).padStart(2, '0');
  }, '');
};

const hexToBytes = hex => {
  if(hex.length % 2) hex = '0' + hex;

  return new Uint8Array(
    hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );
};

const bytesXor = (bytes1, bytes2) => {
  return new Uint8Array(bytes1.length).map((b, i) => bytes1[i] ^ bytes2[i]);
};

const bytesModPow = params => {
  const result = powMod(
    str2bigInt(bytesToHex(params.x), 16),
    str2bigInt(bytesToHex(params.y), 16),
    str2bigInt(bytesToHex(params.m), 16)
  );
  if(params.returnBigInt) return result;

  return hexToBytes(bigInt2str(result, 16));
};

const saltHash = async (data, salt) => {
  return await sha256(Uint8Array.from([
    ... salt,
    ... data,
    ... salt
  ]));
};

const pbkdf = async (keyBytes, saltBytes) => {
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'PBKDF2' },
    false,
    [ 'deriveBits' ]
  );

  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-512',
        salt: saltBytes,
        iterations: 100000
      },
      key,
      512
    )
  );
};

const encryptPassword = async params => {
  const aBytes = randomBytes(256);

  const gBytes = Uint8Array.from([
    ... new Uint8Array(255),
    params.g
  ]);

  const ga = bytesModPow({
    x: gBytes,
    y: aBytes,
    m: params.p
  });

  const k = str2bigInt(bytesToHex(await sha256(Uint8Array.from([
    ... params.p,
    ... gBytes
  ]))), 16);

  const u = str2bigInt(bytesToHex(await sha256(Uint8Array.from([
    ... ga,
    ... params.srpB
  ]))), 16);

  const passwordBytes = new TextEncoder().encode(params.password);
  const ph1 = await saltHash(
    await saltHash(passwordBytes, params.salt1),
    params.salt2
  );
  const pbkdfBytes = await pbkdf(ph1, params.salt1);
  const xBytes = await saltHash(pbkdfBytes, params.salt2);

  const v = bytesModPow({
    x: Uint8Array.from([ params.g ]),
    y: xBytes,
    m: params.p,
    returnBigInt: true
  });

  const p = str2bigInt(bytesToHex(params.p), 16);

  const kv = multMod(k, v, p);

  const gb = str2bigInt(bytesToHex(params.srpB), 16);

  if(greater(kv, gb)) add_(gb, p);
  const t = mod(sub(gb, kv), p);

  const a = str2bigInt(bytesToHex(aBytes), 16);
  const x = str2bigInt(bytesToHex(xBytes), 16);
  const sa = powMod(t, add(a, mult(u, x)), p);

  return {
    A: ga,
    M1: await sha256(Uint8Array.from([
      ... bytesXor(
        await sha256(params.p),
        await sha256(gBytes)
      ),
      ... await sha256(params.salt1),
      ... await sha256(params.salt2),
      ... ga,
      ... params.srpB,
      ... await sha256(hexToBytes(bigInt2str(sa, 16)))
    ]))
  };
};

const factorize = pqBytes => {
  const minLen = Math.ceil(64 / bpe) + 1;
  const what = str2bigInt(bytesToHex(pqBytes), 16, minLen);
  let lim = 0;

  const a = new Array(minLen);
  const b = new Array(minLen);
  const c = new Array(minLen);
  const g = new Array(minLen);
  const x = new Array(minLen);
  const y = new Array(minLen);
  const z = new Array(minLen);

  for(let i = 0; i < 3; i++) {
    const q = (randomInt(128) & 15) + 17;
    copyInt_(x, randomInt(1000000000) + 1);
    copy_(y, x);
    lim = 1 << (i + 18);

    for(let j = 0; j < lim; j++) {
      copy_(a, x);
      copy_(b, x);
      copyInt_(c, q);

      while(!isZero(b)) {
        if(b[0] & 1) {
          add_(c, a);
          if(greater(c, what)) sub_(c, what);
        }

        add_(a, a);
        if(greater(a, what)) sub_(a, what);
        rightShift_(b, 1);
      }

      copy_(x, c);
      if(greater(x, y)) {
        copy_(z, x);
        sub_(z, y);
      } else {
        copy_(z, y);
        sub_(z, x);
      }

      eGCD_(z, what, g, a, b);

      if(!equalsInt(g, 1)) break;
      if((j & (j - 1)) == 0) copy_(y, x);
    }

    if(greater(g, one)) break;
  }

  divide_(what, g, x, y);

  let p;
  let q;

  if(greater(g, x)) {
    p = x;
    q = g;
  } else {
    p = g;
    q = x;
  }

  return {
    p: hexToBytes(bigInt2str(p, 16)),
    q: hexToBytes(bigInt2str(q, 16))
  };
};

const rsaEncrypt = async params => {
  const publicKey = params.key;
  const buffer = params.data;

  const dataWithHash = new Uint8Array([
    ... await sha1(buffer),
    ... new Uint8Array(buffer)
  ]);

  const bytes = addPadding(dataWithHash, 255);

  return hexToBytes(bigInt2str(
    powMod(
      str2bigInt(bytesToHex(bytes), 16),
      str2bigInt('10001', 16),
      str2bigInt(publicKey, 16)
    ),
    16
  ));
};

const verifyDhParams = async params => {
  const g = params.g;
  const dhPrime = params.dhPrime;
  const gA = params.gA;

  const dhPrimeHash = bytesToHex(await sha1(dhPrime));
  if(g != 3 || dhPrimeHash != '465bd03478c819c41d4e654c0c9a9978888485cf') {
    return false;
  }

  const gABI = str2bigInt(bytesToHex(gA), 16);
  const primeBI = str2bigInt(bytesToHex(dhPrime), 16);

  if(greater(one, gABI) || equals(one, gABI)) return false;
  const prevPrimeBI = sub(primeBI, one);
  if(greater(gABI, prevPrimeBI) || equals(gABI, prevPrimeBI)) return false;

  let it = 2048 - 65;
  const twoPow = int2bigInt(2, it, 1);
  while(it--) {
    multInt_(twoPow, 2);
  }

  if(greater(twoPow, gABI)) return false;
  const subPrimeBI = sub(primeBI, twoPow);
  if(greater(gABI, subPrimeBI) || equals(gABI, subPrimeBI)) return false;

  return true;
};

export {
  bytesModPow,
  factorize,
  encryptPassword,
  rsaEncrypt,
  verifyDhParams
};