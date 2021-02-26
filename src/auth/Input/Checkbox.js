import { bindRefs, on } from '../../helpers';

class InputCheckboxElement extends HTMLElement {
  constructor() {
    super();

    this._isDisabled = false;
  }

  connectedCallback() {
    this.className = 'a-checkbox';

    this.innerHTML =
     `<input type="checkbox" ref="input"
              ${ this.hasAttribute('checked') ? ' checked' : '' }>
      <span>${ this.textContent }</span>`;

    bindRefs(this);

    on(this, 'click', () => {
      if(!this._isDisabled) this._$input.checked = !this._$input.checked;
    });
  }

  isChecked() {
    return this._$input.checked;
  }

  setDisabled(state) {
    this._isDisabled = state;
    this.classList[ state ? 'add' : 'remove' ]('is-disabled');
    this._$input[ (state ? 'set' : 'remove') + 'Attribute' ]('disabled', true);
  }
}

if(!customElements.get('tga-input-checkbox')) {
  customElements.define('tga-input-checkbox', InputCheckboxElement);
}