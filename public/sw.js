// Cache only the public offline screen. Account data stays on its existing path.
const cachePrefix = 'little-days-offline-';
const cacheName = cachePrefix + 'v3';
const offlinePage = new URL('offline.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.add(new Request(offlinePage, { cache: 'reload' }));
    // This worker only handles navigations and the offline page.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(cachePrefix) && key !== cacheName)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.mode !== 'navigate' || request.method !== 'GET' ||
      !request.url.startsWith(self.registration.scope)) return;

  event.respondWith(fetch(request, { cache: 'no-cache' }).catch(async () => {
    const cache = await caches.open(cacheName);
    return await cache.match(offlinePage) || Response.error();
  }));
});
