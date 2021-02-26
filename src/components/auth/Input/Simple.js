import { domFromHtml, refsFromDom } from '../../../helpers/dom';
import { on } from '../../../helpers/utils';

import Loader from '../Elements/Loader';

export default function InputSimple(parent, opts) {
  const html =
   `<div class="input-field">
      <label><div ref="label">${ opts.label }</div><span></span></label>
      <input type="text" ref="input">
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  let hasError = false;

  on(refs.input, 'focus', () => {
    if(opts.onFocus) opts.onFocus(refs.input);
    dom.classList.add('is-focus');
  });

  on(refs.input, 'blur', () => {
    if(opts.onBlur) opts.onBlur(refs.input);
    dom.classList.remove('is-focus');
  });

  on(refs.input, 'input', e => {
    if(hasError) {
      hasError = false;
      dom.classList.remove('input-field__error');
      refs.label.textContent = opts.label;
    }

    if(opts.onInput) opts.onInput(refs.input, e);

    const isFill = refs.input.value != '';
    dom.classList[ isFill ? 'add' : 'remove' ]('is-fill');
  });

  on(refs.input, 'keydown', e => {
    if(e.which == 13 && opts.onEnter) opts.onEnter();
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