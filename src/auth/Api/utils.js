/* global tgProto */

import { randomInt } from '../../helpers';

const uploadProfilePhoto = async inputFile => {
  return await tgProto.sendMethod('photos.uploadProfilePhoto', {
    file: inputFile
  });
};

const uploadFile = async bytes => {
  const isBigFile = bytes.length >= 10485760;

  let partSize = 262144;
  if(bytes.length > 67108864) partSize = 524288;
  else if(bytes.length < 102400) partSize = 32768;

  const totalParts = Math.ceil(bytes.length / partSize);

  const fileId = [ randomInt(0xFFFFFFFF), randomInt(0xFFFFFFFF) ];

  let part = 0;
  let offset = 0;

  const uploadMethod = isBigFile
    ? 'upload.saveBigFilePart'
    : 'upload.saveFilePart';

  while(part < totalParts) {
    await tgProto.sendMethod(uploadMethod, {
      file_id: fileId,
      file_part: part,
      file_total_parts: totalParts,
      bytes: bytes.slice(offset, offset + partSize)
    });

    offset += partSize;
    part++;
  }

  return {
    _: isBigFile ? 'inputFileBig' : 'inputFile',
    id: fileId,
    parts: totalParts,
    name: 'profile.jpg',
    md5_checksum: ''
  };
};

export {
  uploadProfilePhoto,
  uploadFile
};