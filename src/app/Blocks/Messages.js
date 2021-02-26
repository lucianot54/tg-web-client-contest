/* global tgProto, tgApp */

import {
  bindRefs,
  on,
  sleep,
  getInfoTimeFormatted,
  getEmptyPhotoColor,
  formatInfoNumber
} from '../../helpers';

import {
  getPeerKey,
  updatePeerAccessHash
} from '../Stores/peers';

import {
  getPhoto
} from '../Stores/photos';

import {
  getMessages,
  readHistory
} from '../Api/messages';

const getStartDayDate = unix => {
  const date = new Date(unix * 1000);
  date.setHours(0, 0, 0, 0);
  return date.toString();
};

const getPeerFull = async peer => {
  let peerFull;

  if(peer._ == 'user') {
    peerFull = await tgProto.sendMethod('users.getFullUser', {
      id: {
        _: 'inputUser',
        user_id: peer.id,
        access_hash: peer.access_hash
      }
    });
  }
  else if(peer._ == 'chat') {
    peerFull = (await tgProto.sendMethod('messages.getFullChat', {
      chat_id: peer.id
    })).full_chat;
  }
  else {
    const peerFullRes = await tgProto.sendMethod('channels.getFullChannel', {
      channel: {
        _: 'inputChannel',
        channel_id: peer.id,
        access_hash: peer.access_hash
      }
    });

    if(peerFullRes.full_chat) {
      peerFull = peerFullRes.full_chat;
    } else {
      const resolvedPeer = await tgProto.sendMethod(
        'contacts.resolveUsername', {
          username: peer.username
        }
      );

      const accessHash = resolvedPeer.chats
        .find(chat => chat.id == peer.id)
        .access_hash;

      updatePeerAccessHash(peer, accessHash);

      return getPeerFull(peer);
    }
  }

  return peerFull;
};

class BlockMessagesElement extends HTMLElement {
  constructor() {
    super();

    this._peer = null;
    this._peerKey = null;
    this._loaderHideTimeout = 0;
    this._isReceiveMessages = false;
    this._messages = {};
    this._messagesObjects = [];
    this._messageToAdd = [];
    this._scrollValue = 1;
    this._scrollValuePx = 0;
    this._maxReadedId = 0;
    this._readOutMaxId = 0;
    this._hasMessagesToLoad = true;
    this._isLoadingAddit = false;
  }

