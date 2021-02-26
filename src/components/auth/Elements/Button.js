import { domFromHtml, refsFromDom } from '../../../helpers/dom';
import { on } from '../../../helpers/utils';

import Loader from './Loader';

export default function Button(parent, opts) {
  const classList = [];
  if(opts.isBig) classList.push('button__big');
  if(opts.isBlock) classList.push('button__block');
  if(opts.isCircle) classList.push('button__circle');
  if(opts.isHidden) classList.push('is-hidden');

  const html =
   `<button class="button ${ classList.length ? classList.join(' ') : '' }">
      <span ref="text">${opts.text}</span>
    </button>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  let isLoading = false;

  let prevWave;

  on(dom, 'click', e => {
    if(isLoading) return;

    const boundingRect = dom.getBoundingClientRect();
    const x = e.x - boundingRect.x;
    const y = e.y - boundingRect.y;

    const wave = document.createElement('div');
    wave.classList.add('button_wave');
    wave.style.top = y + 'px';
    wave.style.left = x + 'px';
    if(opts.isCircle) wave.style.animationDuration = '0.3s';

    dom.appendChild(wave);

    if(prevWave) {
      prevWave.classList.add('button_wave__hide');
    }

    prevWave = wave;

    const halfWidth = dom.offsetWidth / 2;
    const fillCoef = (Math.abs(halfWidth - x) + halfWidth) / dom.offsetWidth;
    setTimeout(() => {
      wave.classList.add('button_wave__hide');

      setTimeout(() => {
        dom.removeChild(wave);
      }, 330);
    }, Math.ceil((opts.isCircle ? 300 : 600) * fillCoef));

    opts.onClick();
  });

  parent.appendChild(dom);

  let loadingState = false;
  let loader;

  return {
    dom,
    setLoading: state => {
      if(loadingState == state) return;
      loadingState = state;

      isLoading = state;
      dom.classList[ state ? 'add' : 'remove' ]('button__loading');
      refs.text.textContent = state ? 'Please wait...' : opts.text;

      if(state) {
        loader = Loader(dom);
      } else {
        loader.destroy();
        loader = null;
      }
    }
  };
};