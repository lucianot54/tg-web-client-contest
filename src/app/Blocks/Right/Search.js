import {
  bindRefs,
  on,
  sleep
} from '../../../helpers';

import {
  searchMessages
} from '../../Api/messages';

class BlockRightSearchElement extends HTMLElement {
  constructor() {
    super();

    this._$input = null;
    this._peer = null;
  }

  connectedCallback() {
    this.className = 'right-inner';

    this.innerHTML =
     `<tg-side-header icon-left="close" has-search ref="header">
      </tg-side-header>
      <div class="right-inner_content">
        <div class="right-search" ref="result">
          <div class="right-search_title" ref="resultTitle"></div>
          <tg-scroll ref="scroll" offset-side="1" offset-bottom="8"></tg-scroll>
        </div>
      </div>`;
    bindRefs(this);

    this._$input = this._$header._$inputSearch;

    on(this._$header, 'ilClick', () => {
      this.parentNode.hide();
    });

    let searchTimeout = 0;

    on(this._$input, 'itInput', () => {
      clearTimeout(searchTimeout);

      searchTimeout = setTimeout(() => {
        if(!this._$input.getValue().length) return;
        this.search();
      }, 1000);
    });

    on(this._$input, 'itEnter', () => {
      clearTimeout(searchTimeout);
      if(!this._$input.getValue().length) return;
      this.search();
    });
  }

  async search() {
    this._$input.setLoading(true);
    const query = this._$input.getValue();

    this.clearResults();

    const messages = await searchMessages(
      this._$input.getValue(),
      this._peer
    );

    if(messages.length) {
      this._$resultTitle.textContent = `${messages.length} messages found for last week`;

      messages.forEach(message => {
        const $searchResult = document.createElement('tg-search-result');
        $searchResult.setData(message, query);
        this._$scroll.$content.appendChild($searchResult);
        $searchResult.onclick = () => {
          this.parentElement.parentElement
            ._$messages.scrollToMessage($searchResult.messageId);
        };
      });

      this._$scroll.update();
      this._$scroll._scrollContainer(0, true);
    } else {
      this._$resultTitle.textContent = 'No messages found for last week';
    }

    this._$input.setLoading(false);
  }

  clearResults() {
    this._$resultTitle.textContent = '';
    this._$scroll.$content.innerHTML = '';
    this._$scroll.update();
    this._$scroll._scrollContainer(0, true);
  }

  async show(peer) {
    if(this._peer == peer) {
      this.classList.add('is-visible');
      await sleep(310);
      this._$input.setFocus();
      return;
    }

    this._peer = peer;
    this._$input.setValue('');
    this.clearResults();
    this.classList.add('is-visible');

    await sleep(310);
    this._$input.setFocus();
  }

  hide() {
    this.classList.remove('is-visible');
  }
}

if(!customElements.get('tg-block-right-search')) {
  customElements.define('tg-block-right-search', BlockRightSearchElement);
}