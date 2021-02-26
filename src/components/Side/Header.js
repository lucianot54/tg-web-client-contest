import { domFromHtml, refsFromDom } from '../../helpers/dom';

import Button from '../Elements/Button';
import InputSimple from '../Input/Simple';

export default function SideHeader(parent, opts) {
  const html =
   `<div class="side_header">
      <div class="side_menu" ref="menu"></div>
      <div class="side_search" ref="search"></div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  const openMenu = () => {

  };

  /*const scrollComponent = Scroll(refs.dropdown, {
    innerHTML: countriesHtml
  });*/

  Button(refs.menu, {
    text: '<span class="icon icon__burger"></span>',
    isCircle: true,
    isMiddle: true,
    isWhite: true,
    onClick: openMenu
  });

  InputSimple(refs.search, {
    label: 'Search',
    isRounded: true,
    isSmall: true,
    isNoLabelAnimated: true,
    leftIcon: 'search'
  });

  parent.appendChild(dom);

  return {
    showShadow: () => {
      dom.classList.add('side_header__shadow');
    },
    hideShadow: () => {
      dom.classList.remove('side_header__shadow');
    }
  };
};