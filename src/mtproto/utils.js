import {
  randomInt,
  longFromInts
} from './bin';

let prevMessageId = [ 0, 0 ];
let timeOffset = parseInt(TGInit.getStorage('server_time_offset')) || 0;

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

  return longFromInts(messageId[0], messageId[1]);
};

export const applyServerTime = serverTime => {
  const newTimeOffset = serverTime - Math.floor(+(new Date()) / 1000);

  TGInit.setStorage('server_time_offset', newTimeOffset);
  prevMessageId = [ 0, 0 ];
  timeOffset = newTimeOffset;
};

export const getPublicKey = fingerprints => {
  const publicKeys = TGInit.resources['public-keys'];

  for(let i = 0, l = fingerprints.length; i < l; i++) {
    if(publicKeys[fingerprints[i]]) {
      const founded = publicKeys[fingerprints[i]];
      founded.fp = fingerprints[i];
      return founded;
    }
  }
};