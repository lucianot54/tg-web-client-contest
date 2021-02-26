import { bindRefs } from '../../helpers';

class LoaderElement extends HTMLElement {
  connectedCallback() {
    const classList = [];
    if(this.hasAttribute('blue')) classList.push('loader__blue');
    if(this.hasAttribute('big')) classList.push('loader__big');

    this.innerHTML =
     `<svg class="loader ${ classList.join(' ') }"
           viewBox="25 25 50 50" ref="svg">
        <circle cx="50" cy="50" r="20">
      </svg>`;

    bindRefs(this);
  }

  destroy() {
    return new Promise(resolve => {
      this._$svg.classList.add('loader__hide');
      setTimeout(() => {
        this.remove();
        resolve();
      }, 300);
    });
  }
}

if(!customElements.get('tga-loader')) {
  customElements.define('tga-loader', LoaderElement);
}