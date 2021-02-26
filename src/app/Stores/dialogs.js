/* global tgProto, tgApp */

import {
  dbGetAll,
  dbPuts,
  dbDelete
} from '../db';

import {
  getDialogs as getDialogsApi
} from '../Api/dialogs';

import {
  putMessages,
  getMessage,
  deleteMessage
} from './messages';

import {
  getPeerKey,
  putPeers,
  getPeer,
  updatePeerAccessHash
} from './peers';

let dialogs = {};

const typingTimeouts = {};

const initDialogsStore = async () => {
  (await dbGetAll('dialogs')).forEach(dialog => {
    dialogs[dialog._key] = dialog;
  });

  tgProto.onUpdate('updates', update => {
    putPeers(update.users);
    putPeers(update.chats);
  });

  tgProto.onUpdate('updates.channelDifferenceTooLong', async update => {
    putMessages(update.messages);
    putPeers(update.users);
    putPeers(update.chats);

    const dialog = Object.assign({}, update.dialog);
    const key = getPeerKey(dialog.peer);

    dialog._key = key;
    dialog._peer = getPeer(dialog.peer);
    dialog._message = await getMessage(dialog.peer, dialog.top_message);

    dialogs[key] = dialog;

    if(dialog.peer._ == 'peerChannel') {
      tgProto.addChannelUpdateState(getPeer(dialog.peer), dialog.pts);
    }

    saveDialog(dialog);

    callUpdateHandlers(dialog);

    updateDialogsSort(dialog.folder_id);
  });

  tgProto.onUpdate('updatesCombined', update => {
    putMessages(update.messages);
    putPeers(update.users);
    putPeers(update.chats);
  });

  tgProto.onUpdate('updateDeleteMessages', async update => {
    const dialogsToUpdates = Object.values(dialogs).filter(dialog => {
      return update.messages.includes(dialog.top_message);
    });

    const foldersToUpdate = [];

    for(let i = 0, l = dialogsToUpdates.length; i < l; i++) {
      const dialogToUpdate = dialogsToUpdates[i];
      const key = dialogToUpdate._key;
      const dialogPeer = dialogToUpdate._peer;

      let inputPeer;
      if(dialogPeer._ == 'user') {
        inputPeer = {
          _: 'inputPeerUser',
          user_id: dialogPeer.id,
          access_hash: dialogPeer.access_hash
        };
      } else {
        inputPeer = {
          _: 'inputPeerChat',
          chat_id: dialogPeer.id
        };
      }

      const peerDialogs = await tgProto.sendMethod('messages.getPeerDialogs', {
        peers: [ {
          _: 'inputDialogPeer',
          peer: inputPeer
        } ]
      });

      putMessages(peerDialogs.messages);
      putPeers(peerDialogs.users);
      putPeers(peerDialogs.chats);

      const newDialog = Object.assign({}, peerDialogs.dialogs[0]);

      if(!newDialog.top_message) {
        callDeleteHandlers(key);

        delete(dialogs[key]);
        dbDelete('dialogs', [ key ]);
      } else {
        newDialog._key = key;
        newDialog._peer = getPeer(newDialog.peer);
        newDialog._message =
          await getMessage(newDialog.peer, newDialog.top_message);
        newDialog._index = dialogs[key]._index;
        dialogs[key] = newDialog;

        saveDialog(newDialog);

        callUpdateHandlers(newDialog);
      }

      if(!foldersToUpdate.includes(newDialog.folder_id)) {
        foldersToUpdate.push(newDialog.folder_id);
      }
    }

    foldersToUpdate.forEach(folderId => {
      updateDialogsSort(folderId);
    });
  });

  tgProto.onUpdate('updateDeleteChannelMessages', async update => {
    let key = getPeerKey({ channel_id: update.channel_id });
    if(!dialogs[key]) return;

    const topMessage = dialogs[key].top_message;

    let isTopMessageDeleted = false;
    for(let i = 0, l = update.messages.length; i < l; i++) {
      if(update.messages[i] > topMessage) {
        if(!dialogs[key]._notHandleMessages) {
          dialogs[key]._notHandleMessages = {};
        }
        dialogs[key]._notHandleMessages[update.messages[i]] = true;
        return;
      }

      if(update.messages[i] == topMessage) {
        isTopMessageDeleted = true;
        break;
      }
    }

    if(isTopMessageDeleted) {
      const dialogPeer = dialogs[key]._peer;

      const resolvedPeer = await tgProto.sendMethod(
        'contacts.resolveUsername', {
          username: dialogPeer.username
        }
      );

      const accessHash = resolvedPeer.chats
        .find(chat => chat.id == dialogPeer.id)
        .access_hash;

      updatePeerAccessHash(dialogPeer, accessHash);

      const peerDialogs = await tgProto.sendMethod('messages.getPeerDialogs', {
        peers: [ {
          _: 'inputDialogPeer',
          peer: {
            _: 'inputPeerChannel',
            channel_id: dialogPeer.id,
            access_hash: accessHash
          }
        } ]
      });

      putMessages(peerDialogs.messages);
      putPeers(peerDialogs.users);
      putPeers(peerDialogs.chats);

      const newDialog = Object.assign({}, peerDialogs.dialogs[0]);
      newDialog._key = key;
      newDialog._peer = getPeer(newDialog.peer);
      newDialog._message =
        await getMessage(newDialog.peer, newDialog.top_message);
      newDialog._index = dialogs[key]._index;
      dialogs[key] = newDialog;

      saveDialog(newDialog);

      tgProto.addChannelUpdateState(newDialog._peer, newDialog.pts);

      callUpdateHandlers(newDialog);

      updateDialogsSort(newDialog.folder_id);
    }
  });

  tgProto.onUpdate('updateFolderPeers', update => {
    update.folder_peers.forEach(async folderPeer => {
      const key = getPeerKey(folderPeer.peer);
      if(!dialogs[key]) return;

      if(folderPeer.folder_id) {
        dialogs[key].folder_id = folderPeer.folder_id;
        callDeleteHandlers(key);

        saveDialog(dialogs[key]);
        updateDialogsSort(0);
      } else {
        dialogs[key].folder_id = folderPeer.folder_id;
        dialogs[key]._peer = getPeer(dialogs[key].peer);
        dialogs[key]._message =
          await getMessage(dialogs[key].peer, dialogs[key].top_message);
        callAddHandlers(dialogs[key]);

        saveDialog(dialogs[key]);
        updateDialogsSort(0);
      }
    });
  });

  tgProto.onUpdate('updateDialogUnreadMark', update => {
    const key = getPeerKey(update.peer.peer);
    if(!dialogs[key]) return;

    dialogs[key].unread_mark = !!update.unread;
    saveDialog(dialogs[key]);

    callUpdateHandlers(dialogs[key]);
  });

  tgProto.onUpdate('updateReadHistoryOutbox', update => {
    const key = getPeerKey(update.peer);
    if(!dialogs[key]) return;

    dialogs[key].read_outbox_max_id = update.max_id;
    saveDialog(dialogs[key]);

    callUpdateHandlers(dialogs[key]);
  });

  tgProto.onUpdate('updateReadHistoryInbox', update => {
    const key = getPeerKey(update.peer);
    if(!dialogs[key]) return;

    dialogs[key].read_inbox_max_id = update.max_id;
    dialogs[key].unread_count = update.still_unread_count;
    saveDialog(dialogs[key]);

    callUpdateHandlers(dialogs[key]);
  });

  tgProto.onUpdate('updateReadChannelOutbox', update => {
    const key = getPeerKey({ channel_id: update.channel_id });
    if(!dialogs[key]) return;

    dialogs[key].read_outbox_max_id = update.max_id;
    saveDialog(dialogs[key]);

    callUpdateHandlers(dialogs[key]);
  });

  tgProto.onUpdate('updateReadChannelInbox', update => {
    const key = getPeerKey({ channel_id: update.channel_id });
    if(!dialogs[key]) return;

    dialogs[key].read_inbox_max_id = update.max_id;
    dialogs[key].unread_count = update.still_unread_count;
    saveDialog(dialogs[key]);

    callUpdateHandlers(dialogs[key]);
  });

  tgProto.onUpdate('updateUserTyping', update => {
    const key = getPeerKey({ user_id: update.user_id });
    if(!dialogs[key]) return;

    if(typingTimeouts[key] > -1) clearTimeout(typingTimeouts[key]);

    dialogs[key]._isTyping = true;
    callUpdateHandlers(dialogs[key]);

    typingTimeouts[key] = setTimeout(() => {
      delete(typingTimeouts[key]);
      if(!dialogs[key]._isTyping) return;
      dialogs[key]._isTyping = false;
      callUpdateHandlers(dialogs[key]);
    }, 6000);
  });

  tgProto.onUpdate('updateChatUserTyping', update => {
    let key = getPeerKey({ chat_id: update.chat_id });
    if(!dialogs[key]) {
      key = getPeerKey({ channel_id: update.chat_id });
      if(!dialogs[key]) return;
    }

    const peer = getPeer({ user_id: update.user_id });
    if(!peer) return;

    const timeoutsKey = `${key}-${update.user_id}`;

    if(typingTimeouts[timeoutsKey] > -1) {
      clearTimeout(typingTimeouts[timeoutsKey]);
    }

    dialogs[key]._isTyping = true;

    if(!dialogs[key]._typingIds) {
      dialogs[key]._typingIds = [];
    }
    if(!dialogs[key]._typingIds.includes(update.user_id)) {
      dialogs[key]._typingIds.push(update.user_id);
    }

    callUpdateHandlers(dialogs[key]);

    typingTimeouts[timeoutsKey] = setTimeout(() => {
      if(dialogs[key]._typingIds) {
        dialogs[key]._typingIds = dialogs[key]._typingIds.filter(id => {
          return id != update.user_id;
        });
      }

      if(!dialogs[key]._typingIds || !dialogs[key]._typingIds.length) {
        dialogs[key]._isTyping = false;
        delete(dialogs[key]._typingNames);
      }

      callUpdateHandlers(dialogs[key]);
      delete(typingTimeouts[timeoutsKey]);
    }, 6000);
  });

  tgProto.onUpdate('updateChannel', async update => {
    let key = getPeerKey({ channel_id: update.channel_id });

    if(!dialogs[key]) {
      const peer = getPeer({ channel_id: update.channel_id });

      const peerDialogs = await tgProto.sendMethod('messages.getPeerDialogs', {
        peers: [ {
          _: 'inputDialogPeer',
          peer: {
            _: 'inputPeerChannel',
            channel_id: peer.id,
            access_hash: peer.access_hash
          }
        } ]
      });

      if(peerDialogs.messages) putMessages(peerDialogs.messages);
      if(peerDialogs.users) putPeers(peerDialogs.users);
      if(peerDialogs.chats) putPeers(peerDialogs.chats);

      if(!peerDialogs.dialogs || !peerDialogs.dialogs.length) return;

      const newDialog = Object.assign({}, peerDialogs.dialogs[0]);
      newDialog._key = key;
      newDialog._peer = getPeer(newDialog.peer);
      newDialog._message =
        await getMessage(newDialog.peer, newDialog.top_message);
      newDialog._index = 0;
      dialogs[key] = newDialog;

      tgProto.addChannelUpdateState(newDialog._peer, newDialog.pts);
      saveDialog(newDialog);

      callAddHandlers(newDialog);

      updateDialogsSort(newDialog.folder_id);

      return;
    }

    if(dialogs[key]._peer.left) {
      tgProto.addChannelUpdateState(dialogs[key]._peer, null);
      callDeleteHandlers(key);
      updateDialogsSort(dialogs[key]._peer.folder_id);

      delete(dialogs[key]);
      dbDelete('dialogs', [ key ]);
    }
  });
};

