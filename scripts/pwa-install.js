'use strict';
(() => {
  let pendingPrompt = null, installed = false, busy = false;
  const displayMode = window.matchMedia('(display-mode: standalone)');
  const isInstalled = () => installed || displayMode.matches || navigator.standalone === true;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isInApp = () => /KAKAOTALK|NAVER[(/]|DaumApps|Instagram|FBAN|FBAV|; wv\)/i.test(navigator.userAgent);
  const needsSafari = () => isIOS() && /CriOS|FxiOS|EdgiOS|OPiOS/i.test(navigator.userAgent);
  const dialog = () => document.querySelector('#install-dialog');
  const appUrl = new URL('./', window.location.href).href;
  const installUrl = () => appUrl;
  function externalControls() {
    return '<button type="button" class="primary-button" data-pwa-external>외부 브라우저로 열기</button><button type="button" class="install-copy-button" data-pwa-copy>앱 주소 복사</button><p class="install-external-status" role="status" aria-live="polite"></p><input class="install-url" aria-label="설치할 앱 주소" readonly hidden>';
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
    showExternalFallback('브라우저가 열리지 않으면 앱 주소를 복사하거나 현재 화면 메뉴의 ‘외부 브라우저로 열기’를 이용해 주세요.');
    // App and OS policies can block these handoffs; the copy option remains available.
    if (/KAKAOTALK/i.test(navigator.userAgent)) {
      window.location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url.href);
    } else if (/Android/i.test(navigator.userAgent)) {
      window.location.href = `intent://${url.host}${url.pathname}#Intent;scheme=${url.protocol.slice(0, -1)};action=android.intent.action.VIEW;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url.href)};end`;
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
  }
  function render() {
    const sheet = dialog();
    if (!sheet) return;
    let content;
    if (isInstalled()) content = '<p>앱으로 실행 중입니다. 홈 화면의 연세제일안과 아이콘으로 이용해 주세요.</p>';
    else if (isInApp()) content = '<p>앱 설치를 위해 외부 브라우저에서 열어 주세요.</p><p>아이폰은 Safari, 안드로이드는 Chrome 또는 삼성 인터넷을 이용해 주세요.</p>' + externalControls();
    else if (pendingPrompt) content = '<p>홈 화면에 연세제일안과를 추가하고 앱처럼 이용하세요.</p><button type="button" class="primary-button" data-pwa-install>앱 설치하기</button>';
    else if (isIOS()) content = '<p>Safari에서 아래 순서로 설치해 주세요.</p><ol class="install-steps"><li>브라우저의 <strong>공유</strong> 버튼을 누르세요.</li><li><strong>홈 화면에 추가</strong>를 선택하세요.</li><li><strong>추가</strong>를 누르면 설치가 완료됩니다.</li></ol>' + (needsSafari() ? '<p>Safari로 이동한 후 설치를 진행해 주세요.</p>' + externalControls() : '');
    else content = '<p>브라우저 메뉴에서 설치할 수 있습니다.</p><ol class="install-steps"><li>Chrome 또는 삼성 인터넷에서 이 페이지를 여세요.</li><li>메뉴 <strong>⋮ / ☰</strong>를 누르세요.</li><li><strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택하세요.</li></ol><p>컴퓨터에서는 주소창의 설치 아이콘 또는 브라우저 메뉴의 앱 설치를 이용해 주세요.</p>';
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
      // If the browser declines the prompt, keep its manual installation steps available.
    } finally {
      busy = false;
      if (dialog()?.open) render();
    }
  }
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    pendingPrompt = event;
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
})();
