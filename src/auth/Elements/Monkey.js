/* global tgMain, lottie */

import { on } from '../../helpers';

class MonkeyElement extends HTMLElement {
  constructor() {
    super();

    this._animation = null;
    this._canPlay = false;
    this._current = '';
    this._startFrame = 0;
    this._endFrame = 0;
    this._isIdleReady = true;
    this._next = null;
    this._param1 = null;
    this._param2 = null;
    this._isCloseAfterTrack = false;
  }

  init() {
    this._animation = lottie.loadAnimation({
      container: this,
      loop: false,
      autoplay: false,
      animationData: tgMain.resources.auth.monkey
    });

    on(this._animation, 'complete', this._completeHandler.bind(this));
  }

  play() {
    this._canPlay = true;
    this._play();
  }

  stop() {
    this._canPlay = false;
    this._animation.pause();
  }

  playTrack(length, maxLength) {
    if(this._current == 'idle' && !this._isIdleReady) {
      this._next = 'playTrack';
      this._param1 = length;
      this._param2 = maxLength;
      return this._prepareIdle();
    }

    let startFrame = 261;
    let endFrame = 333;

    if(this._current == 'track' ||
       this._current == 'track_end_1' ||
       this._current == 'track_end_2') {
      endFrame = startFrame + 20 + 32 * length / maxLength;
      startFrame = this._animation.projectInterface.currentFrame;
    }

    else {
      endFrame = startFrame + 20 + 32 * length / maxLength;
    }

    this._current = 'track';
    this._startFrame = startFrame;
    this._endFrame = endFrame;

    this._play();
  }

  playClose() {
    if(this._current == 'idle' && !this._isIdleReady) {
      this._next = 'playClose';
      return this._prepareIdle();
    }

    if(this._current == 'close_end') {
      this._startFrame = this._animation.projectInterface.currentFrame;
      this._endFrame = 221;
      this._current = 'close';
    }
    else if(this._current == 'peek') {
      this._startFrame = 235;
      this._endFrame = 221;
      this._current = 'close';
    }
    else if(this._current == 'track_end_1') {
      this._startFrame = 314;
      this._endFrame = 332;

      this._current = 'track_end_2';
      this._isCloseAfterTrack = true;
    }
    else if(this._current == 'track_end_2') {
      this._startFrame = this._animation.projectInterface.currentFrame;
      this._endFrame = 332;

      this._isCloseAfterTrack = true;
    }
    else {
      this._startFrame = 181;
      this._endFrame = 221;
      this._current = 'close';
    }

    this._play();
  }

  playPeek() {
    if(this._current == 'idle' && !this._isIdleReady) {
      this._next = 'playPeek';
      return this._prepareIdle();
    }

    if(this._current == 'peek_end') {
      this._startFrame = this._animation.projectInterface.currentFrame;
      this._endFrame = 236;
    }
    else if(this._current == 'close') {
      this._startFrame = 222;
      this._endFrame = 236;
    }
    else {
      this._startFrame = 259;
      this._endFrame = 236;
    }

    this._current = 'peek';

    this._play();
  }

  playIdle() {
    if(this._current == 'idle') return;

    this._isIdleReady = false;

    if(this._current == 'track') {
      this._startFrame = this._animation.projectInterface.currentFrame;
      this._endFrame = 313;

      let speed = (this._endFrame - this._startFrame) / 9;
      if(speed < 1) speed = 1;
      this._animation.playSpeed = speed;
      this._animation.updaFrameModifier();

      this._current = 'track_end_1';
    }
    else if(this._current == 'close') {
      this._startFrame = this._animation.projectInterface.currentFrame;
      this._endFrame = 181;
      this._current = 'close_end';
    }
    else if(this._current == 'peek') {
      this._startFrame = this._animation.projectInterface.currentFrame;
      this._endFrame = 259;
      this._current = 'peek_end';
    }
    else if(this._current == 'idle_end') {
      this._startFrame = this._animation.projectInterface.currentFrame;
      this._current = 'idle';
    }
    else {
      this._startFrame = 0;
      this._endFrame = 180;
      this._current = 'idle';
    }

    this._play();
  }

  _play() {
    if(!this._canPlay) return;

    if(!this._current) return this.playIdle();

    this._animation.playSegments([ this._startFrame, this._endFrame ], true);
  }

  _prepareIdle() {
    const currentFrame = this._animation.currentFrame;

    if(currentFrame <= 19 || currentFrame >= 162) {
      this._current = 'idle_end';
      this._completeHandler();
      return;
    }
    else if(currentFrame >= 50 && currentFrame <= 80) {
      this._setEyesAnimated(false);

      this._startFrame = 50;
      this._endFrame = 19;
    }
    else if(currentFrame >= 110 && currentFrame <= 141) {
      this._setEyesAnimated(false);

      this._startFrame = 141;
      this._endFrame = 162;
    }
    else if(currentFrame > 141 && currentFrame < 162) {
      this._startFrame = this._animation.projectInterface.currentFrame;
      this._endFrame = 162;
    }
    else {
      const removeListener = this._animation
        .addEventListener('enterFrame', () => {
          const currentFrame = this._animation.currentFrame;

          const isLow = currentFrame >= 50 && currentFrame <= 80;
          const isHigh = currentFrame >= 110 && currentFrame <= 141;

          if(!isLow && !isHigh) return;

          this._setEyesAnimated(false);

          if(isLow) {
            this._startFrame = 50;
            this._endFrame = 19;
          }

          if(isHigh) {
            this._startFrame = 141;
            this._endFrame = 162;
          }

          removeListener();

          this._current = 'idle_end';
          this._play();
        });
      return;
    }

    this._current = 'idle_end';
    this._play();
  }

  async _completeHandler() {
    if(this._animation.playSpeed != 1) {
      this._animation.playSpeed = 1;
      this._animation.updaFrameModifier();
    }
    this._setEyesAnimated(true);

    if(this._current == 'idle_end') {
      this._isIdleReady = true;
      this[this._next](this._param1, this._param2);
      return;
    }

    if(this._current == 'track_end_2' && this._isCloseAfterTrack) {
      this._isCloseAfterTrack = false;
      this._startFrame = 181;
      this._endFrame = 221;
      this._current = 'close';
      this._play();
      return;
    }

    if(this._current == 'idle' ||
       this._current == 'track_end_2' ||
       this._current == 'close_end' ||
       this._current == 'peek_end') {
      const wasIdle = this._current == 'idle';

      if(wasIdle && this._current != 'idle') return;

      this._current = 'idle';
      this._startFrame = 0;
      this._endFrame = 180;
      this._play();
      return;
    }

    if(this._current == 'track_end_1') {
      this._startFrame = 314;
      this._endFrame = 332;

      this._current = 'track_end_2';
      this._play();
      return;
    }
  }

  _setEyesAnimated(state) {
    this._animation.renderer.elements[5].shapes.forEach(shape => {
      shape._isAnimated = state;
    });
    this._animation.renderer.elements[6].shapes.forEach(shape => {
      shape._isAnimated = state;
    });
  }
}

if(!customElements.get('tga-monkey')) {
  customElements.define('tga-monkey', MonkeyElement);
}