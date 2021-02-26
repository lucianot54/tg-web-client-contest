import { domFromHtml, refsFromDom } from '../../helpers/dom';

import Scroll from '../Elements/Scroll';
import Message from './Message';

export default function Chat(parent, opts) {
  const html =
   `<div class="chat_wrapper" style="display:none">
      <div class="chat_header">

      </div>
      <div class="chat_messages" ref="messages"></div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  const scrollComponent = Scroll(refs.messages, {
    innerHTML: ''
  });

  parent.appendChild(dom);

  MTProto.messages.getHistory(opts.peer)
  .then(result => {
    const messages = result.messages.reverse();

    messages.forEach((message, index) => {
      const messageComponent = Message(message, messages[index + 1]);
      scrollComponent.content.appendChild(messageComponent.dom);
    });

    opts.onLoad();
  });

  return {
    show: () => {
      dom.style.display = null;
      scrollComponent.scroll(100000, true);
    },
    destroy: () => {
      parent.removeChild(dom);
    }
  };
};