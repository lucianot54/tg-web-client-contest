/* global tgApp */

import {
  bindRefs,
  getTimeFormatted,
  getEmptyPhotoColor,
  on
} from '../../helpers';

import {
  getPeer
} from '../Stores/peers';

import {
  getPhoto
} from '../Stores/photos';

class SearchResultElement extends HTMLElement {
  async connectedCallback() {
    this.className = 'dialog search-result';
  }

  setData(message, query) {
    this.messageId = message.id;

    this.innerHTML =
     `<div class="dialog_side">
        <div class="dialog_photo" ref="photo">
          <div class="dialog_photo-text" ref="photoText"></div>
          <img class="dialog_photo-image" ref="photoImage">
        </div>
      </div>
      <div class="dialog_main">
        <div class="dialog_header">
          <div class="dialog_name" ref="name"></div>
          <div class="dialog_fill"></div>
          <div class="dialog_date" ref="date"></div>
        </div>
        <div class="dialog_body">
          <div class="dialog_text" ref="text"></div>
        </div>
      </div>`;
    bindRefs(this);

    let peer;

    if(!message.from_id) {
      peer = getPeer(message.to_id);
    } else {
      peer = getPeer({ user_id: message.from_id });
    }

    if(!peer) debugger;
    if(peer.deleted) {
      this._$photo.style.backgroundColor = 'rgba(0, 0, 0, 0.21)';
      this._$photoText.innerHTML =
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

      this._$photoText.textContent = photoName;
      this._$photo.style.backgroundColor =
        '#' + getEmptyPhotoColor(peer.id);

      const peerPhoto = peer.photo;
      if(peerPhoto && !peerPhoto._.includes('Empty')) {
        getPhoto(peer).then(url => {
          this._$photoImage.src = url;
          this._$photoImage.style.display = 'block';
        });
      }
    }

    let name;
    if(peer.deleted) name = 'Deleted Account';
    else if(peer._ == 'chat' || peer._ == 'channel') name = peer.title;
    else {
      name = peer.first_name;
      if(peer.last_name) name += ` ${peer.last_name}`;
    }
    this._$name.textContent = name;

    this._$date.textContent = getTimeFormatted(message.date);
    this._$text.textContent = message.message;
  }
}

if(!customElements.get('tg-search-result')) {
  customElements.define('tg-search-result', SearchResultElement);
}