const CACHE_NAME = 'smart-tools-v15';
const ASSETS = [
  '/',
  '/index.html',
  '/hub.html',
  '/consultants.json',
  '/manifest.json',
  '/images/logo.png',
  '/wp_orange.html',
  '/wp_eneco.html',
  '/wp_rem.html',
  '/documents/wp_orange.pdf',
  '/documents/wp_eneco.pdf',
  '/documents/wp_smartPlan.pdf',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js',
  'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap',
  'https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => console.warn('Cache miss:', url))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;

  // consultants.json — toujours réseau first pour avoir les dernières données
  if (url.pathname.includes('consultants.json')) {
    event.respondWith(
      fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  const isStatic = event.request.url.endsWith('.html') ||
    event.request.url.endsWith('.pdf') ||
    event.request.url.endsWith('.png') ||
    event.request.url.endsWith('.js') ||
    event.request.url.endsWith('.css') ||
    event.request.url.endsWith('.json') ||
    ASSETS.some(a => event.request.url.includes(a));

  if (isStatic) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
      })
    );
  } else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
  }
});

self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