  connectedCallback() {
    this.className = 'app_messages';

    this.innerHTML =
     `<div class="messages-bg messages-bg__default"></div>
      <div class="messages-wrapper" ref="wrapper">
        <div class="messages-header">
          <div class="messages-header_peer" ref="headerPeer">
            <div class="messages-header_photo" ref="headerPhoto">
              <div class="messages-header_photo-text"
                   ref="headerPhotoText"></div>
              <img class="messages-header_photo-image" ref="headerPhotoImage">
            </div>
            <div class="messages-header_info">
              <div class="messages-header_name" ref="headerName"></div>
              <div class="messages-header_desc" ref="headerDesc"></div>
            </div>
          </div>
          <div class="messages-header_actions">
            <tg-button icon="search"
                       ref="headerSearch"></tg-button>
          </div>
        </div>
        <tg-scroll ref="scroll" no-scroll-update offset-side="8"
                   offset-top="8" offset-bottom="10">
          <div class="messages-fill"></div>
          <div class="messages-list" ref="list"></div>
        </tg-scroll>
        <div class="messages-form" ref="form">
          <tg-send ref="send"></tg-send>
        </div>
      </div>
      <div class="messages-loader" ref="loader">
        <tg-loader big thin></tg-loader>
      </div>`;

    bindRefs(this);

    on(this._$send, 'itInput', () => {
      this._$scroll.update();
      if(this._scrollValue >= 1) {
        this._$scroll._scrollContainer(999999, true);
      }
    });

    on(this._$send, 'sendMedia', async () => {
      const media = this._$send._inputMedia;

      const peer = this._peer;
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

      tgProto.sendMessage(inputPeer, '', media);
    });

    on(this._$send, 'sendMess', async () => {
      const message = this._$send.getValue();
      this._$send.setValue('');

      const peer = this._peer;
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

      tgProto.sendMessage(inputPeer, message);
    });

    on(this._$headerPeer, 'click', () => {
      this.parentNode._$right.show('info');
    });

    on(this._$headerSearch, 'click', () => {
      this.parentNode._$right.show('search', this._peer);
    });

    on(this._$scroll, 'scrollValueUpdate', async () => {
      if(!this._messagesObjects.length) return;

      let scrollValue = this._$scroll.scrollValue;
      if(scrollValue === null) scrollValue = 1;
      this._scrollValue = scrollValue;
      this._scrollValuePx = this._$scroll.scrollValuePx;

      if(scrollValue < 1) {
        this._$scroll._$container.classList.add('is-masked-bottom');
      } else {
        this._$scroll._$container.classList.remove('is-masked-bottom');
        this.setReaded(this._messagesObjects[0].id);
      }

      if(scrollValue > 0) {
        this._$scroll._$container.classList.add('is-masked-top');
      }
      else this._$scroll._$container.classList.remove('is-masked-top');

      if(this._scrollValuePx < 500 &&
         this._hasMessagesToLoad &&
         !this._isLoadingAddit) {
        this._isLoadingAddit = true;

        getMessages(
          this._peer, this._messagesObjects[this._messagesObjects.length - 1].id
        ).then(messages => {
          const currentScrollValuePx = this._$scroll.scrollValuePx;
          const currentContentHeight = this._$scroll._$content.offsetHeight;

          const lastIndex = this._messagesObjects.length - 1;
          this.handleMessages(messages);
          this.updateNearMessages(lastIndex);

          const newContentHeight = this._$scroll._$content.offsetHeight;
          const heightDiff = newContentHeight - currentContentHeight;
          this._$scroll._scrollContainer(
            currentScrollValuePx + heightDiff,
            true,
            heightDiff
          );

          this._isLoadingAddit = false;
        });
      }
    });

    tgProto.onUpdate('updateNewMessage', update => {
      this.newMessageHandler(update.message);
    });

    tgProto.onUpdate('updateNewChannelMessage', update => {
      this.newMessageHandler(update.message);
    });

    tgProto.onUpdate('updateDeleteMessages', async update => {
      this.deleteMessagesHandler(update);
    });

    tgProto.onUpdate('updateDeleteChannelMessages', async update => {
      this.deleteMessagesHandler(update);
    });

    tgProto.onUpdate('updateEditMessage', update => {
      this.editMessageHandler(update.message);
    });

    tgProto.onUpdate('updateEditChannelMessage', update => {
      this.editMessageHandler(update.message);
    });

    tgProto.onUpdate('updateReadHistoryOutbox', update => {
      this.readHistoryOutboxHandler(update);
    });

    tgProto.onUpdate('updateReadChannelOutbox', update => {
      this.readHistoryOutboxHandler(update);
    });

    tgProto.onUpdate('updateUserStatus', update => {
      const peerKey = getPeerKey(update);
      if(this._peerKey != peerKey) return;

      this.updateStatusHandler(update.status);
    });
  }

  scrollToExistsMessage(messageId) {
    if(!this._messages[messageId]) return false;

    const offset = this._messages[messageId].offsetTop;
    this._$scroll._scrollContainer(
      offset - this._$scroll.offsetHeight / 2,
      true
    );

    return true;
  }

  async scrollToMessage(messageId) {
    let result = this.scrollToExistsMessage(messageId);

    this._$loader.style.display = 'block';
    this._$loader.offsetWidth;
    this._$loader.classList.add('is-visible');

    while(!result) {
      if(this._hasMessagesToLoad) {
        const messages = await getMessages(
          this._peer, this._messagesObjects[this._messagesObjects.length - 1].id
        );

        const lastIndex = this._messagesObjects.length - 1;
        this.handleMessages(messages);
        this.updateNearMessages(lastIndex);
      } else {
        break;
      }

      result = this.scrollToExistsMessage(messageId);
    }

    this._$loader.style.display = null;
  }

