// Service worker — UNREGISTER
// This file exists only to unregister old cached service workers
// and clear all caches. Once all users have this version,
// we can safely remove this file entirely.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => {
        console.log('[SW] All caches cleared ✅');
        return self.clients.claim();
      })
  );
});