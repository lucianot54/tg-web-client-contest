/* global tgProto, tgApp */

import {
  dbGetAll,
  dbPuts,
  dbDelete
} from '../db';

import {
  updateDialogMessage
} from './dialogs';

import {
  getPeerKey,
  getPeer
} from './peers';

import {
  putStickers
} from './stickers';

import {
  putImages
} from './images';

import {
  putDocuments
} from './documents';

let messages = {};

const getMessageKey = (message, peer, messageId) => {
  if(peer) return `${getPeerKey(peer)}-${messageId}`;

  peer = message.to_id;

  if(message.to_id.user_id && message.to_id.user_id == tgApp.userId) {
    peer = { user_id: message.from_id };
  }

  return `${getPeerKey(peer)}-${message.id}`;
};

const initMessagesStore = async () => {
  (await dbGetAll('messages')).forEach(message => {
    messages[message._key] = message;
  });

  tgProto.onUpdate('updateNewMessage', async update => {
    const message = update.message;
    const key = getMessageKey(message);
    message._key = key;

    messages[key] = message;
    dbPuts('messages', [ message ]);

    putStickers([ message ]);
    putImages([ message ]);
    putDocuments([ message ]);

    await updateDialogMessage(message);
  });

  tgProto.onUpdate('updateNewChannelMessage', async update => {
    const message = update.message;
    const key = getMessageKey(message);
    message._key = key;

    messages[key] = message;
    dbPuts('messages', [ message ]);

    putStickers([ message ]);
    putImages([ message ]);
    putDocuments([ message ]);

    await updateDialogMessage(message);
  });

  tgProto.onUpdate('updateEditMessage', update => {
    const message = update.message;
    const key = getMessageKey(message);
    message._key = key;

    messages[key] = message;
    dbPuts('messages', [ message ]);

    putStickers([ message ]);
    putImages([ message ]);
    putDocuments([ message ]);

    updateDialogMessage(message, true);
  });

  tgProto.onUpdate('updateEditChannelMessage', update => {
    const message = update.message;
    const key = getMessageKey(message);
    message._key = key;

    messages[key] = message;
    dbPuts('messages', [ message ]);

    putStickers([ message ]);
    putImages([ message ]);
    putDocuments([ message ]);

    updateDialogMessage(message, true);
  });
};

const putMessages = async messagesParams => {
  const messagesToPut = [];

  messagesParams.forEach(message => {
    let key = getMessageKey(message);
    message._key = key;

    if(!messages[key]) messagesToPut.push(message);
    messages[key] = message;
  });

  dbPuts('messages', messagesToPut);
};

const getMessage = async (peer, messageId) => {
  const dbMessage = messages[getMessageKey(null, peer, messageId)];
  if(dbMessage) return dbMessage;

  let updatedMessages;

  if(peer._ == 'peerChannel') {
    const fullPeer = getPeer(peer);

    updatedMessages = await tgProto.sendMethod('channels.getMessages', {
      channel: {
        _: 'inputChannel',
        channel_id: peer.channel_id,
        access_hash: fullPeer.access_hash
      },
      id: [ { _: 'inputMessageID', id: messageId } ]
    });
  } else {
    updatedMessages = await tgProto.sendMethod('messages.getMessages', {
      id: [ { _: 'inputMessageID', id: messageId } ]
    });
  }

  putMessages(updatedMessages.messages);

  return getMessage(peer, messageId);
};

const deleteMessage = (peer, messageId) => {
  const key = getMessageKey(null, peer, messageId);
  delete(messages[key]);
  dbDelete('messages', [ key ]);
};

const updateTopMessage = message => {
  message = Object.assign({}, message);
  const key = getMessageKey(message);
  message._key = key;

  messages[key] = message;
  dbPuts('messages', [ message ]);

  updateDialogMessage(message);
};

export {
  initMessagesStore,
  putMessages,
  getMessage,
  deleteMessage,
  updateTopMessage
};