import { bindRefs, on } from '../../helpers';

class ButtonElement extends HTMLElement {
  constructor() {
    super();

    this._content = '';
    this._hideTimeout = 0;
    this._$prevWave = null;
    this._$loader = null;
  }

  connectedCallback() {
    const classList = [ 'a-button' ];
    if(this.hasAttribute('circle')) classList.push('a-button__circle');
    if(this.hasAttribute('hidden')) classList.push('a-is-hidden');
    this.className = classList.join(' ');

    this._content = this.innerHTML;

    this.innerHTML = `<span ref="text">${ this._content }</span>`;
    bindRefs(this);

    on(this, 'click', this._click);
  }

  setHidden(state) {
    if(state) {
      this.classList.remove('a-show-down');
      this.classList.add('a-hide-up');
      this._hideTimeout = setTimeout(() => {
        this.classList.add('a-is-hidden');
      }, 330);
    } else {
      clearTimeout(this._hideTimeout);

      this.classList.remove('a-is-hidden');
      this.classList.remove('a-hide-up');
      this.classList.add('a-show-down');
    }
  }

  setLoading(state) {
    this.classList[ state ? 'add' : 'remove' ]('a-button__loading');

    if(state) {
      this._$loader = document.createElement('tga-loader');
      this.appendChild(this._$loader);
    } else {
      if(this._$loader) this._$loader.destroy();
      this._$loader = null;
    }

    const text = state ? 'Please wait...' : this._content;
    this._$text.style.transform = 'rotateX(90deg)';

    setTimeout(() => {
      this._$text.innerHTML = text;
      this._$text.style.transform = null;
    }, 150);
  }

  _click(e) {
    if(this._$loader) return;

    const boundingRect = this.getBoundingClientRect();
    const x = e.x - boundingRect.x;
    const y = e.y - boundingRect.y;

    const wave = document.createElement('div');
    wave.classList.add('a-button_wave');
    wave.style.top = y + 'px';
    wave.style.left = x + 'px';
    if(this.circle) wave.style.animationDuration = '0.3s';

    this.appendChild(wave);

    if(this._$prevWave) {
      this._$prevWave.classList.add('a-button_wave__hide');
    }

    this._$prevWave = wave;

    const halfWidth = this.offsetWidth / 2;
    const fillCoef = (Math.abs(halfWidth - x) + halfWidth) /
      this.offsetWidth;
    setTimeout(() => {
      wave.classList.add('a-button_wave__hide');

      setTimeout(() => {
        this.removeChild(wave);
      }, 330);
    }, Math.ceil((this.circle ? 300 : 600) * fillCoef));

    this.dispatchEvent(new CustomEvent('bClick'));
  }
}

if(!customElements.get('tga-button')) {
  customElements.define('tga-button', ButtonElement);
}