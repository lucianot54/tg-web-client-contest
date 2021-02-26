import { domFromHtml, refsFromDom } from '../../helpers/dom';
import { on, onWindow } from '../../helpers/utils';

import Button from './Elements/Button';
import InputSimple from './Input/Simple';

export default function AuthRegister(parent, opts) {
  const html =
   `<div class="auth-screen auth-animated auth-animated__hide-right">
      <div class="auth-header" ref="header">
        <label class="auth-photo" ref="photo">
          <div class="auth-photo_overlay auth-photo_overlay__hide" ref="photoOverlay"></div>
          <div class="icon icon__add-photo"></div>
          <input type="file" ref="file" accept="image/jpeg,image/png">
        </label>
      </div>
      <div class="auth-title">Your Name</div>
      <div class="auth-info">
        Enter your name and add<br>a profile picture
      </div>
      <div class="auth-field" ref="fieldFirst"></div>
      <div class="auth-field" ref="fieldLast"></div>
      <div class="auth-field auth-field__button" ref="fieldButton"></div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  const modalHtml =
   `<div class="auth-photo-modal">
      <div class="auth-photo-modal_overlay" ref="overlay"></div>
      <div class="auth-photo-modal_content" ref="content">
        <div class="auth-photo-modal_close" ref="close">
          <div class="icon icon__close"></div>
        </div>
        <div class="auth-photo-modal_header">Drag to Reposition</div>
        <div class="auth-photo-modal_button" ref="button"></div>
        <div class="auth-photo-modal_body">
          <canvas ref="canvasImage" width="720" height="720"></canvas>
          <canvas ref="canvasCircle" width="360" height="360"></canvas>
        </div>
      </div>
    </div>`;

  const modalDom = domFromHtml(modalHtml);
  const modalRefs = refsFromDom(modalDom);

  let photoData = '';
  let imgPlaceholder;

  const modalButton = Button(modalRefs.button, {
    text: '<span class="icon icon__check"></span>',
    isCircle: true,
    onClick: () => {
      const sideSize = 720 - 80;

      let imageData = modalRefs.canvasImage.getContext('2d')
        .getImageData(40, 40, sideSize, sideSize);

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = sideSize;
      tempCanvas.height = sideSize;
      const tempContext = tempCanvas.getContext('2d');
      tempContext.putImageData(imageData, 0, 0);

      photoData = tempCanvas.toDataURL('image/jpeg');

      if(imgPlaceholder) refs.photo.removeChild(imgPlaceholder);

      imgPlaceholder = document.createElement('img');
      imgPlaceholder.src = photoData;
      refs.photo.insertBefore(imgPlaceholder, refs.photo.firstChild);

      refs.photoOverlay.classList.remove('auth-photo_overlay__hide');

      closeModal();
    }
  });

  const closeModal = () => {
    modalRefs.content.classList.add('hide-down');
    modalRefs.overlay.classList.add('auth-photo-modal_overlay__hide');

    setTimeout(() => {
      modalDom.classList.remove('auth-photo-modal__active');
      modalRefs.content.classList.remove('hide-down');
      modalRefs.overlay.classList.remove('auth-photo-modal_overlay__hide');
    }, 300);
  };

  on(modalRefs.close, 'click', closeModal);

  document.body.appendChild(modalDom);

  const contextCircle = modalRefs.canvasCircle.getContext('2d');
  contextCircle.clearRect(0, 0, 360, 360);
  contextCircle.fillStyle = 'rgba(255,255,255,0.5)';
  contextCircle.beginPath();
  contextCircle.arc(180, 180, 160, 0, 2 * Math.PI);
  contextCircle.rect(360, 0, -360, 360);
  contextCircle.fill();

  let cursorType = 'auto';

  let mouseStartX = 0;
  let mouseStartY = 0;
  let isAction = false;
  let actionType;
  let initDistance = 0;

  const handleCursorType = (x, y) => {
    const diffX = x - 180;
    const diffY = y - 180;
    const distance = Math.sqrt(diffX * diffX + diffY * diffY);

    let newCursorType;
    if(distance < 160) newCursorType = 'move';
    else {
      const angle = Math.atan2(y - 180, x - 180)
      * 180 / Math.PI;

      if(angle >= 0) {
        if(angle < 23) newCursorType = 'e-resize';
        else if(angle < 68) newCursorType = 'se-resize';
        else if(angle < 113) newCursorType = 's-resize';
        else if(angle < 158) newCursorType = 'sw-resize';
        else newCursorType = 'w-resize';
      } else {
        if(angle > -22) newCursorType = 'e-resize';
        else if(angle > -67) newCursorType = 'ne-resize';
        else if(angle > -112) newCursorType = 'n-resize';
        else if(angle > -157) newCursorType = 'nw-resize';
        else newCursorType = 'w-resize';
      }
    }

    if(newCursorType != cursorType) {
      cursorType = newCursorType;
      document.body.style.cursor = cursorType;
    }
  };

  on(modalRefs.canvasCircle, 'mousedown', e => {
    canvasBoundingRect = modalRefs.canvasCircle.getBoundingClientRect();

    isAction = true;
    mouseStartX = e.layerX;
    mouseStartY = e.layerY;

    const diffX = mouseStartX - 180;
    const diffY = mouseStartX - 180;
    initDistance = Math.sqrt(diffX * diffX + diffY * diffY);

    handleCursorType(mouseStartX, mouseStartY);
    document.body.classList.add('no-user-select');

    if(cursorType == 'move') actionType = 'move';
    else actionType = 'resize';
  });

  onWindow('mouseup', () => {
    isAction = false;

    prevPhotoX = photoX;
    prevPhotoY = photoY;

    prevPhotoWidth = photoWidth;
    prevPhotoHeight = photoHeight;

    cursorType = 'auto';
    document.body.style.cursor = null;
    document.body.classList.remove('no-user-select');
  });

  let photoImg;

  let photoWidth;
  let photoHeight;
  let prevPhotoWidth;
  let prevPhotoHeight;

  let photoX;
  let photoY;
  let prevPhotoX;
  let prevPhotoY;

  let photoRatio;

  const drawPhoto = () => {
    const context = modalRefs.canvasImage.getContext('2d');

    context.clearRect(0, 0, 720, 720);
    context.drawImage(photoImg, photoX, photoY, photoWidth, photoHeight);
  };

  let canvasBoundingRect;

  onWindow('mousemove', e => {
    if(!isAction) return;

    const mouseX = e.x - canvasBoundingRect.x;
    const mouseY = e.y - canvasBoundingRect.y;

    const diffX = (mouseX - mouseStartX) * 720 / 360;
    const diffY = (mouseY - mouseStartY) * 720 / 360;

    if(actionType == 'resize') {
      const angle = Math.atan2(mouseY - 180, mouseX - 180)
        * 180 / Math.PI;

      let newCursorType;

      if(angle >= 0) {
        if(angle < 23) newCursorType = 'e-resize';
        else if(angle < 68) newCursorType = 'se-resize';
        else if(angle < 113) newCursorType = 's-resize';
        else if(angle < 158) newCursorType = 'sw-resize';
        else newCursorType = 'w-resize';
      } else {
        if(angle > -22) newCursorType = 'e-resize';
        else if(angle > -67) newCursorType = 'ne-resize';
        else if(angle > -112) newCursorType = 'n-resize';
        else if(angle > -157) newCursorType = 'nw-resize';
        else newCursorType = 'w-resize';
      }

      if(newCursorType != cursorType) {
        cursorType = newCursorType;
        document.body.style.cursor = cursorType;
      }
    }

    if(cursorType == 'move') {
      photoX = prevPhotoX + diffX;
      photoY = prevPhotoY + diffY;

      if(photoX > 0) photoX = 0;
      if(photoX + photoWidth < 720) photoX = 720 - photoWidth;

      if(photoY > 0) photoY = 0;
      if(photoY + photoHeight < 720) photoY = 720 - photoHeight;
    } else {
      const distanceDiffX = mouseX - 180;
      const distanceDiffY = mouseY - 180;
      const distance = Math.sqrt(
        distanceDiffX * distanceDiffX + distanceDiffY * distanceDiffY
      );

      const resizeCoef = distance / initDistance;

      photoWidth = prevPhotoWidth * resizeCoef;
      photoHeight = prevPhotoHeight * resizeCoef;

      if(photoWidth < 720) {
        photoWidth = 720;
        photoHeight = photoWidth / photoRatio;
      }
      if(photoHeight < 720) {
        photoHeight = 720;
        photoWidth = photoHeight * photoRatio;
      }

      photoX = prevPhotoX - (photoWidth - prevPhotoWidth) / 2;
      photoY = prevPhotoY - (photoHeight - prevPhotoHeight) / 2;

      if(photoX > 0) photoX = 0;
      if(photoY > 0) photoY = 0;
      if(photoX + photoWidth < 720) photoX = 720 - photoWidth;
      if(photoY + photoHeight < 720) photoY = 720 - photoHeight;
    }

    drawPhoto();
  });

  on(modalRefs.canvasCircle, 'mousemove', e => {
    if(isAction) return;
    handleCursorType(e.layerX, e.layerY);
  });

  on(modalRefs.canvasCircle, 'mouseleave', e => {
    if(isAction) return;

    cursorType = 'auto';
    document.body.style.cursor = null;
  });

  on(refs.file, 'change', () => {
    let reader = new FileReader()
    reader.readAsDataURL(refs.file.files[0])
    reader.onloadend = () => {
      refs.file.value = '';

      modalDom.classList.add('auth-photo-modal__active');
      modalRefs.content.classList.add('show-down');

      photoImg = new Image();
      photoImg.onload = () => {
        const imgWidth = photoImg.naturalWidth;
        const imgHeight = photoImg.naturalHeight;

        photoRatio = imgWidth / imgHeight;

        photoWidth = 720;
        photoHeight = imgHeight * 720 / imgWidth;
        if(imgHeight < imgWidth) {
          photoHeight = 720;
          photoWidth = imgWidth * 720 / imgHeight;
        }

        photoX = 0;
        photoY = (720 - photoHeight) / 2;
        if(imgHeight < imgWidth) {
          photoY = 0;
          photoX = (720 - photoWidth) / 2;
        }

        prevPhotoX = photoX;
        prevPhotoY = photoY;

        prevPhotoWidth = photoWidth;
        prevPhotoHeight = photoHeight;

        drawPhoto();
      };
      photoImg.setAttribute('src', reader.result);
    };
  });

  const submit = () => {
    if(!hasName) return;

    buttonComponent.setLoading(true);
    inputFirstComponent.setDisabled(true);
    inputLastComponent.setDisabled(true);

    const phone = opts.getPhone();

    MTProto.auth.signUp(
      phone.plain, phone.hash,
      inputFirstComponent.refs.input.value,
      inputLastComponent.refs.input.value
    )
    .then(result => {
      if(result.err) {
        buttonComponent.setLoading(false);
        inputFirstComponent.setDisabled(false);
        inputLastComponent.setDisabled(false);

        if(result.err == 'FIRSTNAME_INVALID') {
          inputFirstComponent.setError('Name Invalid');
        }

        if(result.err == 'PHONE_CODE_EXPIRED') {
          inputFirstComponent.setError('Confirm Code Expired, try again');
        }

        if(result.err == 'LASTNAME_INVALID') {
          inputFirstComponent.setError('Last Name Invalid');
        }

        return;
      }

      if(result.next == 'done') {
        if(!photoData) opts.onAuth();
        else {
          const parts = photoData.split(',');
          const mime = parts[0].match(/:(.*?);/)[1];
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);

          while(n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }

          const file = new File([u8arr], 'profile.jpg', { type: mime });

          MTProto.utils.uploadFile(file)
          .then(inputFile => {
            return MTProto.utils.uploadProfilePhoto(inputFile);
          })
          .then(result => {
            opts.onAuth();
          });
        }
      }
    });
  };

  let hasName = false;
  let hideTimeout;

  const showButton = () => {
    if(hasName) return;
    hasName = true;

    clearTimeout(hideTimeout);

    buttonComponent.dom.classList.remove('is-hidden');
    buttonComponent.dom.classList.remove('hide-up');
    buttonComponent.dom.classList.add('show-down');
  };

  const hideButton = () => {
    if(!hasName) return;
    hasName = false;

    buttonComponent.dom.classList.remove('show-down');
    buttonComponent.dom.classList.add('hide-up');
    hideTimeout = setTimeout(() => {
      buttonComponent.dom.classList.add('is-hidden');
    }, 330);
  };

  const inputFirstComponent = InputSimple(refs.fieldFirst, {
    label: 'Name',
    onEnter: submit,
    onInput: input => {
      if(input.value.length) showButton();
      else hideButton();
    }
  });
  const inputLastComponent = InputSimple(refs.fieldLast, {
    label: 'Last Name (optional)',
    onEnter: submit
  });
  const buttonComponent = Button(refs.fieldButton, {
    text: 'Start messaging',
    isBig: true,
    isBlock: true,
    isHidden: true,
    onClick: submit
  });

  parent.appendChild(dom);

  return {
    destroyModal: () => {
      document.body.removeChild(modalDom);
    },
    show: termOfService => {
      dom.classList.remove('auth-animated__hide-right');

      if(termOfService) {
        const modalTermHtml =
         `<div class="auth-photo-modal">
            <div class="auth-photo-modal_overlay" ref="overlay"></div>
            <div class="auth-photo-modal_content" ref="content">
              <div class="auth-photo-modal_header">Terms of Service</div>
              <div class="auth-photo-modal_button" ref="button"></div>
              <div class="auth-photo-modal_body auth-photo-modal_body__terms">${termOfService}</div>
            </div>
          </div>`;

        const modalTermDom = domFromHtml(modalTermHtml);
        const modalTermRefs = refsFromDom(modalTermDom);

        const closeModalTerm = () => {
          modalTermRefs.content.classList.add('hide-down');
          modalTermRefs.overlay.classList.add('auth-photo-modal_overlay__hide');

          setTimeout(() => {
            document.body.removeChild(modalTermDom);
          }, 300);
        };

        Button(modalTermRefs.button, {
          text: '<span class="icon icon__check"></span>',
          isCircle: true,
          onClick: closeModalTerm
        });

        document.body.appendChild(modalTermDom);

        modalTermDom.classList.add('auth-photo-modal__active');
        modalTermRefs.content.classList.add('show-down');
      }
    }
  };
};