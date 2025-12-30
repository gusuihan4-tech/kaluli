const PRECACHE = 'food-calorie-precache-v1';
const RUNTIME = 'food-calorie-runtime-v1';
const PRECACHE_URLS = ['/', '/index.html', '/src/main.jsx', '/src/App.css'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(PRECACHE).then(cache => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  const currentCaches = [PRECACHE, RUNTIME];
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => {
      if (!currentCaches.includes(key)) return caches.delete(key);
    }))).then(() => self.clients.claim())
  );
});

// 基本 runtime cache：静态资源走 cache-first，API/页面走 network-first
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 静态资源（images、css、js）优先缓存
  if (url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.css') || url.pathname.endsWith('.js')) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
        if (!resp || resp.status !== 200) return resp;
        const r = resp.clone();
        caches.open(RUNTIME).then(cache => cache.put(event.request, r));
        return resp;
      })).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // 对页面和 root 使用网络优先（network-first），离线时回退到缓存的 index.html
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request).then(resp => {
        const copy = resp.clone();
        caches.open(RUNTIME).then(cache => cache.put(event.request, copy));
        return resp;
      }).catch(() => caches.match(event.request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // 其他资源使用缓存优先回退到网络
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// 可扩展：监听来自页面的消息（例如触发清理缓存、检查更新等）
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.type === 'CLEAR_RUNTIME_CACHE') {
    caches.delete(RUNTIME);
  }
});
