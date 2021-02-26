import { domFromHtml } from '../../helpers/dom';
import { deferred, clearResizeHandlers, offWindowAll } from '../../helpers/utils';

import AuthPhone from './Phone';
import AuthCode from './Code';
import AuthRegister from './Register';

export default function Auth(parent) {
  const html =
   `<div class="auth"></div>`;

  const dom = domFromHtml(html);

  let isPhoneEntered = false;
  let isMtprotoInited = false;
  let isCodeScreenLoaded = false;

  let plainPhone;
  let formattedPhone;
  let hashPhone;
  let codeLength;

  const showCodeScreen = () => {
    authPhoneComponent.hide();

    authCodeComponent.setPhone(plainPhone, formattedPhone, hashPhone, codeLength);

    authCodeComponent.show();
  };

  const showPhoneScreen = () => {
    authCodeComponent.hide();

    authPhoneComponent.show();
  };

  const showRegScreen = termOfService => {
    authCodeComponent.hide(true);
    authRegComponent.show(termOfService);
  };

  let plainPhoneToSend;
  let innerSendDefer;

  const innerSendCode = () => {
    MTProto.auth.sendCode(plainPhoneToSend)
    .then(result => {
      innerSendDefer.resolve(result);
    });
  };

  const sendCode = plain => {
    innerSendDefer = deferred();

    isPhoneEntered = true;
    plainPhoneToSend = plain;

    if(isMtprotoInited && isCodeScreenLoaded) innerSendCode();

    return innerSendDefer.promise;
  };

  const phoneEntered = (plain, formatted, hash, codeLengthParam, isTemp) => {
    plainPhone = plain;
    formattedPhone = formatted;
    hashPhone = hash;
    codeLength = codeLengthParam;

    TGInit.changeStorageType(isTemp);

    showCodeScreen();
  };

  const onAuth = () => {
    dom.classList.add('hide-down');
    authRegComponent.destroyModal();

    clearResizeHandlers();
    offWindowAll();

    setTimeout(() => {
      parent.removeChild(dom);

      TGInit.initApp();
    }, 300);
  };

  const authPhoneComponent = AuthPhone(dom, {
    phoneEntered,
    sendCode
  });
  let authCodeComponent;

  let authRegComponent = AuthRegister(dom, {
    onAuth,
    getPhone: () => {
      return {
        plain: plainPhone,
        hash: hashPhone
      };
    }
  });

  parent.appendChild(dom);

  return {
    mtprotoInited: () => {
      isMtprotoInited = true;

      if(isPhoneEntered && isCodeScreenLoaded) innerSendCode();
    },
    codeScreenLoaded: () => {
      isCodeScreenLoaded = true;
      authCodeComponent = AuthCode(dom, {
        showPhoneScreen,
        showRegScreen,
        onAuth
      });

      if(isPhoneEntered && isMtprotoInited) innerSendCode();
    }
  };
};