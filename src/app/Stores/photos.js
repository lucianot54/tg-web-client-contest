/* global tgProto, tgApp */

import {
  compareObjects
} from '../../helpers';

import {
  dbGetAll,
  dbPuts
} from '../db';

import {
  getPeerKey
} from './peers';

let photos = {};

const initPhotosStore = async () => {
  (await dbGetAll('photos')).forEach(photo => {
    photos[photo._key] = photo;
  });
};

const putPeersPhotos = peers => {
  const photosToPut = [];

  peers.forEach(peer => {
    const peerPhoto = peer.photo;
    if(!peerPhoto || peerPhoto._.includes('Empty')) return;

    const key = getPeerKey(peer);
    if(!key) return;

    const photo = {
      _key: key,
      small: {
        volume: peerPhoto.photo_small.volume_id,
        local: peerPhoto.photo_small.local_id,
        dc: peerPhoto.dc_id
      },
      big: {
        volume: peerPhoto.photo_big.volume_id,
        local: peerPhoto.photo_big.local_id,
        dc: peerPhoto.dc_id
      }
    };

    if(!photos[key]) {
      photos[key] = photo;
      photosToPut.push(photo);
    }
    else {
      const existsPhoto = JSON.parse(JSON.stringify(photos[key]));
      delete(existsPhoto.small.file);
      delete(existsPhoto.big.file);

      if(!compareObjects(existsPhoto, photo)) {
        photos[key] = photo;
        photosToPut.push(photo);
      }
    }
  });

  dbPuts('photos', photosToPut);
};

const getPhoto = async (peer, isBig) => {
  const key = getPeerKey(peer);
  const type = isBig ? 'big' : 'small';
  const photo = photos[key][type];
  if(photo.file) {
    return URL.createObjectURL(new Blob([ photo.file.bytes ], {
      type: photo.file.type
    }));
  }

  await tgApp.waitProtoInited();

  const inputPeer = {};
  if(peer._ == 'user') {
    inputPeer._ = 'inputPeerUser';
    inputPeer.user_id = peer.id;
    inputPeer.access_hash = peer.access_hash;
  }
  if(peer._ == 'chat') {
    inputPeer._ = 'inputPeerChat';
    inputPeer.chat_id = peer.id;
  }
  if(peer._ == 'channel') {
    inputPeer._ = 'inputPeerChannel';
    inputPeer.channel_id = peer.id;
    inputPeer.access_hash = peer.access_hash;
  }

  const fileData = await tgProto.sendMethod('upload.getFile', {
    location: {
      _: 'inputPeerPhotoFileLocation',
      peer: inputPeer,
      volume_id: photo.volume,
      local_id: photo.local
    },
    offset: 0,
    limit: 1048576
  }, photo.dc);

  let mime;
  switch(fileData.type._) {
    case 'storage.fileJpeg':
      mime = 'image/jpeg';
      break;
    case 'storage.fileGif':
      mime = 'image/gif';
      break;
    case 'storage.filePng':
      mime = 'image/png';
      break;
    case 'storage.fileWebp':
      mime = 'image/webp';
      break;
  }

  photos[key][type].file = {
    type: mime,
    bytes: fileData.bytes
  };

  dbPuts('photos', [ photos[key] ]);

  return getPhoto(peer, isBig);
};

export {
  initPhotosStore,
  putPeersPhotos,
  getPhoto
};