import { domFromHtml, refsFromDom } from '../../../helpers/dom';
import { emojiConverter, createEmojiConverter } from '../../../helpers/emoji';
import { on, onResize, onWindow } from '../../../helpers/utils';

import Scroll from '../Elements/Scroll';

export default function InputCountry(parent, opts) {
  createEmojiConverter(true);
  const countries = TGInit.resources['countries'];

  let countriesHtml = '';
  countries.forEach(country => {
    let flagHtml = emojiConverter.replace_colons(`:flag-${country.c}:`);
    if(country.c == 'none') flagHtml = '';

    countriesHtml +=
     `<div class="select-dropdown_option select-dropdown_option__country">
        <div>${flagHtml}</div>
        <div>${country.n}</div>
        <div>${ country.p ? '+' + country.p : '' }</div>
      </div>`;
  });

  const html =
   `<div class="input-field">
      <label><div ref="label">Country</div><span></span></label>
      <input type="text" ref="input">
      <div class="input-field_dropdown" ref="drop">
        <div class="icon icon__down"></div>
      </div>
      <div class="select-dropdown" ref="dropdown"></div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  let dropdownMaxHeight = 0;

  const scrollComponent = Scroll(refs.dropdown, {
    innerHTML: countriesHtml
  });

  let isOpened = false;
  let inputHasChanges = false;

  const hideDropdown = clearInput => {
    dom.classList.remove('is-focus');
    refs.dropdown.style.height = null;
    scrollComponent.hide();

    if(clearInput && inputHasChanges) {
      refs.input.value = '';
      dom.classList.remove('is-fill');
      opts.onSelect('');
    }
    inputHasChanges = false;

    refs.label.textContent = 'Country';
    isOpened = false;
  };

  on(refs.drop, 'click', () => {
    if(dom.classList.contains('is-focus')) hideDropdown(true);
    else refs.input.focus();
  });

  on(refs.input, 'focus', () => {
    if(isOpened) return;

    dom.classList.add('is-focus');

    for(let i = 0, l = scrollComponent.content.children.length; i < l; i++) {
      scrollComponent.content.children[i].style.display = null;
    }

    const newHeight = changeDropdownMaxHeight(true);
    scrollComponent.update(newHeight, scrollComponent.content.children.length * 56);

    isOpened = true;
  });

  on(refs.input, 'input', () => {
    inputHasChanges = true;
    prevInputValue = refs.input.value;

    const isFill = refs.input.value != '';
    dom.classList[ isFill ? 'add' : 'remove' ]('is-fill');

    const value = refs.input.value.toLowerCase();

    let visibleCount = 0;
    for(let i = 0, l = scrollComponent.content.children.length; i < l; i++) {
      const option = scrollComponent.content.children[i];
      const countryName = option.children[1].textContent.toLowerCase();

      if(countryName.includes(value) || countryName == 'other') {
        option.style.display = null;
        visibleCount++;
      }
      else option.style.display = 'none';
    }

    const newHeight = changeDropdownMaxHeight(true);
    scrollComponent.update(newHeight, visibleCount * 56);
  });

  let prevInputValue = '';
  let prevMoveTarget;

  const optionEnterHandler = function(e) {
    if(this == prevMoveTarget || !isOpened) return;
    prevMoveTarget = this;

    prevInputValue = refs.input.value;
    const countryName = this.children[1].textContent;

    if(prevInputValue) refs.input.value = countryName;
    else refs.label.textContent = countryName;
  };

  const optionLeaveHandler = e => {
    if(!isOpened) return;

    if(prevInputValue) refs.input.value = prevInputValue;
    else refs.label.textContent = 'Country';
  };

  const optionSelectHandler = function(e) {
    refs.input.value = this.children[1].textContent;
    prevInputValue = '';
    hideDropdown();
    dom.classList.add('is-fill');

    opts.onSelect(this.children[2].textContent);
  };

  for(let i = 0, l = scrollComponent.content.children.length; i < l; i++) {
    on(scrollComponent.content.children[i], 'mousemove', optionEnterHandler);
    on(scrollComponent.content.children[i], 'mouseleave', optionLeaveHandler);
    on(scrollComponent.content.children[i], 'click', optionSelectHandler);
  }

  onWindow('mousedown', e => {
    if(isOpened && !dom.contains(e.target)) hideDropdown(true);
  });

  parent.appendChild(dom);

  const changeDropdownMaxHeight = isSet => {
    const defaultDropdownMaxHeight = 375;
    const heightDropdownMaxHeight =
      document.documentElement.scrollHeight
      - (dom.getBoundingClientRect().bottom + window.scrollY)
      - 16;
    const contentHeight = scrollComponent.content.offsetHeight;
    dropdownMaxHeight = Math.min(defaultDropdownMaxHeight, heightDropdownMaxHeight, contentHeight);

    if(isSet === true) refs.dropdown.style.height = dropdownMaxHeight + 'px';

    return dropdownMaxHeight;
  };

  setTimeout(changeDropdownMaxHeight, 1);

  onResize(changeDropdownMaxHeight);

  let disabledState = false;

  return {
    setDisabled: (state, isLoading) => {
      if(disabledState == state) return;
      disabledState = state;

      dom.classList[ state ? 'add' : 'remove' ]('is-disabled');

      if(state) refs.input.setAttribute('disabled', true);
      else refs.input.removeAttribute('disabled');
    }
  };
};