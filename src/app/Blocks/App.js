/* global tgMain, tgProto */

import {
  on,
  bindRefs,
  clearWindowResize,
  offWindowAll
} from '../../helpers';

class BlockAppElement extends HTMLElement {
  connectedCallback() {
    this.className = 'app';

    this.innerHTML =
     `<tg-block-left ref="left"></tg-block-left>
      <tg-block-messages ref="messages"></tg-block-messages>
      <tg-block-right ref="right"></tg-block-right>`;

    bindRefs(this);

    on(this._$left, 'dialogOpen', e => {
      this._$messages.open(e.detail.peer, e.detail.readOutMaxId);
    });

    on(this._$messages, 'dialogActive', e => {
      this._$left.activeDialog(e.detail);
    });
  }

  hide() {
    const $pageOverlay = document.createElement('div');
    $pageOverlay.className = 'page-overlay';
    document.body.appendChild($pageOverlay);
    this._$pageOverlay = $pageOverlay;

    tgMain.loadAuth();

    this.classList.add('app__hide');

    tgProto.onConnect = null;
    tgProto.onDisconnect = null;
    clearWindowResize();
    offWindowAll();
  }

  initAuth() {
    location.reload();
  }
}

if(!customElements.get('tg-block-app')) {
  customElements.define('tg-block-app', BlockAppElement);
}