import { on, off } from '../../helpers';

import { ModalElement } from './Modal';

class ModalPhotoElement extends ModalElement {
  constructor() {
    super();

    this._$img = new Image();
    this._context = null;
    this._ratio = 0;
    this._width = 0;
    this._prevWidth = 0;
    this._height = 0;
    this._prevHeight = 0;
    this._x = 0;
    this._prevX = 0;
    this._y = 0;
    this._prevY = 0;
    this._photoData = '';
    this._isAction = false;
    this._actionType = '';
    this._cursor = '';
    this._initDistance = 0;
    this._startX = 0;
    this._startY = 0;
    this._canvasBoundingRect = null;
    this._$pageOverlay = null;
    this._mouseUpHandlerBinded = this._mouseUpHandler.bind(this);
    this._mouseMoveHandlerBinded = this._mouseMoveHandler.bind(this);
    this._isClosing = false;
  }

  connectedCallback() {
    this.setAttribute('header', 'Drag to Reposition');
    this.setAttribute('closable', true);
    this.innerHTML =
     `<canvas ref="canvasImage" width="720" height="720"></canvas>
      <canvas ref="canvasCircle" width="360" height="360"></canvas>`;

    super.connectedCallback();

    this._$header.classList.add('a-modal_header__photo');
    this._$body.style.height = '500px';
    this._context = this._$canvasImage.getContext('2d');

    const contextCircle = this._$canvasCircle.getContext('2d');
    contextCircle.clearRect(0, 0, 360, 360);
    contextCircle.fillStyle = 'rgba(255,255,255,0.68)';
    contextCircle.beginPath();
    contextCircle.arc(180, 180, 160, 0, 2 * Math.PI);
    contextCircle.rect(360, 0, -360, 360);
    contextCircle.fill();

    on(this._$canvasCircle, 'mousedown', e => {
      if(this._isClosing) return;

      this._$pageOverlay = document.createElement('div');
      this._$pageOverlay.className = 'page-overlay';
      document.body.appendChild(this._$pageOverlay);

      this._canvasBoundingRect = this._$canvasCircle.getBoundingClientRect();

      this._isAction = true;
      this._startX = e.layerX + 250;
      this._startY = e.layerY + 250;

      const diffX = this._startX - 180;
      const diffY = this._startY - 180;
      this._initDistance = Math.sqrt(diffX * diffX + diffY * diffY);

      this._handleCursorType(this._startX, this._startY);
      this._actionType = this._cursor == 'move' ? 'move' : 'resize';
    });

    on(window, 'mouseup', this._mouseUpHandlerBinded);
    on(window, 'mousemove', this._mouseMoveHandlerBinded);

    on(this._$canvasCircle, 'mousemove', e => {
      if(this._isAction || this._isClosing) return;
      this._handleCursorType(e.layerX + 250, e.layerY + 250);
    });

    on(this._$canvasCircle, 'mouseleave', () => {
      if(this._isAction) return;
      this._cursor = '';
      document.body.style.cursor = null;
    });
  }

  close() {
    this._isClosing = true;
    off(window, 'mouseup', this._mouseUpHandlerBinded);
    off(window, 'mousemove', this._mouseMoveHandlerBinded);
    document.body.style.cursor = null;

    super.close();
  }

  setImage(data) {
    const $img = this._$img;

    $img.onload = () => {
      const imgWidth = $img.naturalWidth;
      const imgHeight = $img.naturalHeight;

      this._ratio = imgWidth / imgHeight;

      let width = 720;
      let height = 720;

      if(imgWidth > imgHeight) {
        width = imgWidth * 720 / imgHeight;
      } else {
        height = imgHeight * 720 / imgWidth;
      }

      this._width = this._prevWidth = width;
      this._height = this._prevHeight = height;

      let x = 0;
      let y = 0;

      if(imgWidth > imgHeight) {
        x = (720 - width) / 2;
      } else {
        y = (720 - height) / 2;
      }

      this._x = this._prevX = x;
      this._y = this._prevY = y;

      this._draw();
    };
    $img.setAttribute('src', data);
  }

