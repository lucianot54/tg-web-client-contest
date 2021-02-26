import {
  bindRefs,
  on
} from '../../helpers';

class InputSearchElement extends HTMLElement {
  constructor() {
    super();

    this._hasError = false;
    this._$loader = null;
  }

  connectedCallback() {
    this.className = 'search-field';

    this.innerHTML =
     `<div class="icon icon__search"></div>
      <label ref="label">Search</label>
      <input type="text" ref="input" autocomplete="off">`;

    bindRefs(this);

    on(this, 'click', () => {
      this.setFocus();
    });

    on(this._$input, 'focus', this._focusHandler.bind(this));
    on(this._$input, 'blur', this._blurHandler.bind(this));
    on(this._$input, 'input', this._inputHandler.bind(this));

    on(this._$input, 'keydown', e => {
      if(e.which == 13) {
        this.dispatchEvent(new CustomEvent('itEnter'), {
          bubbles: true
        });
      }
    });
  }

  getValue() {
    return this._$input.value;
  }

  setValue(value) {
    this._$input.value = value;
    this._inputHandler();
  }

  setLoading(state) {
    if(state) {
      this._$loader = document.createElement('tg-loader');
      this._$loader.setAttribute('blue', true);
      this.appendChild(this._$loader);
    } else if(this._$loader) {
      if(this._$loader) this._$loader.destroy();
      this._$loader = null;
    }
  }

  setFocus() {
    this._$input.focus();
  }

  _focusHandler() {
    this.classList.add('is-focus');
  }

  _blurHandler() {
    this.classList.remove('is-focus');
  }

  _inputHandler() {
    this.dispatchEvent(new CustomEvent('itInput'), {
      bubbles: true
    });

    this.classList[ this._$input.value != '' ? 'add' : 'remove' ]('is-fill');
  }
}

if(!customElements.get('tg-input-search')) {
  customElements.define('tg-input-search', InputSearchElement);
}