  updateStatusHandler(status) {
    let isBlue = false;
    let text = '';

    if(status._ == 'userStatusOnline') {
      isBlue = true;
      text = 'online';
    } else {
      text = 'offline';
    }

    this._$headerDesc.textContent = text;
    this._$headerDesc.classList[ isBlue ? 'add' : 'remove' ]('is-blue');

    this.parentNode._$right._$info.setPeerStatus(text, isBlue);
  }

  readHistoryOutboxHandler(update) {
    let peerKey;
    if(update.channel_id) {
      peerKey = getPeerKey(update);
    } else {
      peerKey = getPeerKey(update.peer);
    }

    if(this._peerKey != peerKey) return;

    Object.keys(this._messages).forEach(id => {
      const isOut = this._messages[id].isOut;
      if(isOut && id > this._readOutMaxId && id <= update.max_id) {
        this._messages[id].setReaded();
      }
    });
    this._readOutMaxId = update.max_id;
  }

  editMessageHandler(message) {
    let peerKey;
    if(message.to_id._ == 'peerUser' &&
        message.to_id.user_id == tgApp.userId) {
      if(message.from_id == tgApp.userId) {
        peerKey = getPeerKey({ _: 'inputPeerSelf' });
      } else {
        peerKey = getPeerKey({ user_id: message.from_id });
      }
    } else {
      peerKey = getPeerKey(message.to_id);
    }

    if(this._peerKey != peerKey) return;

    if(!this._messages[message.id]) return;

    if(peerKey == 'self') message.out = true;

    const index = this._messagesObjects.findIndex(
      messageInner => messageInner.id == message.id
    );

    let $bottomMessage = null;
    if(this._messagesObjects[index - 1]) {
      $bottomMessage = this._messages[this._messagesObjects[index - 1].id];
    }

    this._messages[message.id].setData(
      message, this._messagesObjects[index - 1],
      this._messagesObjects[index + 1],
      this._peer, $bottomMessage, null, this._readOutMaxId
    );

    this.updateNearMessages(index - 1);
    this.updateNearMessages(index + 1);

    this._$scroll.update();
  }

  updateNearMessages(index2) {
    if(this._messagesObjects[index2]) {
      let $bottomMessage = null;
      if(this._messagesObjects[index2 - 1]) {
        $bottomMessage = this._messages[this._messagesObjects[index2 - 1].id];
      }

      this._messages[this._messagesObjects[index2].id].setData(
        this._messagesObjects[index2], this._messagesObjects[index2 - 1],
        this._messagesObjects[index2 + 1],
        this._peer, $bottomMessage, null, this._readOutMaxId
      );
    }
  }

  deleteMessagesHandler(update) {
    if(update.channel_id && this._peerKey != getPeerKey(update)) {
      return;
    }

    update.messages.forEach(id => {
      if(!this._messages[id]) return;

      const index = this._messagesObjects
        .findIndex(message => message.id == id);

      if(update.channel_id) {
        this._messagesObjects.splice(index, 1);
        this._messages[id].remove();
        return;
      }

      this._messagesObjects.splice(index, 1);
      this._messages[id].remove();

      this.updateNearMessages(index - 1);
      this.updateNearMessages(index);
    });

    this._$scroll.update();
  }

