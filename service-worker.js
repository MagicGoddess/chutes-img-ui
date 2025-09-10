/* Simple app-shell cache. Avoid caching authenticated API calls. */
const CACHE = 'qwen-edit-cache-v1';
const APP_SHELL = [
  './',
  './index.html',
  './app.css',
  './app.js',
  './manifest.webmanifest',
  './service-worker.js'
];
self.addEventListener('install', (e)=>{
  e.waitUntil((async()=>{
    const c = await caches.open(CACHE); await c.addAll(APP_SHELL);
    self.skipWaiting();
  })());
});
self.addEventListener('activate', (e)=>{
  e.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
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
