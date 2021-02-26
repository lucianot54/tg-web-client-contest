import { domFromHtml, refsFromDom } from '../helpers/dom';

import Side from './Side/Index';
import Main from './Main/Index';

export default function App(parent, opts) {
  const html =
   `<div class="app">
      <div ref="side"></div>
      <div class="flex-grow" ref="main"></div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  const onDialogSelected = peer => {
    mainComponent.openChat(peer);
  };

  Side(refs.side, {
    onDialogSelected
  });
  const mainComponent = Main(refs.main);

  parent.appendChild(dom);

  return {};
};