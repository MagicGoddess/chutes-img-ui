/* Simple app-shell cache. Avoid caching authenticated API calls. */
const CACHE_VERSION = 1758111402715; // Dynamic cache version - updated by build script
const CACHE = `qwen-edit-cache-v${CACHE_VERSION}`;
const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './js/main.js',
  './js/models.js',
  './js/api.js',
  './js/storage.js',
  './js/helpers.js',
  './js/imageUtils.js',
  './js/activityLog.js',
  './js/serviceWorker.js',
  './js/modal.js',
  './js/ui.js',
  './manifest.webmanifest',
  './service-worker.js'
];
self.addEventListener('install', (e)=>{
  console.log('Service Worker: Installing with cache version', CACHE_VERSION);
  e.waitUntil((async()=>{
    const c = await caches.open(CACHE); 
    await c.addAll(APP_SHELL);
    // Force immediate activation of new service worker
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e)=>{
  console.log('Service Worker: Activating and cleaning old caches');
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    // Delete all old cache versions
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>{
      console.log('Service Worker: Deleting old cache', k);
      return caches.delete(k);
    }));
    // Take control of all clients immediately
    await self.clients.claim();
    
    // Notify all clients about the update
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'CACHE_UPDATED', version: CACHE_VERSION });
    });
  })());
});
self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);
  // Never cache Chutes API calls (they carry Authorization headers)
  if (url.hostname.endsWith('chutes.ai')) return; // let it go to network

  // Navigation & static: cache-first
  if (e.request.mode === 'navigate' || APP_SHELL.some(p=>url.pathname.endsWith(p.replace('./','/')))) {
    e.respondWith((async()=>{
      const cached = await caches.match(e.request); if (cached) return cached;
      const res = await fetch(e.request); const c = await caches.open(CACHE); c.put(e.request, res.clone()); return res;
    })());
  }
});
