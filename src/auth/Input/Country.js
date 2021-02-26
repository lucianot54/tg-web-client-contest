/* global tgAuth */

import { bindRefs, on, onWindow, onWindowResize } from '../../helpers';

class InputCountryElement extends HTMLElement {
  constructor() {
    super();

    this._data = [];
    this._selectedId = null;
    this._isUserSelected = false;
    this._prevTriggeredNumber = '';
    this._prevInputValue = '';
    this._inputHasChanges = false;
    this._isOpened = false;
    this._dropdownMaxHeight = 0;
    this._isUserInteracted = false;
    this._isSkipNextFilter = false;
  }

  connectedCallback() {
    this.className = 'a-input-field';

    let countriesHtml = '';
    tgAuth.countriesData.split('|').forEach((countryString, index) => {
      const country = countryString.split(';');
      const countryName = country[1];
      const countryCode = country[3];

      this._data[index] = {
        short: country[0],
        name: countryName
      };
      if(countryCode) this._data[index].code = countryCode;
      if(country[4]) this._data[index].format = country[4];

      let flagHtml = '';
      if(country.length > 2) {
        flagHtml = '<span class="a-flag" style="background-position:0 -'
          + (country[2] * 24) +
          'px"></span>';
      }

      countriesHtml +=
       `<div class="a-select-dropdown_option" data-id="${index}">
          <div>${flagHtml}</div>
          <div>${countryName}</div>
          <div>${ countryCode ? '+' + countryCode : '' }</div>
        </div>`;
    });

    this.innerHTML =
     `<label><div ref="label">Country</div><span></span></label>
      <input type="text" ref="input" autocomplete="off">
      <div class="a-input-field_dropdown" ref="button">
        <div class="icon icon__a icon__down"></div>
      </div>
      <div class="a-select-dropdown" ref="dropdown">
        <tga-scroll ref="scroll">${countriesHtml}</tga-scroll>
      </div>`;

    bindRefs(this);

    const bindedOptionEnterHandler = this._optionEnterHandler.bind(this);
    const bindedOptionLeaveHandler = this._optionLeaveHandler.bind(this);
    const bindedOptionSelectHandler = this._optionSelectHandler.bind(this);

    for(let i = 0, l = this._$scroll.$content.children.length; i < l; i++) {
      const $option = this._$scroll.$content.children[i];

      on($option, 'mousemove', bindedOptionEnterHandler);
      on($option, 'mouseleave', bindedOptionLeaveHandler);
      on($option, 'click', bindedOptionSelectHandler);
    }

    on(this._$input, 'focus', () => {
      this._isUserInteracted = true;
      if(this._isOpened) return;
      this._isOpened = true;

      let visibleCount = 0;
      for(let i = 0, l = this._$scroll.$content.children.length; i < l; i++) {
        const option = this._$scroll.$content.children[i];
        if(option.style.display === null) visibleCount++;
      }

      this._changeDropdownMaxHeight(true);
      this._$scroll.update(
        this._dropdownMaxHeight, visibleCount * 56
      );

      this.classList.add('is-focus');
      this._$input.setSelectionRange(0, 99);
    });

    on(this._$input, 'input', this._inputHandler.bind(this));

    on(this._$button, 'click', () => {
      if(this.classList.contains('is-focus')) this._hideDropdown(true);
      else this._$input.focus();
    });

    onWindow('mousedown', e => {
      if(this._isOpened && (e.target == window || !this.contains(e.target))) {
        this._hideDropdown(true);
      }
    });

    const bindedChangeDropdownMaxHeight =
      this._changeDropdownMaxHeight.bind(this);
    setTimeout(bindedChangeDropdownMaxHeight, 1);
    onWindowResize(bindedChangeDropdownMaxHeight);
  }

  setCountry(country) {
    if(this._isUserInteracted) return;

    for(let i = 0, l = this._data.length; i < l; i++) {
      if(this._data[i].short == country) {
        this._isSkipNextFilter = true;
        this._selectOption(i);
        break;
      }
    }
  }

  getSelected() {
    return this._selectedId !== null
      ? this._data[this._selectedId]
      : {};
  }

  setDisabled(state) {
    this._$input.style.transition = 'color 0.3s';
    this._$input.offsetWidth;
    this.classList[ state ? 'add' : 'remove' ]('is-disabled');
    this._$input[ (state ? 'set' : 'remove') + 'Attribute' ]('disabled', true);
    this._$input.style.transition = null;
  }