  newMessageHandler(message) {
    let peerKey;
    if(message.to_id._ == 'peerUser' &&
        message.to_id.user_id == tgApp.userId) {
      if(message.from_id == tgApp.userId) {
        peerKey = getPeerKey({ _: 'inputPeerSelf' });
      } else {
        peerKey = getPeerKey({ user_id: message.from_id });
      }
    } else {
      peerKey = getPeerKey(message.to_id);
    }

    if(this._peerKey != peerKey) return;

    if(this._messages[message.id]) {
      this.setReaded(message.id);
      return;
    }

    if(peerKey == 'self') message.out = true;

    if(!this._isReceiveMessages) {
      this._messageToAdd.push(message);
      this.setReaded(message.id);
      return;
    }

    const topMessage = this._messagesObjects[0];
    this.insertMessage(
      message, null, topMessage,
      null, this._messages[topMessage.id], true
    );

    this._$scroll.update();
    if(this._scrollValue >= 1) {
      this.setReaded(message.id);
      this._$scroll._scrollContainer(999999, true);
    }
  }

  setReaded(maxId) {
    if(maxId <= this._maxReadedId) return;
    this._maxReadedId = maxId;

    setTimeout(() => {
      readHistory(this._peer, maxId);
    }, 0);
  }

  async open(peer, readOutMaxId) {
    if(peer._ == 'user' && peer.id == tgApp.userId) {
      peer = { _: 'inputPeerSelf' };
    }

    const peerKey = getPeerKey(peer);

    if(this._peerKey == peerKey) {
      this._$scroll._scrollContainer(999999, true);
      return;
    }

    this.parentNode._$right.peerChanged();
    this._$send.setValue('');

    if(peer._ == 'inputPeerSelf') {
      this._$headerPhotoImage.style.display = null;
      this._$headerPhoto.style.backgroundColor = null;
      this._$headerPhotoText.innerHTML =
        '<div class="icon icon__savedavatar"></div>';
    }
    else if(peer.deleted) {
      this._$headerPhotoImage.style.display = null;
      this._$headerPhoto.style.backgroundColor = 'rgba(0, 0, 0, 0.21)';
      this._$headerPhotoText.innerHTML =
        '<div class="icon icon__deletedavatar"></div>';
    } else {
      let nameParts;
      if(peer.title) {
        nameParts = peer.title.split(' ').slice(0, 2);
      } else {
        if(peer.last_name) nameParts = [ peer.first_name, peer.last_name ];
        else nameParts = peer.first_name.split(' ').slice(0, 2);
      }
      const photoName = nameParts
        .map(part => part.substr(0, 1).toUpperCase()).join('');

      this._$headerPhotoText.textContent = photoName;
      this._$headerPhoto.style.backgroundColor =
        '#' + getEmptyPhotoColor(peer.id);

      const peerPhoto = peer.photo;
      if(peerPhoto && !peerPhoto._.includes('Empty')) {
        getPhoto(peer).then(url => {
          this._$headerPhotoImage.src = url;
          this._$headerPhotoImage.style.display = 'block';
        });
      } else {
        this._$headerPhotoImage.style.display = null;
      }
    }

    let name;
    if(peer._ == 'inputPeerSelf') name = 'Saved Messages';
    else if(peer.deleted) name = 'Deleted Account';
    else if(peer._ == 'chat' || peer._ == 'channel') name = peer.title;
    else {
      name = peer.first_name;
      if(peer.last_name) name += ` ${peer.last_name}`;
    }
    this._$headerName.textContent = name;

    if(peer._ == 'inputPeerSelf') {
      this.parentNode._$right._$info.setPeerInfo(peer);
      this._$headerDesc.textContent = '';
    }
    else if(peer.deleted) {
      this._$headerDesc.textContent = '';
    }
    else if(peer._ == 'user') {
      getPeerFull(peer).then(peerFull => {
        this.parentNode._$right._$info.setPeerInfo(peer, peerFull);
        this.updateStatusHandler(peer.status);
      });
    } else {
      getPeerFull(peer).then(peerFull => {
        let info = '';

        if(peerFull._ == 'channelFull') {
          const allCount = peerFull.participants_count;
          const onlineCount = peerFull.online_count;

          if(onlineCount === undefined) {
            info = `${formatInfoNumber(allCount)} subscribers`;
          } else {
            info =
              `${formatInfoNumber(allCount)} members, ` +
              `${formatInfoNumber(onlineCount)} online`;
          }
        } else {
          const allCount = peerFull.participants.participants.length;
          info = `${formatInfoNumber(allCount)} members`;
        }

        this._$headerDesc.textContent = info;

        peerFull._info = info;
        this.parentNode._$right._$info.setPeerInfo(peer, peerFull);
      });
    }

    this._$wrapper.style.display = null;

    this._peer = peer;
    this._peerKey = peerKey;
    this._readOutMaxId = readOutMaxId;
    this._isReceiveMessages = false;
    this._messagesObjects = [];
    this._hasMessagesToLoad = true;

    this.dispatchEvent(
      new CustomEvent('dialogActive', { detail: peer, bubbles: true })
    );

    const $messagesContainer = this._$list;

    if(peer._ == 'channel' && peer.broadcast) {
      $messagesContainer.classList.add('is-channel');
      this._$form.style.display = 'none';
    } else {
      $messagesContainer.classList.remove('is-channel');
      this._$form.style.display = null;
    }

    clearTimeout(this._loaderHideTimeout);
    this._messages = {};
    $messagesContainer.innerHTML = '';
    this._$scroll.update();

    this._$loader.style.display = 'block';
    this._$loader.offsetWidth;
    this._$loader.classList.add('is-visible');

    let messages = (await Promise.all([
      getMessages(peer, 0),
      sleep(400)
    ]))[0];

    this._$loader.style.display = null;
    this._$wrapper.style.display = 'flex';

    this._maxReadedId = messages[0].id;
    this.handleMessages(messages);

    this._$scroll._scrollContainer(999999, true);

    this._isReceiveMessages = true;

    this._messageToAdd.forEach(message => {
      const topMessage = this._messagesObjects[0];
      this.insertMessage(
        message, null, topMessage,
        null, this._messages[topMessage.id], true
      );
    });
    this._messageToAdd = [];
  }

