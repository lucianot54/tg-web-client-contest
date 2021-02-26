import { bindRefs, on } from '../../helpers';

class MenuElement extends HTMLElement {
  constructor() {
    super();

    this._$overlay = null;
    this._isVisible = false;
    this._isVisibleAttribute = false;
  }

  connectedCallback() {
    this.className = 'menu';

    const items = JSON.parse(decodeURIComponent(this.getAttribute('items')));
    const hasIcons = items.findIndex(item => item[1]) > -1;
    this._isVisibleAttribute = this.hasAttribute('is-visible');
    if(this._isVisibleAttribute) this._isVisible = true;

    let html = '<div class="menu_hover" ref="hover"></div>';
    items.forEach(item => {
      html +=
       `<div class="menu_item" ref="${item[0]}">
          ${ hasIcons ? `<div>
                           <div class="icon icon__${item[1]}"></div>
                         </div>` : '' }
          <div>${item[2]}</div>
          ${ item[3] ? `<div><div class="badge">${item[3]}</div></div>` : '' }
        </div>`;
    });

    this.innerHTML = html;
    bindRefs(this);

    const $overlay = document.createElement('div');
    $overlay.className = 'page-overlay';
    this._$overlay = $overlay;

    on($overlay, 'click', () => {
      this.hide();
    });

    items.forEach(item => {
      on(this[`_$${item[0]}`], 'click', this._clickHandler);
    });
  }

  show(x, y) {
    if(!this._isVisibleAttribute) this._isVisible = true;

    this.style.left = `${x}px`;
    this.style.top = `${y}px`;
    this.classList.add('is-visible');
    document.body.appendChild(this._$overlay);
  }

  hide() {
    if(!this._isVisibleAttribute) this._isVisible = false;

    this.classList.remove('is-visible');
    this._$overlay.remove();
  }

  _clickHandler() {
    if(!this._isVisibleAttribute && !this.parentElement._isVisible) return;

    this.dispatchEvent(new CustomEvent(
      this.getAttribute('ref') + 'MenuClick',
      { bubbles: true }
    ));

    this.parentElement.hide();
  }
}

if(!customElements.get('tg-menu')) {
  customElements.define('tg-menu', MenuElement);
}