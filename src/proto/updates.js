/* global tgMain, tgProto, tgApp */

import {
  sleep
} from '../helpers';

import {
  serializeMethod
} from './tl';

import {
  send
} from './transport';

let isHandleUpdates = {
  main: false
};

let getUpdatesTimeout;

let updateState;
let updateChannelsState = {};

const saveState = () => {
  tgMain.setStorage('us', JSON.stringify(updateState));
  tgMain.setStorage('uc', JSON.stringify(updateChannelsState));
};

const clearUpdateState = () => {
  isHandleUpdates = {
    main: false
  };
  updateState = null;
  updateChannelsState = null;
};

const initUpdates = async () => {
  const updateStateString = tgMain.getStorage('us');

  if(!updateStateString) {
    const updatesStateRes = await send(serializeMethod('updates.getState'));

    updateState = {};
    updateState.pts = updatesStateRes.pts;
    updateState.qts = updatesStateRes.qts;
    updateState.seq = updatesStateRes.seq;
    updateState.date = updatesStateRes.date;

    updateChannelsState = {};

    saveState();
    isHandleUpdates.main = true;
    getUpdatesTimeout = setTimeout(getUpdates, 900000);

    return;
  }

  updateState = JSON.parse(updateStateString);
  updateChannelsState = JSON.parse(tgMain.getStorage('uc'));

  isHandleUpdates.main = true;
  Object.keys(updateChannelsState).forEach(key => {
    isHandleUpdates[key] = true;
  });

  await getUpdates();
};

const addChannelUpdateState = (peer, pts) => {
  if(!peer) return;

  if(pts === null) {
    delete(updateChannelsState[peer.id]);
  } else {
    updateChannelsState[peer.id] = {
      pts,
      ah: peer.access_hash
    };
  }

  saveState();
};

const setMainPts = pts => {
  updateState.pts = pts;
  saveState();
};

let sendedPeer;
let sendedMessage;
let sendedMedia;

const getRandomId = () => {
  return [
    Math.random() * (2147483647 + 2147483648) - 2147483648,
    Math.random() * (2147483647 + 2147483648) - 2147483648
  ];
};

const sendMessage = (peer, message, media) => {
  sendedPeer = peer;
  sendedMessage = message;
  sendedMedia = media;

  if(!media) {
    tgProto.sendMethod('messages.sendMessage', {
      message: message,
      random_id: getRandomId(),
      peer: peer
    });
  } else {
    tgProto.sendMethod('messages.sendMedia', {
      message: message,
      random_id: getRandomId(),
      peer: peer,
      media: media
    });
  }
};

const getUpdatesChannel = async channelId => {
  if(!isHandleUpdates[channelId]) return;
  isHandleUpdates[channelId] = false;

  const updatesDiff = await send(serializeMethod(
    'updates.getChannelDifference', {
      channel: {
        _: 'inputChannel',
        channel_id: channelId,
        access_hash: updateChannelsState[channelId].ah
      },
      pts: updateChannelsState[channelId].pts,
      filter: {
        _: 'channelMessagesFilterEmpty'
      },
      limit: 20
    }
  ));

  if(updatesDiff._ == 'rpc_error') {
    await sleep(500);
    updateChannelsState[channelId].pts--;
    saveState();
    isHandleUpdates[channelId] = true;
    return getUpdatesChannel(channelId);
  }

  if(updatesDiff.pts) updateChannelsState[channelId].pts = updatesDiff.pts;
  saveState();

  if(updatesDiff._ == 'updates.channelDifferenceEmpty') {
    isHandleUpdates[channelId] = true;
    return;
  }

  if(updatesDiff._ == 'updates.channelDifferenceTooLong') {
    isHandleUpdates[channelId] = true;

    updateChannelsState[channelId].pts = updatesDiff.dialog.pts;
    saveState();

    callUpdateHandlers(updatesDiff);

    return;
  }

  const updates = updatesDiff.other_updates;
  updatesDiff.new_messages.forEach(newMessage => {
    updates.push({
      _: 'updateNewChannelMessage',
      message: newMessage
    });
  });

  isHandleUpdates[channelId] = true;
  handleUpdates({
    _: 'updates',
    users: updatesDiff.users,
    chats: updatesDiff.chats,
    updates
  }, true);
};

