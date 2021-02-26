import {
  deferred
} from './helpers/utils';

import {
  getTransport,
  destroyTransport
} from './mtproto/transport';

import {
  serializeMethod
} from './mtproto/tl';

let isStartInit = false;
let isInited = false;
const initDefer = deferred();

export const init = () => {
  if(isInited) return Promise.resolve();
  else if(isStartInit) return initDefer.promise;

  isStartInit = true;

  let initDc = parseInt(TGInit.getStorage('nearest_dc')) || 1;

  getTransport(initDc, true)
  .then(transport => {
    if(TGInit.getStorage('nearest_dc')) return;

    return transport.send(serializeMethod('help.getNearestDc'));
  })
  .then(result => {
    if(!result) return initDefer.resolve();

    const nearestDc = result.nearest_dc;
    TGInit.setStorage('nearest_dc', nearestDc);

    destroyTransport(initDc);

    getTransport(nearestDc, true)
    .then(transport => {
      isInited = true;
      initDefer.resolve();
    })
  });

  return initDefer.promise;
};

export const initAllDc = () => {
  [ 1, 2, 3, 4, 5 ].forEach(dcId => {
    if(TGInit.getStorage(`auth_key_${dcId}`)) return;

    getTransport(dcId)
    .then(transport => {
      destroyTransport(dcId);
    });
  });
};

export * from './mtproto/api/auth';
export * from './mtproto/api/users';
export * from './mtproto/api/messages';
export * from './mtproto/api/utils';