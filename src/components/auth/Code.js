import { domFromHtml, refsFromDom } from '../../helpers/dom';
import { on } from '../../helpers/utils';

import Button from './Elements/Button';
import InputSimple from './Input/Simple';
import InputPassword from './Input/Password';

export default function AuthCode(parent, opts) {
  const html =
   `<div class="auth-screen auth-animated auth-animated__hide-right">
      <div class="auth-header auth-header__anim" ref="header"></div>
      <div class="auth-animated-wrapper">
        <div class="auth-animated" ref="formCode">
          <div class="auth-title">
            <span ref="phone"></span>
            <span class="icon icon__edit" ref="edit"></span>
          </div>
          <div class="auth-info">
            We have sent you an SMS<br>with the code.
          </div>
          <div class="auth-field" ref="authFieldCode"></div>
        </div>
        <div class="auth-animated auth-animated__hide-right" ref="formPassword">
          <div class="auth-title">Enter a Password</div>
          <div class="auth-info">
            Your account is protected with<br>an additional password.
          </div>
          <div class="auth-field" ref="authFieldPassword"></div>
          <div class="auth-field auth-field__button" ref="authFieldPasswordButton"></div>
        </div>
      </div>
    </div>`;

  const dom = domFromHtml(html);
  const refs = refsFromDom(dom);

  let plainPhone;
  let hashPhone;
  let codeLength;
  let isLoading = false;

  const submit = value => {
    inputCodeComponent.setDisabled(true, true);
    refs.edit.classList.add('is-cursor-not-allowed');
    isLoading = true;

    MTProto.auth.signIn(plainPhone, hashPhone, value)
    .then(result => {
      if(result.err) {
        inputCodeComponent.setDisabled(false);
        refs.edit.classList.remove('is-cursor-not-allowed');
        isLoading = false;

        let errorText = '';
        if(result.err == 'PHONE_CODE_INVALID') errorText = 'Invalid Code';
        if(result.err == 'PHONE_CODE_EXPIRED') errorText = 'Code Expired, try Resend';

        inputCodeComponent.setError(errorText);
        return;
      }

      if(result.next == 'pass') {
        refs.formCode.classList.add('auth-animated__hide-left');
        refs.formPassword.classList.remove('auth-animated__hide-right');
        inputPasswordComponent.refs.input.focus();
      }

      if(result.next == 'reg') {
        refs.formPassword.classList.remove('auth-animated__hide-right');
        opts.showRegScreen(result.termOfService);
      }

      if(result.next == 'done') {
        opts.onAuth();
      }
    });
  };

  const submitPassword = password => {
    alert('2FA not implemented');
    return;

    inputPasswordComponent.setDisabled(true);
    buttonPasswordComponent.setLoading(true);

    MTProto.auth.checkPassword(password)
    .then(result => {
      if(result.err) {
        inputPasswordComponent.setDisabled(false);
        buttonPasswordComponent.setLoading(false);

        let errorText = '';
        if(result.err == 'invalid') errorText = 'Invalid Password';

        inputPasswordComponent.setError(errorText);
        return;
      }

      if(result.next == 'auth') {
        console.log('auth');
      }
    });
  };

  const animationIdle = lottie.loadAnimation({
    container: refs.header,
    renderer: 'svg',
    loop: true,
    autoplay: false,
    animationData: TGInit.resources.idle
  });

  const setEyeIdleAnimationState = state => {
    animationIdle.renderer.elements[2].shapes.forEach(shape => {
      shape._isAnimated = state;
    });
    animationIdle.renderer.elements[3].shapes.forEach(shape => {
      shape._isAnimated = state;
    });
  };

  const animationTracking = lottie.loadAnimation({
    container: refs.header,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: TGInit.resources.tracking
  });
  animationTracking.hide();

  const animationCloseToggle = lottie.loadAnimation({
    container: refs.header,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: TGInit.resources['close-toggle']
  });

  animationCloseToggle.playSegments([ 48, 49 ], true);
  animationCloseToggle.renderer.elements[8].shapes.forEach(shape => {
    shape._isAnimated = false;
  });
  animationCloseToggle.hide();

  const animationClosePeekShow = lottie.loadAnimation({
    container: refs.header,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: TGInit.resources['close-peek-show']
  });
  animationClosePeekShow.hide();

  const animationClosePeekHide = lottie.loadAnimation({
    container: refs.header,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: TGInit.resources['close-peek-hide']
  });
  animationClosePeekHide.hide();

  const animationCloseToPeek = lottie.loadAnimation({
    container: refs.header,
    renderer: 'svg',
    loop: false,
    autoplay: false,
    animationData: TGInit.resources['close-to-peek']
  });
  animationCloseToPeek.hide();

  let removeToIdle;
  let removeToIdleStep;
  let removeToTracking;
  let removeToTrackingStep;
  let removeToTrackingStep2;
  let removeToggle;
  const oneSymbolWidth = 140 / 36;

  const idleAnimationToStart = callback => {
    if(removeToIdle) {
      removeToIdle();
      removeToIdle = null;
    }
    if(removeToIdleStep) {
      removeToIdleStep();
      removeToIdleStep = null;
    }

    setEyeIdleAnimationState(false);
    animationIdle.loop = false;
    animationIdle.setSpeed(3);
    if(animationIdle.currentFrame < 90)
      animationIdle.playSegments([ animationIdle.currentFrame, 20 ], true);
    else
      animationIdle.playSegments([ animationIdle.currentFrame, 170 ], true);

    removeToTracking = animationIdle.addEventListener('complete', () => {
      removeToTracking();
      removeToTracking = null;

      setEyeIdleAnimationState(true);
      animationIdle.hide();

      callback();
    });
  };

  const playIdleLoop = () => {
    animationIdle.loop = true;
    animationIdle.setSpeed(1);
    animationIdle.playSegments([ 0, 180 ], true);
    animationIdle.show();
  };

  const inputCodeComponent = InputSimple(refs.authFieldCode, {
    label: 'Code',
    onFocus: input => {
      idleAnimationToStart(() => {
        animationTracking.show();
        animationTracking.setSpeed(1);
        animationTracking.playSegments([
          0, 20
        ], true);

        removeToTrackingStep = animationTracking.addEventListener('complete', () => {
          removeToTrackingStep();
          removeToTrackingStep = null;

          animationTracking.setSpeed(4);
          animationTracking.playSegments([
            20, 20 + input.value.length * oneSymbolWidth
          ], true);

          removeToTrackingStep2 = animationTracking.addEventListener('complete', () => {
            removeToTrackingStep2();
            removeToTrackingStep2 = null;

            animationTracking.setSpeed(1);
          });
        });
      });
    },
    onBlur: input => {
      if(removeToTracking) {
        removeToTracking();
        removeToTracking = null;
      }
      if(removeToTrackingStep) {
        removeToTrackingStep();
        removeToTrackingStep = null;
      }
      if(removeToTrackingStep2) {
        removeToTrackingStep2();
        removeToTrackingStep2 = null;
      }

      animationTracking.setSpeed(4);
      animationTracking.playSegments([
        20 + input.value.length * oneSymbolWidth, 20
      ], true);

      removeToIdleStep = animationTracking.addEventListener('complete', () => {
        removeToIdleStep();
        removeToIdleStep = null;

        animationTracking.setSpeed(1);
        animationTracking.playSegments([ 20, 0 ], true);

        removeToIdle = animationTracking.addEventListener('complete', () => {
          removeToIdle();
          removeToIdle = null;

          animationTracking.hide();

          playIdleLoop();
        });
      });
    },
    onInput: (() => {
      let prevValue = '';

      return (input, e) => {
        let prevSelectionStart = input.selectionStart;
        let prevSelectionEnd = input.selectionEnd;

        const checkRegExp = new RegExp(`^\\d{0,${codeLength}}$`);

        if(!checkRegExp.test(input.value)) {
          input.value = prevValue;

          if(e.data) prevSelectionStart--;
          if(e.data) prevSelectionEnd--;

          input.setSelectionRange(prevSelectionStart, prevSelectionEnd);
          return;
        }

        //animationTracking.playSegments([ 20, 160 ], true);

        // 140 - frames tracking count
        // 36 - max input symbols by width
        // 20 - first tracking frame

        const startFrame = 20 + prevValue.length * oneSymbolWidth;
        const endFrame = 20 + input.value.length * oneSymbolWidth;

        animationTracking.playSegments([ startFrame, endFrame ], true);

        prevValue = input.value;

        if(input.value.length == codeLength) {
          submit(input.value);
        }
      }
    })()
  });

  on(refs.edit, 'click', () => {
    if(isLoading) return;
    opts.showPhoneScreen();
  });

  let buttonHideTimeout;

  const showButton = () => {
    clearTimeout(buttonHideTimeout);

    buttonPasswordComponent.dom.classList.remove('is-hidden');
    buttonPasswordComponent.dom.classList.remove('hide-up');
    buttonPasswordComponent.dom.classList.add('show-down');
  };

  const hideButton = () => {
    buttonPasswordComponent.dom.classList.remove('show-down');
    buttonPasswordComponent.dom.classList.add('hide-up');
    buttonHideTimeout = setTimeout(() => {
      buttonPasswordComponent.dom.classList.add('is-hidden');
    }, 330);
  };

  let isPasswordShow = false;
  let isPasswordShowChanged = false;
  let blurTimeout;
  let isFocused = false;

  const inputPasswordComponent = InputPassword(refs.authFieldPassword, {
    onFocus: input => {
      clearTimeout(blurTimeout);
      isFocused = true;

      if(isPasswordShowChanged) {
        isPasswordShowChanged = false;
        return;
      }

      idleAnimationToStart(() => {
        if(isPasswordShow) {
          animationClosePeekShow.show();
          animationClosePeekShow.playSegments([
            0, 33
          ], true);
        } else {
          animationCloseToggle.show();
          animationCloseToggle.playSegments([
            0, 49
          ], true);
        }
      });
    },
    onBlur: input => {
      blurTimeout = setTimeout(() => {
        isFocused = false;

        if(isPasswordShowChanged) return;

        let playedAnimation;

        if(isPasswordShow) {
          animationClosePeekShow.hide();
          animationClosePeekHide.show();
          animationClosePeekHide.playSegments([
            0, 33
          ], true);

          playedAnimation = animationClosePeekHide;
        } else {
          animationCloseToggle.playSegments([
            49, 98
          ], true);

          playedAnimation = animationCloseToggle;
        }

        removeToIdle = playedAnimation.addEventListener('complete', () => {
          removeToIdle();
          removeToIdle = null;

          //playedAnimation.hide();
          animationCloseToggle.hide();
          animationClosePeekHide.hide();

          playIdleLoop();
        });
      }, 150);
    },
    onInput: input => {
      if(input.value.length) showButton();
      else hideButton();
    },
    onEnter: () => {
      submitPassword(inputPasswordComponent.refs.input.value);
    },
    onToggle: state => {
      if(removeToggle) {
        removeToggle();
        removeToggle = null;
      }

      isPasswordShow = state;

      if(!isFocused) return;
      else isPasswordShowChanged = true;

      animationClosePeekShow.hide();
      animationCloseToggle.hide();

      animationCloseToPeek.show();

      let frames = [ 0, 16 ];
      if(!state) frames = [ 16, 33 ];

      animationCloseToPeek.playSegments(frames, true);

      removeToggle = animationCloseToPeek.addEventListener('complete', () => {
        removeToggle();
        removeToggle = null;

        animationCloseToPeek.hide();

        if(isPasswordShow) {
          animationClosePeekShow.show();
          animationClosePeekShow.playSegments([ 32, 33 ], true);
        } else {
          animationCloseToggle.show();
          animationClosePeekShow.currentFrame = 48;
        }
      });
    }
  });
  const buttonPasswordComponent = Button(refs.authFieldPasswordButton, {
    text: 'Next',
    isBig: true,
    isBlock: true,
    isHidden: true,
    onClick: () => {
      submitPassword(inputPasswordComponent.refs.input.value);
    }
  });

  parent.appendChild(dom);

  return {
    setPhone: (plainPhoneParam, formattedPhoneParam, hashPhoneParam, codeLengthParam) => {
      refs.phone.textContent = formattedPhoneParam;

      plainPhone = plainPhoneParam;
      hashPhone = hashPhoneParam;
      codeLength = codeLengthParam;
    },
    hide: isLeft => {
      dom.classList.add(isLeft ? 'auth-animated__hide-left' : 'auth-animated__hide-right');
    },
    show: () => {
      animationIdle.play();
      dom.classList.remove('auth-animated__hide-left');
      dom.classList.remove('auth-animated__hide-right');
      inputCodeComponent.refs.input.focus();
    }
  };
};