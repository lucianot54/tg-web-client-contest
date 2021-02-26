import {
  bindRefs,
  on
} from '../../helpers';

class SideHeaderElement extends HTMLElement {
  connectedCallback() {
    const classList = [ 'side-header' ];
    if(this.hasAttribute('is-bordered')) classList.push('is-bordered');
    this.className = classList.join(' ');

    let html = '';

    html += `<tg-button icon="${this.getAttribute('icon-left')}"
                        ref="iconLeft"></tg-button>`;

    const menuItemsAttribute = this.getAttribute('menu-items');
    if(menuItemsAttribute) {
      html += `<tg-menu items="${menuItemsAttribute}" ref="menu"></tg-menu>`;
    }

    const textAttribute = this.getAttribute('text');
    if(textAttribute) {
      html += `<div class="side-header_text">${textAttribute}</div>`;
    }

    const hasSearchAttribute = this.hasAttribute('has-search');
    if(hasSearchAttribute) {
      html += '<tg-input-search ref="inputSearch"></tg-input-search>';
    }

    this.innerHTML = html;

    bindRefs(this);

    const menuTriggerAttribute = this.getAttribute('menu-trigger');
    if(menuTriggerAttribute) {
      on(this[`_$${menuTriggerAttribute}`], 'bClick', () => {
        this._$menu.show(14, 60);
      });
    }

    on(this._$iconLeft, 'click', () => {
      this.dispatchEvent( new CustomEvent('ilClick',
        { bubbles: true }
      ));
    });
  }
}

if(!customElements.get('tg-side-header')) {
  customElements.define('tg-side-header', SideHeaderElement);
}