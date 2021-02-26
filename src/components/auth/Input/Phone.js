import { domFromHtml, refsFromDom } from '../../../helpers/dom';
import { on } from '../../../helpers/utils';

export default function InputPhone(parent, opts) {
  const html =
   `<div class="input-field">
      <label><div ref="label">Phone Number</div><span></span></label>
      <div class="input-field_code" ref="code"></div>
      <input type="text" ref="input">
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  let hasError = false;
  let phoneCode = '';

  on(refs.input, 'focus', () => {
    dom.classList.add('is-focus');
  });
  on(refs.input, 'blur', () => {
    dom.classList.remove('is-focus');
  });

  let prevValue = '';
  let needUpdateFormat = false;

  const inputHandler = e => {
    const value = refs.input.value;

    let filteredValue = value.replace(/[^0-9.]/g, '');

    let prevSelectionStart = refs.input.selectionStart;
    let prevSelectionEnd = refs.input.selectionEnd;

    const numberMaxLength = phoneCode
      ? 15 - (phoneCode.length - 1)
      : 15;
    const numberMinLength = phoneCode
      ? 4
      : 7;

    if(filteredValue.length > numberMaxLength && !needUpdateFormat) {
      refs.input.value = prevValue;

      if(e.data) prevSelectionStart--;
      if(e.data) prevSelectionEnd--;

      refs.input.setSelectionRange(prevSelectionStart, prevSelectionEnd);
      return;
    }

    if(needUpdateFormat) {
      filteredValue = filteredValue.substr(0, numberMaxLength);
      prevSelectionStart = prevSelectionEnd = 99;
    }
    needUpdateFormat = false;

    const matches = filteredValue.match(/^(.{1})?(.{2})?(.{2})?(.{2})?(.{2})?(.{2})?(.{2})?(.{2})?(.*)?$/);

    let formattedValue = '';
    if(matches) {
      for(let i = 1; i <= 9; i++) {
        if(matches[i]) {
          formattedValue += ' ' + matches[i];
        }
      }
      if(formattedValue.length > 1) {
        formattedValue = formattedValue.substr(1);
      }
    } else {
      formattedValue = filteredValue;
    }
    if(!phoneCode && value.charAt(0) == '+') formattedValue = '+' + formattedValue;

    refs.input.value = formattedValue;
    prevValue = formattedValue;

    if(hasError) {
      hasError = false;
      dom.classList.remove('input-field__error');
      refs.label.textContent = 'Phone Number';
    }

    if(e.data && formattedValue.substr(prevSelectionStart - 1, 1) == ' ')
      prevSelectionStart++;
    if(e.data && formattedValue.substr(prevSelectionStart - 1, 1) == ' ')
      prevSelectionStart++;
    refs.input.setSelectionRange(prevSelectionStart, prevSelectionStart);

    const phoneNumber = value.replace(/[^0-9.]/g, '');
    if(phoneNumber.length >= numberMinLength) {
      opts.onValidPhone();
    } else {
      opts.onInvalidPhone();
    }

    const isFill = refs.input.value != '';
    dom.classList[ isFill || phoneCode ? 'add' : 'remove' ]('is-fill');
  };

  on(refs.input, 'input', inputHandler);

  on(refs.input, 'keydown', e => {
    if(e.which == 13) opts.onEnter();
  });

  parent.appendChild(dom);

  let disabledState = false;

  return {
    setError: text => {
      hasError = true;
      dom.classList.add('input-field__error');
      refs.label.textContent = text;
    },
    setDisabled: (state, isLoading) => {
      if(disabledState == state) return;
      disabledState = state;

      dom.classList[ state ? 'add' : 'remove' ]('is-disabled');

      if(state) refs.input.setAttribute('disabled', true);
      else refs.input.removeAttribute('disabled');
    },
    setCode: code => {
      phoneCode = code;
      refs.code.textContent = phoneCode ? code + ' ' : '';
      needUpdateFormat = true;
      inputHandler({ data: null });
      refs.input.focus();
    },
    getNumber: () => {
      let plain = '';
      if(phoneCode) plain += phoneCode.substr(1);
      plain += refs.input.value.replace(/[^0-9.]/g, '');

      let formatted = '';
      if(phoneCode) formatted += phoneCode + ' ';
      formatted += refs.input.value;
      if(formatted.charAt(0) != '+') formatted = '+' + formatted;

      return {
        plain,
        formatted
      };
    }
  };
};