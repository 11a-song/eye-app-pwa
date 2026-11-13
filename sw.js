const CACHE = 'jeileye-app-v117';
const SHELL = ['./', './index.html', './styles.css', './fonts.css', './typography.css', './assets/fonts/PretendardVariable.woff2', './schedule.css', './guide.css', './vision-before.css', './cataract-before.css', './cataract-medication.css', './eye-drops-guide.css', './scripts/eye-drops-guide.js', './scripts/cataract-medication.js', './scripts/cataract-before.js', './scripts/vision-before.js', './app.js', './scripts/pwa-install.js', './scripts/supabase-config.js', './scripts/public-content.js', './scripts/holidays.js', './scripts/schedule-source.js', './scripts/schedule-model.js', './scripts/guide-reference.js', './scripts/guide.js', './manifest.webmanifest', './assets/logo.svg', './assets/veterans-logo.svg', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png', './assets/doctor-placeholder.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('jeileye-app-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Only public, static app resources are cached. Account/API responses are excluded.
  const relative = './' + url.pathname.slice(new URL(self.registration.scope).pathname.length);
  // Versioned, public image files are downloaded only when viewed and reused locally.
  // A new CACHE version clears these copies when the deployed images change.
  const publicImage = relative.startsWith('./assets/') && /\.(?:jpe?g|png|webp|avif|svg)$/i.test(url.pathname);
  if (publicImage) {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) event.waitUntil(cache.put(event.request, response.clone()));
      return response;
    }));
    return;
  }
  if (!SHELL.includes(relative)) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy))); }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
