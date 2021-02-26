import { on } from '../../helpers';

import { InputTextElement } from './Text';

class InputPasswordElement extends InputTextElement {
  constructor() {
    super();

    this._isPasswordShowed = false;
    this._isFocused = false;
    this._isDisabled = false;
    this._blurTimeout = 0;

    this.setAttribute('label', 'Password');
  }

  connectedCallback() {
    super.connectedCallback();

    on(this._$toggle, 'click', () => {
      if(this._isDisabled) return;

      this._isPasswordShowed = !this._isPasswordShowed;

      if(this._isPasswordShowed) {
        this._$toggleIcon.classList.remove('icon__eye-show');
        this._$toggleIcon.classList.add('icon__eye-hide');
        this._$input.setAttribute('type', 'text');
        this._$input.style.fontFamily = null;
      } else {
        this._$toggleIcon.classList.add('icon__eye-show');
        this._$toggleIcon.classList.remove('icon__eye-hide');
        this._$input.setAttribute('type', 'password');
        this._$input.style.fontFamily = 'monospace';
      }

      if(this._isFocused) this.setFocus();

      this.dispatchEvent(new CustomEvent('itpToggle'));
    });
  }

  setDisabled(state) {
    this._isDisabled = state;

    super.setDisabled(state);
  }

  isPasswordShowed() {
    return this._isPasswordShowed;
  }

  isFocused() {
    return this._isFocused;
  }

  _getTemplate() {
    return `<label ref="label"><div ref="labelText">
              ${ this.getAttribute('label') }
            </div><span></span></label>
            <input type="password" ref="input" autocomplete="off"
                   style="font-family:monospace">
            <div class="a-input-field_password" ref="toggle">
              <div class="icon icon__a icon__eye-show" ref="toggleIcon"></div>
            </div>`;
  }

  _focusHandler() {
    if(this._isFocused) {
      clearTimeout(this._blurTimeout);
      return;
    }

    this._isFocused = true;

    super._focusHandler();
  }

  _blurHandler() {
    clearTimeout(this._blurTimeout);
    this._blurTimeout = setTimeout(() => {
      this._isFocused = false;

      super._blurHandler();
    }, 150);
  }
}

if(!customElements.get('tga-input-password')) {
  customElements.define('tga-input-password', InputPasswordElement);
}