/* global tgMain, tgProto, tgApp */

import {
  deferred
} from '../../helpers';

import {
  dbGetAll,
  dbPuts
} from '../db';

const isStickerMessage = message => {
  if(!message.media) return false;
  if(message.media._ != 'messageMediaDocument') return false;

  const stickerAttributeIndex = message.media.document.attributes
    .findIndex(attribute => attribute._ == 'documentAttributeSticker');
  if(stickerAttributeIndex == -1) return false;

  return true;
};

const isGifMessage = message => {
  if(!message.media) return false;
  if(message.media._ != 'messageMediaDocument') return false;

  const videoAttributeIndex = message.media.document.attributes
    .findIndex(attribute => attribute._ == 'documentAttributeVideo');
  const gifAttributeIndex = message.media.document.attributes
    .findIndex(attribute => attribute._ == 'documentAttributeAnimated');
  if(videoAttributeIndex == -1 || gifAttributeIndex == -1) return false;

  return true;
};

const isVideoMessage = message => {
  if(!message.media) return false;
  if(message.media._ != 'messageMediaDocument') return false;

  const videoAttributeIndex = message.media.document.attributes
    .findIndex(attribute => attribute._ == 'documentAttributeVideo');
  if(videoAttributeIndex == -1) return false;

  return true;
};

const isAudioMessage = message => {
  if(!message.media) return false;
  if(message.media._ != 'messageMediaDocument') return false;

  const audioAttributeIndex = message.media.document.attributes
    .findIndex(attribute => attribute._ == 'documentAttributeAudio');
  if(audioAttributeIndex == -1) return false;

  return true;
};

let stickers = {};

const initStickersStore = async () => {
  (await dbGetAll('stickers')).forEach(sticker => {
    stickers[sticker._key] = sticker;
  });
};

const putStickers = messages => {
  const stickersToPut = [];

  messages.forEach(message => {
    if(!isStickerMessage(message)/* &&
       !isGifMessage(message)*/) return;

    const document = message.media.document;

    const key = document.id.toString();

    const sticker = {
      _key: key,
      id: document.id,
      access_hash: document.access_hash,
      ref: document.file_reference,
      type: document.mime_type,
      thumbs: document.thumbs
    };

    if(!stickers[key]) {
      stickers[key] = sticker;
      stickersToPut.push(sticker);
    }
  });

  dbPuts('stickers', stickersToPut);
};

const fullLoadDefers = {};

const loadSticker = async document => {
  const key = document.id.toString();
  fullLoadDefers[key] = deferred();

  await tgApp.waitProtoInited();

  let isPartial = true;
  let offset = 0;

  while(isPartial) {
    const fileData = await tgProto.sendMethod('upload.getFile', {
      location: {
        _: 'inputDocumentFileLocation',
        id: document.id,
        access_hash: document.access_hash,
        file_reference: document.file_reference,
        thumb_size: 'x'
      },
      offset: offset,
      limit: 1048576
    }, document.dc_id);

    stickers[key].content = new Uint8Array([
      ... (stickers[key].content || []),
      ... fileData.bytes
    ]);

    if(fileData.type._ == 'storage.filePartial' &&
       fileData.bytes.length == 1048576) {
      offset += fileData.bytes.length;
    } else {
      isPartial = false;
    }
  }

  dbPuts('stickers', [ stickers[key] ]);

  const defer = fullLoadDefers[key];
  delete(fullLoadDefers[key]);
  defer.resolve(getSticker(document));
};

const getSticker = async (document, noDownload) => {
  const key = document.id.toString();
  if(fullLoadDefers[key]) return fullLoadDefers[key].promise;

  const sticker = stickers[key];

  if(!noDownload && sticker.content) {
    if(sticker.type == 'application/x-tgsticker') {
      return {
        isFull: true,
        data: JSON.parse(new TextDecoder().decode(
          await tgMain.callWorker('gunzip', sticker.content)
        ))
      };
    }

    return {
      isFull: true,
      url: URL.createObjectURL(new Blob([ sticker.content ], {
        type: sticker.type
      }))
    };
  }

  if(!noDownload) loadSticker(document);

  const thumbWithData = sticker.thumbs.find(thumb => {
    return thumb._ == 'photoCachedSize';
  });
  if(thumbWithData) {
    return {
      isFull: false,
      url: URL.createObjectURL(new Blob([ thumbWithData.bytes ], {
        type: sticker.type == 'application/x-tgsticker'
          ? 'image/webp'
          : sticker.type
      }))
    };
  } else {
    const thumbSize = sticker.thumbs.find(thumb => {
      return thumb._ == 'photoSize';
    });

    const canvas = window.document.createElement('canvas');
    canvas.width = thumbSize.w;
    canvas.height = thumbSize.h;

    return {
      isFull: false,
      url: canvas.toDataURL()
    };
  }
};

export {
  isStickerMessage,
  isGifMessage,
  isVideoMessage,
  isAudioMessage,
  initStickersStore,
  putStickers,
  getSticker
};