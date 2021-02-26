import {
  bindRefs,
  on,
  getEmptyPhotoColor,
  getSizeText,
  getFullTimeFormatted
} from '../../../helpers';

import {
  searchMessages
} from '../../Api/messages';

import {
  getPhoto
} from '../../Stores/photos';

import {
  getImagePlaceholder,
  getImage
} from '../../Stores/images';

import {
  loadDocument,
  getDocument
} from '../../Stores/documents';

class BlockRightInfoElement extends HTMLElement {
  connectedCallback() {
    this.className = 'right-inner';

    this.innerHTML =
     `<tg-side-header icon-left="close" text="Info" ref="header">
      </tg-side-header>
      <div class="right-inner_content">
        <div class="right-info" ref="rightInfo"></div>
        <div class="shared">
          <div class="tabs">
            <div class="tabs_elem is-active" ref="tabMedia">Media</div>
            <div class="tabs_elem" ref="tabDocs">Docs</div>
          </div>
          <div class="shared_photos" ref="sharedPhotos">
            <tg-scroll offset-side="1" offset-top="1" offset-bottom="1"
                       ref="scrollSharedPhotos"></tg-scroll>
          </div>
          <div class="shared_files" ref="sharedFiles" style="display:none">
            <tg-scroll offset-side="1" offset-top="1" offset-bottom="1"
                       ref="scrollSharedDocs"></tg-scroll>
          </div>
        </div>
      </div>`;
    bindRefs(this);

    on(this._$header, 'ilClick', () => {
      this.parentNode.hide();
    });
  }

  show() {
    this.classList.add('is-visible');
  }

  hide() {
    this.classList.remove('is-visible');
  }

