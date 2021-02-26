/* global tgApp */

import {
  bindRefs, on
} from '../../helpers';

import {
  getDialogs,
  loadDialogs,
  onDialog
} from '../Stores/dialogs';

import {
  getPeerKey
} from '../Stores/peers';

class BlockDialogsElement extends HTMLElement {
  constructor() {
    super();

    this._dialogs = {};
  }

  async connectedCallback() {
    this.className = 'dialogs';
    this.innerHTML =
     `<tg-scroll ref="scroll" offset-side="1" offset-bottom="8"></tg-scroll>
      <div class="dialogs_overlay" ref="topOverlay"></div>
      <div class="dialogs_overlay dialogs_overlay__bottom"
           ref="bottomOverlay"></div>`;
    bindRefs(this);

    on(this._$scroll, 'scrollValueUpdate', () => {
      const scrollValue = this._$scroll.scrollValue;

      this._$topOverlay.classList.add('is-visible');
      this._$bottomOverlay.classList.add('is-visible');

      if(scrollValue === null) {
        this._$topOverlay.classList.remove('is-visible');
        this._$bottomOverlay.classList.remove('is-visible');
      }

      if(scrollValue === 0) this._$topOverlay.classList.remove('is-visible');
      if(scrollValue === 1) this._$bottomOverlay.classList.remove('is-visible');
    });
  }

  async init() {
    let dialogs = await getDialogs();
    if(!dialogs.length) {
      await tgApp.waitProtoInited();
      await loadDialogs();
      dialogs = await getDialogs();
    }

    const $dialogsContainer = this._$scroll.$content;
    dialogs.forEach(dialog => {
      const $dialog = document.createElement('tg-dialog');
      $dialog.update(dialog);
      $dialogsContainer.appendChild($dialog);

      console.log(dialog);

      this._dialogs[dialog._key] = $dialog;
    });
    $dialogsContainer.style.height =
      (dialogs.length * 72 + dialogs.length * 4 + 4) + 'px';
    this._$scroll.update();

    onDialog('add', dialog => {
      const $dialog = document.createElement('tg-dialog');
      $dialog.update(dialog, true);
      $dialogsContainer.appendChild($dialog);

      this._dialogs[dialog._key] = $dialog;

      const currentTransform = $dialog.style.transform;
      $dialog.style.transform = `${currentTransform} scale(0)`;
      $dialog.offsetWidth;
      $dialog.style.transform = currentTransform;

      $dialogsContainer.style.height =
        (this._dialogs.length * 72 + this._dialogs.length * 4 + 4) + 'px';
      this._$scroll.update();
    });

    onDialog('update', dialog => {
      const $dialog = this._dialogs[dialog._key];
      if($dialog) $dialog.update(dialog);
    });

    onDialog('delete', key => {
      const $dialog = this._dialogs[key];
      if($dialog) {
        $dialog.hide();
        delete(this._dialogs[key]);
      }

      $dialogsContainer.style.height =
        (this._dialogs.length * 72 + this._dialogs.length * 4 + 4) + 'px';
      this._$scroll.update();
    });

    this.dispatchEvent(new CustomEvent('dLoaded'));
  }

  activeDialog(peer) {
    Object.values(this._dialogs).forEach($dialog => {
      $dialog.setActive(false);
    });

    let key;
    if(peer._ == 'inputPeerSelf') key = `user${tgApp.userId}`;
    else key = getPeerKey(peer);

    this._dialogs[key].setActive(true);
  }
}

if(!customElements.get('tg-block-dialogs')) {
  customElements.define('tg-block-dialogs', BlockDialogsElement);
}