import { bindRefs, on } from '../../helpers';

class ModalElement extends HTMLElement {
  connectedCallback() {
    this.className = 'a-modal';

    const closeHtml = this.hasAttribute('closable')
      ? `<div class="a-modal_close" ref="close">
           <div class="icon icon__a icon__close"></div>
         </div>`
      : '';

    this.innerHTML =
     `<div class="a-modal_overlay" ref="overlay"></div>
      <div class="a-modal_wrapper">
        <div class="a-modal_content" ref="content">
          ${ closeHtml }
          <div class="a-modal_header" ref="header">
            ${ this.getAttribute('header') }
          </div>
          <div class="a-modal_button">
            <tga-button circle ref="button">
              <span class="icon icon__a icon__check"></span>
            </tga-button>
          </div>
          <div class="a-modal_body" ref="body">
            ${ this.innerHTML }
          </div>
        </div>
      </div>`;

    bindRefs(this);

    if(this._$close) on(this._$close, 'click', this.close.bind(this));
    on(this._$button, 'bClick', this._buttonClickHandler.bind(this));

    this.classList.add('a-modal__active');
    this._$content.classList.add('a-show-down');

    window.dispatchEvent(new CustomEvent('mousedown'));
  }

  close() {
    this._$content.classList.add('a-hide-down');
    this._$overlay.classList.add('a-modal_overlay__hide');

    setTimeout(() => {
      this.remove();
    }, 300);
  }

  _buttonClickHandler() {
    this.close();
  }
}

if(!customElements.get('tga-modal')) {
  customElements.define('tga-modal', ModalElement);
}

export {
  ModalElement
};