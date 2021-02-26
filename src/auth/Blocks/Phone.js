/* global tgMain */

import { bindRefs, on } from '../../helpers';

class BlockPhoneElement extends HTMLElement {
  constructor() {
    super();

    this._hasValidPhone = false;
  }

  connectedCallback() {
    this.className = 'auth-screen auth-animated';

    this.innerHTML =
     `<div class="auth-header" ref="header"></div>
      <div class="auth-title">Sign in to Telegram</div>
      <div class="auth-info">
        Please confirm your country and<br>enter your phone number.
      </div>
      <div class="auth-field">
        <tga-input-country ref="inputCountry"></tga-input-country>
      </div>
      <div class="auth-field">
        <tga-input-phone ref="inputPhone"></tga-input-phone>
      </div>
      <div class="auth-field auth-field__padded">
        <tga-input-checkbox checked ref="inputCheckbox">
          Keep me signed in
        </tga-input-checkbox>
      </div>
      <div class="auth-field auth-field__button">
        <tga-button hidden ref="button">Next</tga-button>
      </div>`;

    bindRefs(this);

    this._$header.appendChild(tgMain.resources.auth.logo);

    window.icTest = this._$inputCountry;

    on(this._$inputCountry, 'icSelect', () => {
      const selectedCountry = this._$inputCountry.getSelected();
      this._$inputPhone.setData(selectedCountry.code, selectedCountry.format);

      if(selectedCountry.short) {
        setTimeout(() => {
          this._$inputCountry.filterByNumber(
            this._$inputPhone.getNumber().plain
          );
        }, 300);
      }
    });

    on(this._$inputPhone, 'ipDetect', () => {
      this._$inputCountry.filterByNumber(this._$inputPhone.getNumber().plain);
    });

    on(this._$inputPhone, 'ipValid', () => {
      if(this._hasValidPhone) return;
      this._hasValidPhone = true;

      this._$button.setHidden(false);
    });

    on(this._$inputPhone, 'ipInvalid', () => {
      if(!this._hasValidPhone) return;
      this._hasValidPhone = false;

      this._$button.setHidden(true);
    });

    const bindedSubmit = this._submit.bind(this);
    on(this._$inputPhone, 'itEnter', bindedSubmit);
    on(this._$button, 'bClick', bindedSubmit);
  }

  setCountry(country) {
    this._$inputCountry.setCountry(country);
  }

  getNumber() {
    return this._$inputPhone.getNumber();
  }

  isTemp() {
    return !this._$inputCheckbox.isChecked();
  }

  setError(code) {
    this.setDisabled(false);

    let errorText = '';
    switch(code) {
      case 'AUTH_RESTART':
        errorText = 'Send Code Error, try later';
        break;
      case 'PHONE_NUMBER_INVALID':
        errorText = 'Invalid Phone Number';
        break;
      case 'PHONE_NUMBER_BANNED':
        errorText = 'Phone Number Banned';
        break;
      case 'SMS_CODE_CREATE_FAILED':
        errorText = 'Send Code Error';
        break;
      case 'PHONE_NUMBER_FLOOD':
      case 'PHONE_PASSWORD_FLOOD':
        errorText = 'You asked for the code too many times, try later';
        break;
      default:
        errorText = 'Unknown Error';
    }

    this._$inputPhone.setError(errorText);
    this._$inputPhone.setFocus();
  }

  show() {
    this.style.height = null;
    this.style.overflow = null;

    this.setDisabled(false);
    this.classList.remove('auth-animated__hide-left');
  }

  hide() {
    this.classList.add('auth-animated__hide-left');

    setTimeout(() => {
      this.style.height = '0px';
      this.style.overflow = 'hidden';
    }, 600);
  }

  setDisabled(state) {
    this._$inputCountry.setDisabled(state);
    this._$inputPhone.setDisabled(state);
    this._$inputCheckbox.setDisabled(state);
    this._$button.setLoading(state);
  }

  _submit() {
    if(!this._hasValidPhone) return;

    this.setDisabled(true);
    this.dispatchEvent(new CustomEvent('bpSubmit'));
  }
}

if(!customElements.get('tga-block-phone')) {
  customElements.define('tga-block-phone', BlockPhoneElement);
}