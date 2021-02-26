/* global tgApp */

import {
  bindRefs,
  getTimeFormatted,
  getEmptyPhotoColor,
  compareObjects,
  on
} from '../../helpers';

import {
  getPeer
} from '../Stores/peers';

import {
  getPhoto
} from '../Stores/photos';

import {
  isGifMessage
} from '../Stores/stickers';

import {
  isDocumentMessage
} from '../Stores/documents';

class DialogElement extends HTMLElement {
  constructor() {
    super();

    this._isInited = false;
    this._badgeTimeout = 0;
    this._prevParams = {};
    this._peer = null;
    this._readOutMaxId = 0;
    this._$prevWave = null;
  }

  async connectedCallback() {
    this.className = 'dialog';
  }

  update(dialog) {
    const params = this._getParams(dialog);
    const prevParams = this._prevParams;

    if(!this._isInited) {
      this._init(params);
      this._isInited = true;
    }

    if(!compareObjects(params.photo, prevParams.photo)) {
      const photo = params.photo;
      if(photo == 'saved') {
        this._$photoImage.style.display = null;
        this._$photoText.innerHTML =
          '<div class="icon icon__savedavatar"></div>';
      } else {
        this._$photoText.textContent = params.photo.text;
        this._$photo.style.backgroundColor = `#${photo.color}`;
        this._$photoImage.style.display = null;

        if(photo.content) {
          photo.content.then(url => {
            this._$photoImage.src = url;
            this._$photoImage.style.display = 'block';
          });
        }
      }
    }

    if(params.isOnline != prevParams.isOnline) {
      this._$online.classList[
        params.isOnline ? 'add' : 'remove'
      ]('is-visible');
    }

    if(params.name != prevParams.name) this._$name.textContent = params.name;
    if(params.date != prevParams.date) this._$date.textContent = params.date;
    if(params.text != prevParams.text) this._$text.innerHTML = params.text;

    if(params.status != prevParams.status) {
      const statusClassList = this._$status.classList;

      if(prevParams.status == 'readed') statusClassList.remove('is-readed');
      if(prevParams.status == 'sended') statusClassList.remove('is-sended');

      if(params.status == 'readed') statusClassList.add('is-readed');
      if(params.status == 'sended') statusClassList.add('is-sended');
    }

    if(params.isUnreadMark != prevParams.isUnreadMark ||
       params.isSilent != prevParams.isSilent ||
       params.unreadedCount != prevParams.unreadedCount) {
      const isBadgeVisible = params.isUnreadMark || params.unreadedCount;
      const isBadgeGray = !params.isUnreadMark && params.isSilent;
      const badgeText = params.isUnreadMark ? '' : params.unreadedCount;

      const badgeClassList = this._$badge.classList;

      if(isBadgeVisible) {
        clearTimeout(this._$badge._hideTimeout);
        badgeClassList.add('is-display');
        this._$badge.offsetWidth;
        badgeClassList.add('is-visible');
      } else {
        this._$badge.classList.remove('is-visible');
        this._$badge._hideTimeout = setTimeout(() => {
          this._$badge.classList.remove('is-display');
        }, 300);
      }

      if(isBadgeGray) badgeClassList.add('is-gray');
      else badgeClassList.remove('is-gray');

      if(isBadgeVisible) this._$badgeText.textContent = badgeText;
    }

    if(params.index != prevParams.index) {
      this.style.zIndex = (99999 - params.index).toString();
      const transform = `translateY(${params.index * 72 + params.index * 4}px)`;
      this.style.transform = transform;
    }

    this._prevParams = params;
  }

  _init(params) {
    this.innerHTML =
     `<div class="dialog_side">
        <div class="dialog_photo" ref="photo">
          <div class="dialog_photo-text" ref="photoText"></div>
          <img class="dialog_photo-image" ref="photoImage">
        </div>
        <div class="dialog_online" ref="online"></div>
      </div>
      <div class="dialog_main">
        <div class="dialog_header">
          <div class="dialog_name" ref="name"></div>
          ${ params.isVerified ? `<div class="icon icon__verified">
                                  </div>` : '' }
          <div class="dialog_fill"></div>
          ${ !params.isBroadcast ? `<div class="dialog_status" ref="status">
                                      <div class="icon icon__check1"></div>
                                      <div class="icon icon__check2"></div>
                                    </div>` : '' }
          <div class="dialog_date" ref="date"></div>
        </div>
        <div class="dialog_body">
          <div class="dialog_text" ref="text"></div>
          <div class="badge" ref="badge"><span ref="badgeText"></span></div>
        </div>
      </div>`;

    bindRefs(this);

    on(this, 'click', e => {
      const boundingRect = this.getBoundingClientRect();
      const x = e.x - boundingRect.x;
      const y = e.y - boundingRect.y;

      const wave = document.createElement('div');
      wave.classList.add('dialog_wave');
      wave.style.top = y + 'px';
      wave.style.left = x + 'px';

      this.appendChild(wave);

      if(this._$prevWave) this._$prevWave.classList.add('dialog_wave__hide');
      this._$prevWave = wave;

      this.classList.add('is-hover');

      const halfWidth = this.offsetWidth / 2;
      const fillCoef = (Math.abs(halfWidth - x) + halfWidth) / this.offsetWidth;

      setTimeout(() => {
        wave.classList.add('dialog_wave__hide');
        this.classList.remove('is-hover');

        setTimeout(() => {
          this.removeChild(wave);
        }, 300);
      }, 450 * fillCoef * 1.2);

      this.dispatchEvent( new CustomEvent('dialogOpen',
        { detail: {
          peer: this._peer, readOutMaxId: this._readOutMaxId
        }, bubbles: true }
      ));
    });
  }

