/* global lottie */

import {
  bindRefs,
  getTimeFormatted,
  getFullTimeFormatted,
  getNumberFormatted,
  getEmptyPhotoColor,
  getSizeText,
  on
} from '../../helpers';

import {
  isStickerMessage,
  isGifMessage,
  isVideoMessage,
  isAudioMessage,
  getSticker
} from '../Stores/stickers';

import {
  isImageMessage,
  getImagePlaceholder,
  getImage
} from '../Stores/images';

import {
  isDocumentMessage,
  loadDocument,
  getDocument
} from '../Stores/documents';

import {
  getPeer
} from '../Stores/peers';

import {
  getPhoto
} from '../Stores/photos';

const ns = 'http://www.w3.org/2000/svg';
// eslint-disable-next-line max-len
const removeEmojiRegExp = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

class MessageElement extends HTMLElement {
  constructor() {
    super();

    this._animation = null;

    this.isOut = false;
  }

  connectedCallback() {
    this.className = 'message';
  }

  disconnectedCallback() {
    if(this._animation) {
      try {
        this._animation.destroy();
      }
      // eslint-disable-next-line no-empty
      catch(e) {}
    }
  }

  setReaded() {
    const $icon = this._$info.querySelector('.icon__check1');
    $icon.classList.remove('icon__check1');
    $icon.classList.add('icon__check2');
  }