const updateDialogsSortInner = folderId => {
  return Object.values(dialogs)
    .filter(dialog => {
      const activeCond = dialog._peer && !dialog._peer.deactivated;
      const folderCond = folderId
        ? dialog.folder_id == folderId
        : !dialog.folder_id;
      const hasMessageCond = !!dialog.top_message;
      const noLeftCond = dialog._peer && !dialog._peer.left;

      return activeCond && folderCond && hasMessageCond && noLeftCond;
    })
    .sort((a, b) => {
      const aDate = a._peer._ == 'channel'
        ? Math.max(a._message.date, a._peer.date)
        : a._message.date;
      const bDate = b._peer._ == 'channel'
        ? Math.max(b._message.date, b._peer.date)
        : b._message.date;

      if(aDate > bDate) return -1;
      if(aDate < bDate) return 1;
      return 0;
    })
    .map((dialog, index) => {
      dialogs[dialog._key]._index = index;
      callUpdateHandlers(dialogs[dialog._key]);
    });
};

let updateDialogsSortTimeout = 0;

const updateDialogsSort = folderId => {
  clearTimeout(updateDialogsSortTimeout);

  updateDialogsSortTimeout = setTimeout(() => {
    updateDialogsSortInner(folderId);
  }, 100);
};

const saveDialog = dialog => {
  const dialogCopy = Object.assign({}, dialog);
  delete(dialogCopy._peer);
  delete(dialogCopy._message);
  delete(dialogCopy._index);
  delete(dialogCopy._isTyping);
  delete(dialogCopy._typingIds);
  delete(dialogCopy._notHandleMessages);

  dbPuts('dialogs', [ dialogCopy ]);
};

