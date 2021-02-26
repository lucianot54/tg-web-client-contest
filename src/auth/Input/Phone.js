/* global tgAuth */

import { InputTextElement } from './Text';

class InputPhoneElement extends InputTextElement {
  constructor() {
    super();

    this._formats = tgAuth.numbersFormatsData.split(';');
    this._code = '';
    this._formatId = '';
    this._regExp = new RegExp('^(.*)?$');
    this._groups = [];
    this._minLength = 7;
    this._maxLength = 15;
    this._prevValue = '';
    this._selectStart = 0;
    this._needUpdateFormat = false;

    this.setAttribute('label', 'Phone Number');
  }

  getNumber() {
    const plain = this._$input.value.replace(/[^0-9.]/g, '');

    let formatted = this._$input.value;
    if(formatted.charAt(0) != '+') formatted = '+' + formatted;

    return {
      plain,
      formatted
    };
  }

  setData(code, formatId) {
    if(this._code == code && this._formatId == formatId) {
      this.setFocus();
      this.dispatchEvent(new CustomEvent('ipDetect'));
      return;
    }

    const format = this._formats[formatId];

    let formatLength = 0;

    if(code) {
      const plainNumber = this.getNumber().plain;
      if(!plainNumber.startsWith(code)) {
        if(plainNumber.startsWith(this._code)) {
          this._$input.value = plainNumber.replace(this._code, code);
        } else {
          this._$input.value = code + this._$input.value;
        }
      }

      if(format) {
        formatLength = format.split(' ').reduce((result, elem) => {
          return result + parseInt(elem);
        }, 0);

        let formatRegExpPart = format.split(' ').reduce((result, count) => {
          return `${result}(.{1,${count}})?`;
        }, '');

        this._regExp = new RegExp(
          `^(.{${code.length}})?${formatRegExpPart}$`
        );

        this._groups = `${code.length} ${format}`.split(' ');
      } else {
        let codeRegExpPart = code
          ? `(.{${code.length}})?`
          : '';

        this._regExp = new RegExp(
          `^${codeRegExpPart}(.*)?$`
        );

        this._groups = [ code.length ];
      }
    } else {
      this._regExp = new RegExp('^(.*)?$');
      this._groups = [];
    }

    this._code = code;
    this._formatId = formatId;

    this._minLength = format ? code.length + formatLength : 7;
    this._maxLength = format ? code.length + formatLength : 15;

    this._needUpdateFormat = true;
    this._prevValue = this._$input.value;
    this._inputHandler({ data: null }, false);
    this.setFocus();
  }

  _inputHandler(e, isSubmitDetect = true) {
    let value = this._$input.value;
    let selectStart = this._$input.selectionStart;

    const isNearSpace = this._prevValue.charAt(selectStart) == ' ';
    if(e.inputType == 'deleteContentBackward' && isNearSpace) {
      value = value.substr(0, selectStart - 1) + value.substr(selectStart);
      selectStart--;
    }
    if(e.inputType == 'deleteContentForward' && isNearSpace) {
      value = value.substr(0, selectStart) + value.substr(selectStart + 1);
    }

    let filteredValue = value.replace(/[^0-9]/g, '');

    if(filteredValue.length > this._maxLength && !this._needUpdateFormat) {
      this._$input.value = this._prevValue;
      selectStart--;
      this._$input.setSelectionRange(selectStart, selectStart);
      return;
    }

    if(this._needUpdateFormat) {
      filteredValue = filteredValue.substr(0, this._maxLength);
    }

    const matches = filteredValue.match(this._regExp);
    let groupFinite = false;

    let formattedValue = '';
    for(let i = 1; i <= 6; i++) {
      if(matches[i]) {
        formattedValue += ' ' + matches[i];

        if(this._groups[i - 1] == matches[i].length) groupFinite = true;
        else groupFinite = false;
      }
    }
    formattedValue = '+' + formattedValue.substr(1);

    if(groupFinite && filteredValue.length != this._maxLength) {
      formattedValue += ' ';
      if(selectStart >= formattedValue.length - 1) selectStart++;
    }

    if(formattedValue.substr(selectStart - 1, 1) == ' ' &&
       e.inputType != 'deleteContentBackward' &&
       e.inputType != 'deleteContentForward') {
      selectStart++;
    }

    if(formattedValue == '+') selectStart = 1;
    if(filteredValue == this._code) selectStart = 99;
    if(!isSubmitDetect) selectStart = 99;

    this._$input.value = formattedValue;
    this._prevValue = formattedValue;

    super._inputHandler();

    if(isSubmitDetect &&
       value.charAt(selectStart) == ' ') {
      selectStart++;
    }

    this._$input.setSelectionRange(selectStart, selectStart);

    this._selectStart = selectStart;

    if(isSubmitDetect) this.dispatchEvent(new CustomEvent('ipDetect'));

    this._$input.setSelectionRange(this._selectStart, this._selectStart);

    if(filteredValue.length >= this._minLength) {
      this.dispatchEvent(new CustomEvent('ipValid'));
    } else {
      this.dispatchEvent(new CustomEvent('ipInvalid'));
    }

    this._needUpdateFormat = false;
  }

  _focusHandler() {
    super._focusHandler();

    if(this._$input.value == '') {
      this._$input.value = '+';
      super._inputHandler();
    }
  }

  _blurHandler() {
    super._blurHandler();

    if(this._$input.value == '+') {
      this._$input.value = '';
      super._inputHandler();
    }
  }
}

if(!customElements.get('tga-input-phone')) {
  customElements.define('tga-input-phone', InputPhoneElement);
}