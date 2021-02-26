import {
  deferred
} from '../helpers';

let db;
let dbOpenDefer;

const dbOpen = async () => {
  if(dbOpenDefer) return dbOpenDefer.promise;
  dbOpenDefer = deferred();

  const request = indexedDB.open('tg', 1);

  request.onupgradeneeded = () => {
    db = request.result;

    if(!db.objectStoreNames.contains('dialogs')) {
      db.createObjectStore('dialogs', { keyPath: '_key' });
    }

    if(!db.objectStoreNames.contains('peers')) {
      db.createObjectStore('peers', { keyPath: '_key' });
    }

    if(!db.objectStoreNames.contains('messages')) {
      db.createObjectStore('messages', { keyPath: '_key' });
    }

    if(!db.objectStoreNames.contains('photos')) {
      db.createObjectStore('photos', { keyPath: '_key' });
    }

    if(!db.objectStoreNames.contains('stickers')) {
      db.createObjectStore('stickers', { keyPath: '_key' });
    }

    if(!db.objectStoreNames.contains('images')) {
      db.createObjectStore('images', { keyPath: '_key' });
    }

    if(!db.objectStoreNames.contains('documents')) {
      db.createObjectStore('documents', { keyPath: '_key' });
    }
  };

  request.onerror = () => {
    console.log(request.error);
  };

  request.onsuccess = function() {
    db = request.result;
    dbOpenDefer.resolve();
  };

  return dbOpenDefer.promise;
};

const dbGetInstance = async () => {
  if(db) return db;

  await dbOpen();
  return db;
};

const dbGetAll = async storeName => {
  const defer = deferred();

  const db = await dbGetInstance();
  const transaction = db.transaction(storeName, 'readonly');
  const store = transaction.objectStore(storeName);
  const request = store.getAll();

  transaction.onerror = () => {
    console.log(transaction.error);
  };
  transaction.oncomplete = () => {
    defer.resolve(request.result);
  };

  return defer.promise;
};

const dbPuts = async (storeName, items) => {
  const defer = deferred();

  const db = await dbGetInstance();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);

  items.forEach(item => {
    store.put(item);
  });

  transaction.onerror = () => {
    console.log(transaction.error);
  };
  transaction.oncomplete = () => {
    defer.resolve();
  };

  return defer.promise;
};

const dbDelete = async (storeName, keys) => {
  const defer = deferred();

  const db = await dbGetInstance();
  const transaction = db.transaction(storeName, 'readwrite');
  const store = transaction.objectStore(storeName);

  keys.forEach(key => {
    store.delete(key);
  });

  transaction.onerror = () => {
    console.log(transaction.error);
  };
  transaction.oncomplete = () => {
    defer.resolve();
  };

  return defer.promise;
};

export {
  dbGetAll,
  dbPuts,
  dbDelete
};