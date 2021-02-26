/* global tgProto, tgAuth, tgApp */

import './Styles/minireset.sass';
import './Styles/fonts.scss';
import './Styles/main.scss';
import './Styles/icons.scss';

import {
  sleep,
  deferred
} from '../helpers';

const isTestMode = location.hash == '#testmode';

let currentStorage = sessionStorage.storage || 'localStorage';
sessionStorage.storage = currentStorage;

const setStorage = (key, value) => {
  if(value === null) delete(window[currentStorage][key]);
  else window[currentStorage][key] = value;
};

const getStorage = key => {
  return window[currentStorage][key];
};

const changeStorageType = isTemp => {
  const newCurrentStorage = isTemp ? 'sessionStorage' : 'localStorage';
  if(newCurrentStorage == currentStorage) return;

  sessionStorage.storage = newCurrentStorage;

  Object.keys(window[currentStorage]).forEach(key => {
    if(key == 'storage') return;
    window[newCurrentStorage][key] = window[currentStorage][key];
  });
  window[currentStorage].clear();

  currentStorage = newCurrentStorage;
  sessionStorage.storage = currentStorage;
};

let nextCallWorkerId = 0;
let callWorkerDefers = {};

const worker = new Worker('js/worker.min.js');

worker.onmessage = e => {
  const id = e.data.id;
  callWorkerDefers[id].resolve(e.data.result);
  delete(callWorkerDefers[id]);
};

const callWorker = (method, params) => {
  const currentCallWorkerId = nextCallWorkerId++;

  worker.postMessage({
    id: currentCallWorkerId,
    method,
    params
  });

  const defer = deferred();
  callWorkerDefers[currentCallWorkerId] = defer;
  return defer.promise;
};

const resources = {
  main: {},
  auth: {},
  app: {}
};

const loadLogo = () => {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      resources.auth.logo = img;
      resolve();
    };
    img.src = 'img/logo.svg';
  });
};

const loadMonkey = () => {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', 'img/monkey.tgs', true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = async () => {
      const parsed = JSON.parse(new TextDecoder().decode(
        await callWorker('gunzip', new Uint8Array(xhr.response))
      ));

      resources.auth.monkey = parsed;

      resolve();
    };

    xhr.send();
  });
};

const loadStyle = name => {
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'stylesheet');
    link.setAttribute('href', `css/${name}.min.css`);

    const interval = setInterval(() => {
      try {
        if(link.sheet && link.sheet.cssRules.length) {
          clearInterval(interval);
          resources[name].style = link;
          resolve();
        }
      }
      // eslint-disable-next-line no-empty
      catch(err) {}
    }, 10);

    document.head.appendChild(link);
  });
};

const loadScript = name => {
  const type = resources[name] ? name : 'main';
  if(resources[type][name]) return;

  return new Promise(resolve => {
    const script = document.createElement('script');
    script.src = `js/${name}.min.js`;

    script.onload = () => {
      resources[type][name] = script;
      resolve();
    };

    document.head.appendChild(script);
  });
};

const clearResources = resourcesToClear => {
  for(let name in resourcesToClear) {
    const resource = resourcesToClear[name];

    if(resource.tagName == 'LINK' || resource.tagName == 'SCRIPT') {
      document.head.removeChild(resource);
    }

    delete(resourcesToClear[name]);
  }
};

let svgLoader;
let loaderShowTimeout;

const createSvgLoader = () => {
  const div = document.createElement('div');
  div.innerHTML =
   `<svg class="loader loader__big loader__blue" viewBox="25 25 50 50">
      <circle cx="50" cy="50" r="20">
    </svg>`;

  loaderShowTimeout = setTimeout(() => {
    svgLoader = div.firstChild;
    document.body.appendChild(svgLoader);
  }, 500);
};

const destroySvgLoader = () => {
  return new Promise(resolve => {
    clearTimeout(loaderShowTimeout);

    if(!svgLoader) {
      resolve();
      return;
    }

    svgLoader.classList.add('loader__hide');
    setTimeout(() => {
      resolve();
    }, 150);
    setTimeout(() => {
      document.body.removeChild(svgLoader);
      svgLoader = null;
    }, 300);
  });
};

let loadAuthInited = false;
let loadAuthDefer;
let loadAppInited = false;
let loadAppDefer;

const loadApp = () => {
  if(loadAppInited) return loadAppDefer.promise;

  loadAppInited = true;
  loadAppDefer = deferred();

  let resourcesPreloader = document.createElement('div');
  resourcesPreloader.className = 'messages-bg__default m-preloader';
  resourcesPreloader.innerHTML = 'a<b>a</b>';
  document.body.appendChild(resourcesPreloader);

  const promises = [
    loadStyle('app'),
    loadScript('app'),
    loadScript('proto'),
    document.fonts.ready
  ];
  if(!document.fonts.check('1rem icons')) {
    promises.push(document.fonts.load('1rem icons'));
  }

  Promise.all(promises).then(() => {
    document.body.removeChild(resourcesPreloader);
    loadAppDefer.resolve();
  });

  return loadAppDefer.promise;
};

const loadAuth = () => {
  if(loadAuthInited) return loadAuthDefer.promise;

  loadAuthInited = true;
  loadAuthDefer = deferred();

  let resourcesPreloader = document.createElement('div');
  resourcesPreloader.className = 'a-flag m-preloader';
  resourcesPreloader.innerHTML = 'a<b>a</b>';
  document.body.appendChild(resourcesPreloader);

  const promises = [
    loadLogo(),
    loadStyle('auth'),
    loadScript('auth'),
    loadScript('proto'),
    document.fonts.ready
  ];
  if(!document.fonts.check('1rem icons-auth')) {
    promises.push(document.fonts.load('1rem icons-auth'));
  }

  Promise.all(promises).then(() => {
    document.body.removeChild(resourcesPreloader);
    loadAuthDefer.resolve();
  });

  return loadAuthDefer.promise;
};

const initApp = async () => {
  createSvgLoader();

  clearResources(resources.auth);
  loadAuthInited = false;

  await loadApp();

  await destroySvgLoader();

  tgApp.init();

  await tgProto.init();
  tgApp.protoInited();

  await loadScript('lottie');
  tgApp.lottieLoaded();
};

const initAuth = async () => {
  createSvgLoader();

  clearResources(resources.app);
  loadAppInited = false;

  await loadAuth();

  await destroySvgLoader(true);

  const authComponent = tgAuth.init();

  await tgProto.init();
  tgProto.initAllDc();
  authComponent.protoInited();

  await sleep(1200);
  await Promise.all([
    loadScript('lottie'),
    loadMonkey()
  ]);
  authComponent.lottieLoaded();
};

if(getStorage('user_id')) {
  initApp();
} else {
  initAuth();
}

export {
  isTestMode,
  resources,
  setStorage,
  getStorage,
  changeStorageType,
  initApp,
  initAuth,
  loadApp,
  loadAuth,
  callWorker
};