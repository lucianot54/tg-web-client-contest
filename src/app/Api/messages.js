/* global tgProto */

import {
  updateDialogRead
} from '../Stores/dialogs';

import {
  updateTopMessage
} from '../Stores/messages';

import {
  putPeers,
  updatePeerAccessHash
} from '../Stores/peers';

import {
  putStickers
} from '../Stores/stickers';

import {
  putImages
} from '../Stores/images';

import {
  putDocuments
} from '../Stores/documents';

const getMessages = async (peer, offsetId) => {
  offsetId = offsetId || 0;

  let inputPeer;

  if(peer._ == 'inputPeerSelf') {
    inputPeer = peer;
  }
  if(peer._ == 'user') {
    inputPeer = {
      _: 'inputPeerUser',
      user_id: peer.id,
      access_hash: peer.access_hash
    };
  }
  if(peer._ == 'chat') {
    inputPeer = {
      _: 'inputPeerChat',
      chat_id: peer.id
    };
  }
  if(peer._ == 'channel') {
    inputPeer = {
      _: 'inputPeerChannel',
      channel_id: peer.id,
      access_hash: peer.access_hash
    };
  }

  const messages = await tgProto.sendMethod('messages.getHistory', {
    peer: inputPeer,
    offset_id: offsetId,
    offset_date: 0,
    add_offset: 0,
    limit: 50,
    max_id: 0,
    min_id: 0,
    hash: 0
  });

  if(messages.error_code == 400) {
    const resolvedPeer = await tgProto.sendMethod(
      'contacts.resolveUsername', {
        username: peer.username
      }
    );

    const accessHash = resolvedPeer.chats
      .find(chat => chat.id == peer.id)
      .access_hash;
    peer.access_hash = accessHash;

    updatePeerAccessHash(peer, accessHash);

    return getMessages(peer, offsetId);
  }

  putPeers(messages.users);
  putPeers(messages.chats);

  putStickers(messages.messages);
  putImages(messages.messages);
  putDocuments(messages.messages);

  if(offsetId == 0) {
    updateTopMessage(messages.messages[0]);
    const maxId = messages.messages[0].id;
    readHistory(peer, maxId);
  }

  return messages.messages;
};

const searchMessages = async (query, peer, filter) => {
  let inputPeer;

  if(peer._ == 'inputPeerSelf') {
    inputPeer = peer;
  }
  if(peer._ == 'user') {
    inputPeer = {
      _: 'inputPeerUser',
      user_id: peer.id,
      access_hash: peer.access_hash
    };
  }
  if(peer._ == 'chat') {
    inputPeer = {
      _: 'inputPeerChat',
      chat_id: peer.id
    };
  }
  if(peer._ == 'channel') {
    inputPeer = {
      _: 'inputPeerChannel',
      channel_id: peer.id,
      access_hash: peer.access_hash
    };
  }

  let filterConstr = {
    _: 'inputMessagesFilterEmpty'
  };
  if(filter == 'photos') {
    filterConstr = {
      _: 'inputMessagesFilterPhotos'
    };
  }
  if(filter == 'documents') {
    filterConstr = {
      _: 'inputMessagesFilterDocument'
    };
  }

  const messages = await tgProto.sendMethod('messages.search', {
    peer: inputPeer,
    q: query,
    filter: filterConstr,
    max_date: 0,
    min_date: 0,
    offset_id: 0,
    add_offset: 0,
    limit: 50,
    max_id: 0,
    min_id: 0,
    hash: 0
  });

  if(messages.error_code == 400) {
    const resolvedPeer = await tgProto.sendMethod(
      'contacts.resolveUsername', {
        username: peer.username
      }
    );

    const accessHash = resolvedPeer.chats
      .find(chat => chat.id == peer.id)
      .access_hash;
    peer.access_hash = accessHash;

    updatePeerAccessHash(peer, accessHash);

    return searchMessages(query, peer);
  }

  putPeers(messages.users);
  putPeers(messages.chats);

  putStickers(messages.messages);
  putImages(messages.messages);
  putDocuments(messages.messages);

  return messages.messages;
};

const readHistory = (peer, maxId) => {
  if(peer._ == 'channel') {
    tgProto.sendMethod('channels.readHistory', {
      channel: {
        _: 'inputPeerChannel',
        channel_id: peer.id,
        access_hash: peer.access_hash
      },
      max_id: maxId
    });
  } else {
    let inputPeer;
    if(peer._ == 'inputPeerSelf') {
      inputPeer = peer;
    }
    if(peer._ == 'user') {
      inputPeer = {
        _: 'inputPeerUser',
        user_id: peer.id,
        access_hash: peer.access_hash
      };
    }
    if(peer._ == 'chat') {
      inputPeer = {
        _: 'inputPeerChat',
        chat_id: peer.id
      };
    }

    tgProto.sendMethod('messages.readHistory', {
      peer: inputPeer,
      max_id: maxId
    }).then(affectedMessages => {
      tgProto.setMainPts(affectedMessages.pts);
    });
  }

  updateDialogRead(peer, maxId);
};

export {
  getMessages,
  readHistory,
  searchMessages
};