  filterByNumber(number) {
    this._isUserInteracted = true;
    if(number == this._prevTriggeredNumber) return;

    this._prevTriggeredNumber = number;

    if(this._isSkipNextFilter) {
      this._isSkipNextFilter = false;
      return;
    }

    const codeMax = number.substr(0, 4);

    let equalId = -1;
    let isStrictEqual = false;

    if(number != '') {
      for(let i = codeMax.length; i > 0; i--) {
        const code = codeMax.substr(0, i);

        if(code == '7') {
          equalId = this._data.findIndex(elem => elem.short == 'ru');
        } else if(code == '1') {
          equalId = this._data.findIndex(elem => elem.short == 'us');
        } else {
          equalId = this._data.findIndex(elem => elem.code == code);
        }

        if(equalId > -1) {
          isStrictEqual = true;
          break;
        }
      }

      if(equalId < 0) {
        equalId = this._data.length - 1;
      }
    }

    let visibleCount = 0;

    for(let i = 0, l = this._$scroll.$content.children.length; i < l; i++) {
      const option = this._$scroll.$content.children[i];
      if(number == '') {
        option.style.display = null;
        visibleCount++;
        continue;
      }

      const countryCode = option.children[2].textContent.substr(1);

      let hasEqual = false;

      if(isStrictEqual) {
        for(let i = 1, l = codeMax.length; i <= l; i++) {
          let codeSub = codeMax.substr(0, i);

          if(countryCode == codeSub) {
            hasEqual = true;
            break;
          }
        }
      } else {
        hasEqual = countryCode.startsWith(codeMax);
        if(hasEqual) equalId = -1;
      }

      if(!countryCode || hasEqual) {
        option.style.display = null;
        visibleCount++;
      }
      else option.style.display = 'none';
    }

    this._changeDropdownMaxHeight(false);
    this._$scroll.update(
      this._dropdownMaxHeight, visibleCount * 56, true
    );

    if(equalId == this._data.length - 1 ||
       equalId == -1 ||
       (this._selectedId != equalId && !this._isUserSelected) ||
       (this._data[this._selectedId].code &&
        !number.startsWith(this._data[this._selectedId].code))) {
      this._selectOption(equalId);
    }
  }

  _selectOption(id, isUserSelected) {
    this._selectedId = id > -1 ? id : null;
    this._isUserSelected = isUserSelected;

    this._$input.value = id > -1 ? this._data[id].name : '';
    this._prevInputValue = '';
    this._hideDropdown();
    this.classList[ id > -1 ? 'add' : 'remove' ]('is-fill');

    this.dispatchEvent(new CustomEvent('icSelect'));
  }

  _hideDropdown(clearInput) {
    if(clearInput && this._inputHasChanges) {
      this._$input.value = '';
      this._inputHandler();
      this._selectOption(-1);

      this.dispatchEvent(new CustomEvent('icSelect'));
    }

    this.classList.remove('is-focus');
    this._$dropdown.style.height = null;
    this._$scroll.hideHandler();

    this._inputHasChanges = false;

    this._$label.textContent = 'Country';
    this._isOpened = false;
  }

  _inputHandler() {
    this._inputHasChanges = true;
    this._prevInputValue = this._$input.value;

    const isFill = this._$input.value != '';
    this.classList[ isFill ? 'add' : 'remove' ]('is-fill');

    const value = this._$input.value.toLowerCase();

    let visibleCount = 0;
    for(let i = 0, l = this._$scroll.$content.children.length; i < l; i++) {
      const option = this._$scroll.$content.children[i];
      const countryName = option.children[1].textContent.toLowerCase();

      if(countryName.includes(value) || countryName == 'other') {
        option.style.display = null;
        visibleCount++;
      }
      else option.style.display = 'none';
    }

    this._changeDropdownMaxHeight(true);
    this._$scroll.update(this._dropdownMaxHeight, visibleCount * 56);
  }

  _changeDropdownMaxHeight(isSet) {
    const heightDropdownMaxHeight =
      document.documentElement.scrollHeight
      - (this.getBoundingClientRect().bottom + window.scrollY)
      - 16;
    const contentHeight = this._$scroll.$content.offsetHeight;

    this._dropdownMaxHeight = Math.min(
      375, heightDropdownMaxHeight, contentHeight
    );

    if(isSet === true) {
      this._$dropdown.style.height = this._dropdownMaxHeight + 'px';
    }
  }

  _optionEnterHandler(e) {
    const self = e.currentTarget || e.target;

    if(self == this._prevMoveTarget || !this._isOpened) return;
    this._prevMoveTarget = self;

    this._prevInputValue = this._$input.value;
    const countryName = self.children[1].textContent;

    if(this._prevInputValue) this._$input.value = countryName;
    else this._$label.textContent = countryName;
  }

  _optionLeaveHandler() {
    if(!this._isOpened) return;

    this._prevMoveTarget = null;

    if(this._prevInputValue) this._$input.value = this._prevInputValue;
    else this._$label.textContent = 'Country';
  }

  _optionSelectHandler(e) {
    const self = e.currentTarget || e.target;
    this._selectOption(self.dataset.id, true);
  }
}

if(!customElements.get('tga-input-country')) {
  customElements.define('tga-input-country', InputCountryElement);
}