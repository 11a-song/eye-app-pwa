const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function setup(userAgent = 'Android Chrome', standalone = false, clipboard, navigatorExtras = {}) {
  const events = {}, attributes = new Set();
  const status = { textContent: '' }, field = { hidden: true, value: '', focus() {}, select() { this.selected = true; } };
  const sheet = { open: false, innerHTML: '', querySelector: selector => selector === '.install-url' ? field : status, showModal() { this.open = true; }, close() { this.open = false; } };
  const welcome = { hidden: true }, note = { textContent: '' }, main = { focus() { this.focused = true; } };
  const window = { location: { href: 'https://jeileye.2025work11a.workers.dev/#/before' }, matchMedia: () => ({ matches: standalone, addEventListener() {} }), addEventListener: (name, fn) => events[name] = fn };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'scripts/pwa-install.js'), 'utf8'), {
    window, URL, navigator: { userAgent, clipboard, ...navigatorExtras }, document: {
      querySelector: selector => ({ '#install-dialog': sheet, '#install-welcome': welcome, '#install-welcome-note': note, '#main': main })[selector], addEventListener: (name, fn) => events[name] = fn,
      documentElement: { toggleAttribute(name, value) { value ? attributes.add(name) : attributes.delete(name); } }
    }
  });
  return { window, events, sheet, attributes, status, field, welcome, main, click: selector => events.click({ target: { closest: query => query === selector } }) };
}
(async () => {
  const android = setup();
  android.window.ClinicInstall.open();
  assert.match(android.sheet.innerHTML, /홈 화면에 추가/);
  let prompted = 0, prevented = 0;
  android.events.beforeinstallprompt({ preventDefault() { prevented++; }, async prompt() { prompted++; }, userChoice: Promise.resolve({ outcome: 'dismissed' }) });
  assert.match(android.sheet.innerHTML, /data-pwa-install/); // Prompt arriving after the sheet opened.
  android.window.ClinicInstall.open();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(prompted, 1);
  assert.equal(prevented, 1);
  assert.equal(android.sheet.open, true);
  assert.doesNotMatch(android.sheet.innerHTML, /data-pwa-install/); // Consumed prompts cannot be reused.
  android.events.appinstalled();
  assert.equal(android.sheet.open, false);
  assert.ok(android.attributes.has('data-app-installed'));
  const ios = setup('iPhone Safari');
  ios.window.ClinicInstall.open();
  assert.match(ios.sheet.innerHTML, /공유/);
  assert.match(ios.sheet.innerHTML, /홈 화면에 추가/);
  const inApp = setup('Android KAKAOTALK');
  inApp.window.ClinicInstall.open();
  assert.match(inApp.sheet.innerHTML, /Chrome으로 열기/);
  assert.match(inApp.sheet.innerHTML, /data-pwa-external/);
  inApp.click('[data-pwa-external]');
  assert.match(inApp.window.location.href, /^intent:\/\/jeileye.*package=com.android.chrome;/);
  assert.ok(!inApp.window.location.href.startsWith('kakaotalk:'));
  assert.equal(decodeURIComponent(inApp.window.location.href.match(/S.browser_fallback_url=([^;]+)/)[1]), 'https://play.google.com/store/apps/details?id=com.android.chrome');
  assert.equal(inApp.field.hidden, false);
  const naver = setup('Android NAVER(inapp)');
  naver.window.ClinicInstall.open();
  naver.click('[data-pwa-external]');
  assert.match(naver.window.location.href, /^intent:\/\/jeileye.*package=com.android.chrome;/);
  assert.match(naver.window.location.href, /S.browser_fallback_url=https%3A/);
  const iosKakao = setup('iPhone KAKAOTALK');
  iosKakao.window.ClinicInstall.open();
  iosKakao.click('[data-pwa-external]');
  assert.match(iosKakao.window.location.href, /^kakaotalk:\/\/web\/openExternal\?url=https%3A/);
  const iosChrome = setup('iPhone CriOS');
  iosChrome.window.ClinicInstall.open();
  assert.match(iosChrome.sheet.innerHTML, /data-pwa-external/);
  iosChrome.click('[data-pwa-external]');
  assert.equal(iosChrome.window.location.href, 'x-safari-https://jeileye.2025work11a.workers.dev/');
  let copied;
  const copy = setup('Android KAKAOTALK', false, { async writeText(text) { copied = text; } });
  copy.window.ClinicInstall.open();
  copy.click('[data-pwa-copy]');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(copied, 'https://jeileye.2025work11a.workers.dev/');
  assert.match(copy.status.textContent, /복사했습니다/);
  const deniedCopy = setup('Android KAKAOTALK', false, { async writeText() { throw Error('denied'); } });
  deniedCopy.click('[data-pwa-copy]');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(deniedCopy.field.selected, true);
  assert.match(deniedCopy.status.textContent, /길게 눌러 복사/);
  assert.ok(setup('iPhone', true).attributes.has('data-app-installed'));
  assert.equal(setup('Android Chrome', true).welcome.hidden, true);
  assert.equal(setup('Desktop Chrome').welcome.hidden, true);
  const firstVisit = setup();
  assert.equal(firstVisit.welcome.hidden, false);
  assert.ok(firstVisit.attributes.has('data-install-welcome'));
  firstVisit.click('[data-pwa-continue]');
  assert.equal(firstVisit.welcome.hidden, true);
  assert.equal(firstVisit.main.focused, true);
  firstVisit.events.beforeinstallprompt({ preventDefault() {}, prompt() {} });
  assert.equal(firstVisit.welcome.hidden, true, 'Continuing on the web is respected for this visit');
  const installFromWelcome = setup();
  let started = 0;
  installFromWelcome.events.beforeinstallprompt({ preventDefault() {}, async prompt() { started++; }, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  assert.equal(started, 0, 'Never auto-install or prompt on page load');
  installFromWelcome.click('[data-pwa-start]');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(started, 1);
  installFromWelcome.events.appinstalled();
  assert.equal(installFromWelcome.welcome.hidden, true);
  const externalStart = setup('Android KAKAOTALK');
  externalStart.click('[data-pwa-start]');
  assert.match(externalStart.window.location.href, /^intent:.*package=com.android.chrome;/);
  const samsungStart = setup('Android Chrome SamsungBrowser');
  samsungStart.click('[data-pwa-start]');
  assert.match(samsungStart.window.location.href, /^intent:.*package=com.android.chrome;/);
  assert.equal(samsungStart.field.hidden, false);
  const knownInstalled = setup('Android Chrome', false, undefined, { async getInstalledRelatedApps() { return [{ platform: 'webapp', url: 'https://jeileye.2025work11a.workers.dev/manifest.webmanifest' }]; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(knownInstalled.welcome.hidden, true);
  const unrelated = setup('Android Chrome', false, undefined, { async getInstalledRelatedApps() { return [{ platform: 'webapp', url: 'https://example.com/manifest.webmanifest' }]; } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(unrelated.welcome.hidden, false);
  const failedDetection = setup('iPhone Safari', false, undefined, { async getInstalledRelatedApps() { throw Error('unavailable'); } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(failedDetection.welcome.hidden, false);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
    const png = fs.readFileSync(path.join(root, icon.src));
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const shell = fs.readFileSync(path.join(root, 'sw.js'), 'utf8').match(/const SHELL = (\[.*\]);/)[1];
  for (const file of JSON.parse(shell.replace(/'/g, '"'))) assert.ok(fs.existsSync(path.join(root, file)), `Missing offline file: ${file}`);
  assert.ok(!shell.includes('.jpg'), 'Photos must not compete with first-screen downloads');
  const workerEvents = {}, cachedImages = new Map();
  let downloads = 0, imageStatus = 200, networkFails = false, skipWaitingCalls = 0;
  const fetchedUrls = [], precached = [];
  vm.runInNewContext(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'), {
    self: { location: { origin: 'https://example.com' }, registration: { scope: 'https://example.com/' }, async skipWaiting() { skipWaitingCalls++; }, addEventListener: (name, fn) => workerEvents[name] = fn }, URL, Response,
    caches: { async open() { return { async addAll(files) { precached.push(...files); }, async match(request) { return cachedImages.get(typeof request === 'string' ? request : request.url); }, async put(request, response) { cachedImages.set(typeof request === 'string' ? request : request.url, response); } }; } },
    async fetch(request) { downloads++; fetchedUrls.push(typeof request === 'string' ? request : request.url); if(networkFails) throw Error('offline'); return new Response('image', { status: imageStatus }); }
  });
  async function requestAsset(file) {
    const waits = [];
    let response;
    workerEvents.fetch({ request: { url: new URL(file, 'https://example.com').href, method: 'GET' }, respondWith(promise) { response = promise; }, waitUntil(promise) { waits.push(promise); } });
    const result = await response;
    await Promise.all(waits);
    return result;
  }
  await requestAsset('/assets/facility/building-parking.jpg');
  await requestAsset('/assets/facility/building-parking.jpg');
  assert.equal(downloads, 1, 'Viewing the same image again uses its cached copy');
  imageStatus = 404;
  await requestAsset('/assets/missing.jpg');
  await requestAsset('/assets/missing.jpg');
  assert.equal(downloads, 3, 'Failed image responses are not stored');
  imageStatus = 200;
  await requestAsset('/assets/app.js');
  await requestAsset('/assets/app.js');
  assert.equal(downloads, 4, 'The versioned app bundle opens from cache without waiting for the server');
  await requestAsset('/');
  await requestAsset('/?install=1');
  assert.equal(downloads, 5, 'Navigation query strings reuse the same public app shell');
  await requestAsset('/assets/fonts/subsets/PretendardVariable.subset.91.woff2');
  await requestAsset('/assets/fonts/subsets/PretendardVariable.subset.91.woff2');
  assert.equal(downloads, 6, 'Only viewed font slices are downloaded once');
  assert.equal(await requestAsset('/rest/v1/private'), undefined);
  assert.equal(await requestAsset('/admin.html'), undefined);
  assert.equal(await requestAsset('https://other.example.com/photo.jpg'), undefined);
  const redirectedHtml = new Response('<h1>App</h1>', {headers:{'Content-Type':'text/html'}});
  Object.defineProperty(redirectedHtml,'redirected',{value:true});
  cachedImages.set('https://example.com/',redirectedHtml);
  const repaired = await requestAsset('/index.html');
  assert.equal(repaired.redirected,false,'Followed redirects must not be returned to browser navigation');
  assert.equal(await repaired.text(),'<h1>App</h1>');
  cachedImages.delete('https://example.com/');
  await requestAsset('/index.html');
  assert.equal(fetchedUrls.at(-1),'https://example.com/','Fetch the canonical root instead of the redirecting index URL');
  let installWork;
  workerEvents.install({waitUntil(promise){installWork=promise;}});
  await installWork;
  assert.ok(!precached.includes('./index.html'));
  assert.equal(cachedImages.get('https://example.com/').redirected,false);
  assert.equal(skipWaitingCalls,1,'Activate the repair without deleting device records');
  cachedImages.delete('https://example.com/');
  networkFails=true;
  const offline = await requestAsset('/');
  assert.equal(offline.status,503);
  assert.match(await offline.text(),/인터넷 연결을 확인/);
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(html, /<main id="main"[^>]*>[\s\S]*?class="menu-list"/);
  assert.equal((html.match(/<script src=/g) || []).length, 1, 'One application request replaces the script waterfall');
  assert.equal((html.match(/rel="stylesheet"/g) || []).length, 1, 'One stylesheet request paints the first screen');
  assert.ok(!html.includes('PretendardVariable.woff2'), 'The full 2MB font is not preloaded');
  for (const match of fs.readFileSync(path.join(root,'assets/app.css'),'utf8').matchAll(/url\("(fonts\/subsets\/[^\"]+)"\)/g)) {
    assert.ok(fs.existsSync(path.join(root,'assets',match[1])), 'Bundled font URL resolves locally');
  }
  console.log('PWA installation checks passed');
})();
