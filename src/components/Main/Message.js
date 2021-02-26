import { domFromHtml, refsFromDom } from '../../helpers/dom';
import { formMessageDate } from '../../helpers/utils';

export default function Message(message, nextMessage) {
  const html =
   `<div class="message">
      <div class="message_wrapper">
        <div class="message_text" ref="text"></div>
        <div class="message_time" ref="time"></div>
      </div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  if(message.pFlags.out) dom.classList.add('message__out');
  if(!nextMessage || (nextMessage.from_id != message.from_id)) dom.classList.add('message__pip');

  refs.text.innerHTML = message.message || '&nbsp;';
  refs.time.textContent = formMessageDate(message.date);

  return {
    dom
  };
};