import {
  bindRefs,
  sleep
} from '../../helpers';

class BlockRightElement extends HTMLElement {
  constructor() {
    super();

    this._current = '';
  }

  connectedCallback() {
    this.className = 'app_right';

    this.innerHTML =
     `<tg-block-right-info ref="info"></tg-block-right-info>
      <tg-block-right-search ref="search"></tg-block-right-search>`;

    bindRefs(this);
  }

  peerChanged() {
    if(this._current == 'search') this.hide();
  }

  show(type, peer, notShowSelf) {
    this._$info.hide();
    this._$search.hide();

    this[`_$${type}`].show(peer);
    this._current = type;

    if(!notShowSelf) this.classList.add('is-visible');
  }

  async hide() {
    this.classList.remove('is-visible');
    await sleep(300);
    this.show('info', null, true);
  }
}

if(!customElements.get('tg-block-right')) {
  customElements.define('tg-block-right', BlockRightElement);
}