const getUpdatesMain = async () => {
  if(!isHandleUpdates.main) return;
  isHandleUpdates.main = false;

  const updatesDiff = await send(serializeMethod(
    'updates.getDifference', updateState
  ));

  if(updatesDiff.pts) updateState.pts = updatesDiff.pts;
  if(updatesDiff.date) updateState.date = updatesDiff.date;
  if(updatesDiff.seq) updateState.seq = updatesDiff.seq;
  saveState();

  if(updatesDiff._ == 'updates.differenceEmpty') {
    isHandleUpdates.main = true;
    return;
  }

  if(updatesDiff._ == 'updates.differenceTooLong') {
    isHandleUpdates.main = true;
    getUpdatesMain();
    return;
  }

  callUpdateHandlers(updatesDiff);

  const newState = updatesDiff.intermediate_state || updatesDiff.state;
  updateState.pts = newState.pts;
  updateState.qts = newState.qts;
  if(newState.seq) updateState.seq = newState.seq;
  updateState.date = newState.date;
  saveState();

  const updates = updatesDiff.other_updates;
  updatesDiff.new_messages.forEach(newMessage => {
    updates.push({
      _: 'updateNewMessage',
      message: newMessage
    });
  });
  updatesDiff.new_encrypted_messages.forEach(newEncryptedMessage => {
    updates.push({
      _: 'updateNewEncryptedMessage',
      message: newEncryptedMessage
    });
  });

  isHandleUpdates.main = true;
  handleUpdates({
    _: 'updates',
    users: updatesDiff.users,
    chats: updatesDiff.chats,
    updates
  }, true);

  if(updatesDiff._ == 'updates.differenceSlice') getUpdatesMain();
};

const getUpdates = async () => {
  await getUpdatesMain();

  if(updateChannelsState) {
    Object.keys(updateChannelsState).forEach(key => {
      getUpdatesChannel(parseInt(key));
    });
  }
};

const handleUpdates = (updates, skipChecking) => {
  if(!isHandleUpdates.main) return;

  clearTimeout(getUpdatesTimeout);
  getUpdatesTimeout = setTimeout(getUpdates, 900000);

  if(updates._ == 'updatesTooLong') {
    getUpdates();
    return;
  }

  if(updates._ == 'updateShortMessage' ||
     updates._ == 'updateShortChatMessage') {
    const message = Object.assign({}, updates);
    message._ = 'message';
    message.from_id = updates.from_id
      ? updates.from_id
      : updates.out
        ? tgApp.userId
        : updates.user_id;

    message.to_id = {
      _: updates._ == 'updateShortChatMessage' ? 'peerChat' : 'peerUser',
      _type: 'Peer'
    };

    if(updates._ == 'updateShortChatMessage') {
      message.to_id.chat_id = updates.chat_id;
    }
    else message.to_id.user_id = updates.out ? updates.user_id : tgApp.userId;

    updates = {
      _: 'updateShort',
      date: message.date,
      update: {
        _: 'updateNewMessage',
        message: message,
        pts: updates.pts,
        pts_count: updates.pts_count
      }
    };
  }

  if(updates._ == 'updateShortSentMessage') {
    const message = Object.assign({}, updates);
    message._ = 'message';

    message.to_id = sendedPeer;
    message.message = sendedMessage;

    updates = {
      _: 'updateShort',
      date: message.date,
      update: {
        _: 'updateNewMessage',
        message: message,
        pts: updates.pts,
        pts_count: updates.pts_count
      }
    };
  }

  if(updates._ == 'updateShort') {
    const update = updates.update;
    const applyResult = applyState(update);
    if(applyResult == 'fill') {
      if(update._ && update._.includes('Channel')) {
        let channelId = update.channel_id;
        if(!channelId) {
          const peer = update.message.to_id;
          channelId = peer.chat_id || peer.channel_id;
        }
        getUpdatesChannel(channelId);
      }
      else getUpdatesMain();
      return;
    }
    if(applyResult == 'skip') return;

    updateState.date = updates.date;
    saveState();

    callUpdateHandlers(updates.update);
    return;
  }

  callUpdateHandlers(updates);

  if(skipChecking) {
    updates.updates.forEach(update => {
      applyState(update, true);
      callUpdateHandlers(update);
    });

    return;
  }

  const updatesToHandle = [];

  updates.updates = updates.updates.sort((a, b) => {
    const aHasSome = a.pts || a.qts;
    const bHasSome = b.pts || b.qts;

    if(!aHasSome && !bHasSome) return 0;
    if(aHasSome && !bHasSome) return 1;
    if(!aHasSome && bHasSome) return -1;

    if(a.qts && b.qts) {
      if(a.qts < b.qts) return -1;
      if(a.qts > b.qts) return 1;
      return 0;
    }

    if(a.pts && b.pts) {
      if(a.pts < b.pts) return -1;
      if(a.pts > b.pts) return 1;

      if(!a.pts_count && b.pts_count) return 1;
      if(a.pts_count && !b.pts_count) return -1;

      return 0;
    }

    return 0;
  });

  for(let i = 0, l = updates.updates.length; i < l; i++) {
    const update = updates.updates[i];

    const applyResult = applyState(update);
    if(applyResult == 'fill') {
      if(update._ && update._.includes('Channel')) {
        let channelId = update.channel_id;
        if(!channelId) {
          const peer = update.message.to_id;
          channelId = peer.chat_id || peer.channel_id;
        }
        getUpdatesChannel(channelId);
      }
      else getUpdatesMain();
      return;
    }
    if(applyResult == 'skip') continue;

    updatesToHandle.push(update);
  }

  const seqStart = updates.seq_start || updates.seq;
  if(seqStart) {
    const newLocalSeq = updateState.seq + 1;

    if(newLocalSeq > seqStart) return;
    if(newLocalSeq < seqStart) {
      getUpdates();
      return;
    }
  }

  updatesToHandle.forEach(update => {
    callUpdateHandlers(update);
  });

  if(updates.seq) updateState.seq = updates.seq;
  updateState.date = updates.date;
  saveState();
};

