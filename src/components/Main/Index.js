import { domFromHtml, refsFromDom } from '../../helpers/dom';

import Loader from '../Elements/Loader';
import Chat from './Chat';

export default function Main(parent, opts) {
  const html =
   `<div class="main">
      <div ref="chat" class="chat"></div>
      <div class="main_placeholder" ref="placeholder">
        <div class="main_placeholder-icon">
          <div class="icon icon__chats-placeholder"></div>
        </div>
        <div class="main_placeholder-title">
          Open Chat<br>or create a new one
        </div>
      </div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  parent.appendChild(dom);

  let chatComponent;

  return {
    openChat: peer => {
      const loaderComponent = Loader(dom, {
        isBlue: true,
        isBig: true
      });

      refs.placeholder.style.display = 'none';

      if(chatComponent) chatComponent.destroy();

      chatComponent = Chat(refs.chat, {
        peer,
        onLoad: () => {
          loaderComponent.destroy().then(() => {
            chatComponent.show();
          });
        }
      });
    }
  };
};