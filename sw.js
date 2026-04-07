const CACHE_NAME = 'travel-app-v6';

self.addEventListener('install', event => {
  // 有新版就立刻接管，不等舊 SW 關閉
  self.skipWaiting();
});

// 主頁面也可以送 SKIP_WAITING（雙保險）
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  // 清掉所有舊版快取（v1, v2, v3 全清）
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Firebase / googleapis / exchangerate API 永遠走網路
  const url = event.request.url;
  if (url.includes('firebaseio.com') ||
      url.includes('googleapis.com') ||
      url.includes('er-api.com') ||
      url.includes('frankfurter.app') ||
      url.includes('wikipedia.org') ||
      url.includes('wikimedia.org') ||
      url.includes('version.txt')) {
    event.respondWith(fetch(event.request).catch(() => new Response('')));
    return;
  }

  // Network first：優先拿最新版，離線才用快取
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
