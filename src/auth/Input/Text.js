import { bindRefs, on } from '../../helpers';

class InputTextElement extends HTMLElement {
  constructor() {
    super();

    this._hasError = false;
    this._$loader = null;
  }

  connectedCallback() {
    this.className = 'a-input-field';

    this.innerHTML = this._getTemplate();

    bindRefs(this);

    on(this._$input, 'focus', this._focusHandler.bind(this));
    on(this._$input, 'blur', this._blurHandler.bind(this));
    on(this._$input, 'input', this._inputHandler.bind(this));

    on(this._$input, 'keydown', e => {
      if(e.which == 13) this.dispatchEvent(new CustomEvent('itEnter'));
    });
  }

  getInputElement() {
    return this._$input;
  }

  getValue() {
    return this._$input.value;
  }

  setValue(value) {
    this._$input.value = value;
    this._inputHandler({ data: null });
  }

  setError(text) {
    if(this._$labelText.textContent == text) return;
    this._hasError = true;

    const $labelText = this._$labelText;
    const labelStyle = this._$label.style;

    labelStyle.overflow = 'hidden';
    labelStyle.width = this._$label.offsetWidth + 'px';
    labelStyle.transition = 'color 0.15s, width 0.15s';
    this._$label.offsetWidth;
    labelStyle.width = '0';

    setTimeout(() => {
      $labelText.textContent = text;
      labelStyle.width = ($labelText.scrollWidth + 8) + 'px';
      this.classList.add('a-input-field__error');

      setTimeout(() => {
        labelStyle.overflow = null;
        labelStyle.width = null;
        labelStyle.transition = null;
      }, 150);
    }, 150);
  }

  setDisabled(state) {
    this._$input.style.transition = 'color 0.3s';
    this._$input.offsetWidth;
    this.classList[ state ? 'add' : 'remove' ]('is-disabled');
    this._$input[ (state ? 'set' : 'remove') + 'Attribute' ]('disabled', true);
    this._$input.style.transition = null;
  }

  setLoading(state) {
    if(state) {
      this._$loader = document.createElement('tga-loader');
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

  _getTemplate() {
    return `<label ref="label"><div ref="labelText">
              ${ this.getAttribute('label') }
            </div><span></span></label>
            <input type="text" ref="input" autocomplete="off" tabindex="">`;
  }

  _focusHandler() {
    this.classList.add('is-focus');
    this.dispatchEvent(new CustomEvent('itFocus'));
  }

  _blurHandler() {
    this.classList.remove('is-focus');
    this.dispatchEvent(new CustomEvent('itBlur'));
  }

  _inputHandler() {
    if(this._hasError) {
      this._hasError = false;

      const $labelText = this._$labelText;
      const labelStyle = this._$label.style;

      labelStyle.overflow = 'hidden';
      labelStyle.width = this._$label.offsetWidth + 'px';
      labelStyle.transition = 'color 0.15s, width 0.15s';
      this._$label.offsetWidth;
      labelStyle.width = '0';

      setTimeout(() => {
        $labelText.textContent = this.getAttribute('label');
        labelStyle.width = ($labelText.scrollWidth + 8) + 'px';
        this.classList.remove('a-input-field__error');

        setTimeout(() => {
          labelStyle.overflow = null;
          labelStyle.width = null;
          labelStyle.transition = null;
        }, 150);
      }, 150);
    }

    this.dispatchEvent(new CustomEvent('itInput'));

    this.classList[ this._$input.value != '' ? 'add' : 'remove' ]('is-fill');
  }
}

if(!customElements.get('tga-input-text')) {
  customElements.define('tga-input-text', InputTextElement);
}

export {
  InputTextElement
};