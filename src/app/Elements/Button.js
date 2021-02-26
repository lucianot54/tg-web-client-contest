import { bindRefs, on } from '../../helpers';

// TODO обычная кнопка, скорость анимации wave
// TODO disabled, loading state?

class ButtonElement extends HTMLElement {
  constructor() {
    super();

    this._$prevWave = null;
  }

  connectedCallback() {
    const classList = [ 'button' ];
    this.className = classList.join(' ');

    let html = '';

    const iconAttribute = this.getAttribute('icon');
    if(iconAttribute) {
      html = `<span class="icon icon__${iconAttribute}"></span>`;
    }

    this.innerHTML = html;
    bindRefs(this);

    on(this, 'click', this._click);
  }

  _click(e) {
    const boundingRect = this.getBoundingClientRect();
    const x = e.x - boundingRect.x;
    const y = e.y - boundingRect.y;

    const wave = document.createElement('div');
    wave.classList.add('button_wave');
    wave.style.top = y + 'px';
    wave.style.left = x + 'px';

    this.appendChild(wave);

    if(this._$prevWave) this._$prevWave.classList.add('button_wave__hide');
    this._$prevWave = wave;

    this.classList.add('is-hover');

    const halfWidth = this.offsetWidth / 2;
    const fillCoef = (Math.abs(halfWidth - x) + halfWidth) / this.offsetWidth;

    setTimeout(() => {
      wave.classList.add('button_wave__hide');
      this.classList.remove('is-hover');

      setTimeout(() => {
        this.removeChild(wave);
      }, 450);
    }, 450 * fillCoef);

    this.dispatchEvent(new CustomEvent('bClick'));
  }
}

if(!customElements.get('tg-button')) {
  customElements.define('tg-button', ButtonElement);
}