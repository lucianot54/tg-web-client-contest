/* global importScripts, Zlib */

importScripts('gunzip.min.js');

import {
  importAesCtrData,
  cryptAesCtr,
  cryptAesIge
} from './aes';

import {
  bytesModPow,
  encryptPassword,
  factorize,
  rsaEncrypt,
  verifyDhParams
} from './crypto';

import {
  sha1,
  sha256
} from './hash';

const methods = {};

methods.importAesCtrData = importAesCtrData;
methods.cryptAesCtr = cryptAesCtr;
methods.cryptAesIge = cryptAesIge;

methods.bytesModPow = bytesModPow;
methods.encryptPassword = encryptPassword;
methods.factorize = factorize;
methods.rsaEncrypt = rsaEncrypt;
methods.verifyDhParams = verifyDhParams;

methods.sha1 = sha1;
methods.sha256 = sha256;

methods.gunzip = data => {
  return new Zlib.Gunzip(data).decompress();
};

onmessage = async e => {
  const data = e.data;
  data.result = await methods[data.method](data.params);
  postMessage(data);
};