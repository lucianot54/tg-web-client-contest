import './scss/main/index.scss';

import {
  domFromHtml
} from './helpers/dom';

import {
  deferred,
  bytesToStr,
  sleep
} from './helpers/utils';

export const resources = {};
let authResources = {};
let isLottieLoaded = false;

const loadImg = (name, addToResources, isAuth) => {
  const defer = deferred();

  const img = new Image();
  img.onload = () => {
    if(addToResources) resources[name] = img;
    if(isAuth) authResources[name] = img;
    defer.resolve();
  };
  img.src = `img/${name}`;

  return defer.promise;
};

const loadStyle = (name, isAuth) => {
  const defer = deferred();

  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', `css/${name}`);

  let sheet;
  let cssRules;
  if('sheet' in link) {
    sheet = 'sheet';
    cssRules = 'cssRules';
  } else {
    sheet = 'styleSheet';
    cssRules = 'rules';
  }

  const interval = setInterval(() => {
    try {
      if(link[sheet] && link[sheet][cssRules].length) {
        clearInterval(interval);

        if(isAuth) authResources[name] = link;

        defer.resolve();
      }
    }
    catch(err) {}
  }, 10);

  document.head.appendChild(link);

  return defer.promise;
};

const loadScript = (name, isAuth) => {
  const defer = deferred();

  const script = document.createElement('script');
  script.onload = () => {
    if(isAuth) authResources[name] = script;

    defer.resolve();
  };
  script.src = `js/${name}`;
  document.head.appendChild(script);

  return defer.promise;
};

