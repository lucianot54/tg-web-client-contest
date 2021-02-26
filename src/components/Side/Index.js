import { domFromHtml, refsFromDom } from '../../helpers/dom';

import Loader from '../Elements/Loader';
import SideHeader from './Header';
import SideDialogs from './Dialogs';

export default function Side(parent, opts) {
  const html =
   `<div class="side">
      <div ref="header" style="display:none"></div>
      <div ref="dialogs" class="side_dialogs" style="display:none"></div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  const loaderComponent = Loader(dom, {
    isBig: true,
    isBlue: true
  });

  const onDialogsLoaded = () => {
    loaderComponent.destroy().then(() => {
      refs.header.style.display = null;
      refs.dialogs.style.display = null;
    });
  };

  const headerComponent = SideHeader(refs.header);
  SideDialogs(refs.dialogs, {
    headerComponent,
    onDialogsLoaded,
    onDialogSelected: opts.onDialogSelected
  });

  parent.appendChild(dom);

  return {};
};