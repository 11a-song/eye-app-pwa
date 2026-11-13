const CACHE = 'jeileye-app-v150';
const SHELL = ['./', './assets/app.css', './assets/app.js', './manifest.webmanifest', './assets/logo.svg', './assets/icon.svg', './assets/icon-192.png', './assets/icon-512.png', './assets/apple-touch-icon.png', './assets/doctor-placeholder.svg'];
// Cloudflare redirects /index.html to /. A followed redirect cannot be returned
// directly to a navigation request whose redirect mode is manual (Chrome ERR_FAILED).
function documentResponse(response) {
  return new Response(response.body, {status:response.status,statusText:response.statusText,headers:response.headers});
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const root = new URL('./', self.registration.scope).href;
    await Promise.all([
      cache.addAll(SHELL.filter(file => file !== './')),
      fetch(root, {cache:'reload',redirect:'follow'}).then(response => {
        if (!response.ok) throw Error('App shell unavailable');
        return cache.put(root, documentResponse(response));
      })
    ]);
    // Repair existing installations without requiring deletion of patient records.
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('jeileye-app-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const relative = './' + url.pathname.slice(scope.pathname.length);
  const isDocument = relative === './' || relative === './index.html';
  // Only versioned public app files, images and used font slices are stored.
  // APIs, administrator pages and other origins always bypass this cache.
  const publicImage = relative.startsWith('./assets/') && /\.(?:jpe?g|png|webp|avif|svg)$/i.test(url.pathname);
  const publicFont = relative.startsWith('./assets/fonts/subsets/') && /\.woff2$/i.test(url.pathname);
  const publicForm = relative.startsWith('./assets/forms/') && /\.(?:pdf|hwp)$/i.test(url.pathname);
  if (!isDocument && !SHELL.includes(relative) && !publicImage && !publicFont && !publicForm) return;
  const key = isDocument ? scope.href : event.request;
  event.respondWith((async () => {
    let cache;
    try {
      cache = await caches.open(CACHE);
      const stored = await cache.match(key);
      if (stored?.ok) return isDocument ? documentResponse(stored) : stored;
    } catch { /* Storage may be unavailable in private browsing; keep network access. */ }
    try {
      const fetched = isDocument ? await fetch(scope.href, {cache:'reload',redirect:'follow'}) : await fetch(event.request);
      const response = isDocument && fetched.ok ? documentResponse(fetched) : fetched;
      if (cache && response.ok) event.waitUntil(cache.put(key, response.clone()).catch(() => {}));
      return response;
    } catch (error) {
      if (!isDocument) throw error;
      return new Response('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>연결 확인</title><body style="font-family:sans-serif;padding:40px 24px;line-height:1.8"><h1>인터넷 연결을 확인해 주세요.</h1><p>저장된 약 사용 기록은 유지됩니다.</p><a href="./">다시 연결하기</a></body></html>', {status:503,headers:{'Content-Type':'text/html; charset=utf-8'}});
    }
  })());
});
