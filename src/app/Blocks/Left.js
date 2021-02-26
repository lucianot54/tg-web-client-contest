/* global tgProto */

import {
  bindRefs,
  on,
  sleep
} from '../../helpers';

class BlockLeftElement extends HTMLElement {
  connectedCallback() {
    this.className = 'app_left';

    const menuItems = [
      [ 'saved', 'saved', 'Saved' ],
      [ 'help', 'help', 'Help' ],
      [ 'logout', 'logout', 'Log Out' ],
    ];

    this.innerHTML =
     `<div class="app_left-overlay" ref="overlay"></div>
      <tg-side-header icon-left="menu"
        menu-trigger="iconLeft"
        menu-items="${encodeURIComponent(JSON.stringify(menuItems))}"
        has-search
        ref="header"></tg-side-header>
      <tg-block-dialogs ref="dialogs"></tg-block-dialogs>`;
    bindRefs(this);

    on(this._$header, 'savedMenuClick', () => {
      this.dispatchEvent(new CustomEvent(
        'dialogOpen',
        { detail: { peer: { _: 'inputPeerSelf' } }, bubbles: true }
      ));
    });

    on(this._$header, 'helpMenuClick', () => {
      window.open('https://telegram.org/faq', '_blank');
    });

    on(this._$header, 'logoutMenuClick', () => {
      tgProto.logOut();
    });

    let $loader;
    let createLoaderTimeout = setTimeout(() => {
      $loader = document.createElement('tg-loader');
      $loader.setAttribute('blue', true);
      $loader.setAttribute('big', true);
      this._$overlay.appendChild($loader);
    }, 500);

    on(this._$dialogs, 'dLoaded', async () => {
      clearTimeout(createLoaderTimeout);

      if($loader) {
        $loader.classList.add('loader__hide');
        await sleep(150);
      }

      this._$overlay.classList.add('app_left-overlay__hide');
      await sleep(300);
      this._$overlay.remove();
    });

    this._$dialogs.init();
  }

  activeDialog(peer) {
    this._$dialogs.activeDialog(peer);
  }
}

if(!customElements.get('tg-block-left')) {
  customElements.define('tg-block-left', BlockLeftElement);
}