import { bindRefs, on } from '../../helpers';

class BlockRegisterElement extends HTMLElement {
  constructor() {
    super();

    this._hasValidName = false;
    this._termOfService = '';
    this._$photoPreview = null;
    this._photoData = '';
  }

  connectedCallback() {
    this.className = 'auth-screen auth-animated auth-animated__hide-right';

    this.innerHTML =
     `<div class="auth-flex">
        <div class="auth-flex_main">
          <div class="auth-header auth-header__photo" ref="header">
            <label class="auth-photo" ref="photo">
              <div class="auth-photo_overlay auth-photo_overlay__hide"
                  ref="photoOverlay"></div>
              <div class="icon icon__a icon__add-photo"></div>
              <input type="file" ref="file" accept="image/jpeg,image/png">
            </label>
          </div>
          <div class="auth-title">Your Name</div>
          <div class="auth-info">
            Enter your name and add<br>a profile picture
          </div>
          <div class="auth-field">
            <tga-input-text label="Name" ref="inputFirst"></tga-input-text>
          </div>
          <div class="auth-field">
            <tga-input-text label="Last Name (optional)"
                          ref="inputLast"></tga-input-text>
          </div>
          <div class="auth-field auth-field__button-mt-small">
            <tga-button hidden ref="button">Start messaging</tga-button>
          </div>
        </div>
        <div class="auth-flex_footer" ref="termsBlock">
          <div class="auth-info">
            By signing up,<br>you agree to the
            <a href="#" class="a-link" ref="termsLink">Terms of Service</a>.
          </div>
        </div>
      </div>`;

    bindRefs(this);

    on(this._$inputFirst, 'itInput', () => {
      if(this._$inputFirst.getValue().length && !this._hasValidName) {
        this._hasValidName = true;
        this._$button.setHidden(false);
      }

      if(!this._$inputFirst.getValue().length && this._hasValidName) {
        this._hasValidName = false;
        this._$button.setHidden(true);
      }
    });

    on(this._$file, 'change', () => {
      const reader = new FileReader();
      reader.onloadend = () => {
        this._$file.value = '';

        const modalPhotoComponent = document.createElement('tga-modal-photo');
        document.body.appendChild(modalPhotoComponent);
        modalPhotoComponent.setImage(reader.result);

        on(modalPhotoComponent, 'mpReady', () => {
          const photoData = modalPhotoComponent.getPhotoData();
          modalPhotoComponent.close();

          if(this._$photoPreview) this._$photo.removeChild(this._$photoPreview);

          this._$photoPreview = document.createElement('img');
          this._$photoPreview.src = photoData;
          this._$photo.insertBefore(
            this._$photoPreview, this._$photo.firstChild
          );

          this._$photoOverlay.classList.remove('auth-photo_overlay__hide');
          this._photoData = photoData;
        });
      };
      reader.readAsDataURL(this._$file.files[0]);
    });

    const bindedSubmit = this._submit.bind(this);
    on(this._$inputFirst, 'itEnter', bindedSubmit);
    on(this._$inputLast, 'itEnter', bindedSubmit);
    on(this._$button, 'bClick', bindedSubmit);

    on(this._$termsLink, 'click', e => {
      e.preventDefault();

      const termModal = document.createElement('tga-modal');
      termModal.setAttribute('header', 'Terms of Service');
      termModal.innerHTML = this._termOfService.replace(/\n/g, '<br>');
      document.body.appendChild(termModal);
    });

    this.style.height = '0px';
    this.style.overflow = 'hidden';
  }

  getFirstValue() {
    return this._$inputFirst.getValue();
  }

  getLastValue() {
    return this._$inputLast.getValue();
  }

  getPhotoData() {
    return this._photoData;
  }

  setError(code) {
    this.setDisabled(false);

    if(code == 'FIRSTNAME_INVALID') {
      this._$inputFirst.setError('Name Invalid');
    } else if(code == 'LASTNAME_INVALID') {
      this._$inputLast.setError('Last Name Invalid');
      this._$inputLast.setFocus();
      return;
    } else {
      this._$inputFirst.setError('Unknown Error');
    }

    this._$inputFirst.setFocus();
  }

  show(termOfService) {
    this.style.height = null;
    this.style.overflow = null;

    this.classList.remove('auth-animated__hide-right');

    if(termOfService) {
      this._termOfService = termOfService;
    } else {
      this._termOfService = '';
      this._$termsBlock.style.display = 'none';
      this._$inputFirst.setFocus();
    }
  }

  hide() {
    this.setDisabled(false);
    this.classList.add('auth-animated__hide-right');

    setTimeout(() => {
      this.style.height = '0px';
      this.style.overflow = 'hidden';
    }, 600);
  }

  setDisabled(state) {
    this._$inputFirst.setDisabled(state);
    this._$inputLast.setDisabled(state);
    this._$button.setLoading(state);
  }

  _submit() {
    if(!this._hasValidName) return;

    this.setDisabled(true);
    this.dispatchEvent(new CustomEvent('brSubmit'));
  }
}

if(!customElements.get('tga-block-register')) {
  customElements.define('tga-block-register', BlockRegisterElement);
}