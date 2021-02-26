import {
  bindRefs,
  on,
  onWindow,
  onWindowResize
} from '../../helpers';

class ScrollElement extends HTMLElement {
  constructor() {
    super();

    this._handlerHeightDelta = 0;
    this._prevHandlerHeight = 0;
    this._topOffset = 0;
    this._verticalOffset = 0;
    this._noScrollOnUpdate = false;
    this._updated = false;

    this.$content = null;
    this.startScroll = 0;
    this.scrollValue = null;
    this.scrollValuePx = null;
  }

  connectedCallback() {
    this.className = 'scroll';

    this.innerHTML =
     `<div class="scroll_container" ref="container">
        <div class="scroll_content" ref="content">
          ${this.innerHTML}
        </div>
      </div>
      <div class="scroll_handler" ref="handler"><div></div></div>`;

    bindRefs(this);

    const noScrollOnUpdateAttribute = this.hasAttribute('no-scroll-update');
    if(noScrollOnUpdateAttribute) this._noScrollOnUpdate = true;

    const sideOffsetAttribute = this.getAttribute('offset-side');
    if(sideOffsetAttribute) {
      this._$handler.style.padding = `0 ${sideOffsetAttribute}px`;
    }

    const topOffset = parseInt(this.getAttribute('offset-top'));
    if(topOffset) {
      this._topOffset = topOffset;
      this._verticalOffset = topOffset;
    }
    const bottomOffset = parseInt(this.getAttribute('offset-bottom'));
    if(bottomOffset) this._verticalOffset += bottomOffset;

    this.$content = this._$content;

    on(this, 'wheel', e => {
      let delta = e.deltaY;
      if(e.deltaMode == 1) delta *= 40;
      this._scrollContainer(Math.round(delta));
    });

    on(this, 'mouseenter', () => {
      this.update();
      this._showHandler();
    });

    on(this, 'mousemove', () => {
      this.update();
      this._showHandler();
    });

    on(this, 'mouseleave', this.hideHandler);

    let $overlay = null;

    on(this._$handler, 'mousedown', e => {
      this.startPos = e.y;
      this.startScroll = this._$container.scrollTop;

      this._$handler.classList.add('is-active');

      $overlay = document.createElement('div');
      $overlay.className = 'page-overlay';
      document.body.appendChild($overlay);
    });

    onWindow('mousemove', e => {
      this.lastMousePos = e.y;

      if(this.startPos) {
        const delta = e.y - this.startPos;
        const newScroll = Math.round(
          this.startScroll
          + this._$container.scrollHeight * delta
          / (this.offsetHeight - this._verticalOffset
             + this._handlerHeightDelta)
        );
        this._scrollContainer(newScroll, true);
      }
    });

    onWindow('mouseup', () => {
      this.startPos = null;
      this._$handler.classList.remove('is-active');

      if($overlay) {
        $overlay.remove();
        $overlay = null;
      }
    });

    onWindowResize(this.update.bind(this));
  }

  update(domHeight, containerHeight, isResetScroll) {
    domHeight = domHeight || this.offsetHeight;

    let newHandlerHeight = this._calculateHandlerHeight(
      domHeight, containerHeight
    );

    if(newHandlerHeight != this._prevHandlerHeight) {
      this._prevHandlerHeight = newHandlerHeight;
      this._$handler.style.height = newHandlerHeight + 'px';

      if(newHandlerHeight >= domHeight - this._verticalOffset) {
        this.hideHandler();
        this.classList.remove('is-hoverable');
      }
      else {
        if(!this._noScrollOnUpdate) this._scrollContainer(0, true);
        this.classList.add('is-hoverable');
      }

      this._updated = true;
    }

    if(isResetScroll) {
      this._scrollContainer(0, true);
    }
  }

  hideHandler() {
    this._$handler.style.opacity = null;
  }

  _scrollContainer(offset, isSet, diff) {
    if(isSet) this._$container.scrollTop = offset;
    else this._$container.scrollTop += offset;

    const maxScrollTop = this._$container.scrollHeight - this.offsetHeight;
    const newScrollValue = maxScrollTop > 0
      ? Math.ceil(this._$container.scrollTop) / maxScrollTop
      : null;

    if(newScrollValue != this.scrollValue || this._updated) {
      this._updated = false;

      this.scrollValue = newScrollValue;
      this.scrollValuePx = this._$container.scrollTop;
      this.dispatchEvent(new CustomEvent('scrollValueUpdate'));

      this._$handler.style.top = (Math.ceil(
        this._topOffset
        + (this._$container.scrollTop / this._$container.scrollHeight)
        * (this.offsetHeight - this._verticalOffset + this._handlerHeightDelta)
      )) + 'px';

      if(isSet && diff && this.startPos !== null) {
        this.startScroll = this._$container.scrollTop;
        this.startPos = this.lastMousePos;
      }
    }
  }

  _showHandler() {
    if(this._prevHandlerHeight >= this.offsetHeight - this._verticalOffset) {
      return;
    }

    if(!this._$handler.style.opacity) this._$handler.style.opacity = '1';
  }

  _calculateHandlerHeight(domHeight, containerHeight) {
    containerHeight = containerHeight || this._$container.scrollHeight;

    const scrollHeight = Math.round(
      (domHeight - this._verticalOffset)
      * domHeight / containerHeight
    );

    const offsetHeight = Math.ceil((domHeight - this._verticalOffset) * 0.1);

    const newHeight = Math.max(scrollHeight, offsetHeight, 25);
    this._handlerHeightDelta = scrollHeight - newHeight;

    return newHeight;
  }
}

if(!customElements.get('tg-scroll')) {
  customElements.define('tg-scroll', ScrollElement);
}