const getDialogs = async folderId => {
  let filteredDialogs = Object.values(dialogs)
    .filter(dialog => {
      const folderCond = folderId
        ? dialog.folder_id == folderId
        : !dialog.folder_id;
      const hasMessageCond = !!dialog.top_message;

      return folderCond && hasMessageCond;
    });

  for(let i = 0, l = filteredDialogs.length; i < l; i++) {
    const dialog = filteredDialogs[i];

    dialog._peer = dialogs[dialog._key]._peer = getPeer(dialog.peer);
    dialog._message = dialogs[dialog._key]._message =
      await getMessage(dialog.peer, dialog.top_message);

    filteredDialogs[i] = dialog;
  }

  return filteredDialogs
    .filter(dialog => {
      const activeCond = dialog._peer && !dialog._peer.deactivated;
      const noLeftCond = dialog._peer && !dialog._peer.left;

      return activeCond && noLeftCond;
    })
    .sort((a, b) => {
      const aDate = a._peer._ == 'channel'
        ? Math.max(a._message.date, a._peer.date)
        : a._message.date;
      const bDate = b._peer._ == 'channel'
        ? Math.max(b._message.date, b._peer.date)
        : b._message.date;

      if(aDate > bDate) return -1;
      if(aDate < bDate) return 1;
      return 0;
    })
    .map((dialog, index) => {
      dialog._index = dialogs[dialog._key]._index = index;
      return dialog;
    });
};

