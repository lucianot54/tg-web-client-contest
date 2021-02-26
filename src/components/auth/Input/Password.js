import { domFromHtml, refsFromDom } from '../../../helpers/dom';
import { on } from '../../../helpers/utils';

import Loader from '../Elements/Loader';

export default function InputPassword(parent, opts) {
  const html =
   `<div class="input-field">
      <label><div ref="label">Password</div><span></span></label>
      <input type="password" ref="input">
      <div class="input-field_password" ref="toggle">
        <div class="icon icon__eye-show" ref="toggleIcon"></div>
      </div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  let hasError = false;

  let passwordShow = false;

  let isFocused = false;
  let blurTimeout;

  on(refs.toggle, 'click', () => {
    if(disabledState) return;

    passwordShow = !passwordShow;

    if(passwordShow) {
      refs.toggleIcon.classList.remove('icon__eye-show');
      refs.toggleIcon.classList.add('icon__eye-hide');
      refs.input.setAttribute('type', 'text');
    } else {
      refs.toggleIcon.classList.add('icon__eye-show');
      refs.toggleIcon.classList.remove('icon__eye-hide');
      refs.input.setAttribute('type', 'password');
    }

    opts.onToggle(passwordShow);
    if(isFocused) refs.input.focus();
  });

  on(refs.input, 'focus', () => {
    isFocused = true;
    clearTimeout(blurTimeout);
    if(opts.onFocus) opts.onFocus(refs.input);
    dom.classList.add('is-focus');
  });

  on(refs.input, 'blur', () => {
    if(opts.onBlur) opts.onBlur(refs.input);
    dom.classList.remove('is-focus');

    blurTimeout = setTimeout(() => {
      isFocused = false;
    }, 150);
  });

  on(refs.input, 'input', e => {
    if(hasError) {
      hasError = false;
      dom.classList.remove('input-field__error');
      refs.label.textContent = 'Password';
    }

    if(opts.onInput) opts.onInput(refs.input, e);

    const isFill = refs.input.value != '';
    dom.classList[ isFill ? 'add' : 'remove' ]('is-fill');
  });

  on(refs.input, 'keydown', e => {
    if(e.which == 13) opts.onEnter();
  });

  parent.appendChild(dom);

  let disabledState = false;
  let loader;

  return {
    refs,
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

      if(isLoading) {
        loader = Loader(dom, {
          isBlue: true
        });
      }

      if(!state && loader) {
        loader.destroy();
        loader = null;
      }
    }
  };
};