const loadTgs = (name, isAuth) => {
  const defer = deferred();

  const xhr = new XMLHttpRequest();
  xhr.open('GET', `img/tgs/${name}.tgs`, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = () => {
    const byteView = new Uint8Array(xhr.response);

    const gunzip = new Zlib.Gunzip(byteView);
    const uncompressed = gunzip.decompress();
    const parsed = JSON.parse(bytesToStr(uncompressed));

    resources[name] = parsed;
    if(isAuth) authResources[name] = parsed;

    defer.resolve();
  };
  xhr.send(null);

  return defer.promise;
};

const loadData = (name, isAuth) => {
  const defer = deferred();

  const xhr = new XMLHttpRequest();
  xhr.open('GET', `data/${name}.json`, true);
  xhr.onload = () => {
    const parsed = JSON.parse(xhr.response);
    resources[name] = parsed;
    if(isAuth) authResources[name] = parsed;

    defer.resolve();
  };
  xhr.send(null);

  return defer.promise;
};

const loadZeroAuthResources = () => {
  const promises = [];
  promises.push(loadScript('auth.min.js', true));
  promises.push(loadStyle('auth.min.css', true));

  return Promise.all(promises);
};

let isMtprotoResourcesLoaded = false;

const loadMtprotoResources= () => {
  if(isMtprotoResourcesLoaded) return Promise.resolve();
  isMtprotoResourcesLoaded = true;

  const mtprotoPromises = [];
  mtprotoPromises.push(loadScript('mtproto.min.js'));
  mtprotoPromises.push(loadScript('aes.min.js'));
  mtprotoPromises.push(loadScript('bigint.min.js'));
  mtprotoPromises.push(loadScript('gunzip.min.js'));
  mtprotoPromises.push(loadScript('sha1.min.js'));
  mtprotoPromises.push(loadScript('sha256.min.js'));
  mtprotoPromises.push(loadData('public-keys'));
  mtprotoPromises.push(loadData('schema-mtproto'));
  mtprotoPromises.push(loadData('schema-api'));

  return Promise.all(mtprotoPromises);
};

const loadFirstAuthResources = () => {
  const promises = [];

  const fontTextRegular = new FontFaceObserver('Roboto', { weight: 400 });
  const fontTextBold = new FontFaceObserver('Roboto', { weight: 700 });
  const fontIconsBold = new FontFaceObserver('icons');

  promises.push(fontTextRegular.load(null, 30000));
  promises.push(fontTextBold.load(null, 30000));
  promises.push(fontIconsBold.load('\e800', 30000));
  promises.push(loadImg('logo.svg', true, true));
  promises.push(loadScript('emoji-flags.min.js', true));
  promises.push(loadData('countries', true));

  return Promise.all(promises);
};

const loadSecondAuthResources = () => {
  const codeScreenPromises = [];
  if(!isLottieLoaded) codeScreenPromises.push(loadScript('lottie.min.js'));
  codeScreenPromises.push(loadTgs('idle', true));
  codeScreenPromises.push(loadTgs('tracking', true));
  codeScreenPromises.push(loadTgs('close-toggle', true));
  codeScreenPromises.push(loadTgs('close-peek-show', true));
  codeScreenPromises.push(loadTgs('close-peek-hide', true));
  codeScreenPromises.push(loadTgs('close-to-peek', true));

  isLottieLoaded = true;

  return Promise.all(codeScreenPromises);
};

const loadAppResources = () => {
  const promises = [];

  const fontTextRegular = new FontFaceObserver('Roboto', { weight: 400 });
  const fontTextBold = new FontFaceObserver('Roboto', { weight: 700 });
  const fontIconsBold = new FontFaceObserver('icons');

  promises.push(fontTextRegular.load(null, 30000));
  promises.push(fontTextBold.load(null, 30000));
  promises.push(fontIconsBold.load('\e800', 30000));
  promises.push(loadScript('emoji.min.js'));
  promises.push(loadScript('app.min.js'));
  promises.push(loadStyle('app.min.css'));

  return Promise.all(promises);
};

let svgLoader;
const createSvgLoader = () => {
  svgLoader = domFromHtml(
   `<svg class="loader loader__big loader__blue" viewBox="25 25 50 50">
      <circle cx="50" cy="50" r="20" stroke-miterlimit="10">
    </svg>`
  );

  document.body.appendChild(svgLoader);
};

const destroySvgLoader = () => {
  const defer = deferred();

  svgLoader.classList.add('loader__hide');
  setTimeout(() => {
    document.body.removeChild(svgLoader);
    defer.resolve();
  }, 300);

  return defer.promise;
};

let currentStorage = sessionStorage.storage_type || 'localStorage';
sessionStorage.storage_type = currentStorage;

export const setStorage = (key, value) => {
  if(value === null) delete(window[currentStorage][key]);
  else window[currentStorage][key] = value;
};

export const getStorage = key => {
  return window[currentStorage][key];
};

export const changeStorageType = isTemp => {
  const newCurrentStorage = isTemp ? 'sessionStorage' : 'localStorage';
  if(newCurrentStorage == currentStorage) return;

  sessionStorage.storage_type = newCurrentStorage;

  Object.keys(window[currentStorage]).forEach(key => {
    if(key == 'storage_type') return;
    window[newCurrentStorage][key] = window[currentStorage][key];
  });
  window[currentStorage].clear();

  currentStorage = newCurrentStorage;
  sessionStorage.storage_type = currentStorage;
};

export const initApp = () => {
  createSvgLoader();

  for(let name in authResources) {
    const resource = authResources[name];

    if(resource.tagName == 'LINK' || resource.tagName == 'SCRIPT') {
      document.head.removeChild(resource);
    }

    delete(authResources[name]);
    delete(resources[name]);
  }

  let appComponent;
  let emojiPreloader;

  loadMtprotoResources()
  .then(() => {
    return loadAppResources();
  })
  .then(() => {
    emojiPreloader = document.createElement('div');
    emojiPreloader.className = 'emoji-preloader emoji-inner';
    document.body.appendChild(emojiPreloader);

    return destroySvgLoader();
  })
  .then(() => {
    document.body.removeChild(emojiPreloader);
    appComponent = TGApp.AppComponent(document.body);
    return MTProto.init();
  })
  .then(() => {
    TGApp.mtprotoInited();
  });
};

export const initAuth = () => {
  createSvgLoader();

  let emojiPreloader;
  let authComponent;

  loadZeroAuthResources()
  .then(() => {
    emojiPreloader = document.createElement('div');
    emojiPreloader.className = 'emoji-flags-preloader emoji-flag-inner';
    document.body.appendChild(emojiPreloader);

    return loadFirstAuthResources();
  }).then(() => {
    document.body.removeChild(emojiPreloader);
    destroySvgLoader();
    return sleep(150);
  })
  .then(() => {
    authComponent = TGAuth.AuthComponent(document.body);
    return sleep(2000);
  })
  .then(() => {
    loadMtprotoResources()
    .then(() => {
      loadSecondAuthResources()
      .then(() => {
        authComponent.codeScreenLoaded();
      });

      return MTProto.init();
    })
    .then(() => {
      authComponent.mtprotoInited();
    });
  });
};

window.addEventListener('load', () => {
  if(getStorage('access_hash')) {
    initApp();
  } else {
    initAuth();
  }
});