  async setData(
    message, prevMessage, nextMessage, peer,
    $prevMessage, $nextMessage, readOutMaxId
  ) {
    this.innerHTML =
     `<div class="message_photo" ref="photo">
        <div class="message_photo-text" ref="photoText"></div>
        <img class="message_photo-image" ref="photoImage">
      </div>
      <div class="message_wrapper" ref="wrapper">
        <div class="message_document" ref="doc">
          <div class="message_document-side">
            <div class="message_document-bg" ref="docBg">
              <div class="icon icon__download"></div>
              <div class="message_document-bg-type" ref="docType"></div>
            </div>
          </div>
          <div class="message_document-main">
            <div class="message_document-name" ref="docName"></div>
            <div class="message_document-size" ref="docSize"></div>
          </div>
        </div>
        <div class="message_name" ref="name"></div>
        <div class="message_image" ref="image"></div>
        <div class="message_text" ref="text"></div>
        <div class="message_link" ref="link">
          <div class="message_link-image" ref="linkImage"></div>
          <a class="message_link-name" target="_blank" ref="linkName"></a>
          <div class="message_link-title" ref="linkTitle"></div>
          <div class="message_link-info" ref="linkInfo"></div>
        </div>
        <div class="message_info" ref="info"></div>
      </div>`;

    bindRefs(this);

    this.classList.remove('is-chat');
    this.classList.remove('is-pip');
    this.classList.remove('is-offset');
    this.classList.remove('is-saved-top');
    this._$name.classList.remove('is-visible');
    this._$photo.classList.remove('is-visible');
    this.isOut = false;

    if(message.out) {
      this.classList.add('is-out');
      this.isOut = true;
    }

    const isChat = peer._ == 'chat' ||
      (peer._ == 'channel' && !peer.broadcast);
    const isOtherUserTop =
      nextMessage && nextMessage.from_id != message.from_id;
    const isOtherUserBottom =
      prevMessage && prevMessage.from_id != message.from_id;

    if(isChat && isOtherUserTop) {
      this.classList.add('is-offset');
    }

    if(isChat && !message.out) {
      this.classList.add('is-chat');

      const topCond = !nextMessage || isOtherUserTop;
      const bottomCond = !prevMessage || isOtherUserBottom;

      let user;
      if(topCond || bottomCond) {
        user = getPeer({ user_id: message.from_id });
      }

      if(topCond) {
        let name;

        if(user.deleted) name = 'Deleted Account';
        else {
          name = user.first_name;
          if(user.last_name) name += ` ${user.last_name}`;
        }

        this._$name.textContent = name;
        this._$name.classList.add('is-visible');
      }

      if(bottomCond) {
        this._$photo.classList.add('is-visible');

        if(user.deleted) {
          this._$photo.style.backgroundColor = 'rgba(0, 0, 0, 0.21)';
          this._$photoText.innerHTML =
            '<div class="icon icon__deletedavatar"></div>';
        } else {
          let nameParts;
          if(user.last_name) nameParts = [ user.first_name, user.last_name ];
          else nameParts = user.first_name.split(' ').slice(0, 2);
          const photoName = nameParts
            .map(part => part.substr(0, 1).toUpperCase()).join('');

          this._$photoText.textContent = photoName;
          this._$photo.style.backgroundColor =
            '#' + getEmptyPhotoColor(user.id);

          if(user.photo && !user.photo._.includes('Empty')) {
            getPhoto(user).then(url => {
              this._$photoImage.src = url;
              this._$photoImage.style.display = 'block';
            });
          }
        }
      }
    }

    let infoContent = '';

    if(message.views) {
      infoContent +=
       `<span>
          ${getNumberFormatted(message.views)}
          <div class="icon icon__eye"></div>
        </span>`;
    }

    let timeTitle = getFullTimeFormatted(message.date);
    if(message.edit_date) {
      timeTitle += `\nEdited: ${getFullTimeFormatted(message.edit_date)}`;
    }

    const timeText = getTimeFormatted(message.date, true);
    infoContent +=
     `<span title="${timeTitle}">
        ${ message.edit_date ? 'edited ' : '' }${timeText}
      </span>`;

    if(message.out && peer._ != 'inputPeerSelf') {
      infoContent +=
       `<div class="icon
                    icon__check${ readOutMaxId >= message.id ? '2' : '1' }">
        </div>`;
    }

    this._$info.innerHTML = infoContent;

    let isCheckPip = true;
    const isImageMess = isImageMessage(message);
    const isDocumentMess = isDocumentMessage(message);
    const hasLink = message.media && message.media._ == 'messageMediaWebPage' &&
      message.media.webpage._ != 'webPageEmpty';

    if(!hasLink) {
      this._$link.remove();
    }

    if(message._ == 'messageService') {
      isCheckPip = false;
      this.classList.add('is-info');
      this._$name.classList.remove('is-visible');

      this._$text.textContent = message.action._
        .substr(13)
        .match(/[A-Z][a-z]+/g)
        .map((word, i) => i == 0 ? word : word.toLowerCase())
        .join(' ');
    }
    else if(isGifMessage(message)) {
      this._$text.innerHTML = 'Gif (not support yet)' +
         `<div class="message_info">${infoContent}</div>`;
    }
    /*else if(isGifMessage(message)) {
      this._$name.classList.remove('is-visible');

      let sticker = await getSticker(message.media.document, true);
      this._$text.innerHTML = `<img src="${sticker.url}">`;

      //if(sticker.isFull) {
        this._$text.innerHTML =
         `<video autoplay>
            <source src="${sticker.url}" type="video/mp4">
          </video>`;
      } else {
        if(sticker.url) {
          this._$text.innerHTML = `<img src="${sticker.url}">`;
        }
        sticker = await getSticker(message.media.document);
        this._$text.innerHTML =
         `<video autoplay>
            <source src="${sticker.url}" type="video/mp4">
          </video>`;
      }
    }*/
    else if(isStickerMessage(message)) {
      isCheckPip = false;
      this._$wrapper.classList.add('is-no-bubble', 'is-sticker');
      this._$name.classList.remove('is-visible');

      let sticker = await getSticker(message.media.document);
      if(sticker.isFull) {
        if(sticker.data) {
          this._animation = lottie.loadAnimation({
            container: this._$text,
            loop: true,
            autoplay: true,
            animationData: sticker.data
          });
        }
        else this._$text.innerHTML = `<img src="${sticker.url}">`;
      } else {
        if(sticker.url) {
          this._$text.innerHTML = `<img src="${sticker.url}">`;
        }
        sticker = await getSticker(message.media.document);
        if(sticker.data) {
          this._$text.innerHTML = '';
          this._animation = lottie.loadAnimation({
            container: this._$text,
            loop: true,
            autoplay: true,
            animationData: sticker.data
          });
        }
        else this._$text.innerHTML = `<img src="${sticker.url}">`;
      }
    }
    else if(isVideoMessage(message)) {
      this._$text.innerHTML = 'Video (not support yet)' +
         `<div class="message_info">${infoContent}</div>`;
    }
    else if(isAudioMessage(message)) {
      this._$text.innerHTML = 'Audio (not support yet)' +
         `<div class="message_info">${infoContent}</div>`;
    }
    else if(message.media && !message.message &&
            !isImageMess && !isDocumentMess) {
      this._$text.innerHTML = message.media._.substr(12) +
        ' (not support yet)' +
        `<div class="message_info">${infoContent}</div>`;
    }
    else {
      const text = message.message;

      if(isImageMess) {
        this._$name.classList.remove('is-visible');
        this._$image.classList.add('is-visible');
        this._$wrapper.classList.add('has-image');

        if(text) {
          this._$image.classList.add('has-text');
        } else {
          this._$wrapper.classList.add('has-only-image');
          this._$text.remove();
        }

        const imageGhost = getImagePlaceholder(message.media.photo, 'm');
        const $img = new Image();
        $img.src = imageGhost.url;
        $img.width = imageGhost.size.w;
        $img.height = imageGhost.size.h;
        this._$image.appendChild($img);

        getImage(message.media.photo, 'm').then(image => {
          $img.src = image.url;
        });
      }

      if(isDocumentMess) {
        this._$name.classList.remove('is-visible');
        this._$doc.classList.add('is-visible');
        this._$wrapper.classList.add('has-document');

        if(text) {
          this._$doc.classList.add('has-text');
        } else {
          this._$wrapper.classList.add('has-only-document');
          this._$text.remove();
        }

        const documentObj = getDocument(message.media.document);
        this._$docName.textContent = documentObj.name;
        this._$docSize.textContent = getSizeText(documentObj.size);

        const isLoaded = !!documentObj.content;

        if(isLoaded) {
          this._$doc.classList.add('is-loaded');
        }

        on(this._$doc, 'click', () => {
          let $loader = document.createElement('tg-loader');
          this._$doc.classList.add('is-loading');
          this._$docBg.appendChild($loader);

          loadDocument(message.media.document).then(url => {
            this._$doc.classList.add('is-loaded');

            $loader.remove();
            this._$doc.classList.remove('is-loading');

            var a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            a.href = url;
            a.download = documentObj.name;
            a.click();
          });
        });

        const ext = documentObj.name.split('.').pop();
        this._$docType.textContent = ext;

        const isArchive =
          ext == 'zip' ||
          ext == '7z' ||
          ext == 'rar';
        if(isArchive) this._$doc.classList.add('is-zip');
        const isPdf =
          ext == 'pdf' ||
          ext == 'ppt' ||
          ext == 'pptx';
        if(isPdf) this._$doc.classList.add('is-pdf');
        const isDoc =
          ext == 'doc' ||
          ext == 'docx' ||
          ext == 'rtf' ||
          ext == 'odt';
        if(isDoc) this._$doc.classList.add('is-doc');
        const isXls =
          ext == 'csv' ||
          ext == 'ods' ||
          ext == 'xls' ||
          ext == 'xlsx';
        if(isXls) this._$doc.classList.add('is-xls');
      }

      if(text) {
        const textWithoutEmoji = text.replace(removeEmojiRegExp, '').trim();
        const textWithoutSpacesParts = [ ...text.replace(/\s/g, '') ];
        if(!textWithoutEmoji &&
          textWithoutSpacesParts.length < 4 && !isImageMess) {
          this._$name.classList.remove('is-visible');

          isCheckPip = false;
          if(textWithoutSpacesParts.length == 1) {
            this._$wrapper.classList.add('is-no-bubble', 'is-one-emoji');
          } else {
            this._$wrapper.classList.add('is-no-bubble', 'is-only-emoji');
          }

          this._$text.innerHTML = textWithoutSpacesParts.join('');
        } else {
          if(!message.entities) {
            this._$text.innerHTML = message.message +
              (!hasLink
                ? `<div class="message_info">${infoContent}</div>`
                : '');
          } else {
            let additOffset = 0;
            let formattedText = message.message;

            message.entities.forEach(entity => {
              const offset = entity.offset + additOffset;
              const length = entity.length;
              const part = formattedText.substr(offset, length);
              let newPart = '';

              if(entity._ == 'messageEntityMention' ||
                entity._ == 'messageEntityHashtag' ||
                entity._ == 'messageEntityPhone' ||
                entity._ == 'messageEntityMentionName' ||
                entity._ == 'inputMessageEntityMentionName' ||
                entity._ == 'messageEntityBlockquote' ||
                entity._ == 'messageEntityCashtag') {
                newPart = `<span class="is-highlight">${part}</span>`;
              }
              if(entity._ == 'messageEntityUrl') {
                let partUrl = part;
                const partStart = partUrl.substr(0, 7);
                if(partStart != 'http://' && partStart != 'https:/') {
                  partUrl = `https://${partUrl}`;
                }

                newPart = `<a href="${partUrl}" target="_blank">${part}</a>`;
              }
              if(entity._ == 'messageEntityTextUrl') {
                newPart = `<a href="${entity.url}" target="_blank">${part}</a>`;
              }
              if(entity._ == 'messageEntityEmail') {
                newPart =
                  `<a href="mailto:${part}" target="_blank">${part}</a>`;
              }
              if(entity._ == 'messageEntityBold') {
                newPart = `<b>${part}</b>`;
              }
              if(entity._ == 'messageEntityItalic') {
                newPart = `<i>${part}</i>`;
              }
              if(entity._ == 'messageEntityUnderline') {
                newPart = `<u>${part}</u>`;
              }
              if(entity._ == 'messageEntityStrike') {
                newPart = `<strike>${part}</strike>`;
              }
              if(entity._ == 'messageEntityPre') {
                newPart = `<pre>${part}</pre>`;
              }

              additOffset += newPart.length - part.length;
              formattedText = formattedText.substr(0, offset) +
                newPart + formattedText.substr(offset + length);
            });

            this._$text.innerHTML = formattedText +
              (!hasLink
                ? `<div class="message_info">${infoContent}</div>`
                : '');
          }
        }

        if(message.media && message.media._ == 'messageMediaWebPage' &&
           message.media.webpage._ != 'webPageEmpty') {
          this._$wrapper.classList.add('has-link');

          const webpage = message.media.webpage;

          if(webpage.photo) {
            const imageGhost = getImagePlaceholder(webpage.photo, 'm');
            if(imageGhost) {
              const $img = new Image();
              $img.src = imageGhost.url;
              $img.width = imageGhost.size.w;
              $img.height = imageGhost.size.h;
              this._$linkImage.appendChild($img);

              getImage(webpage.photo, 'm').then(image => {
                $img.src = image.url;
              });

              $img.onclick = () => {
                window.open(webpage.url, '_blank');
              };
            }
          }

          this._$linkName.textContent = webpage.site_name;
          this._$linkName.setAttribute('href', webpage.url);
          this._$linkTitle.textContent = webpage.title;
          this._$linkInfo.innerHTML = webpage.description.trim() +
            `&nbsp;<div class="message_info">${infoContent}</div>`;
        }
      }
    }

    let prevDateDiff;

    if(peer._ == 'inputPeerSelf') {
      prevDateDiff = prevMessage
        ? prevMessage.date - message.date
        : 0;

      const nextDateDiff = nextMessage
        ? message.date - nextMessage.date
        : 0;
      if(nextDateDiff && nextDateDiff > 60) {
        this.classList.add('is-saved-top');
      }
    }

    if(isCheckPip &&
       (!prevMessage ||
        (!isChat && prevMessage.out != message.out) ||
        (isChat && isOtherUserBottom) ||
        (peer._ == 'channel' && peer.broadcast) ||
        (prevDateDiff && prevDateDiff > 60))) {
      this.classList.add('is-pip');

      /*const $imgs = this.querySelectorAll('img');
      for(let i = 0, l = $imgs.length; i < l; i++) {
        await imgLoading($imgs[i]);
      }*/

      this._$wrapper.offsetWidth;

      let offsetWidth = message.out ? this._$wrapper.offsetWidth : 0;

      this._createClipPath(
        message.id,
        this._generatePath(
          this._$wrapper.offsetWidth, this._$wrapper.offsetHeight,
          nextMessage &&
          nextMessage._ != 'messageService' &&
          ((!isChat && nextMessage.out == message.out) ||
           (isChat && !isOtherUserTop)) &&
          !peer.broadcast
        ),
        offsetWidth
      );

      this._$wrapper.style.clipPath = `url(#mess${message.id})`;
    }
  }

