import { bindRefs, on, onWindow } from '../../helpers';

class ScrollElement extends HTMLElement {
  constructor() {
    super();

    this._handlerHeightDelta = 0;
    this._prevHandlerHeight = 0;
    this._hideHandlerTimeout = 0;

    this.$content = null;
  }

  connectedCallback() {
    this.className = 'a-scroll';

    this.innerHTML =
     `<div class="a-scroll_container" ref="container">
        <div class="a-scroll_content" ref="content">
          ${this.innerHTML}
        </div>
      </div>
      <div class="a-scroll_handler" ref="handler"><div></div></div>`;

    bindRefs(this);

    this.$content = this._$content;

    on(this, 'wheel', e => {
      this._scrollContainer(Math.floor(e.deltaY));
    });

    on(this, 'mouseenter', () => {
      this.update();
    });

    on(this, 'mousemove', this._showHandler);
    on(this, 'mouseleave', this._showHandler);

    let startPos;
    let startScroll;
    let $overlay = null;

    on(this._$handler, 'mousedown', e => {
      startPos = e.y;
      startScroll = this._$container.scrollTop;

      this._$handler.classList.add('is-active');

      $overlay = document.createElement('div');
      $overlay.className = 'page-overlay';
      document.body.appendChild($overlay);
    });

    onWindow('mousemove', e => {
      if(startPos) {
        const delta = e.y - startPos;
        const newScroll = Math.floor(
          startScroll
          + this._$container.scrollHeight * delta
          / (this.offsetHeight - 16 + this._handlerHeightDelta)
        );
        this._scrollContainer(newScroll, true);
      }
    });

    onWindow('mouseup', () => {
      startPos = null;
      this._$handler.classList.remove('is-active');

      if($overlay) {
        $overlay.remove();
        $overlay = null;
      }
    });

    this.dispatchEvent(new CustomEvent('scrlReady'));
  }

  update(domHeight, containerHeight, isResetScroll) {
    let newHandlerHeight = this._calculateHandlerHeight(
      domHeight, containerHeight
    );

    if(newHandlerHeight != this._prevHandlerHeight) {
      this._prevHandlerHeight = newHandlerHeight;
      this._$handler.style.height = newHandlerHeight + 'px';

      if(newHandlerHeight >= domHeight - 17) this.hideHandler();
      else this._scrollContainer(0, true);
    }

    if(isResetScroll) {
      this._scrollContainer(0, true);
    }
  }

  hideHandler() {
    this._$handler.style.opacity = null;
  }

  _scrollContainer(offset, isSet) {
    if(isSet) this._$container.scrollTop = offset;
    else this._$container.scrollTop += offset;

    this._$handler.style.top = (Math.floor(
      8
      + (this._$container.scrollTop / this._$container.scrollHeight)
      * (this.offsetHeight - 16 + this._handlerHeightDelta)
    )) + 'px';
  }

  _showHandler() {
    if(this._prevHandlerHeight >= this.offsetHeight - 17) return;

    if(!this._$handler.style.opacity) this._$handler.style.opacity = '1';
    clearTimeout(this._hideHandlerTimeout);
    this._hideHandlerTimeout = setTimeout(this.hideHandler.bind(this), 2000);
  }

  _calculateHandlerHeight(domHeight, containerHeight) {
    domHeight = domHeight || this.offsetHeight;
    containerHeight = containerHeight || this._$container.scrollHeight;

    const scrollHeight = Math.floor(
      (domHeight - 16)
      * domHeight / containerHeight
    );

    const offsetHeight = Math.floor((domHeight - 16) * 0.1);

    const newHeight = Math.max(scrollHeight, offsetHeight, 25);
    this._handlerHeightDelta = scrollHeight - newHeight;

    return newHeight;
  }
}

if(!customElements.get('tga-scroll')) {
  customElements.define('tga-scroll', ScrollElement);
}