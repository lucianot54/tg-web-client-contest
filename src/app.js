import './scss/app/index.scss';

import AppComponent from './components/App';

const mtprotoInitedHandlers = [];

export const onMtprotoInit = callback => {
  mtprotoInitedHandlers.push(callback);
};

export const mtprotoInited = () => {
  mtprotoInitedHandlers.forEach(handler => {
    handler();
  });
};

export { AppComponent };