/* ==========================================================================
   db.js — thin IndexedDB wrapper.
   Stores:
     nodes   { id, type:'folder'|'board', name, parentId, order, createdAt, clientTag }
     images  { id, boardId, blob, x, y, width, height, rotation, zIndex,
               deleted, deletedAt, deletedFrom, remoteUrl }
     palette { id, hex, createdAt }
   ========================================================================== */

const DB = (() => {
  const NAME = 'MoodboardStudioDB';
  const VERSION = 2;
  let db;

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = (e) => {
        const _db = e.target.result;
        if (!_db.objectStoreNames.contains('nodes')) {
          _db.createObjectStore('nodes', { keyPath: 'id' });
        }
        if (!_db.objectStoreNames.contains('images')) {
          const store = _db.createObjectStore('images', { keyPath: 'id' });
          store.createIndex('boardId', 'boardId', { unique: false });
          store.createIndex('deleted', 'deleted', { unique: false });
        }
        if (!_db.objectStoreNames.contains('palette')) {
          _db.createObjectStore('palette', { keyPath: 'id' });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function tx(store, mode) {
    return db.transaction([store], mode).objectStore(store);
  }

  function put(store, value) {
    return new Promise((resolve, reject) => {
      const r = tx(store, 'readwrite').put(value);
      r.onsuccess = () => resolve(value);
      r.onerror = () => reject(r.error);
    });
  }

  function del(store, id) {
    return new Promise((resolve, reject) => {
      const r = tx(store, 'readwrite').delete(id);
      r.onsuccess = () => resolve();
      r.onerror = () => reject(r.error);
    });
  }

  function getAll(store) {
    return new Promise((resolve, reject) => {
      const r = tx(store, 'readonly').getAll();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  function getByIndex(store, indexName, value) {
    return new Promise((resolve, reject) => {
      const idx = tx(store, 'readonly').index(indexName);
      const r = idx.getAll(value);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  return { open, put, del, getAll, getByIndex };
})();
