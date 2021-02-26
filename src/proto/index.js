/* global tgMain, tgProto, tgApp */

import {
  getTransport,
  destroyTransport,
  send,
  setMessagesHandling,
  mainDcId
} from './transport';

import {
  setApiScheme,
  serializeMethod
} from './tl';

import {
  initUpdates,
  clearUpdateState,
  addChannelUpdateState,
  setMainPts,
  onUpdate,
  sendMessage
} from './updates';

const isTestMode = tgMain.isTestMode;

let onConnect = null;
let onDisconnect = null;
let onCountryDetected = null;

let isInited = false;

let country = '';

const sendMethod = async (name, params, dcId) => {
  return await send(serializeMethod(name, params), dcId);
};

const init = async () => {
  if(isInited) return;

  let initDc = parseInt(tgMain.getStorage('nd')) || 1;
  await getTransport(initDc, true);

  if(tgMain.getStorage('nd')) {
    await sendMethod('help.getNearestDc');
    isInited = true;
    return;
  }

  const getNearestDcResult = await sendMethod('help.getNearestDc');
  const nearestDc = getNearestDcResult.nearest_dc;

  country = getNearestDcResult.country;
  if(tgProto.onCountryDetected) tgProto.onCountryDetected(country);

  tgMain.setStorage('nd', nearestDc);

  if(nearestDc == getNearestDcResult.this_dc) {
    isInited = true;
    return;
  }

  await getTransport(nearestDc, true);
  destroyTransport(initDc);
  isInited = true;
};

const initAllDc = () => {
  const allDcIds = [ 1, 2, 3 ];
  if(!isTestMode) allDcIds.push(4, 5);

  allDcIds.forEach(dcId => {
    if(tgMain.getStorage(`ak${dcId}${ isTestMode ? 't' : '' }`)) return;

    getTransport(dcId)
      .then(() => {
        destroyTransport(dcId);
      });
  });
};

const getCountry = async () => {
  if(country) return country;

  const getNearestDcResult = await sendMethod('help.getNearestDc');
  country = getNearestDcResult.country;

  return country;
};

const exportAuth = async () => {
  const allDcIds = [ 1, 2, 3 ];
  if(!isTestMode) allDcIds.push(4, 5);

  allDcIds.forEach(async dcId => {
    if(dcId == mainDcId) return;

    const exportedAuth = await sendMethod(
      'auth.exportAuthorization', {
        dc_id: dcId
      }
    );

    await sendMethod('auth.importAuthorization', {
      id: exportedAuth.id,
      bytes: exportedAuth.bytes
    }, dcId);
  });
};

const logOut = async () => {
  tgApp.appComponent.hide();

  tgMain.setStorage('user_id', null);
  tgMain.setStorage('us', null);
  tgMain.setStorage('uc', null);
  clearUpdateState();
  indexedDB.deleteDatabase('tg');

  clearInterval(tgApp.updatePeersStatusInterval);

  const allDcIds = [ 1, 2, 3 ];
  if(!isTestMode) allDcIds.push(4, 5);

  const promises = [];
  for(let i = 0, l = allDcIds.length; i < l; i++) {
    promises.push(sendMethod('auth.logOut', {}, allDcIds[i]));
  }
  await Promise.all(promises);

  tgApp.appComponent.initAuth();
};

export {
  init,
  initAllDc,
  onConnect,
  onDisconnect,
  onCountryDetected,
  setApiScheme,
  setMessagesHandling,
  sendMethod,
  getCountry,
  initUpdates,
  logOut,
  exportAuth,
  addChannelUpdateState,
  setMainPts,
  onUpdate,
  sendMessage
};