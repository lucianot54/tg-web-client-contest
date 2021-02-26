/* global tgMain */

import { randomInt } from '../helpers';

export const randomBytes = length => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

export const hexToBytes = hex => {
  if(hex.length % 2) hex = '0' + hex;

  return new Uint8Array(
    hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
  );
};

export const bytesToHex = bytes => {
  return bytes.reduce((str, byte) => {
    return str + byte.toString(16).padStart(2, '0');
  }, '');
};

export const isBytesCompare = (arr1, arr2) => {
  return arr1.toString() == arr2.toString();
};

let prevMessageId = [ 0, 0 ];
let timeOffset = parseInt(tgMain.getStorage('sto')) || 0;

export const generateMessageId = () => {
  const time = +(new Date());
  const timeSec = Math.floor(time / 1000) + timeOffset;
  const timeMsec = time % 1000;
  const random = randomInt(65535);

  let messageId = [ timeSec, (timeMsec << 21) | (random << 3) | 4 ];

  const isWrongMessageId =
    prevMessageId[0] > messageId[0]
    || prevMessageId[0] == messageId[0]
       && prevMessageId[1] >= messageId[1];

  if(isWrongMessageId) messageId = [ prevMessageId[0], prevMessageId[1] + 4 ];

  prevMessageId = messageId;

  return [ messageId[1], messageId[0] ];
};

export const applyServerTime = serverTime => {
  const newTimeOffset = serverTime - Math.floor(+(new Date()) / 1000);

  tgMain.setStorage('sto', newTimeOffset);
  prevMessageId = [ 0, 0 ];
  timeOffset = newTimeOffset;
};