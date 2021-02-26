import { domFromHtml, refsFromDom } from '../../helpers/dom';

import Button from './Elements/Button';
import InputCountry from './Input/Country';
import InputPhone from './Input/Phone';
import InputCheckbox from './Input/Checkbox';

export default function AuthPhone(parent, opts) {
  const html =
   `<div class="auth-screen auth-animated show-down-screen">
      <div class="auth-header" ref="header"></div>
      <div class="auth-title">Sign in to Telegram</div>
      <div class="auth-info">
        Please confirm your country and<br>enter your phone number.
      </div>
      <div class="auth-field" ref="fieldCountry"></div>
      <div class="auth-field" ref="fieldPhone"></div>
      <div class="auth-field auth-field__padded" ref="fieldCheckbox"></div>
      <div class="auth-field auth-field__button" ref="fieldButton"></div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  refs.header.appendChild(TGInit.resources['logo.svg']);

  const submit = () => {
    if(!hasValidPhone) return;

    buttonComponent.setLoading(true);
    inputPhoneComponent.setDisabled(true);
    inputCountryComponent.setDisabled(true);
    inputChecboxComponent.setDisabled(true);

    const phoneNumber = inputPhoneComponent.getNumber();

    opts.sendCode(phoneNumber.plain)
    .then(result => {
      if(result.err) {
        buttonComponent.setLoading(false);
        inputPhoneComponent.setDisabled(false);
        inputCountryComponent.setDisabled(false);
        inputChecboxComponent.setDisabled(false);

        let errorText = '';
        if(result.err == 'AUTH_RESTART') errorText = 'Send Code Error, try later';
        if(result.err == 'PHONE_NUMBER_INVALID') errorText = 'Invalid Phone Number';
        if(result.err == 'PHONE_NUMBER_BANNED') errorText = 'Phone Number Banned';
        if(result.err == 'SMS_CODE_CREATE_FAILED') errorText = 'Send Code Error';
        if(result.err == 'PHONE_NUMBER_FLOOD' ||
           result.err == 'PHONE_PASSWORD_FLOOD') errorText = 'You asked for the code too many times, try later';

        inputPhoneComponent.setError(errorText);
        return;
      }

      MTProto.initAllDc();

      const isTemp = !inputChecboxComponent.getState();

      opts.phoneEntered(phoneNumber.plain, phoneNumber.formatted, result.hash, result.codeLength, isTemp);
    });

    /*MTProto.auth.sendCode(phoneNumber.plain)
    .then(result => {
      if(result.err) {
        buttonComponent.setLoading(false);
        inputPhoneComponent.setDisabled(false);
        inputCountryComponent.setDisabled(false);
        inputChecboxComponent.setDisabled(false);

        let errorText = '';
        if(result.err == 'PHONE_NUMBER_INVALID') errorText = 'Invalid Phone Number';
        if(result.err == 'PHONE_NUMBER_BANNED') errorText = 'Phone Number Banned';
        if(result.err == 'SMS_CODE_CREATE_FAILED') errorText = 'Send Code Error';
        if(result.err == 'PHONE_NUMBER_FLOOD' ||
           result.err == 'PHONE_PASSWORD_FLOOD') errorText = 'You asked for the code too many times, try later';

        inputPhoneComponent.setError(errorText);
        return;
      }

      MTProto.initAllDc();

      const isTemp = !inputChecboxComponent.getState();

      opts.phoneEntered(phoneNumber.plain, phoneNumber.formatted, result.hash, result.codeLength, isTemp);
    });*/
  };

  const onSelectCountry = code => {
    inputPhoneComponent.setCode(code);
  };

  let hasValidPhone = false;
  let hideTimeout;

  const showButton = () => {
    if(hasValidPhone) return;
    hasValidPhone = true;
    clearTimeout(hideTimeout);

    buttonComponent.dom.classList.remove('is-hidden');
    buttonComponent.dom.classList.remove('hide-up');
    buttonComponent.dom.classList.add('show-down');
  };

  const hideButton = () => {
    if(!hasValidPhone) return;
    hasValidPhone = false;

    buttonComponent.dom.classList.remove('show-down');
    buttonComponent.dom.classList.add('hide-up');
    hideTimeout = setTimeout(() => {
      buttonComponent.dom.classList.add('is-hidden');
    }, 330);
  };

  const inputCountryComponent = InputCountry(refs.fieldCountry, {
    onSelect: onSelectCountry
  });
  const inputPhoneComponent = InputPhone(refs.fieldPhone, {
    onValidPhone: showButton,
    onInvalidPhone: hideButton,
    onEnter: submit
  });
  const inputChecboxComponent = InputCheckbox(refs.fieldCheckbox, {
    checked: true
  });
  const buttonComponent = Button(refs.fieldButton, {
    text: 'Next',
    isBig: true,
    isBlock: true,
    isHidden: true,
    onClick: submit
  });

  parent.appendChild(dom);

  return {
    hide: () => {
      dom.classList.add('auth-animated__hide-left');
    },
    show: () => {
      buttonComponent.setLoading(false);
      inputPhoneComponent.setDisabled(false);
      inputCountryComponent.setDisabled(false);
      inputChecboxComponent.setDisabled(false);
      dom.classList.remove('auth-animated__hide-left');
    }
  };
};