import {
  bindRefs,
  on
} from '../../helpers';

import {
  uploadFile
} from '../Api/files';

const smiles = {
  people: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😙", "😚", "😋", "😛", "😝", "😜", "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞", "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩", "🥺", "😢", "😭", "😤", "😠", "😡", "🤬", "🤯", "😳", "🥵", "🥶", "😱", "😨", "😰", "😥", "😓", "🤗", "🤔", "🤭", "🤫", "🤥", "😶", "😐", "😑", "😬", "🙄", "😯", "😦", "😧", "😮", "😲", "😴", "🤤", "😪", "😵", "🤐", "🥴", "🤢", "🤮", "🤧", "😷", "🤒", "🤕", "🤑", "🤠", "😈", "👿", "👹", "👺", "🤡", "💩", "👻", "💀", "👽", "👾", "🎃", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾"],
  nature: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🙈", "🙉", "🙊", "🐒", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🦟", "🦗", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦙", "🐐", "🦌", "🐕", "🐩", "🐈", "🐓", "🦃", "🦚", "🦜", "🦢", "🐇", "🦝", "🦡", "🐁", "🐀", "🦔", "🐾", "🐉", "🐲", "🌵", "🎄", "🌲", "🌳", "🌴", "🌱", "🌿", "🍀", "🎍", "🎋", "🍃", "🍂", "🍁", "🍄", "🐚", "🌾", "💐", "🌷", "🌹", "🥀", "🌺", "🌸", "🌼", "🌻", "🌞", "🌝", "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓", "🌔", "🌙", "🌎", "🌍", "🌏", "💫", "⭐", "🌟", "✨", "⚡", "💥", "🔥", "🌈", "⛅", "⛄", "💨", "💧", "💦", "☔", "🌊"],
  food: ["🍏", "🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌽", "🥕", "🥔", "🍠", "🥐", "🥯", "🍞", "🥖", "🥨", "🧀", "🥚", "🍳", "🥞", "🥓", "🥩", "🍗", "🍖", "🦴", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🌮", "🌯", "🥗", "🥘", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🥧", "🧁", "🍰", "🎂", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🥜", "🍯", "🥛", "🍼", "🍵", "🥤", "🍶", "🍺", "🍻", "🥂", "🍷", "🥃", "🍸", "🍹", "🍾", "🥄", "🍴", "🥣", "🥡", "🥢", "🧂"],
  travel: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🛴", "🚲", "🛵", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🚟", "🚃", "🚋", "🚞", "🚝", "🚄", "🚅", "🚈", "🚂", "🚆", "🚇", "🚊", "🚉", "🛫", "🛬", "💺", "🚀", "🛸", "🚁", "🛶", "⛵", "🚤", "🚢", "⚓", "⛽", "🚧", "🚦", "🚥", "🚏", "🗿", "🗽", "🗼", "🏰", "🏯", "🎡", "🎢", "🎠", "⛲", "🌋", "🗻", "⛺", "🏠", "🏡", "🏭", "🏢", "🏬", "🏣", "🏤", "🏥", "🏦", "🏨", "🏪", "🏫", "🏩", "💒", "⛪", "🕌", "🕍", "🕋", "🗾", "🎑", "🌅", "🌄", "🌠", "🎇", "🎆", "🌇", "🌆", "🌃", "🌌", "🌉", "🌁"],
  activity: ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🥅", "⛳", "🏹", "🎣", "🥊", "🥋", "🎽", "🛹", "🛷", "🥌", "🎿", "🏂", "🏆", "🥇", "🥈", "🥉", "🏅", "🎫", "🎪", "🎭", "🎨", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🎻", "🎲", "🎯", "🎳", "🎮", "🎰", "🧩"],
  objects: ["⌚", "📱", "📲", "💻", "💽", "💾", "💿", "📀", "📼", "📷", "📸", "📹", "🎥", "📞", "📟", "📠", "📺", "📻", "🧭", "⏰", "⌛", "⏳", "📡", "🔋", "🔌", "💡", "🔦", "🧯", "💸", "💵", "💴", "💶", "💷", "💰", "💳", "💎", "🧰", "🔧", "🔨", "🔩", "🧱", "🧲", "🔫", "💣", "🧨", "🔪", "🚬", "🏺", "🔮", "📿", "🧿", "💈", "🔭", "🔬", "💊", "💉", "🧬", "🦠", "🧫", "🧪", "🧹", "🧺", "🧻", "🚽", "🚰", "🚿", "🛁", "🧼", "🧽", "🧴", "🔑", "🚪", "🛌", "🧸", "🛒", "🎁", "🎈", "🎏", "🎀", "🎊", "🎉", "🎎", "🏮", "🎐", "🧧", "📩", "📨", "📧", "💌", "📥", "📤", "📦", "📪", "📫", "📬", "📭", "📮", "📯", "📜", "📃", "📄", "📑", "🧾", "📊", "📈", "📉", "📆", "📅", "📇", "📋", "📁", "📂", "📰", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚", "📖", "🔖", "🧷", "🔗", "📎", "📐", "📏", "🧮", "📌", "📍", "📝", "🔍", "🔎", "🔏", "🔐", "🔓"],
  symbols: ["🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "🔯", "🕎", "🛐", "⛎", "♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓", "🆔", "🉑", "📴", "📳", "🈶", "🈚", "🈸", "🈺", "🈷", "🆚", "💮", "🉐", "㊙", "㊗", "🈴", "🈵", "🈹", "🈲", "🅰", "🅱", "🆎", "🆑", "🅾", "🆘", "❌", "⭕", "🛑", "⛔", "📛", "🚫", "💯", "💢", "🚷", "🚯", "🚳", "🚱", "🔞", "📵", "🚭", "❗", "❕", "❓", "❔", "🔅", "🔆", "〽", "🚸", "🔱", "🔰", "✅", "🈯", "💹", "❎", "🌐", "💠", "Ⓜ", "🌀", "💤", "🏧", "🚾", "♿", "🅿", "🈳", "🈂", "🛂", "🛃", "🛄", "🛅", "🚹", "🚺", "🚼", "🚻", "🚮", "🎦", "📶", "🈁", "🔣", "🔤", "🔡", "🔠", "🆖", "🆗", "🆙", "🆒", "🆕", "🆓", "🔟", "🔢", "⏸", "⏯", "⏹", "⏺", "⏭", "⏮", "⏩", "⏪", "⏫", "⏬", "🔼", "🔽", "🔀", "🔁", "🔂", "🔄", "🔃", "➕", "➖", "➗", "💲", "💱", "👁‍🗨", "🔚", "🔙", "🔛", "🔝", "🔜", "〰", "➰", "➿", "🔘", "🔴", "🔵", "⚫", "⚪", "🔺", "🔻", "🔸", "🔹", "🔶", "🔷", "🔳", "🔲", "◾", "◽", "⬛", "⬜", "🔈", "🔇", "🔉", "🔊", "🔔", "🔕", "📣", "📢", "💬", "💭", "🃏", "🎴", "🀄", "🕐", "🕑", "🕒", "🕓", "🕔", "🕕", "🕖", "🕗", "🕘", "🕙", "🕚", "🕛", "🕜", "🕝", "🕞", "🕟", "🕠", "🕡", "🕢", "🕣", "🕤", "🕥", "🕦", "🕧", "🏴", "🏁", "🚩", "🏳‍🌈", "🇺🇳", "🇦🇫", "🇦🇽", "🇦🇱", "🇩🇿", "🇦🇸", "🇦🇩", "🇦🇴", "🇦🇮", "🇦🇶", "🇦🇬", "🇦🇷", "🇦🇲", "🇦🇼", "🇦🇺", "🇦🇹", "🇦🇿", "🇧🇸", "🇧🇭", "🇧🇩", "🇧🇧", "🇧🇾", "🇧🇪", "🇧🇿", "🇧🇯", "🇧🇲", "🇧🇹", "🇧🇴", "🇧🇦", "🇧🇼", "🇧🇷", "🇮🇴", "🇻🇬", "🇧🇳", "🇧🇬", "🇧🇫", "🇧🇮", "🇰🇭", "🇨🇲", "🇨🇦", "🇮🇨", "🇨🇻", "🇧🇶", "🇰🇾", "🇨🇫", "🇹🇩", "🇨🇱", "🇨🇳", "🇨🇽", "🇨🇨", "🇨🇴", "🇰🇲", "🇨🇬", "🇨🇩", "🇨🇰", "🇨🇷", "🇨🇮", "🇭🇷", "🇨🇺", "🇨🇼", "🇨🇾", "🇨🇿", "🇩🇰", "🇩🇯", "🇩🇲", "🇩🇴", "🇪🇨", "🇪🇬", "🇸🇻", "🇬🇶", "🇪🇷", "🇪🇪", "🇸🇿", "🇪🇹", "🇪🇺", "🇫🇰", "🇫🇴", "🇫🇯", "🇫🇮", "🇫🇷", "🇬🇫", "🇵🇫", "🇹🇫", "🇬🇦", "🇬🇲", "🇬🇪", "🇩🇪", "🇬🇭", "🇬🇮", "🇬🇷", "🇬🇱", "🇬🇩", "🇬🇵", "🇬🇺", "🇬🇹", "🇬🇬", "🇬🇳", "🇬🇼", "🇬🇾", "🇭🇹", "🇭🇳", "🇭🇰", "🇭🇺", "🇮🇸", "🇮🇳", "🇮🇩", "🇮🇷", "🇮🇶", "🇮🇪", "🇮🇲", "🇮🇱", "🇮🇹", "🇯🇲", "🇯🇵", "🎌", "🇯🇪", "🇯🇴", "🇰🇿", "🇰🇪", "🇰🇮", "🇽🇰", "🇰🇼", "🇰🇬", "🇱🇦", "🇱🇻", "🇱🇧", "🇱🇸", "🇱🇷", "🇱🇾", "🇱🇮", "🇱🇹", "🇱🇺", "🇲🇴", "🇲🇬", "🇲🇼", "🇲🇾", "🇲🇻", "🇲🇱", "🇲🇹", "🇲🇭", "🇲🇶", "🇲🇷", "🇲🇺", "🇾🇹", "🇲🇽", "🇫🇲", "🇲🇩", "🇲🇨", "🇲🇳", "🇲🇪", "🇲🇸", "🇲🇦", "🇲🇿", "🇲🇲", "🇳🇦", "🇳🇷", "🇳🇵", "🇳🇱", "🇳🇨", "🇳🇿", "🇳🇮", "🇳🇪", "🇳🇬", "🇳🇺", "🇳🇫", "🇰🇵", "🇲🇰", "🇲🇵", "🇳🇴", "🇴🇲", "🇵🇰", "🇵🇼", "🇵🇸", "🇵🇦", "🇵🇬", "🇵🇾", "🇵🇪", "🇵🇭", "🇵🇳", "🇵🇱", "🇵🇹", "🇵🇷", "🇶🇦", "🇷🇪", "🇷🇴", "🇷🇺", "🇷🇼", "🇼🇸", "🇸🇲", "🇸🇹", "🇸🇦", "🇸🇳", "🇷🇸", "🇸🇨", "🇸🇱", "🇸🇬", "🇸🇽", "🇸🇰", "🇸🇮", "🇬🇸", "🇸🇧", "🇸🇴", "🇿🇦", "🇰🇷", "🇸🇸", "🇪🇸", "🇱🇰", "🇧🇱", "🇸🇭", "🇰🇳", "🇱🇨", "🇵🇲", "🇻🇨", "🇸🇩", "🇸🇷", "🇸🇪", "🇨🇭", "🇸🇾", "🇹🇼", "🇹🇯", "🇹🇿", "🇹🇭", "🇹🇱", "🇹🇬", "🇹🇰", "🇹🇴", "🇹🇹", "🇹🇳", "🇹🇷", "🇹🇲", "🇹🇨", "🇹🇻", "🇻🇮", "🇺🇬", "🇺🇦", "🇦🇪", "🇬🇧", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "🏴󠁧󠁢󠁳󠁣󠁴󠁿", "🏴󠁧󠁢󠁷󠁬󠁳󠁿", "🇺🇸", "🇺🇾", "🇺🇿", "🇻🇺", "🇻🇦", "🇻🇪", "🇻🇳", "🇼🇫", "🇪🇭", "🇾🇪", "🇿🇲", "🇿🇼"]
};

const pasteEmoji = ($container, type, emojis) => {
  const $block = document.createElement('div');
  $block.className = 'send-smiles_emoji-block';
  $block.id = `emojiBlock-${type}`;

  let emojisHtml = '';
  emojis.forEach(emoji => {
    emojisHtml += `<div class="send-smiles_emoji">${emoji}</div>`;
  });

  $block.innerHTML = emojisHtml;
  $container.appendChild($block);
};

class SendElement extends HTMLElement {
  constructor() {
    super();

    this._scrollValue = 1;
  }

  connectedCallback() {
    this.className = 'send';

    const attachMenuItems = [
      [ 'photo', 'photo', 'Photo' ],
      [ 'document', 'document', 'Document' ]
    ];

    this.innerHTML =
     `<div class="send_form">
        <div class="send_button">
          <div class="send-smiles is-active">
            <div class="send-smiles_wrapper">
              <div class="send-smiles_top">
                <div class="tabs">
                  <div class="tabs_elem is-active">Emoji</div>
                  <div class="tabs_elem">Stickers</div>
                </div>
              </div>
              <div class="send-smiles_content">
                <div class="send-smiles_body">
                  <tg-scroll offset-side="2" offset-top="2"
                             offset-bottom="2" ref="scrollEmoji"></tg-scroll>
                </div>
                <div class="send-smiles_bottom">
                  <div class="send-smiles_bottom-elem" to-id="people">
                    <div class="icon icon__smile"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="nature">
                    <div class="icon icon__animals"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="food">
                    <div class="icon icon__eats"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="travel">
                    <div class="icon icon__car"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="activity">
                    <div class="icon icon__sport"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="objects">
                    <div class="icon icon__lamp"></div>
                  </div>
                  <div class="send-smiles_bottom-elem" to-id="symbols">
                    <div class="icon icon__flag"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="icon icon__smile"></div>
        </div>
        <label ref="sendLabel">Message</label>
        <tg-scroll offset-side="8" offset-bottom="8"
                   offset-top="8" ref="sendScroll">
          <textarea ref="sendInput" autocomplete="off" rows="1"></textarea>
        </tg-scroll>
        <div class="send_button send_button__right">
          <div class="menu-wrapper">
            <tg-menu items="${encodeURIComponent(JSON.stringify(attachMenuItems))}" is-visible ref="menuSend"></tg-menu>
          </div>
          <div class="icon icon__attach"></div>
        </div>
      </div>
      <tg-button icon="send" ref="sendButton"></tg-button>
      <input type="file" class="send-input-file" ref="inputFilePhoto" accept=".png, .jpg, .jpeg">
      <input type="file" class="send-input-file" ref="inputFileDocument">`;

    bindRefs(this);

    const $emojiContainer = this._$scrollEmoji.$content;

    pasteEmoji($emojiContainer, 'people', smiles.people);
    pasteEmoji($emojiContainer, 'nature', smiles.nature);
    pasteEmoji($emojiContainer, 'food', smiles.food);
    pasteEmoji($emojiContainer, 'travel', smiles.travel);
    pasteEmoji($emojiContainer, 'activity', smiles.activity);
    pasteEmoji($emojiContainer, 'objects', smiles.objects);
    pasteEmoji($emojiContainer, 'symbols', smiles.symbols);

    on(this._$scrollEmoji.$content, 'click', e => {
      if(e.target.className != 'send-smiles_emoji') return;

      const value = this._$sendInput.value;
      this._$sendInput.value = this._$sendInput.value +
        (value.length ? ' ' : '') +
        e.target.textContent + ' ';
      this._inputHandler();
    });

    Array.from(this.querySelectorAll('.send-smiles_bottom-elem')).forEach(elem => {
      on(elem, 'click', () => {
        const toId = '#emojiBlock-' + elem.getAttribute('to-id');
        this._$scrollEmoji._scrollContainer(
          this._$scrollEmoji.$content.querySelector(toId).offsetTop ,
          true
        );
      })
    });

    on(this._$menuSend, 'photoMenuClick', () => {
      this._$inputFilePhoto.click();
    });

    on(this._$menuSend, 'documentMenuClick', () => {
      this._$inputFileDocument.click();
    });

    on(this._$inputFilePhoto, 'change', () => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        this._$inputFilePhoto.value = '';

        const inputFile = await uploadFile(new Uint8Array(reader.result));

        this._inputMedia = {
          _: 'inputMediaUploadedPhoto',
          file: inputFile
        };

        this.dispatchEvent(new CustomEvent('sendMedia'), {
          bubbles: true
        });
      };
      reader.readAsArrayBuffer(this._$inputFilePhoto.files[0]);
    });

    on(this._$inputFileDocument, 'change', () => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const inputFile = await uploadFile(new Uint8Array(reader.result));

        this._inputMedia = {
          _: 'inputMediaUploadedDocument',
          file: inputFile,
          mime_type: this._$inputFileDocument.files[0].type,
          attributes: [
            {
              _: 'documentAttributeFilename',
              file_name: this._$inputFileDocument.files[0].name
            }
          ]
        };

        this._$inputFileDocument.value = '';
        this.dispatchEvent(new CustomEvent('sendMedia'), {
          bubbles: true
        });
      };
      reader.readAsArrayBuffer(this._$inputFileDocument.files[0]);
    });

    on(this._$sendLabel, 'click', () => {
      this.setFocus();
    });

    on(this._$sendButton, 'click', () => {
      this.dispatchEvent(new CustomEvent('sendMess'), {
        bubbles: true
      });
    });

    on(this._$sendInput, 'input', this._inputHandler.bind(this));

    on(this._$sendInput, 'keydown', e => {
      if(e.keyCode == 13) {
        if(e.ctrlKey) {
          const value = this.getValue();
          this.setValue(
            value.substr(0, this._$sendInput.selectionStart) +
            '\n' +
            value.substr(this._$sendInput.selectionStart)
          );

          return true;
        }

        this.dispatchEvent(new CustomEvent('sendMess'), {
          bubbles: true
        });
        e.preventDefault();
        return false;
      }
    });

    on(this._$sendScroll, 'scrollValueUpdate', async () => {
      let scrollValue = this._$sendScroll.scrollValue;
      if(scrollValue === null) scrollValue = 1;
      this._scrollValue = scrollValue;
    });
  }

  getValue() {
    return this._$sendInput.value;
  }

  setValue(value) {
    this._$sendInput.value = value;
    this._inputHandler();
  }

  setFocus() {
    this._$sendInput.focus();
  }

  _inputHandler() {
    let isSetBotScroll = false;
    if(this._scrollValue >= 1) isSetBotScroll = true;

    this._$sendInput.style.height = 'auto';
    const height = this._$sendInput.scrollHeight;
    this._$sendInput.style.height = height + 'px';
    this._$sendScroll.style.height = height + 'px';
    this._$sendScroll.update();

    if(isSetBotScroll) this._scrollValue = 1;
    if(this._scrollValue >= 1) {
      this._$sendScroll._scrollContainer(999999, true);
    }

    this.dispatchEvent(new CustomEvent('itInput'), {
      bubbles: true
    });

    this.classList[
      this._$sendInput.value != '' ? 'add' : 'remove'
    ]('is-fill');
  }
}

if(!customElements.get('tg-send')) {
  customElements.define('tg-send', SendElement);
}