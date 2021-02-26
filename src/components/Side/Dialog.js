import { domFromHtml, refsFromDom } from '../../helpers/dom';
import { formMessageDate, on } from '../../helpers/utils';

export default function SideDialog(dialog, opts) {
  const html =
   `<div class="dialog">
      <div class="dialog_photo">
        <div class="dialog_photo-wrapper" ref="photoWrapper"></div>
        <div class="dialog_online" ref="online"></div>
      </div>
      <div class="dialog_content">
        <div class="dialog_header">
          <div class="dialog_name" ref="name"></div>
          <div class="dialog_message-status">
            <div class="icon icon__sended"></div>
            <div class="icon icon__readed"></div>
          </div>
          <div class="dialog_time" ref="time"></div>
        </div>
        <div class="dialog_info">
          <div class="dialog_text" ref="text"></div>
          <div class="dialog_status">
            <div class="dialog_status-pinned">
              <div class="icon icon__pinned"></div>
            </div>
            <div class="dialog_unreaded"></div>
          </div>
        </div>
      </div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  let name = dialog.peer.first_name || dialog.peer.title;
  if(dialog.peer.last_name) name += ' ' + dialog.peer.last_name;
  refs.name.textContent = name;

  let photoPlaceholderText = name.charAt(0);
  if(dialog.peer.last_name) photoPlaceholderText += dialog.peer.last_name.charAt(0);
  else if(name.split(' ').length > 1) photoPlaceholderText += name.split(' ')[1].charAt(0);
  else photoPlaceholderText += name.charAt(1);
  refs.photoWrapper.textContent = photoPlaceholderText;

  let dialogText = dialog.message.message;
  if(dialog.message.media) dialogText = dialog.message.media._.substr(12);
  if(dialog.author) dialogText = `<span>${dialog.author.first_name}:</span>&nbsp` + dialogText;
  refs.text.innerHTML = dialogText;

  refs.time.textContent = formMessageDate(dialog.message.date);

  let prevWave;

  on(dom, 'click', e => {
    const boundingRect = dom.getBoundingClientRect();
    const x = e.x - boundingRect.x;
    const y = e.y - boundingRect.y;

    const wave = document.createElement('div');
    wave.classList.add('button_wave');
    wave.style.top = y + 'px';
    wave.style.left = x + 'px';

    dom.appendChild(wave);

    if(prevWave) {
      prevWave.classList.add('button_wave__hide');
    }

    prevWave = wave;

    const halfWidth = dom.offsetWidth / 2;
    const fillCoef = (Math.abs(halfWidth - x) + halfWidth) / dom.offsetWidth;
    setTimeout(() => {
      wave.classList.add('button_wave__hide');

      setTimeout(() => {
        dom.removeChild(wave);
      }, 330);
    }, 600 * fillCoef);

    console.log(dialog);
    if(opts.onClick) opts.onClick(dialog._peer);
  });

  return {
    dom
  };
};