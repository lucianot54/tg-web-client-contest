/* global tgMain, tgProto */

import './Styles/main.scss';
import './Styles/elements.scss';
import './Styles/side.scss';
import './Styles/dialogs.scss';
import './Styles/messages.scss';
import './Styles/right.scss';
import './Styles/inputs.scss';

import schemaApiSource from './Api/schema.tl';

import {
  deferred
} from '../helpers';

import './Blocks/Right/Info';
import './Blocks/Right/Search';
import './Blocks/App';
import './Blocks/Dialogs';
import './Blocks/Left';
import './Blocks/Messages';
import './Blocks/Right';

import './Elements/Button';
import './Elements/Dialog';
import './Elements/Loader';
import './Elements/Menu';
import './Elements/Message';
import './Elements/Scroll';
import './Elements/Search';
import './Elements/SearchResult';
import './Elements/Send';
import './Elements/SideHeader';

import { initDocumentsStore } from './Stores/documents';
import { initStickersStore } from './Stores/stickers';
import { initDialogsStore } from './Stores/dialogs';
import { initMessagesStore } from './Stores/messages';
import {
  initPeersStore,
  updatePeersStatusInterval
} from './Stores/peers';
import { initPhotosStore } from './Stores/photos';
import { initImagesStore } from './Stores/images';

const userId = parseInt(tgMain.getStorage('user_id'));

let appComponent;

const init = async () => {
  tgProto.setApiScheme(schemaApiSource);

  await Promise.all([
    initDocumentsStore(),
    initStickersStore(),
    initDialogsStore(),
    initMessagesStore(),
    initPeersStore(),
    initPhotosStore(),
    initImagesStore()
  ]);

  appComponent = document.createElement('tg-block-app');
  document.body.appendChild(appComponent);
};

const protoInitedDefer = deferred();

const protoInited = async () => {
  await tgProto.initUpdates();
  protoInitedDefer.resolve();
};

const waitProtoInited = () => {
  return protoInitedDefer.promise;
};

const lottieLoaded = () => {};

export {
  init,
  appComponent,
  protoInited,
  waitProtoInited,
  lottieLoaded,
  userId,
  updatePeersStatusInterval
};