const applyState = (state, skipChecking) => {
  const qts = state.qts;
  if(qts) {
    const newLocalQts = updateState.qts + 1;

    if(skipChecking) {
      if(updateState.qts < newLocalQts) updateState.qts = newLocalQts;
    } else {
      if(newLocalQts > qts) return 'skip';
      if(newLocalQts < qts) return 'fill';

      updateState.qts = newLocalQts;
    }
  }

  // Учесть обновления каналов, обновлять и сравнивать их pts

  const pts = state.pts;
  if(pts) {
    if(state._ && state._.includes('Channel')) {
      let channelId = state.channel_id;
      if(!channelId) {
        const peer = state.message.to_id;
        channelId = peer.chat_id || peer.channel_id;
      }

      if(!updateChannelsState[channelId]) return 'skip';

      const ptsCount = state.pts_count || 0;

      const newLocalPts = updateChannelsState[channelId].pts + ptsCount;

      if(skipChecking) {
        if(updateChannelsState[channelId].pts < newLocalPts) {
          updateChannelsState[channelId].pts = newLocalPts;
        }
      } else {
        if(newLocalPts > pts) return 'skip';
        if(newLocalPts < pts) return 'fill';

        updateChannelsState[channelId].pts = pts;
      }
    } else {
      const ptsCount = state.pts_count || 0;

      const newLocalPts = updateState.pts + ptsCount;

      if(skipChecking) {
        if(updateState.pts < newLocalPts) {
          updateState.pts = newLocalPts;
        }
      } else {
        if(newLocalPts > pts) return 'skip';
        if(newLocalPts < pts) return 'fill';

        updateState.pts = pts;
      }
    }
  }

  return 'ok';
};

let handlers = {};

const onUpdate = (type, handler) => {
  if(!handlers[type]) handlers[type] = [];
  handlers[type].push(handler);
};

const callUpdateHandlers = async update => {
  if(!handlers[update._]) return;

  for(let i = 0, l = handlers[update._].length; i < l; i++) {
    await handlers[update._][i](update);
  }
};

onUpdate('updatePtsChanged', () => {
  tgMain.setStorage('us', null);
  isHandleUpdates.main = false;
  initUpdates();
});

onUpdate('updateChannelTooLong', update => {
  if(update.pts) {
    updateChannelsState[update.channel_id].pts = update.pts;
    saveState();
  }
  getUpdatesChannel(update.channel_id);
});

export {
  initUpdates,
  clearUpdateState,
  getUpdates,
  handleUpdates,
  addChannelUpdateState,
  setMainPts,
  onUpdate,
  sendMessage
};