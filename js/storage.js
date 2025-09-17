// Storage functionality - localStorage and IndexedDB for image history

import { dataURLToBlob } from './helpers.js';

// IndexedDB configuration
const IDB_DB_NAME = 'chutes_images';
const IDB_STORE = 'images';
const IDB_META_STORE = 'meta';

// IndexedDB functions
export function openIdb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(IDB_DB_NAME, 1);
    r.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(IDB_META_STORE)) {
        db.createObjectStore(IDB_META_STORE, { keyPath: 'id' });
      }
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function idbPutBlob(key, blob, type) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put({ key, blob, type });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('IDB put failed', e);
    throw e;
  }
}

export async function idbGetBlob(key) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => { db.close(); resolve(req.result ? req.result.blob : null); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch (e) {
    console.warn('IDB get failed', e);
    return null;
  }
}

export async function idbPutMeta(meta) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_META_STORE, 'readwrite');
      const store = tx.objectStore(IDB_META_STORE);
      store.put(meta);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('IDB put meta failed', e);
    throw e;
  }
}

export async function idbGetAllMeta() {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_META_STORE, 'readonly');
      const store = tx.objectStore(IDB_META_STORE);
      const req = store.getAll();
      req.onsuccess = () => { db.close(); resolve(req.result || []); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  } catch (e) {
    console.warn('IDB getAll meta failed', e);
    return [];
  }
}

export async function idbDeleteMeta(id) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_META_STORE, 'readwrite');
      const store = tx.objectStore(IDB_META_STORE);
      store.delete(id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('IDB delete meta failed', e);
  }
}

export async function idbClearMeta() {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_META_STORE, 'readwrite');
      const store = tx.objectStore(IDB_META_STORE);
      store.clear();
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('IDB clear meta failed', e);
  }
}

export async function idbDelete(key) {
  try {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch (e) {
    console.warn('IDB delete failed', e);
  }
}

// Migration: move legacy localStorage-inlined images into IndexedDB (run once)
export async function migrateLocalStorageToIdb() {
  try {
    const raw = localStorage.getItem('chutes_image_history');
    if (!raw) return;
    const history = JSON.parse(raw || '[]');
    let changed = false;
    for (const entry of history) {
      // If entry already references imageKey, skip
      if (entry.imageKey) continue;
      // If there's an inlined imageData, move it to IDB
      if (entry.imageData && typeof entry.imageData === 'string' && entry.imageData.startsWith('data:')) {
        const blob = dataURLToBlob(entry.imageData);
        const imageKey = `${entry.id}:img`;
        try { 
          await idbPutBlob(imageKey, blob, blob.type); 
          entry.imageKey = imageKey; 
          delete entry.imageData; 
          changed = true; 
        } catch (e) { 
          console.warn('Migration image put failed', e); 
        }
      }
      if (entry.sourceImageData && typeof entry.sourceImageData === 'string' && entry.sourceImageData.startsWith('data:')) {
        const sblob = dataURLToBlob(entry.sourceImageData);
        const sourceKey = `${entry.id}:src`;
        try { 
          await idbPutBlob(sourceKey, sblob, sblob.type); 
          entry.sourceKey = sourceKey; 
          delete entry.sourceImageData; 
          changed = true; 
        } catch (e) { 
          console.warn('Migration source put failed', e); 
        }
      }
    }
    if (changed) {
      // Save updated metadata back to localStorage (or to IDB later if migrating metadata)
      localStorage.setItem('chutes_image_history', JSON.stringify(history));
      console.log('Migrated some images to IndexedDB');
    }
  } catch (e) {
    console.warn('Migration failed', e);
  }
}

// localStorage-based image history metadata
export function getImageHistory() {
  // Prefer metadata in IndexedDB; fall back to localStorage
  // This returns a synchronous array if stored in localStorage, or if IDB used,
  // the calling code should call refreshImageGrid which will read from IDB async.
  try {
    const metaRaw = localStorage.getItem('chutes_image_history');
    if (metaRaw) return JSON.parse(metaRaw);
  } catch (e) { 
    console.warn('Failed to read localStorage history', e); 
  }
  // If no localStorage metadata, return empty and rely on async IDB loader to populate UI
  return [];
}

export function saveImageHistory(history) {
  try {
    localStorage.setItem('chutes_image_history', JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save image history metadata to localStorage:', e);
  }
}