  _getParams(dialog) {
    const result = {};

    const peer = dialog._peer;
    const message = dialog._message;
    const isBroadcast = !!peer.broadcast;

    this._peer = peer;
    this._readOutMaxId = dialog.read_outbox_max_id;

    if(peer.self) result.photo = 'saved';
    else {
      let nameParts;
      if(peer.title) {
        nameParts = peer.title.split(' ').slice(0, 2);
      } else {
        if(peer.last_name) nameParts = [ peer.first_name, peer.last_name ];
        else nameParts = peer.first_name.split(' ').slice(0, 2);
      }

      result.photo = {
        text: nameParts.map(part => part.substr(0, 1).toUpperCase()).join(''),
        color: getEmptyPhotoColor(peer.id)
      };

      const peerPhoto = peer.photo;
      if(peerPhoto && !peerPhoto._.includes('Empty')) {
        result.photo.constructor = peerPhoto.photo_small;
        result.photo.content = getPhoto(peer);
      }
    }

    result.name = peer.self
      ? 'Saved Messages'
      : peer.title
        ? peer.title
        : peer.last_name
          ? `${peer.first_name} ${peer.last_name}`
          : peer.first_name;

    if(peer._ == 'user' && peer.id != tgApp.userId) {
      result.isOnline = peer.status && peer.status._ == 'userStatusOnline';
    }

    if(!isBroadcast) {
      const isReaded = message.out &&
        dialog.top_message == dialog.read_outbox_max_id;

      result.status = isReaded
        ? 'readed'
        : !isReaded && message.out
          ? 'sended'
          : null;
    }

    result.date = getTimeFormatted(message.date);

    if(dialog._isTyping) {
      let textPrefix = '';
      if(dialog._typingIds) {
        textPrefix = dialog._typingIds.map(id => {
          return getPeer({ user_id: id }).first_name;
        }).join(', ');
        textPrefix = textPrefix + ' ';
      }

      result.text =
       `<div>
          ${textPrefix}typing<span>.</span><span>.</span><span>.</span>
        </div>`;
    }
    else if(peer._ == 'channel' && peer.date > message.date) {
      result.text = 'You joined this channel';
    }
    else {
      let textPrefix = '';
      if(message.out) textPrefix = '<span>You:</span>';
      else if(peer._ != 'user' && message.from_id) {
        const author = getPeer({ user_id: message.from_id });
        if(author) textPrefix = `<span>${author.first_name}:</span>`;
      }

      let messageText = message.message;
      if(message._ == 'messageService') {
        if(message.action._ == 'messageActionHistoryClear') {
          textPrefix = '';
          messageText = '';
        }
        else {
          messageText = message.action._
            .substr(13)
            .match(/[A-Z][a-z]+/g)
            .map(word => word.toLowerCase())
            .join(' ');
        }
      }

      const media = message.media;
      if(media && media._ != 'messageMediaEmpty') {
        let mediaText = '';

        if(media._ == 'messageMediaDocument') {
          const document = media.document;

          if(!document || !document.attributes) mediaText = 'Document';
          else {
            const attributes = document.attributes;
            for(let i = 0, l = attributes.length; i < l; i++) {
              const attribute = attributes[i];

              if(attribute._ == 'documentAttributeVideo') {
                if(isGifMessage(message)) mediaText = 'Gif';
                else mediaText = 'Video';
                break;
              }

              if(attribute._ == 'documentAttributeAudio') {
                mediaText = 'Audio';
                break;
              }

              if(attribute._ == 'documentAttributeSticker') {
                mediaText = `Sticker ${attribute.alt}`;
                break;
              }
            }

            if(isDocumentMessage(message)) {
              mediaText = document.attributes[0].file_name;
            }

            if(!mediaText) mediaText = 'Document';
          }
        }
        else if(message.media._ == 'messageMediaWebPage') {
          mediaText = '';
        }
        else {
          mediaText = media._.substr(12);
        }

        if(messageText && mediaText) {
          messageText = `${mediaText}, ${messageText}`;
        }
        else if(!messageText) messageText = mediaText;
      }

      result.text = (textPrefix ? textPrefix + ' ' : '') + messageText;
    }

    result.unreadedCount = dialog.unread_count;

    result.isUnreadMark = !!dialog.unread_mark;

    const notifySettings = dialog.notify_settings;
    result.isSilent = notifySettings.silent ||
      (notifySettings.mute_until &&
       notifySettings.mute_until > Math.round(Date.now() / 1000));

    result.isBroadcast = isBroadcast;
    result.isVerified = peer.verified;
    result.index = dialog._index;

    return result;
  }

  hide() {
    const currentTransform = this.style.transform;
    this.style.transform = `${currentTransform} scale(0)`;

    setTimeout(() => {
      this.remove();
    }, 300);
  }

  setActive(state) {
    this.classList[ state ? 'add' : 'remove' ]('is-active');
  }
}

if(!customElements.get('tg-dialog')) {
  customElements.define('tg-dialog', DialogElement);
}