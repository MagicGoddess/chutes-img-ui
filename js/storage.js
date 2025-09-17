// Storage functionality for localStorage and IndexedDB operations

const IDB_DB_NAME = 'chutes_images';
const IDB_STORE = 'images';
const IDB_META_STORE = 'meta';

/**
 * Opens the IndexedDB database
 * @returns {Promise<IDBDatabase>} The opened database
 */
function openIdb() {
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

/**
 * Stores a blob in IndexedDB
 * @param {string} key - The storage key
 * @param {Blob} blob - The blob to store
 * @param {string} type - The blob type
 */
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

/**
 * Retrieves a blob from IndexedDB
 * @param {string} key - The storage key
 * @returns {Promise<Blob|null>} The blob or null if not found
 */
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

/**
 * Stores metadata in IndexedDB
 * @param {Object} meta - The metadata object
 */
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

/**
 * Retrieves all metadata from IndexedDB
 * @returns {Promise<Array>} Array of metadata objects
 */
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

/**
 * Deletes metadata from IndexedDB
 * @param {string} id - The metadata ID to delete
 */
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

/**
 * Clears all metadata from IndexedDB
 */
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

/**
 * Deletes a blob from IndexedDB
 * @param {string} key - The storage key
 */
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

/**
 * Gets image history from localStorage
 * @returns {Array} Array of image history entries
 */
export function getImageHistory() {
  try {
    const metaRaw = localStorage.getItem('chutes_image_history');
    if (metaRaw) return JSON.parse(metaRaw);
  } catch (e) { 
    console.warn('Failed to read localStorage history', e); 
  }
  return [];
}

/**
 * Saves image history to localStorage
 * @param {Array} history - The history array to save
 */
export function saveImageHistory(history) {
  try {
    localStorage.setItem('chutes_image_history', JSON.stringify(history));
  } catch (e) {
    console.warn('Failed to save image history metadata to localStorage:', e);
  }
}

/**
 * Gets API key from localStorage
 * @returns {string|null} The stored API key or null
 */
export function getStoredApiKey() {
  return localStorage.getItem('chutes_api_key');
}

/**
 * Saves API key to localStorage
 * @param {string} apiKey - The API key to store
 */
export function saveApiKey(apiKey) {
  localStorage.setItem('chutes_api_key', apiKey);
}

/**
 * Removes API key from localStorage
 */
export function removeApiKey() {
  localStorage.removeItem('chutes_api_key');
}

/**
 * Gets activity log collapsed state from localStorage
 * @returns {boolean} True if collapsed
 */
export function getLogCollapsedState() {
  return localStorage.getItem('chutes_log_collapsed') === 'true';
}

/**
 * Sets activity log collapsed state in localStorage
 * @param {boolean} collapsed - Whether the log is collapsed
 */
export function setLogCollapsedState(collapsed) {
  localStorage.setItem('chutes_log_collapsed', collapsed.toString());
}