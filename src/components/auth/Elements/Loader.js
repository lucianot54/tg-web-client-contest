import { domFromHtml } from '../../../helpers/dom';
import { deferred } from '../../../helpers/utils';

export default function Loader(parent, opts) {
  opts = opts || {};

  const classList = [];
  if(opts.isBlue) classList.push('loader__blue');
  if(opts.isBig) classList.push('loader__big');

  const html =
    `<svg class="loader ${ classList.length ? classList.join(' ') : '' }" viewBox="25 25 50 50">
       <circle cx="50" cy="50" r="20" stroke-miterlimit="10">
     </svg>`;

  const dom = domFromHtml(html);

  parent.appendChild(dom);

  return {
    destroy: () => {
      const defer = deferred();

      dom.classList.add('loader__hide');
      setTimeout(() => {
        parent.removeChild(dom);
        defer.resolve();
      }, 300);

      return defer.promise;
    }
  };
};