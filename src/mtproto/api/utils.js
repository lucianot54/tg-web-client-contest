import {
  send
} from '../transport';

import {
  randomInt
} from '../bin';

import {
  serializeMethod
} from '../tl';

import {
  deferred
} from '../../helpers/utils';

const utils = {};

utils.uploadProfilePhoto = inputFile => {
  return send(serializeMethod('photos.uploadProfilePhoto', {
    file: inputFile
  }));
};

utils.uploadFile = file => {
  const defer = deferred();

  let doneParts = 0;

  const isBigFile = file.size >= 10485760;

  let partSize = 262144;
  if(file.size > 67108864) partSize = 524288;
  else if(file.size < 102400) partSize = 32768;

  const totalParts = Math.ceil(file.size / partSize);

  const fileId = [ randomInt(0xFFFFFFFF), randomInt(0xFFFFFFFF) ];

  const resultInputFile = {
    _: isBigFile ? 'inputFileBig' : 'inputFile',
    id: fileId,
    parts: totalParts,
    name: file.name,
    md5_checksum: ''
  };

  let part = 0;
  let offset = 0;

  const uploadFilePart = () => {
    const reader = new FileReader();
    const blob = file.slice(offset, offset + partSize);

    reader.onloadend = () => {
      send(serializeMethod(isBigFile ? 'upload.saveBigFilePart' : 'upload.saveFilePart', {
        file_id: fileId,
        file_part: part,
        file_total_parts: totalParts,
        bytes: reader.result
      }))
      .then(result => {
        offset += partSize;
        part++;

        if(part >= totalParts) defer.resolve(resultInputFile);
        else uploadFilePart();
      });
    };

    reader.readAsArrayBuffer(blob);
  };
  uploadFilePart();

  return defer.promise;
};

export { utils };