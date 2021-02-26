import { bindRefs, on } from '../../helpers';

class BlockCodeElement extends HTMLElement {
  constructor() {
    super();

    this._isLoading = false;
    this._codeLength = 5;
  }

  connectedCallback() {
    this.className = 'auth-screen auth-animated auth-animated__hide-right';

    this.innerHTML =
     `<div class="auth-header auth-header__monkey">
        <tga-monkey ref="monkey"></tga-monkey>
      </div>
      <div class="auth-animated-wrapper">
        <div class="auth-animated" ref="formCode">
          <div class="auth-title">
            <span ref="phone"></span>
            <span class="icon icon__a icon__edit" ref="editPhone"></span>
          </div>
          <div class="auth-info">
            We have sent you an SMS<br>with the code.
          </div>
          <div class="auth-field" ref="authFieldCode">
            <tga-input-code ref="inputCode"></tga-input-code>
          </div>
        </div>
        <div class="auth-animated auth-animated__hide-right" ref="formPassword">
          <div class="auth-title">Enter a Password</div>
          <div class="auth-info">
            Your account is protected with<br>an additional password.
          </div>
          <div class="auth-field">
            <tga-input-password ref="inputPassword"></tga-input-password>
          </div>
          <div class="auth-field auth-field__button-mt-small">
            <tga-button hidden ref="buttonPassword">Next</tga-button>
          </div>
        </div>
      </div>`;

    bindRefs(this);

    on(this._$editPhone, 'click', () => {
      if(this._isLoading) return;
      this.dispatchEvent(new CustomEvent('bcEditPhone'));
    });

    on(this._$inputCode, 'itFocus', () => {
      this._$monkey.playTrack(
        this._$inputCode.getValue().length, this._codeLength
      );
    });

    on(this._$inputCode, 'itInput', () => {
      this._$monkey.playTrack(
        this._$inputCode.getValue().length, this._codeLength
      );
    });

    on(this._$inputCode, 'itBlur', () => {
      this._$monkey.playIdle();
    });

    on(this._$inputCode, 'itcSubmit', () => {
      this.setDisabledCode(true);

      this._$editPhone.classList.add('a-is-cursor-not-allowed');
      this._isLoading = true;

      this.dispatchEvent(new CustomEvent('bcCodeSubmit'));
    });

    on(this._$inputPassword, 'itpToggle', () => {
      if(!this._$inputPassword.isFocused()) return;

      if(this._$inputPassword.isPasswordShowed()) {
        this._$monkey.playPeek();
      } else {
        this._$monkey.playClose();
      }
    });

    on(this._$inputPassword, 'itFocus', () => {
      if(this._$inputPassword.isPasswordShowed()) {
        this._$monkey.playPeek();
      } else {
        this._$monkey.playClose();
      }
    });

    on(this._$inputPassword, 'itBlur', () => {
      this._$monkey.playIdle();
    });

    on(this._$inputPassword, 'itInput', () => {
      this._$buttonPassword.setHidden(!this._$inputPassword.getValue().length);
    });

    const bindedSubmitPassword = this._submitPassword.bind(this);
    on(this._$inputPassword, 'itEnter', bindedSubmitPassword);
    on(this._$buttonPassword, 'bClick', bindedSubmitPassword);

    this.style.height = '0px';
    this.style.overflow = 'hidden';
  }

  lottieLoaded() {
    this._$monkey.init();
  }

  getCodeValue() {
    return this._$inputCode.getValue();
  }

  getPasswordValue() {
    return this._$inputPassword.getValue();
  }

  setCodeError(code) {
    this.setDisabledCode(false);

    this._$editPhone.classList.remove('a-is-cursor-not-allowed');
    this._isLoading = false;

    let errorText = '';
    switch(code) {
      case 'PHONE_CODE_INVALID':
        errorText = 'Invalid Code';
        break;
      default:
        errorText = 'Unknown Error';
    }

    this._$inputCode.setError(errorText);
    this._$inputCode.setFocus();
  }

  setPasswordError(code) {
    this.setDisabledPassword(false);

    let errorText = '';
    switch(code) {
      case 'PASSWORD_HASH_INVALID':
        errorText = 'Invalid Password';
        break;
      default:
        errorText = 'Unknown Error';
    }

    this._$inputPassword.setError(errorText);
    this._$inputPassword.setFocus();
  }

  setData(formattedPhone, codeLength) {
    this._$phone.textContent = formattedPhone;
    this._$inputCode.setMaxLength(codeLength);
    this._codeLength = codeLength;
  }

  showPasswordForm() {
    this._$formCode.classList.add('auth-animated__hide-left');
    this._$formPassword.classList.remove('auth-animated__hide-right');
    this._$inputPassword.setFocus();
  }

  hidePasswordForm() {
    this._$formCode.classList.remove('auth-animated__hide-left');
    this._$formPassword.classList.add('auth-animated__hide-right');
    this.setDisabledPassword(false);
  }

  show() {
    this.style.height = null;
    this.style.overflow = null;

    this.classList.remove('auth-animated__hide-left');
    this.classList.remove('auth-animated__hide-right');
    this._$inputCode.setFocus();

    setTimeout(() => {
      this._$monkey.play();
    }, 600);
  }

  hide(isLeft) {
    this._$monkey.stop();

    this.setDisabledCode(false);
    this._$inputCode.setValue('');

    this.classList.add(
      isLeft ? 'auth-animated__hide-left' : 'auth-animated__hide-right'
    );

    setTimeout(() => {
      this.style.height = '0px';
      this.style.overflow = 'hidden';
    }, 600);
  }

  setDisabledCode(state) {
    this._$inputCode.setDisabled(state);
    this._$inputCode.setLoading(state);
  }
  setDisabledPassword(state) {
    this._$inputPassword.setDisabled(state);
    this._$buttonPassword.setLoading(state);
  }

  _submitPassword() {
    this.setDisabledPassword(true);

    this.dispatchEvent(new CustomEvent('bcPasswordSubmit'));
  }
}

if(!customElements.get('tga-block-code')) {
  customElements.define('tga-block-code', BlockCodeElement);
}