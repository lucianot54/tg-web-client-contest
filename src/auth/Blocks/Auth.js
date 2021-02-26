/* global tgMain, tgProto */

import {
  bindRefs,
  on,
  offWindowAll,
  clearWindowResize
} from '../../helpers';

import {
  sendCode,
  cancelCode,
  signIn,
  signUp,
  checkPassword
} from '../Api/auth';

import {
  uploadProfilePhoto,
  uploadFile
} from '../Api/utils';

class BlockAuthElement extends HTMLElement {
  constructor() {
    super();

    this._isShowingEnd = false;
    this._isProtoInited = false;
    this._isPhoneEntered = false;
    this._phoneNumber = '';
    this._phoneHash = '';
    this._isCountrySetted = false;
    this._detectedCountry = '';
  }

  connectedCallback() {
    this.className = 'auth a-show-down-screen';

    this.innerHTML =
     `<tga-block-phone ref="blockPhone"></tga-block-phone>
      <tga-block-code ref="blockCode"></tga-block-code>
      <tga-block-register ref="blockRegister"></tga-block-register>`;

    bindRefs(this);

    on(this._$blockPhone, 'bpSubmit', () => {
      this._isPhoneEntered = true;

      if(this._isProtoInited) this._sendCode();
    });

    on(this._$blockCode, 'bcEditPhone', () => {
      cancelCode(this._phoneNumber, this._phoneHash);
      this._$blockCode.hide();
      this._$blockPhone.show();
    });

    on(this._$blockCode, 'bcCodeSubmit', async () => {
      const result = await signIn(
        this._phoneNumber, this._phoneHash, this._$blockCode.getCodeValue()
      );

      if(result.err) {
        if(result.err == 'PHONE_NUMBER_UNOCCUPIED') {
          this._$blockCode.hide(true);
          this._$blockRegister.show('');
          return;
        }

        if(result.err == 'PHONE_CODE_EXPIRED') {
          this._$blockCode.hide();
          this._$blockPhone.show();

          this._showInfoModal(
            'Timeout Error',
            'Phone code expired, try resend it.'
          );

          return;
        }

        if(this._isFloodError(result.err)) {
          this._$blockCode.setDisabledCode(false);
          return;
        }

        return this._$blockCode.setCodeError(result.err);
      }

      if(result.next == 'done') this._initApp();

      if(result.next == 'pass') this._$blockCode.showPasswordForm();

      if(result.next == 'reg') {
        this._$blockCode.hide(true);
        this._$blockRegister.show(result.termOfService);
      }
    });

    on(this._$blockCode, 'bcPasswordSubmit', async () => {
      const result = await checkPassword(this._$blockCode.getPasswordValue());

      if(result.err) {
        if(this._isFloodError(result.err)) {
          this._$blockCode.setDisabledPassword(false);
          return;
        }

        return this._$blockCode.setPasswordError(result.err);
      }

      if(result.next == 'done') this._initApp();

      if(result.next == 'reg') {
        this._$blockCode.hide(true);
        this._$blockRegister.show(result.termOfService);
      }
    });

    on(this._$blockRegister, 'brSubmit', async () => {
      const result = await signUp(
        this._plainPhone, this._hashPhone,
        this._$blockRegister.getFirstValue(),
        this._$blockRegister.getLastValue()
      );

      if(result.err) {
        if(result.err == 'PHONE_CODE_EXPIRED') {
          this._$blockRegister.hide();
          this._$blockCode.hidePasswordForm();
          this._$blockCode.hide();
          this._$blockPhone.show();

          this._showInfoModal(
            'Timeout Error',
            'Phone code expired, try resend it.'
          );

          return;
        }

        if(this._isFloodError(result.err)) {
          this._$blockRegister.setDisabled(false);
          return;
        }

        return this._$blockRegister.setError(result.err);
      }

      const photoData = this._$blockRegister.getPhotoData();
      if(!photoData) return this._initApp();

      const bytes = Uint8Array.from(atob(photoData.split(',')[1]), c => {
        return c.charCodeAt(0);
      });

      const inputFile = await uploadFile(bytes);
      await uploadProfilePhoto(inputFile);

      this._initApp();
    });

    let isConnectedAfterError = true;

    tgProto.onCountryDetected = country => {
      if(this._isShowingEnd) {
        this._isCountrySetted = true;
        this._$blockPhone.setCountry(country.toLowerCase());
      } else {
        this._detectedCountry = country;
      }
    };

    tgProto.onConnect = () => {
      isConnectedAfterError = true;
    };

    tgProto.onDisconnect = () => {
      if(!isConnectedAfterError) return;
      isConnectedAfterError = false;

      const xhr = new XMLHttpRequest();
      xhr.open(
        'HEAD',
        `//${location.host}${location.pathname}?${Date.now()}`,
        true
      );
      xhr.timeout = 2000;

      xhr.onload = () => {
        this._showInfoModal(
          'Network Error',
          `Error connecting to Telegram servers.
           It looks like in your region access to Telegram is blocked.
           Try using VPN or proxy server to bypass the blocking.`
        );
      };

      xhr.ontimeout = xhr.onerror = () => {
        this._showInfoModal(
          'Network Error',
          `Error connecting to Telegram servers.
           It looks like internet connection is lost.
           Check your internet connection and try again.`
        );
      };

      xhr.send(null);
    };

    setTimeout(() => {
      this._isShowingEnd = true;

      if(this._detectedCountry) {
        this._$blockPhone.setCountry(this._detectedCountry.toLowerCase());
      }
    }, 1000);

    window.onkeydown = e => {
      if(e.which == 9) e.preventDefault();
    };
  }

