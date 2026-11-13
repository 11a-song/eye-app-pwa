const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
function setup(userAgent = 'Android Chrome', standalone = false) {
  const events = {}, attributes = new Set();
  const sheet = { open: false, innerHTML: '', showModal() { this.open = true; }, close() { this.open = false; } };
  const window = { matchMedia: () => ({ matches: standalone, addEventListener() {} }), addEventListener: (name, fn) => events[name] = fn };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'scripts/pwa-install.js'), 'utf8'), {
    window, navigator: { userAgent }, document: {
      querySelector: () => sheet, addEventListener() {},
      documentElement: { toggleAttribute(name, value) { value ? attributes.add(name) : attributes.delete(name); } }
    }
  });
  return { window, events, sheet, attributes };
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
  assert.match(inApp.sheet.innerHTML, /외부 브라우저로 열기/);
  assert.ok(setup('iPhone', true).attributes.has('data-app-installed'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  for (const size of [192, 512]) {
    const icon = manifest.icons.find(icon => icon.sizes === `${size}x${size}`);
    const png = fs.readFileSync(path.join(root, icon.src));
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
  const shell = fs.readFileSync(path.join(root, 'sw.js'), 'utf8').match(/const SHELL = (\[.*\]);/)[1];
  for (const file of JSON.parse(shell.replace(/'/g, '"'))) assert.ok(fs.existsSync(path.join(root, file)), `Missing offline file: ${file}`);
  console.log('PWA installation checks passed');
})();