const loadDialogs = async () => {
  const {
    dialogs: dialogsResponse,
    messages, users, chats
  } = await getDialogsApi();

  putMessages(messages);
  putPeers(users);
  putPeers(chats);

  dialogsResponse.forEach(dialog => {
    const key = getPeerKey(dialog.peer);
    dialog._key = key;
    dialogs[key] = dialog;

    if(dialog.peer._ == 'peerChannel') {
      tgProto.addChannelUpdateState(getPeer(dialog.peer), dialog.pts);
    }
  });

  dbPuts('dialogs', Object.values(dialogs));
};

const updateDialogPeer = peer => {
  const key = getPeerKey(peer);
  if(!dialogs[key]) return;

  dialogs[key]._peer = peer;
  callUpdateHandlers(dialogs[key]);
};

const updateDialogRead = (peer, maxId) => {
  const key = getPeerKey(peer);
  if(!dialogs[key]) return;

  dialogs[key].read_inbox_max_id = maxId;
  dialogs[key].unread_count = 0;
  saveDialog(dialogs[key]);

  callUpdateHandlers(dialogs[key]);
};

const updateDialogMessage = async (message, isUpdate) => {
  let peer = message.to_id;
  if(message.to_id.user_id && message.to_id.user_id == tgApp.userId) {
    peer = { user_id: message.from_id };
  }
  const key = getPeerKey(peer);

  if(!dialogs[key]) {
    const peerDialogs = await tgProto.sendMethod('messages.getDialogs', {
      offset_date: message.date + 1,
      offset_id: 0,
      offset_peer: {
        _: 'inputPeerEmpty'
      },
      limit: 5,
      hash: 0
    });

    if(!dialogs[key]) {
      putMessages(peerDialogs.messages);
      putPeers(peerDialogs.users);
      putPeers(peerDialogs.chats);

      const newDialog = Object.assign(
        {},
        peerDialogs.dialogs
          .find(dialog => dialog.peer.user_id == message.user_id)
      );
      newDialog._key = key;
      newDialog._peer = getPeer(newDialog.peer);
      newDialog._message =
        await getMessage(newDialog.peer, newDialog.top_message);
      newDialog._index = 0;
      dialogs[key] = newDialog;

      saveDialog(newDialog);

      callAddHandlers(newDialog);

      updateDialogsSort(newDialog.folder_id);

      return;
    }
  }

  const notHandleMessages = dialogs[key]._notHandleMessages;
  if(notHandleMessages && notHandleMessages[message.id]) {
    delete(dialogs[key]._notHandleMessages[message.id]);
    deleteMessage(dialogs[key].peer, message.id);
    return;
  }

  if(message._ == 'messageService' &&
     message.action._ == 'messageActionChatDeleteUser' &&
     message.action.user_id == tgApp.userId) {
    const folderId = dialogs[key].folder_id;
    callDeleteHandlers(key);
    delete(dialogs[key]);
    dbDelete('dialogs', [ key ]);
    updateDialogsSort(folderId);
    return;
  }

  if(isUpdate) {
    if(dialogs[key].top_message != message.id) return;

    dialogs[key]._message = message;
    callUpdateHandlers(dialogs[key]);
    updateDialogsSort(dialogs[key].folder_id);
    return;
  }

  if(dialogs[key].top_message == message.id) return;

  deleteMessage(dialogs[key].peer, dialogs[key].top_message);

  dialogs[key].top_message = message.id;
  dialogs[key].unread_mark = false;
  if(!message.out) dialogs[key].unread_count += 1;
  saveDialog(dialogs[key]);

  dialogs[key]._message = message;
  dialogs[key]._isTyping = false;

  callUpdateHandlers(dialogs[key]);

  updateDialogsSort(dialogs[key].folder_id);
};

const handlers = {
  add: [],
  update: [],
  delete: []
};

const callAddHandlers = dialog => {
  handlers.add.forEach(handler => {
    handler(dialog);
  });
};

const callUpdateHandlers = dialog => {
  handlers.update.forEach(handler => {
    handler(dialog);
  });
};

const callDeleteHandlers = key => {
  handlers.delete.forEach(handler => {
    handler(key);
  });
};

const onDialog = (type, handler) => {
  handlers[type].push(handler);
};

export {
  initDialogsStore,
  getDialogs,
  loadDialogs,
  updateDialogPeer,
  updateDialogMessage,
  updateDialogRead,
  onDialog
};