  _generatePath(width, height, isSmall) {
    let path = '';
    if(isSmall) path += 'M 13 0C 11 0 7 2 7 6';
    else path += 'M 19 0C 13 0 7 5 7 12';
    path += `V${height - 17}`;
    path += `C 7 ${height - 17}
             7 ${height - 12.7411}
             5 ${height - 8.2176}`;
    path += `C 4.2 ${height - 5.7307}
             2.2 ${height - 3.4945}
             0.7 ${height-1.9849}`;
    path += `C 0 ${height-1.3128} 0.5 ${height} 1.4 ${height}`;
    path += `H ${width-12}`;
    path += `C ${width-5.3726} ${height}
             ${width} ${height-5.3726}
             ${width} ${height-12}`;
    path += 'V 13';
    path += `C ${width} 5.4 ${width-5.3726} 0 ${width-12} 0`;
    if(isSmall) path += 'H 13Z';
    else path += 'H 21Z';

    return path;
  }

  _createClipPath(id, d, width) {
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');

    const clipPath = document.createElementNS(ns, 'clipPath');
    clipPath.setAttribute('id', `mess${id}`);
    svg.appendChild(clipPath);

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    if(width) {
      path.setAttribute('transform', `scale(-1, 1) translate(-${width}, 0)`);
    }
    clipPath.appendChild(path);

    this.appendChild(svg);
  }
}

if(!customElements.get('tg-message')) {
  customElements.define('tg-message', MessageElement);
}