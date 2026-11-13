const CACHE = 'jeileye-app-v119';
const SHELL = ['./', './index.html', './assets/app.css', './assets/app.js', './manifest.webmanifest', './assets/logo.svg', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png', './assets/doctor-placeholder.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('jeileye-app-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const relative = './' + url.pathname.slice(scope.pathname.length);
  // Only versioned public app files, images and used font slices are stored.
  // APIs, administrator pages and other origins always bypass this cache.
  const publicImage = relative.startsWith('./assets/') && /\.(?:jpe?g|png|webp|avif|svg)$/i.test(url.pathname);
  const publicFont = relative.startsWith('./assets/fonts/subsets/') && /\.woff2$/i.test(url.pathname);
  if (!SHELL.includes(relative) && !publicImage && !publicFont) return;
  const key = relative === './' || relative === './index.html' ? new URL('index.html', scope).href : event.request;
  event.respondWith((async () => {
    let cache;
    try {
      cache = await caches.open(CACHE);
      const stored = await cache.match(key);
      if (stored) return stored;
    } catch { /* Storage may be unavailable in private browsing; keep network access. */ }
    const response = await fetch(event.request);
    if (cache && response.ok) event.waitUntil(cache.put(key, response.clone()).catch(() => {}));
    return response;
  })());
});