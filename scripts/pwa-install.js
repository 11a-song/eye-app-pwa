'use strict';
(() => {
  let pendingPrompt = null, installed = false, busy = false, welcomeDismissed = false;
  const displayMode = window.matchMedia('(display-mode: standalone)');
  const isInstalled = () => installed || displayMode.matches || navigator.standalone === true;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = () => /Android/i.test(navigator.userAgent);
  const isMobile = () => isAndroid() || isIOS() || navigator.userAgentData?.mobile === true;
  const isAndroidChrome = () => isAndroid() && /Chrome/i.test(navigator.userAgent) && !/SamsungBrowser|EdgA|OPR|Firefox/i.test(navigator.userAgent);
  const isInApp = () => /KAKAOTALK|NAVER[(/]|DaumApps|Instagram|FBAN|FBAV|; wv\)/i.test(navigator.userAgent);
  const needsSafari = () => isIOS() && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
  const dialog = () => document.querySelector('#install-dialog');
  const appUrl = new URL('./', window.location.href).href;
  const installUrl = () => appUrl;
  function externalControls() {
    return '<button type="button" class="primary-button" data-pwa-external>' + (isAndroid() ? 'Chrome으로 열기' : '외부 브라우저로 열기') + '</button><button type="button" class="install-copy-button" data-pwa-copy>앱 주소 복사</button><p class="install-external-status" role="status" aria-live="polite"></p><input class="install-url" aria-label="설치할 앱 주소" readonly hidden>';
  }
  function showExternalFallback(message) {
    const sheet = dialog();
    sheet.querySelector('.install-external-status').textContent = message;
    const field = sheet.querySelector('.install-url');
    field.value = installUrl();
    field.hidden = false;
  }
  function openExternal() {
    const url = new URL(installUrl());
    showExternalFallback(isAndroid() ? 'Chrome이 열리지 않으면 Chrome 설치 여부를 확인해 주세요. 앱 주소를 복사한 후 Chrome 주소창에 붙여넣어 열 수도 있습니다.' : '브라우저가 열리지 않으면 앱 주소를 복사하거나 현재 화면 메뉴의 ‘외부 브라우저로 열기’를 이용해 주세요.');
    // App and OS policies can block these handoffs; the copy option remains available.
    if (isAndroid()) {
      // Specify Chrome even inside KakaoTalk, whose external-open scheme uses the default browser.
      const chromeStore = 'https://play.google.com/store/apps/details?id=com.android.chrome';
      window.location.href = `intent://${url.host}${url.pathname}#Intent;scheme=${url.protocol.slice(0, -1)};action=android.intent.action.VIEW;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(chromeStore)};end`;
    } else if (/KAKAOTALK/i.test(navigator.userAgent)) {
      window.location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url.href);
    } else if (isIOS() && url.protocol === 'https:') {
      window.location.href = url.href.replace(/^https:/, 'x-safari-https:');
    } else {
      window.open(url.href, '_blank', 'noopener,noreferrer');
    }
  }
  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(installUrl());
      showExternalFallback('앱 주소를 복사했습니다. Safari 또는 Chrome 주소창에 붙여넣어 주세요.');
    } catch {
      showExternalFallback('아래 주소를 길게 눌러 복사한 후 Safari 또는 Chrome에서 열어 주세요.');
      const field = dialog().querySelector('.install-url');
      field.focus();
      field.select();
    }
  }
  function updateState() {
    document.documentElement.toggleAttribute('data-app-installed', isInstalled());
    const welcome = document.querySelector('#install-welcome');
    const showWelcome = isMobile() && !isInstalled() && !welcomeDismissed;
    if (welcome) welcome.hidden = !showWelcome;
    document.documentElement.toggleAttribute('data-install-welcome', showWelcome);
    const note = document.querySelector('#install-welcome-note');
    if (note) note.textContent = isInApp() || (isAndroid() && !isAndroidChrome()) || needsSafari()
      ? (isAndroid() ? 'Chrome으로 이동해 설치를 진행합니다.' : 'Safari로 이동해 홈 화면에 추가해 주세요.')
      : isIOS() ? 'Safari의 공유 → 홈 화면에 추가로 설치할 수 있습니다.' : '설치 확인창에서 설치를 눌러 완료해 주세요.';
  }
  function startInstall() {
    if (isInstalled()) { welcomeDismissed = true; updateState(); return; }
    if (isInApp() || needsSafari() || (isAndroid() && !isAndroidChrome())) {
      render(true);
      const sheet = dialog();
      if (!sheet.open) sheet.showModal();
      openExternal();
      return;
    }
    window.ClinicInstall.open();
  }
  async function detectRelatedInstall() {
    if (!isMobile() || isInstalled() || !navigator.getInstalledRelatedApps) return;
    try {
      const apps = await navigator.getInstalledRelatedApps();
      const manifestUrl = new URL('manifest.webmanifest', appUrl).href;
      if (apps.some(app => app.platform === 'webapp' && app.url && new URL(app.url, appUrl).href === manifestUrl)) {
        installed = true;
        updateState();
      }
    } catch {
      // Browsers without installation detection still allow continuing on the web.
    }
  }
  function render(forceExternal = false) {
    const sheet = dialog();
    if (!sheet) return;
    let content;
    if (isInstalled()) content = '<p>앱으로 실행 중입니다. 홈 화면의 연세제일안과 아이콘으로 이용해 주세요.</p>';
    else if (isInApp() || forceExternal) content = '<p>앱 설치를 위해 외부 브라우저에서 열어 주세요.</p><p>아이폰은 Safari, 안드로이드는 Chrome을 이용해 주세요.</p>' + externalControls();
    else if (pendingPrompt) content = '<p>홈 화면에 연세제일안과를 추가하고 앱처럼 이용하세요.</p><button type="button" class="primary-button" data-pwa-install>앱 설치하기</button>';
    else if (isIOS()) content = '<p>Safari의 공유 버튼에서 <strong>홈 화면에 추가</strong>를 선택해 주세요.</p>' + (needsSafari() ? externalControls() : '');
    else content = isAndroid() ? '<p>Chrome 메뉴(⋮)에서 <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택해 주세요.</p>' : '<p>브라우저 메뉴에서 앱 설치를 선택해 주세요.</p>';
    sheet.innerHTML = '<div class="sheet-header"><h2 id="install-title">연세제일안과 앱 설치</h2><button type="button" class="icon-button" data-close aria-label="닫기">✕</button></div>' + content;
  }
  async function requestInstall() {
    if (busy) return;
    if (!pendingPrompt || isInstalled()) { render(); return; }
    const prompt = pendingPrompt;
    pendingPrompt = null;
    busy = true;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') dialog()?.close();
    } catch {
      // If the browser declines the prompt, keep a brief installation fallback available.
    } finally {
      busy = false;
      if (dialog()?.open) render();
    }
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingPrompt = event;
    installed = false;
    updateState();
    if (dialog()?.open) render();
  });
  window.addEventListener('appinstalled', () => {
    installed = true;
    pendingPrompt = null;
    updateState();
    dialog()?.close();
  });
  displayMode.addEventListener?.('change', updateState);
  document.addEventListener('click', event => {
    if (event.target.closest('[data-pwa-start]')) startInstall();
    if (event.target.closest('[data-pwa-continue]')) {
      welcomeDismissed = true;
      updateState();
      document.querySelector('#main')?.focus({ preventScroll: true });
    }
    if (event.target.closest('[data-pwa-install]')) requestInstall();
    if (event.target.closest('[data-pwa-external]')) openExternal();
    if (event.target.closest('[data-pwa-copy]')) copyAddress();
  });
  window.ClinicInstall = { open() {
    render();
    const sheet = dialog();
    if (!sheet.open) sheet.showModal();
    if (pendingPrompt && !isInApp()) requestInstall();
  }};
  updateState();
  detectRelatedInstall();
})();
