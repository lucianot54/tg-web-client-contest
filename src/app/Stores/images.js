/* global tgProto, tgApp */

import {
  dbGetAll,
  dbPuts
} from '../db';

const isImageMessage = message => {
  if(!message.media) return false;
  if(message.media._ != 'messageMediaPhoto') return false;

  return true;
};

const isWebpagePhotoMessage = message => {
  if(!message.media) return false;
  if(message.media._ != 'messageMediaWebPage') return false;
  if(!message.media.webpage.photo) return false;

  return true;
};

let images = {};

const initImagesStore = async () => {
  (await dbGetAll('images')).forEach(image => {
    images[image._key] = image;
  });
};

const putImages = messages => {
  const imagesToPut = [];

  messages.forEach(message => {
    if(!isImageMessage(message) && !isWebpagePhotoMessage(message)) return;

    const photo = message.media.photo ||
      message.media.webpage.photo;
    const key = photo.id.toString();

    const image = {
      _key: key,
      id: photo.id,
      access_hash: photo.access_hash,
      ref: photo.file_reference,
      sizes: photo.sizes,
      dcId: photo.dc_id,
      contents: {}
    };

    if(!images[key]) {
      images[key] = image;
      imagesToPut.push(image);
    }
  });

  dbPuts('images', imagesToPut);
};

const loadImage = async (image, size) => {
  const key = image._key;

  await tgApp.waitProtoInited();

  let isPartial = true;
  let offset = 0;

  const hasSizeS = image.sizes
    .findIndex(size => size.type == 's') > -1;
  const hasSizeM = image.sizes
    .findIndex(size => size.type == 'm') > -1;
  const hasSizeX = image.sizes
    .findIndex(size => size.type == 'x') > -1;
  const hasSizeY = image.sizes
    .findIndex(size => size.type == 'y') > -1;
  const hasSizeW = image.sizes
    .findIndex(size => size.type == 'w') > -1;

  let getFileSize;
  if(size == 'm') {
    if(hasSizeX) getFileSize = 'x';
    else if(hasSizeM) getFileSize = 'm';
    else if(hasSizeS) getFileSize = 's';
  }
  if(size == 'l') {
    if(hasSizeY) getFileSize = 'y';
    else if(hasSizeW) getFileSize = 'w';
    else if(hasSizeX) getFileSize = 'x';
  }
  if(size == 'a') {
    getFileSize = 'a';
  }

  while(isPartial) {
    const fileData = await tgProto.sendMethod('upload.getFile', {
      location: {
        _: 'inputPhotoFileLocation',
        id: image.id,
        access_hash: image.access_hash,
        file_reference: image.ref,
        thumb_size: getFileSize
      },
      offset: offset,
      limit: 1048576
    }, image.dcId);

    images[key].contents[size] = new Uint8Array([
      ... (images[key].contents[size] || []),
      ... fileData.bytes
    ]);

    if(fileData.type._ == 'storage.filePartial' &&
       fileData.bytes.length == 1048576) {
      offset += fileData.bytes.length;
    } else {
      isPartial = false;
    }
  }

  dbPuts('images', [ images[key] ]);
};

const getInnerImagesSize = (image, size) => {
  const hasSizeS = image.sizes
    .findIndex(size => size.type == 's') > -1;
  const hasSizeM = image.sizes
    .findIndex(size => size.type == 'm') > -1;
  const hasSizeX = image.sizes
    .findIndex(size => size.type == 'x') > -1;
  const hasSizeY = image.sizes
    .findIndex(size => size.type == 'y') > -1;
  const hasSizeW = image.sizes
    .findIndex(size => size.type == 'w') > -1;

  let imageSizeType;
  if(size == 'm') {
    if(hasSizeX) imageSizeType = 'x';
    else if(hasSizeM) imageSizeType = 'm';
    else if(hasSizeS) imageSizeType = 's';
  }
  if(size == 'l') {
    if(hasSizeY) imageSizeType = 'y';
    else if(hasSizeW) imageSizeType = 'w';
    else if(hasSizeX) imageSizeType = 'x';
  }

  return image.sizes.find(size => size.type == imageSizeType);
};

const getImagePlaceholder = (photo, size) => {
  if(size == 'c') {
    const canvas = window.document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;

    return {
      url: canvas.toDataURL()
    };
  }

  const key = photo.id.toString();
  const image = images[key];

  const imageSize = getInnerImagesSize(image, size);
  if(!imageSize) return null;

  const canvas = window.document.createElement('canvas');
  canvas.width = imageSize.w;
  canvas.height = imageSize.h;

  return {
    url: canvas.toDataURL(),
    size: imageSize
  };
};

const getImage = async (photo, size) => {
  const key = photo.id.toString();

  const image = images[key];

  const imageSize = getInnerImagesSize(image, size);

  if(image.contents[size]) {
    return {
      isFull: true,
      url: URL.createObjectURL(new Blob([ image.contents[size] ], {
        type: 'image/jpeg'
      })),
      size: imageSize
    };
  }

  await loadImage(image, size);

  return getImage(photo, size);
};

export {
  isImageMessage,
  initImagesStore,
  putImages,
  getImagePlaceholder,
  getImage
};