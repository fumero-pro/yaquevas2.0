// Cachea solo el "shell" estático (CSS/JS/iconos) para que la app cargue rápido en visitas
// repetidas e instalada. HTML y /api/ SIEMPRE van a la red — nunca a caché — porque son datos
// en vivo (precios, disponibilidad, sesión, chat): servir una versión vieja sería peor que no
// tener offline en absoluto.
//
// Estrategia stale-while-revalidate (no cache-first puro): sirve lo cacheado al instante, pero
// SIEMPRE pide también la versión de red en segundo plano y actualiza la caché con ella. Con
// cache-first puro, un cambio real en nav.js/api.js se quedaría invisible para siempre (bug real
// encontrado en esta misma sesión al probar un cambio de nav.js que el navegador no recogía) —
// este proyecto no tiene build con nombres de archivo con hash, así que no hay otra señal de
// "esto cambió" salvo pedir la red cada vez.
const CACHE = 'yqv-shell-v1';
const SHELL = [
  '/css/styles.css',
  '/js/api.js',
  '/js/nav.js',
  '/js/icons.js',
  '/js/islandGallery.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!SHELL.includes(url.pathname)) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request).then((response) => {
        if (response && response.ok) cache.put(event.request, response.clone());
        return response;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
