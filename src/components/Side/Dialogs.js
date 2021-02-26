import { domFromHtml, refsFromDom } from '../../helpers/dom';

import Scroll from '../Elements/Scroll';
import SideDialog from './Dialog';

export default function SideDialogs(parent, opts) {
  const html =
   `<div class="side_dialogs-list"></div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  const scrollComponent = Scroll(dom, {
    innerHTML: '',
    onHasScroll: () => {
      opts.headerComponent.showShadow();
    },
    onHasNoScroll: () => {
      opts.headerComponent.hideShadow();
    }
  });

  parent.appendChild(dom);

  TGApp.onMtprotoInit(() => {
    MTProto.messages.getDialogs()
    .then(result => {
      console.log(result);

      result.dialogs.forEach((dialogMtproto, index) => {

        const dialog = {};
        dialog.dialog = dialogMtproto;
        dialog.message = result.messages[index];

        if(dialogMtproto.peer._ == 'peerUser') {
          dialog.peer = result.users.find(user => {
            return user.id == dialogMtproto.peer.user_id;
          });
        } else {
          dialog.peer = result.chats.find(chat => {
            return chat.id == dialogMtproto.peer.channel_id;
          });
        }

        if(dialog.message.to_id._ == 'peerChannel') {
          dialog.author = result.users.find(user => {
            return user.id == dialog.message.from_id;
          });
        }

        if(!dialogMtproto.peer || !dialog.peer) return;

        dialog._peer = Object.assign({}, dialogMtproto.peer);
        dialog._peer._ = 'inputPeer' + dialog.peer._.charAt(0).toUpperCase() + dialog.peer._.substr(1);
        dialog._peer.access_hash = dialog.peer.access_hash;

        const dialogComponent = SideDialog(dialog, {
          onClick: opts.onDialogSelected
        });
        dialog.component = dialogComponent;

        scrollComponent.content.appendChild(dialogComponent.dom);
      });

      scrollComponent.update();

      opts.onDialogsLoaded();
    });
  });

  return {};
};