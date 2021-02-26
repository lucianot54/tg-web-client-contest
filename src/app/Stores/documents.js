/* global tgProto, tgApp */

import {
  dbGetAll,
  dbPuts
} from '../db';

const isDocumentMessage = message => {
  if(!message.media) return false;
  if(message.media._ != 'messageMediaDocument') return false;
  if(message.media.document.attributes.length != 1) return false;
  if(message.media.document.attributes[0]._ != 'documentAttributeFilename') {
    return false;
  }

  return true;
};

let documents = {};

const initDocumentsStore = async () => {
  (await dbGetAll('documents')).forEach(document => {
    documents[document._key] = document;
  });
};

const putDocuments = messages => {
  const documentsToPut = [];

  messages.forEach(message => {
    if(!isDocumentMessage(message)) return;

    const document = message.media.document;
    const key = document.id.toString();

    const documentObj = {
      _key: key,
      id: document.id,
      access_hash: document.access_hash,
      ref: document.file_reference,
      type: document.mime_type,
      dcId: document.dc_id,
      name: document.attributes[0].file_name,
      size: document.size,
      contents: {}
    };

    if(!documents[key]) {
      documents[key] = documentObj;
      documentsToPut.push(documentObj);
    }
  });

  dbPuts('documents', documentsToPut);
};

const loadDocument = async document => {
  const key = document.id.toString();
  await tgApp.waitProtoInited();

  const documentObj = documents[key];

  if(documentObj.content) {
    return URL.createObjectURL(new Blob([ documentObj.content ], {
      type: documentObj.type
    }));
  }

  let isPartial = true;
  let offset = 0;

  while(isPartial) {
    const fileData = await tgProto.sendMethod('upload.getFile', {
      location: {
        _: 'inputDocumentFileLocation',
        id: documentObj.id,
        access_hash: documentObj.access_hash,
        file_reference: documentObj.ref,
        thumb_size: ''
      },
      offset: offset,
      limit: 1048576
    }, documentObj.dcId);

    documents[key].content = new Uint8Array([
      ... (documents[key].content || []),
      ... fileData.bytes
    ]);

    if(fileData.type._ == 'storage.filePartial' &&
       fileData.bytes.length == 1048576) {
      offset += fileData.bytes.length;
    } else {
      isPartial = false;
    }
  }

  dbPuts('documents', [ documents[key] ]);

  return URL.createObjectURL(new Blob([ documents[key].content ], {
    type: documents[key].type
  }));
};

const getDocument = document => {
  const key = document.id.toString();
  return documents[key];
};

export {
  isDocumentMessage,
  initDocumentsStore,
  putDocuments,
  loadDocument,
  getDocument
};