  handleMessages(messages) {
    if(messages.length < 50) this._hasMessagesToLoad = false;

    if(this._peer._ == 'inputPeerSelf') {
      messages = messages.map(message => {
        message.out = true;
        return message;
      });
    }

    let $prevMessage = null;
    const lastMessage = this._messagesObjects[this._messagesObjects.length - 1];

    if(lastMessage) {
      $prevMessage = this._messages[lastMessage.id];
    }

    messages.forEach((message, i) => {
      let prevMessage = messages[i - 1];
      if(!prevMessage) {
        prevMessage = lastMessage;
      }

      $prevMessage = this.insertMessage(
        message, prevMessage, messages[i + 1], $prevMessage, null
      );
    });

    this._$scroll.update();
  }

  insertMessage(
    message, bottomMessage, topMessage,
    $bottomMessage, $topMessage, atStart
  ) {
    const $message = document.createElement('tg-message');

    if(atStart) this._$list.appendChild($message);
    else this._$list.insertBefore($message, this._$list.firstChild);

    this._messagesObjects[ atStart ? 'unshift' : 'push' ](message);

    $message.setData(
      message, bottomMessage, topMessage,
      this._peer, $bottomMessage, $topMessage, this._readOutMaxId
    );

    this._messages[message.id] = $message;

    if((!this._hasMessagesToLoad && !topMessage) ||
       (!topMessage ||
        getStartDayDate(topMessage.date) != getStartDayDate(message.date))) {
      const $date = document.createElement('div');
      $date.className = 'message is-info';
      $date.innerHTML =
        `<div class="message_wrapper">
          <div class="message_text">
            ${getInfoTimeFormatted(message.date)}
          </div>
        </div>`;

      this._$list.insertBefore($date, $message);
    }

    if(atStart) {
      this._messages[this._messagesObjects[1].id].setData(
        this._messagesObjects[1], this._messagesObjects[0],
        this._messagesObjects[2],
        this._peer, $message, null, this._readOutMaxId
      );
    }

    return $message;
  }
}

if(!customElements.get('tg-block-messages')) {
  customElements.define('tg-block-messages', BlockMessagesElement);
}