  async protoInited() {
    this._isProtoInited = true;

    if(this._isPhoneEntered) {
      this._sendCode();
      return;
    }

    if(this._isCountrySetted) return;

    const country = await tgProto.getCountry();
    if(this._isShowingEnd) {
      this._$blockPhone.setCountry(country.toLowerCase());
    } else {
      this._detectedCountry = country;
    }
  }

  lottieLoaded() {
    this._$blockCode.lottieLoaded();
  }

  async _sendCode() {
    const number = this._$blockPhone.getNumber();

    const result = await sendCode(number.plain);

    if(result.err) {
      if(this._isFloodError(result.err)) {
        this._$blockPhone.setDisabled(false);
        return;
      }

      return this._$blockPhone.setError(result.err);
    }

    const isTemp = this._$blockPhone.isTemp();
    tgMain.changeStorageType(isTemp);

    this._phoneNumber = number.plain;
    this._phoneHash = result.hash;

    this._$blockCode.setData(number.formatted, result.codeLength);

    this._$blockPhone.hide();
    this._$blockCode.show();
  }

  _isFloodError(errCode) {
    if(errCode.split('_')[0] != 'FLOOD') return false;

    this._showInfoModal(
      'Flood Error',
      `The maximum allowed number of attempts
        to do this action has been exceeded.<br>
        Try again after ${errCode.split('_')[2]} sec.`
    );

    return true;
  }

  _showInfoModal(header, html) {
    const modalComponent = document.createElement('tga-modal');
    modalComponent.setAttribute('header', header);
    modalComponent.innerHTML = html;
    document.body.appendChild(modalComponent);
  }

  _initApp() {
    tgProto.exportAuth();

    const $pageOverlay = document.createElement('div');
    $pageOverlay.className = 'page-overlay';
    document.body.appendChild($pageOverlay);

    tgMain.loadApp();

    document.body.style.overflow = 'hidden';
    this.classList.add('a-hide-up-screen');

    tgProto.onConnect = null;
    tgProto.onDisconnect = null;
    clearWindowResize();
    offWindowAll();

    this.onanimationend = () => {
      this.remove();
      $pageOverlay.remove();
      document.body.style.overflow = null;
      window.onkeydown = null;

      tgMain.initApp();
    };
  }
}

if(!customElements.get('tga-block-auth')) {
  customElements.define('tga-block-auth', BlockAuthElement);
}