  getPhotoData() {
    return this._photoData;
  }

  _buttonClickHandler() {
    const $tempCanvas = document.createElement('canvas');
    $tempCanvas.width = 640;
    $tempCanvas.height = 640;
    const tempContext = $tempCanvas.getContext('2d');
    tempContext.putImageData(
      this._context.getImageData(40, 40, 640, 640), 0, 0
    );

    this._photoData = $tempCanvas.toDataURL('image/jpeg');

    this.dispatchEvent(new CustomEvent('mpReady'));
  }

  _draw() {
    this._context.clearRect(0, 0, 720, 720);
    this._context.drawImage(
      this._$img, this._x, this._y, this._width, this._height
    );
  }

  _handleCursorType(x, y, onlyResize) {
    let newCursor = '';

    if(!onlyResize) {
      const diffX = x - 180;
      const diffY = y - 180;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);
      if(distance < 160) newCursor = 'move';
    }

    if(!newCursor) {
      const angle = Math.atan2(y - 180, x - 180) * 180 / Math.PI;

      if(angle >= 0) {
        if(angle < 23) newCursor = 'e-resize';
        else if(angle < 68) newCursor = 'se-resize';
        else if(angle < 113) newCursor = 's-resize';
        else if(angle < 158) newCursor = 'sw-resize';
        else newCursor = 'w-resize';
      } else {
        if(angle > -22) newCursor = 'e-resize';
        else if(angle > -67) newCursor = 'ne-resize';
        else if(angle > -112) newCursor = 'n-resize';
        else if(angle > -157) newCursor = 'nw-resize';
        else newCursor = 'w-resize';
      }
    }

    if(newCursor && newCursor != this._cursor) {
      this._cursor = newCursor;
      document.body.style.cursor = newCursor;
    }
  }

  _mouseUpHandler() {
    this._isAction = false;

    this._prevX = this._x;
    this._prevY = this._y;
    this._prevWidth = this._width;
    this._prevHeight = this._height;

    this._cursor = '';
    document.body.style.cursor = null;

    if(this._$pageOverlay) {
      this._$pageOverlay.remove();
      this._$pageOverlay = null;
    }
  }

  _mouseMoveHandler(e) {
    if(!this._isAction || this._isClosing) return;

    const mouseX = e.x - this._canvasBoundingRect.x;
    const mouseY = e.y - this._canvasBoundingRect.y;

    if(this._actionType == 'resize') {
      this._handleCursorType(mouseX, mouseY, true);
    }

    if(this._cursor == 'move') {
      let x = this._prevX + (mouseX - this._startX) * 2;
      let y = this._prevY + (mouseY - this._startY) * 2;

      if(x > 0) x = 0;
      if(y > 0) y = 0;
      if(x + this._width < 720) x = 720 - this._width;
      if(y + this._height < 720) y = 720 - this._height;

      this._x = x;
      this._y = y;
    } else {
      const diffX = mouseX - 180;
      const diffY = mouseY - 180;
      const distance = Math.sqrt(diffX * diffX + diffY * diffY);
      const resizeCoef = distance / this._initDistance;

      let width = this._prevWidth * resizeCoef;
      let height = this._prevHeight * resizeCoef;

      if(width < 720) {
        width = 720;
        height = width / this._ratio;
      }
      if(height < 720) {
        height = 720;
        width = height * this._ratio;
      }

      let x = this._prevX - (width - this._prevWidth) / 2;
      let y = this._prevY - (height - this._prevHeight) / 2;

      if(x > 0) x = 0;
      if(y > 0) y = 0;
      if(x + width < 720) x = 720 - width;
      if(y + height < 720) y = 720 - height;

      this._width = width;
      this._height = height;
      this._x = x;
      this._y = y;
    }

    this._draw();
  }
}

if(!customElements.get('tga-modal-photo')) {
  customElements.define('tga-modal-photo', ModalPhotoElement);
}