  setPeerInfo(peer, peerFull) {
    this._$rightInfo.style.display = null;

    this._$rightInfo.innerHTML =
     `<div class="right-info_photo" ref="photo">
        <div class="right-info_photo-text" ref="photoText"></div>
        <img class="right-info_photo-image" ref="photoImage">
      </div>
      <div class="right-info_name" ref="name"></div>
      <div class="right-info_desc" ref="desc"></div>

      <div class="right-info_item" ref="itemBio">
        <div>
          <div class="icon icon__info"></div>
        </div>
        <div>
          <div class="right-info_item-text" ref="itemBioText"></div>
          <div class="right-info_item-desc">Bio</div>
        </div>
      </div>
      <div class="right-info_item" ref="itemUsername">
        <div>
          <div class="icon icon__username"></div>
        </div>
        <div>
          <div class="right-info_item-text" ref="itemUsernameText"></div>
          <div class="right-info_item-desc">Username</div>
        </div>
      </div>
      <div class="right-info_item" ref="itemPhone">
        <div>
          <div class="icon icon__phone"></div>
        </div>
        <div>
          <div class="right-info_item-text" ref="itemPhoneText"></div>
          <div class="right-info_item-desc">Phone</div>
        </div>
      </div>

      <div class="right-info_item" ref="itemAbout">
        <div>
          <div class="icon icon__info"></div>
        </div>
        <div>
          <div class="right-info_item-text" ref="itemAboutText"></div>
          <div class="right-info_item-desc">About</div>
        </div>
      </div>
      <div class="right-info_item" ref="itemLink">
        <div>
          <div class="icon icon__username"></div>
        </div>
        <div>
          <div class="right-info_item-text" ref="itemLinkText"></div>
          <div class="right-info_item-desc">Link</div>
        </div>
      </div>`;
    bindRefs(this);

    const $photosContainer = this._$scrollSharedPhotos.$content;
    $photosContainer.innerHTML = '';
    const $documentsContainer = this._$scrollSharedDocs.$content;
    $documentsContainer.innerHTML = '';

    on(this._$tabMedia, 'click', () => {
      this._$tabMedia.classList.add('is-active');
      this._$tabDocs.classList.remove('is-active');
      this._$sharedPhotos.style.display = 'block';
      this._$sharedFiles.style.display = 'none';
    });
    on(this._$tabDocs, 'click', () => {
      this._$tabMedia.classList.remove('is-active');
      this._$tabDocs.classList.add('is-active');
      this._$sharedPhotos.style.display = 'none';
      this._$sharedFiles.style.display = 'block';
    });

    searchMessages('', peer, 'photos').then(messagesPhotos => {
      messagesPhotos.forEach(message => {
        const elem = document.createElement('div');
        elem.className = 'shared-photo';

        const $img = new Image();
        elem.appendChild($img);

        getImage(message.media.photo, 'a').then(image => {
          $img.src = image.url;
        });

        $photosContainer.appendChild(elem);
      });
    });
    searchMessages('', peer, 'documents').then(messagesDocuments => {
      messagesDocuments.forEach(message => {
        const elem = document.createElement('div');
        elem.className = 'message_document is-visible';
        elem.innerHTML =
        `<div class="message_document-side">
            <div class="message_document-bg" ref="docBg">
              <div class="icon icon__download"></div>
              <div class="message_document-bg-type" ref="docType"></div>
            </div>
          </div>
          <div class="message_document-main">
            <div class="message_document-name" ref="docName"></div>
            <div class="message_document-size" ref="docSize"></div>
          </div>`;
        bindRefs(elem);

        const documentObj = getDocument(message.media.document);
        if(!documentObj) return;

        elem._$docName.textContent = documentObj.name;
        elem._$docSize.innerHTML =
          getSizeText(documentObj.size) + ' &nbsp;&bull;&nbsp; ' +
          getFullTimeFormatted(message.date);

        const isLoaded = !!documentObj.content;

        if(isLoaded) {
          elem.classList.add('is-loaded');
        }

        on(elem, 'click', () => {
          let $loader = document.createElement('tg-loader');
          elem.classList.add('is-loading');
          elem._$docBg.appendChild($loader);

          loadDocument(message.media.document).then(url => {
            elem.classList.add('is-loaded');

            $loader.remove();
            elem.classList.remove('is-loading');

            var a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            a.href = url;
            a.download = documentObj.name;
            a.click();
          });
        });

        const ext = documentObj.name.split('.').pop();
        elem._$docType.textContent = ext;

        const isArchive =
          ext == 'zip' ||
          ext == '7z' ||
          ext == 'rar';
        if(isArchive) elem.classList.add('is-zip');
        const isPdf =
          ext == 'pdf' ||
          ext == 'ppt' ||
          ext == 'pptx';
        if(isPdf) elem.classList.add('is-pdf');
        const isDoc =
          ext == 'doc' ||
          ext == 'docx' ||
          ext == 'rtf' ||
          ext == 'odt';
        if(isDoc) elem.classList.add('is-doc');
        const isXls =
          ext == 'csv' ||
          ext == 'ods' ||
          ext == 'xls' ||
          ext == 'xlsx';
        if(isXls) elem.classList.add('is-xls');

        $documentsContainer.appendChild(elem);
      });
    });

    if(peer._ == 'inputPeerSelf') {
      this._$rightInfo.style.display = 'none';
      return;
    }

    if(peer.deleted) {
      this._$photo.style.backgroundColor = 'rgba(0, 0, 0, 0.21)';
      this._$photoText.innerHTML =
        '<div class="icon icon__deletedavatar"></div>';
    } else {
      let nameParts;
      if(peer.title) {
        nameParts = peer.title.split(' ').slice(0, 2);
      } else {
        if(peer.last_name) nameParts = [ peer.first_name, peer.last_name ];
        else nameParts = peer.first_name.split(' ').slice(0, 2);
      }
      const photoName = nameParts
        .map(part => part.substr(0, 1).toUpperCase()).join('');

      this._$photoText.textContent = photoName;
      this._$photo.style.backgroundColor =
        '#' + getEmptyPhotoColor(peer.id);

      const peerPhoto = peer.photo;
      if(peerPhoto && !peerPhoto._.includes('Empty')) {
        getPhoto(peer).then(url => {
          this._$photoImage.src = url;
          this._$photoImage.style.display = 'block';
        });
      }
    }

    let name;
    if(peer.deleted) name = 'Deleted Account';
    else if(peer._ == 'chat' || peer._ == 'channel') name = peer.title;
    else {
      name = peer.first_name;
      if(peer.last_name) name += ` ${peer.last_name}`;
    }
    this._$name.textContent = name;

    if(peer.deleted) {
      this._$desc.style.display = 'none';
      return;
    }

    if(peerFull._info) {
      this._$desc.textContent = peerFull._info;
    }

    if(peer._ == 'user') {
      if(peerFull.about) {
        this._$itemBio.classList.add('is-visible');
        this._$itemBioText.textContent = peerFull.about;
      }

      if(peer.username) {
        this._$itemUsername.classList.add('is-visible');
        this._$itemUsernameText.textContent = peer.username;
      }

      if(peer.phone) {
        this._$itemPhone.classList.add('is-visible');
        this._$itemPhoneText.textContent = '+' + peer.phone;
      }
    } else {
      if(peerFull.about) {
        this._$itemAbout.classList.add('is-visible');
        this._$itemAboutText.textContent = peerFull.about;
      }

      if(peer.username) {
        this._$itemLink.classList.add('is-visible');
        this._$itemLinkText.textContent = 't.me/' + peer.username;
      }
    }
  }

  setPeerStatus(text, isBlue) {
    this._$desc.textContent = text;
    this._$desc.classList[ isBlue ? 'add' : 'remove' ]('is-blue');
  }
}

if(!customElements.get('tg-block-right-info')) {
  customElements.define('tg-block-right-info', BlockRightInfoElement);
}