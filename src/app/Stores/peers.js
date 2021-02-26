/* global tgProto */

import {
  compareObjects
} from '../../helpers';

import {
  dbGetAll,
  dbPuts
} from '../db';

import {
  updateDialogPeer
} from './dialogs';

import {
  putPeersPhotos
} from './photos';

let peers = {};
let updatePeersStatusInterval;

const getPeerKey = peer => {
  if(peer._ == 'inputPeerSelf') return 'self';

  if(peer.user_id) return `user${peer.user_id}`;
  if(peer.chat_id) return `chat${peer.chat_id}`;
  if(peer.channel_id) return `channel${peer.channel_id}`;

  let prefix = '';
  if(peer._ == 'user') prefix = 'user';
  if(peer._ == 'chat') prefix = 'chat';
  if(peer._ == 'channel') prefix = 'channel';

  if(!prefix) return null;

  return `${prefix}${peer.id}`;
};

const initPeersStore = async () => {
  (await dbGetAll('peers')).forEach(peer => {
    peers[peer._key] = peer;
  });

  updatePeersStatusInterval = setInterval(() => {
    Object.keys(peers).forEach(key => {
      const peerStatus = peers[key].status;
      if(!peerStatus || peerStatus._ != 'userStatusOnline') return;
      if(Date.now() < peerStatus.expires * 1000) return;

      peers[key].status = {
        _: 'userStatusOffline',
        was_online: peerStatus.expires
      };

      dbPuts('peers', [ peers[key] ]);
      updateDialogPeer(peers[key]);
    });
  }, 5000);

  tgProto.onUpdate('updateUserStatus', update => {
    const key = getPeerKey(update);
    const peer = peers[key];
    if(!peer) return;

    peer.status = update.status;
    peers[key] = peer;
    dbPuts('peers', [ peer ]);

    updateDialogPeer(peer);
  });

  tgProto.onUpdate('updateUserName', update => {
    const key = getPeerKey(update);
    const peer = peers[key];
    if(!peer) return;

    peer.first_name = update.first_name;
    peer.last_name = update.last_name;
    peer.username = update.username;
    peers[key] = peer;
    dbPuts('peers', [ peer ]);

    updateDialogPeer(peer);
  });

  tgProto.onUpdate('updateUserPhone', update => {
    const key = getPeerKey(update);
    const peer = peers[key];
    if(!peer) return;

    peer.phone = update.phone;
    peers[key] = peer;
    dbPuts('peers', [ peer ]);
  });

  tgProto.onUpdate('updateUserPhoto', update => {
    const key = getPeerKey(update);
    const peer = peers[key];
    if(!peer) return;

    peer.photo = update.photo;
    peers[key] = peer;
    dbPuts('peers', [ peer ]);
    putPeersPhotos([ peer ]);

    updateDialogPeer(peer);
  });
};

const putPeers = peersParam => {
  putPeersPhotos(peersParam);

  const peersToPut = [];

  peersParam.forEach(peer => {
    const key = getPeerKey(peer);
    if(!key) {
      if(peer._ == 'channelForbidden' && peer.broadcast) {
        const key = getPeerKey({ channel_id: peer.id });
        if(!peers[key]) return;

        peers[key].left = true;
        return;
      }
      return;
    }

    peer._key = key;

    if(!peers[key]) {
      peers[key] = peer;
      peersToPut.push(peer);
    }
    else if(!compareObjects(peers[key], peer)) {
      peers[key] = peer;
      peersToPut.push(peer);

      updateDialogPeer(peer);
    }
  });

  dbPuts('peers', peersToPut);
};

const updatePeerAccessHash = (peer, accessHash) => {
  const key = getPeerKey(peer);
  peers[key].access_hash = accessHash;
  dbPuts('peers', [ peers[key] ]);
  updateDialogPeer(peers[key]);
};

const getPeer = peer => {
  return peers[getPeerKey(peer)];
};

export {
  initPeersStore,
  getPeerKey,
  putPeers,
  getPeer,
  updatePeerAccessHash,
  updatePeersStatusInterval
};