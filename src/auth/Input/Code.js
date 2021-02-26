import { InputTextElement } from './Text';

class InputCodeElement extends InputTextElement {
  constructor() {
    super();

    this._prevValue = '';
    this._maxLength = 5;
    this._regExp = new RegExp('^\\d{0,5}$');

    this.setAttribute('label', 'Code');
  }

  setMaxLength(maxLength) {
    this._regExp = new RegExp(`^\\d{0,${maxLength}}$`);
    this._$input.style.letterSpacing = '13px';
  }

  _inputHandler(e) {
    let prevSelectionStart = this._$input.selectionStart;
    let prevSelectionEnd = this._$input.selectionEnd;

    if(!this._regExp.test(this._$input.value)) {
      this._$input.value = this._prevValue;

      if(e.data) {
        prevSelectionStart--;
        prevSelectionEnd--;
      }

      this._$input.setSelectionRange(prevSelectionStart, prevSelectionEnd);
      return;
    }

    this._prevValue = this._$input.value;

    super._inputHandler();

    if(this._$input.value.length != this._maxLength) return;

    this.dispatchEvent(new CustomEvent('itcSubmit'));
  }
}

if(!customElements.get('tga-input-code')) {
  customElements.define('tga-input-code', InputCodeElement);
}