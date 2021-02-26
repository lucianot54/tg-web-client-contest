import { domFromHtml, refsFromDom } from '../../../helpers/dom';
import { on, onWindow } from '../../../helpers/utils';

export default function Scroll(parent, opts) {
  const html =
   `<div class="scroll">
      <div class="scroll_container" ref="container">
        <div class="scroll_content" ref="content">
          ${opts.innerHTML}
        </div>
      </div>
      <div class="scroll_handler" ref="handler"><div></div></div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  let hideHandlerTimeout;
  let handlerHeightDelta = 0;

  const hideHandler = () => {
    refs.handler.style.opacity = null;
  };

  const showHandler = () => {
    if(prevHandlerHeight >= dom.offsetHeight - 17) return;

    if(!refs.handler.style.opacity) refs.handler.style.opacity = '1';
    clearTimeout(hideHandlerTimeout);
    hideHandlerTimeout = setTimeout(hideHandler, 2000);
  };

  const scrollContainer = (offset, isSet) => {
    if(isSet) refs.container.scrollTop = offset;
    else refs.container.scrollTop += offset;

    refs.handler.style.top = (Math.floor(
      8
      + (refs.container.scrollTop / refs.container.scrollHeight)
      * (dom.offsetHeight - 16 + handlerHeightDelta)
    )) + 'px';
    showHandler();
  };

  on(dom, 'wheel', e => {
    const delta = e.deltaY > 0 ? 1 : -1;

    scrollContainer(Math.floor(delta * dom.offsetHeight * 0.5));
  });

  const calculateHandlerHeight = (domHeight, containerHeight) => {
    domHeight = domHeight || dom.offsetHeight;
    containerHeight = containerHeight || refs.container.scrollHeight;

    const scrollHeight = Math.floor(
      (domHeight - 16)
      * domHeight / containerHeight
    );

    const offsetHeight = Math.floor((domHeight - 16) * 0.1);

    const newHeight = Math.max(scrollHeight, offsetHeight, 25);
    handlerHeightDelta = scrollHeight - newHeight;

    return newHeight;
  };

  let prevHandlerHeight = 0;

  const updateHandlerHeight = (domHeight, containerHeight) => {
    let newHandlerHeight = calculateHandlerHeight(domHeight, containerHeight);

    if(newHandlerHeight != prevHandlerHeight) {
      prevHandlerHeight = newHandlerHeight;
      refs.handler.style.height = newHandlerHeight + 'px';

      if(newHandlerHeight >= domHeight - 17) hideHandler();
      else scrollContainer(0);
    }
  };

  on(dom, 'mouseenter', () => {
    updateHandlerHeight();
  });

  on(dom, 'mousemove', showHandler);
  on(dom, 'mouseleave', showHandler);

  let startPos;
  let startScroll;

  on(refs.handler, 'mousedown', e => {
    startPos = e.y;
    startScroll = refs.container.scrollTop;
  });

  onWindow('mousemove', e => {
    if(startPos) {
      const delta = e.y - startPos;
      const newScroll = Math.floor(
        startScroll
        + refs.container.scrollHeight * delta / (dom.offsetHeight - 16 + handlerHeightDelta)
      );
      scrollContainer(newScroll, true);
    }
  });

  onWindow('mouseup', e => {
    startPos = null;
  });

  parent.appendChild(dom);

  return {
    content: refs.content,
    update: updateHandlerHeight,
    hide: () => {
      refs.handler.style.opacity = null;
    }
  };
};