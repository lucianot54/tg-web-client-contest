import { domFromHtml, refsFromDom } from '../../../helpers/dom';

export default function InputCheckbox(parent, opts) {
  opts = opts || {};

  const html =
   `<label class="checkbox">
      <input type="checkbox"${ opts.checked ? ' checked' : '' } ref="input">
      <span>Keep me signed in</span>
    </label>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  parent.appendChild(dom);

  let disabledState = false;

  return {
    getState: () => {
      return refs.input.checked ? true : false;
    },
    setDisabled: state => {
      if(disabledState == state) return;
      disabledState = state;

      dom.classList[ state ? 'add' : 'remove' ]('is-disabled');

      if(state) refs.input.setAttribute('disabled', true);
      else refs.input.removeAttribute('disabled');
    }
  };
};