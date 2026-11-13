/* scripts/pwa-install.js */
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

;
/* scripts/supabase-config.js */
// app-PWA-eye: 공개용 연결 설정. 관리자 계정은 Supabase에서 별도로 만듭니다.
// Secret Key, service_role 또는 비밀번호를 넣지 마세요.
// 앱과 관리자 페이지는 같은 프로젝트를 사용하며 DB RLS로 쓰기 권한을 검사합니다.
window.clinicBackend = Object.freeze({
  url: 'https://issyhftzmzpudoeidoum.supabase.co',
  publishableKey: 'sb_publishable_CbpJX_u72nTaGtas8OtX1g_Esh3bXAA',
  adminEnabled: true
});

;
/* scripts/public-content.js */
// 새 프로젝트의 공개 콘텐츠만 읽습니다. 관리자 초안/개인 정보는 조회하지 않습니다.
(function(){
  'use strict';
  const config=window.clinicBackend||{};
  const store={status:'disabled',pages:[],notices:[],profiles:[],doctors:[],equipment:[],hours:[],settings:{},blog:[]};
  window.clinicContent=store;
  if(!config.url||!config.publishableKey)return;
  store.status='loading';
  const read=async(table,query)=>{
    let rows=[];for(;;){const params=new URLSearchParams({...query,offset:String(rows.length),limit:'1000'});
      const response=await fetch(config.url.replace(/\/$/,'')+'/rest/v1/'+table+'?'+params,{headers:{apikey:config.publishableKey},cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('공개 안내를 불러오지 못했습니다.');const data=await response.json();if(!Array.isArray(data))throw Error('응답 오류');rows=rows.concat(data);if(data.length<1000)return rows;
    }
  };
  window.reloadClinicContent=async()=>{
    try{
      const result=await Promise.all([
        read('content_pages',{select:'id,page_key,title,content,image_url,sort_order',is_published:'eq.true',order:'sort_order.asc,id.asc'}),
        read('notices',{select:'id,title,content,notice_date,image_url',is_published:'eq.true',order:'notice_date.desc,id.desc'}),
        read('doctor_about_profiles',{select:'doctor_id,greeting,career,activities,specialties,profile_photo_url',is_visible:'eq.true',order:'doctor_id.asc'}),
        read('doctors',{select:'id,name,photo_url',order:'id.asc'}),read('equipment',{select:'id,title,category,description,image_url',order:'id.asc'}),
        read('clinic_hours',{select:'id,start_time,end_time',order:'id.asc'}),read('app_settings',{select:'id,value',order:'id.asc'}),
        read('blog_posts',{select:'id,title,content,post_date,image_url,source,source_url',is_published:'eq.true',order:'post_date.desc,id.desc'})
      ]);
      [store.pages,store.notices,store.profiles,store.doctors,store.equipment,store.hours,,store.blog]=result;
      store.settings=Object.fromEntries(result[6].map(row=>[row.id,row.value]));store.status='ready';
    }catch{store.status='error';}
    window.dispatchEvent(new Event('clinic-content-updated'));
  };
  window.reloadClinicContent();
}());

;
/* scripts/holidays.js */
// 공휴일 표시용 확인 자료. 네이버 캘린더 직접 읽기/실시간 동기화는 구현되지 않았습니다.
// 확인일: 2026-10-29 / 표시 범위: 2026~2027년 / 임시공휴일 변경 시 갱신 필요
// 출처: 한국천문연구원 달력자료(2026, 2027년)
// https://astro.kasi.re.kr/kor/life/post/calendarData?year=2026
// https://astro.kasi.re.kr/kor/life/post/calendarData?year=2027
// 2026년 노동절·제헌절 추가: 인사혁신처 2026-04-29 공지
// https://openminister.mpm.go.kr/mpm/comm/newsPress/newsPressRelease/?boardId=bbs_0000000000000029&cntId=4250&mode=view
// 병원의 공휴일 휴진 여부를 의미하지 않으며 원장별 예시 근무표와 별개입니다.
window.holidayData = {
  years: [2026, 2027],
  dates: {
    '2026-01-01': '신정',
    '2026-02-16': '설날 연휴',
    '2026-02-17': '설날',
    '2026-02-18': '설날 연휴',
    '2026-03-01': '삼일절',
    '2026-03-02': '대체공휴일(삼일절)',
    '2026-05-01': '노동절',
    '2026-05-05': '어린이날',
    '2026-05-24': '부처님오신날',
    '2026-05-25': '대체공휴일(부처님오신날)',
    '2026-06-03': '전국동시지방선거',
    '2026-06-06': '현충일',
    '2026-07-17': '제헌절',
    '2026-08-15': '광복절',
    '2026-08-17': '대체공휴일(광복절)',
    '2026-09-24': '추석 연휴',
    '2026-09-25': '추석',
    '2026-09-26': '추석 연휴',
    '2026-10-03': '개천절',
    '2026-10-05': '대체공휴일(개천절)',
    '2026-10-09': '한글날',
    '2026-12-25': '성탄절',
    '2027-01-01': '신정',
    '2027-02-06': '설날 연휴',
    '2027-02-07': '설날',
    '2027-02-08': '설날 연휴',
    '2027-02-09': '대체공휴일(설날)',
    '2027-03-01': '삼일절',
    '2027-05-01': '노동절',
    '2027-05-03': '대체공휴일(노동절)',
    '2027-05-05': '어린이날',
    '2027-05-13': '부처님오신날',
    '2027-06-06': '현충일',
    '2027-07-17': '제헌절',
    '2027-07-19': '대체공휴일(제헌절)',
    '2027-08-15': '광복절',
    '2027-08-16': '대체공휴일(광복절)',
    '2027-09-14': '추석 연휴',
    '2027-09-15': '추석',
    '2027-09-16': '추석 연휴',
    '2027-10-03': '개천절',
    '2027-10-04': '대체공휴일(개천절)',
    '2027-10-09': '한글날',
    '2027-10-11': '대체공휴일(한글날)',
    '2027-12-25': '성탄절',
    '2027-12-27': '대체공휴일(성탄절)'
  }
};

;
/* scripts/schedule-source.js */
// 원장 일정에 필요한 공개 테이블만 조회합니다. 환자 정보는 조회하지 않습니다.
(function () {
  'use strict';
  window.loadDoctorScheduleData = async function () {
    if(!window.clinicBackend?.url||!window.clinicBackend?.publishableKey)throw new Error('새 프로젝트의 공개 연결 설정을 확인해 주세요.');
    var projectUrl = window.clinicBackend.url;
    // 새 PWA 프로젝트의 공개용 키입니다. 인증 및 환자 정보는 사용하지 않습니다.
    var publishableKey = window.clinicBackend.publishableKey;

    // 날짜별 일정이 늘어나도 기본 조회 건수 제한으로 누락되지 않게 나눠 읽습니다.
    async function readRows(table, columns) {
      var rows = [];
      var size = 1000;
      while (true) {
        var query = new URLSearchParams({ select: columns, order: 'id.asc', offset: String(rows.length), limit: String(size) });
        var response = await fetch(projectUrl + '/rest/v1/' + table + '?' + query, {
          headers: { apikey: publishableKey }, cache: 'no-store', signal: AbortSignal.timeout(15000)
        });
        var payload = await response.json();
        var result = response.ok ? { data: payload } : { error: payload };
        // 종료 시간 SQL 적용 전에도 기존 일정은 계속 표시합니다.
        if (result.error && ['42703', 'PGRST204'].includes(result.error.code) && columns.includes(',end_time')) {
          columns = columns.replace(',end_time', '');
          continue;
        }
        if (result.error && ['42703', 'PGRST204'].includes(result.error.code) && columns.includes(',photo_url')) {
          columns = columns.replace(',photo_url', '');
          continue;
        }
        if (result.error && ['42703', 'PGRST204'].includes(result.error.code) && columns.includes(',saturday_weeks')) {
          columns = columns.replace(',saturday_weeks', '');
          continue;
        }
        if (result.error) throw result.error;
        if (!Array.isArray(result.data)) throw new Error('일정 조회 결과를 확인할 수 없습니다.');
        rows = rows.concat(result.data);
        if (result.data.length < size) return rows;
      }
    }
    var result = await Promise.all([
      readRows('doctors', 'id,name,initial,color,photo_url'),
      readRows('doctor_weekly_schedules', 'id,doctor_id,weekday,period,end_time,saturday_weeks'),
      readRows('doctor_date_schedules', 'id,doctor_id,schedule_date,period,end_time'),
      readRows('doctor_closures', 'id,doctor_id,start_date,end_date'),
      // 진료시간 테이블이 아직 없는 환경에서도 원장별 일정 조회는 유지합니다.
      readRows('clinic_hours', 'id,start_time,end_time').catch(function () { return []; })
    ]);
    // 기존 달력의 표시 형태로 변환하여 디자인과 근무 구분을 유지합니다.
    var doctors = result[0].map(function (doctor) {
      var weekly = result[1].filter(function (row) { return String(row.doctor_id) === String(doctor.id); });
      return {
        id: String(doctor.id), name: doctor.name, initial: doctor.initial, color: doctor.color, photoUrl: doctor.photo_url,
        weeklySchedules: weekly, weekdays: weekly.map(function (row) { return Number(row.weekday); }),
        morningOnly: weekly.filter(function (row) { return row.period === 'morning'; })
          .map(function (row) { return Number(row.weekday); })
      };
    });
    var schedules = result[2].filter(function (row) {
      return doctors.some(function (doctor) { return doctor.id === String(row.doctor_id); });
    }).map(function (row) {
      return {
        doctorId: String(row.doctor_id), date: row.schedule_date, period: row.period, endTime: row.end_time,
        time: row.period === 'morning' ? '오전 진료' : '종일 진료'
      };
    });
    var closures = result[3].map(function (row) {
      var doctor = doctors.find(function (item) { return item.id === String(row.doctor_id); });
      return doctor ? { doctorId: doctor.id, doctorName: doctor.name, startDate: row.start_date, endDate: row.end_date } : null;
    }).filter(Boolean);
    return { doctors: doctors, schedules: schedules, closures: closures, clinicHours: result[4] };
  };
}());

;
/* scripts/schedule-model.js */
// 기존 홈페이지 home.js의 일정 우선순위와 격주 토요일 규칙을 유지합니다.
(function () {
  'use strict';
  function closuresOn(data, date, doctorId = '') {
    return data.closures.filter(row => (!doctorId || row.doctorId === doctorId) && row.startDate <= date && row.endDate >= date);
  }
  function entries(data, date, doctorId = '') {
    const parts = date.split('-').map(Number);
    const weekday = new Date(parts[0], parts[1] - 1, parts[2]).getDay();
    const specific = data.schedules.filter(row => row.date === date);
    const weekly = data.doctors.filter(doctor => {
      const rule = (doctor.weeklySchedules || []).find(row => Number(row.weekday) === weekday);
      const week = Math.floor((parts[2] - 1) / 7) + 1;
      const matchesWeek = weekday !== 6 || !rule || !rule.saturday_weeks || rule.saturday_weeks === 'all' ||
        (rule.saturday_weeks === 'first_third' && [1, 3].includes(week)) ||
        (rule.saturday_weeks === 'second_fourth' && [2, 4].includes(week));
      return doctor.weekdays.includes(weekday) && matchesWeek && !specific.some(row => row.doctorId === doctor.id);
    }).map(doctor => {
      const rule = doctor.weeklySchedules.find(row => Number(row.weekday) === weekday);
      return { doctorId: doctor.id, date, period: rule.period, endTime: rule.end_time };
    });
    return weekly.concat(specific).filter(row => (!doctorId || row.doctorId === doctorId) && !closuresOn(data, date, row.doctorId).length);
  }
  function workHours(entry, date) {
    const holiday = (window.holidayData?.dates || {})[date] || '';
    const substitute = holiday.includes('대체공휴일');
    const morning = !substitute && (Boolean(holiday) || entry.period === 'morning');
    const saturday = new Date(date + 'T12:00:00').getDay() === 6;
    const end = substitute ? '19:00' : entry.endTime || (saturday ? '17:00' : '19:00');
    return { label: morning ? '오전' : '종일', hours: morning ? '08:30 ~ 13:00' : end.slice(0, 5) === '17:00' ? '08:30 ~ 17:00' : '08:30 ~ 19:00' };
  }
  window.ClinicSchedule = { entries, closuresOn, workHours };
}());

;
/* scripts/guide-reference.js */
// Public website snapshot, 2026-11-12. Designation date corrected by clinic.
window.clinicGuideReference = {
  "logo": "assets/veterans-logo.svg",
  "summary": {
    "details": [
      {
        "label": "진료 대상",
        "value": "국가유공자 및 국가유공자의 유가족"
      },
      {
        "label": "진료 신청",
        "value": "주민등록증, 국가유공자증 등 신분증 제시"
      }
    ],
    "support": [
      "국가유공자 신분증 소지자, 보훈가족 (감면 대상)",
      "4.3 유족 및 며느리 카드 소지자 (1954.12.31 이전 출생자)",
      "장애 1급 카드 소지자",
      "해녀(잠수어업인) 카드 소지자"
    ]
  },
  "veterans": {
    "intro": "연세제일안과는 첨단 의료 장비와 진료 서비스에서 높은 평가를 받아 2026년 1월, '제주지역 안과'로는 최초, 유일하게 보훈위탁병원으로 지정되었습니다.",
    "notice": "아래 표는 안내 자료를 간략히 정리한 내용입니다. 지원 대상과 본인부담은 등록 유형·등급·신청 시기·연령 및 진료 항목에 따라 달라지므로 접수 시 자격을 확인해 주세요.",
    "groups": [
      {
        "target": "전상군경·공상군경·공상공무원 1~7급",
        "person": "본인",
        "care": "국비 진료 전액 감면",
        "medicine": "국비 진료 전액 감면"
      },
      {
        "target": "전몰군경 유족회·전몰군경 미망인회",
        "person": "75세 이상 선순위 유가족 1위",
        "care": "급여 60% 감면",
        "medicine": "제외"
      },
      {
        "target": "무공수훈자",
        "person": "본인",
        "care": "급여 60% 감면",
        "medicine": "연간 160,000원*"
      },
      {
        "target": "월남참전유공자·6.25참전유공자",
        "person": "본인",
        "care": "급여 90% 감면",
        "medicine": "연간 252,000원*"
      },
      {
        "target": "고엽제후유의증 대상자·고엽제 후유증 2세 환자",
        "person": "본인",
        "care": "국비 진료 전액 감면**",
        "medicine": "국비 진료 전액 감면**"
      },
      {
        "target": "재일학도의용군인",
        "person": "본인",
        "care": "급여 60% 감면",
        "medicine": "연간 252,000원*"
      },
      {
        "target": "특수임무유공자",
        "person": "본인",
        "care": "국비 진료 전액 감면",
        "medicine": "국비 진료 전액 감면"
      },
      {
        "target": "독립유공자(순국선열·애국지사)",
        "person": "본인",
        "care": "국비 진료 전액 감면",
        "medicine": "국비 진료 전액 감면"
      },
      {
        "target": "독립유공자 유족",
        "person": "75세 이상 선순위 유가족 1인",
        "care": "급여 60% 감면",
        "medicine": "제외"
      },
      {
        "target": "4.19 혁명 유공자 및 유족",
        "person": "본인",
        "care": "국비 진료 전액 감면",
        "medicine": "국비 진료 전액 감면"
      },
      {
        "target": "4.19 혁명 유공자 유족",
        "person": "75세 이상 선순위 유가족 1인",
        "care": "급여 60% 감면",
        "medicine": "제외"
      },
      {
        "target": "5.18 민주화운동 유공자",
        "person": "본인",
        "care": "국비 진료 전액 감면",
        "medicine": "국비 진료 전액 감면"
      }
    ],
    "footnotes": [
      {
        "text": "* 무공수훈자·참전유공자·재일학도의용군인의 위탁병원 약제비 지원은 75세 이상 등 해당 조건을 충족하는 경우 연간 한도 내에서 적용됩니다.",
        "links": []
      },
      {
        "text": "** 고엽제후유의증 등급기준 미달자는 인정질병과 합병증에 한해 국비 진료를 받을 수 있습니다. 2016년 6월 23일 이후 등록 신청한 경도 대상자는 인정질병 외 진료 시 본인부담금의 10%를 부담합니다.",
        "links": []
      },
      {
        "text": "상이등급 7급 등 일부 대상자는 등록 신청 시기와 질환에 따라 본인부담이 발생할 수 있습니다.",
        "links": [
          {
            "label": "국가보훈부 진료비 안내 보기 ↗",
            "url": "https://sangdam.mpva.go.kr/faq/userQuestionDetail.do?selectedId=000001873"
          }
        ]
      },
      {
        "text": "세부 기준과 신청 방법은 자격별로 다를 수 있으며 변경될 수 있습니다.",
        "links": [
          {
            "label": "국가보훈부 안내 보기 ↗",
            "url": "https://sangdam.mpva.go.kr/faq/userQuestionDetail.do?selectedId=000001831"
          }
        ]
      }
    ],
    "conditions": [
      {
        "label": "건강보험 자격",
        "value": "건강보험 가입자"
      },
      {
        "label": "비급여 항목",
        "value": "원칙적으로 감면 제외"
      },
      {
        "label": "국비진료 대상자",
        "value": "건강보험 급여 부분 및 지정된 일부 비급여 항목 지원"
      },
      {
        "label": "약제비 연간 지원금",
        "value": "해당 대상자별 연간 한도 내 지원"
      },
      {
        "label": "약제비 신청",
        "value": "약제비 지급 신청서를 관할 보훈관서에 제출"
      }
    ]
  },
  "facilities": [
    {
      "floor": "2층",
      "description": "진료/접수",
      "phone": "064.727.2700",
      "phoneLabel": "대표전화 ",
      "photos": [
        {
          "src": "assets/facility/2f-01.jpg",
          "alt": "2층 대기공간",
          "caption": "대기공간"
        },
        {
          "src": "assets/facility/2f-02.jpg",
          "alt": "2층 진료실",
          "caption": "진료실"
        },
        {
          "src": "assets/facility/2f-03.jpg",
          "alt": "2층 검사실",
          "caption": "검사실"
        },
        {
          "src": "assets/facility/2f-04.jpg",
          "alt": "2층 상담실",
          "caption": "상담실"
        },
        {
          "src": "assets/facility/2f-05.jpg",
          "alt": "2층 렌즈실",
          "caption": "렌즈실"
        },
        {
          "src": "assets/facility/2f-06.jpg",
          "alt": "2층 수술실",
          "caption": "수술실"
        },
        {
          "src": "assets/facility/2f-07.jpg",
          "alt": "2층 레이저실",
          "caption": "레이저실"
        },
        {
          "src": "assets/facility/2f-08.jpg",
          "alt": "2층 IPL실",
          "caption": "IPL실"
        },
        {
          "src": "assets/facility/2f-09.jpg",
          "alt": "2층 적외선치료실",
          "caption": "적외선치료실"
        },
        {
          "src": "assets/facility/2f-10.jpg",
          "alt": "2층 주사시술실",
          "caption": "주사시술실"
        },
        {
          "src": "assets/facility/2f-11.jpg",
          "alt": "2층 처치실",
          "caption": "처치실"
        },
        {
          "src": "assets/facility/2f-12.jpg",
          "alt": "2층 특수검사실",
          "caption": "특수검사실"
        },
        {
          "src": "assets/facility/2f-13.jpg",
          "alt": "2층 입원실",
          "caption": "입원실"
        }
      ]
    },
    {
      "floor": "3층",
      "description": "시력교정수술센터/세안실",
      "phone": "064.727.2703",
      "phoneLabel": "",
      "photos": [
        {
          "src": "assets/facility/3f-02.jpg",
          "alt": "3층 안내 데스크",
          "caption": "안내 데스크"
        },
        {
          "src": "assets/facility/3f-01.jpg",
          "alt": "3층 수술센터",
          "caption": "수술센터"
        },
        {
          "src": "assets/facility/3f-06.jpg",
          "alt": "3층 세안실",
          "caption": "세안실"
        },
        {
          "src": "assets/facility/3f-03.jpg",
          "alt": "3층 상담실",
          "caption": "상담실"
        },
        {
          "src": "assets/facility/3f-04.jpg",
          "alt": "3층 회복실",
          "caption": "회복실"
        },
        {
          "src": "assets/facility/3f-05.jpg",
          "alt": "3층 휴게공간",
          "caption": "휴게공간"
        }
      ]
    }
  ],
  "doctorOrder": [
    "정진호",
    "이택관",
    "심종우",
    "최한솔",
    "이정진"
  ],
  "equipmentOrder": [
    "surgery",
    "exam",
    "treatment"
  ],
  "history": [
    {
      "year": "2017",
      "items": [
        "연세제일안과 개원 이도이동 중앙로 337",
        "제주도내 로컬 안과병원 최초 광각안저 촬영기 도입"
      ]
    },
    {
      "year": "2019",
      "items": [
        "안구건조증 치료를 위한 루메니스 M22 IPL 레이저 도내 최초 도입"
      ]
    },
    {
      "year": "2020",
      "items": [
        "안과 전문 진료 차트 선제적 도입"
      ]
    },
    {
      "year": "2022",
      "items": [
        "제주 유일 황반변성 특수 레이저 vitra PDT 레이저 도입"
      ]
    },
    {
      "year": "2025",
      "items": [
        "난시 및 고위수차 분석 장비 i-trace 최초 도입"
      ]
    },
    {
      "year": "2026",
      "items": [
        "제주지역 안과 최초 보훈위탁병원 지정",
        "최신 백내장·망막 수술 장비 알콘 유니티 VCS 신규 도입",
        "현위치 확장이전 도남동 연북로 449"
      ]
    }
  ]
};

// Original history chapter from the reference website.
window.clinicGuideReference.historyMarkup = "<h3 class=\"about-history-intro\">제주 안과의 '최초'를 선도해온 기록</h3>\r\n      <ol class=\"about-history-list guide-history\">\r\n        <li class=\"about-history-year\"><h4>2017</h4><ul><li><strong>연세제일안과 개원</strong><span>이도이동 중앙로 337</span></li><li><strong>제주도내 로컬 안과병원 최초 광각안저 촬영기 도입</strong></li></ul></li>\r\n        <li class=\"about-history-year\"><h4>2019</h4><ul><li><strong>안구건조증 치료를 위한 루메니스<br>M22 IPL 레이저 도내 최초 도입</strong></li></ul></li>\r\n        <li class=\"about-history-year\"><h4>2020</h4><ul><li><strong>안과 전문 진료 차트 선제적 도입</strong></li></ul></li>\r\n        <li class=\"about-history-year\"><h4>2022</h4><ul><li><strong>제주 유일 황반변성 특수 레이저<br>vitra PDT 레이저 도입</strong></li></ul></li>\r\n        <li class=\"about-history-year\"><h4>2025</h4><ul><li><strong>난시 및 고위수차 분석 장비<br>i-trace 최초 도입</strong></li></ul></li>\r\n        <li class=\"about-history-year\"><h4>2026</h4><ul><li><strong>제주지역 안과 최초 <span class=\"history-accent\">보훈위탁병원</span> 지정</strong></li><li><strong>최신 백내장·망막 수술 장비<br>알콘 유니티 VCS 신규 도입</strong></li><li><strong>현위치 확장이전</strong><span>도남동 연북로 449</span></li></ul></li>\r\n      </ol>";

;
/* scripts/guide.js */
(function(){
  'use strict';
  const reference=window.clinicGuideReference;
  const tabs=[['support','보훈·지원'],['facility','시설'],['director','의료진'],['equipment','장비'],['history','History']];
  let active='support';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeUrl(value){
    if(/^assets\/[\w./-]+$/.test(value||'')&&!value.includes('..'))return value;
    try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}
  }
  const image=(value,alt,cls='')=>safeUrl(value)?`<img class="${cls}" src="${esc(safeUrl(value))}" alt="${esc(alt)}" loading="lazy" decoding="async">`:'';
  const list=values=>`<ul>${(Array.isArray(values)?values:[]).map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`;
  function supportLabel(value){
    const text=String(value??'');
    const note=text.includes('유족 및 며느리 카드 소지자')?text.match(/\s*(\([^)]*\))\s*$/):null;
    return note?`${esc(text.slice(0,note.index))}<small class="guide-support-note">${esc(note[1])}</small>`:esc(text);
  }
  function status(content){
    if(content?.status==='ready')return '';
    return `<div class="card guide-status" role="status"><p>${content?.status==='loading'?'병원 정보를 불러오는 중입니다.':'병원 정보를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'}</p>${content?.status==='loading'?'':'<button class="text-button" data-guide-retry>다시 불러오기</button>'}</div>`;
  }
  function hours(content){
    if(content?.status!=='ready')return status(content);
    const labels={weekday:'월 ~ 금요일',saturday:'토요일',holiday:'공휴일',substitute:'대체공휴일',lunch:'점심시간'};
    const rows=Object.keys(labels).map(id=>content.hours.find(r=>r.id===id)).filter(Boolean);
    const time=value=>String(value||'').slice(0,5);
    return `<section class="card guide-hours"><h2>병원 진료시간</h2><dl class="hours">${rows.map(r=>`<div><dt>${labels[r.id]}</dt><dd>${esc(time(r.start_time))} ~ ${esc(time(r.end_time))}</dd></div>`).join('')}</dl><a class="guide-inline-link" href="#/schedule">원장별 진료 일정 확인 <span aria-hidden="true">→</span></a></section>`;
  }
  function support(content){
    return `<section class="guide-veterans" aria-labelledby="guide-veterans-title">${image(reference.logo,'국가보훈부','guide-veterans-logo')}<h2 id="guide-veterans-title">연세제일안과는 <strong>보훈위탁병원</strong>입니다.</h2><dl class="guide-info-rows">${reference.summary.details.map(r=>`<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}</dl><div class="guide-detail-action"><button class="guide-outline-button" data-action="veterans" aria-haspopup="dialog" aria-controls="veterans-dialog">보훈안내 자세히 <span aria-hidden="true">↗</span></button></div><h3>진료비 지원</h3><ul class="guide-support-list">${reference.summary.support.map(item=>`<li>${supportLabel(item)}</li>`).join('')}</ul></section>${content?.status==='ready'?content.pages.filter(r=>r.page_key==='guide'&&r.title.replace(/\s/g,'')!=='내원안내').map(r=>`<section class="card"><h2>${esc(r.title)}</h2><div class="managed-text">${esc(r.content)}</div></section>`).join(''):''}`;
  }
  function locationPhotos(){
    return `<div class="guide-carousel guide-location-carousel"><div id="guide-gallery-location" class="guide-location-photos" tabindex="0" role="region" aria-label="병원 위치와 주차장"><figure>${image('assets/facility/building-exterior.jpg','연세제일안과 메디온빌딩 외관')}<figcaption>제주시 연북로 449 메디온빌딩 2,3층</figcaption></figure><figure>${image('assets/facility/building-parking.jpg','메디온빌딩 뒤편 주차장')}<figcaption>건물 뒤편 주차장</figcaption></figure></div></div>`;
  }
  function galleryControls(id,label){
    return `<div class="guide-gallery-controls"><button type="button" data-guide-gallery="${id}" data-direction="-1" aria-label="${esc(label)} 이전 사진">←</button><button type="button" data-guide-gallery="${id}" data-direction="1" aria-label="${esc(label)} 다음 사진">→</button></div>`;
  }
  function facilities(content){
    return `${locationPhotos()}${reference.facilities.map((floor,index)=>`<section class="guide-floor"><header><div class="guide-floor-heading"><h3>${esc(floor.floor)}</h3><div class="guide-floor-copy"><strong>${esc(floor.description)}</strong><div class="guide-floor-contact">${floor.phoneLabel?`<span class="guide-floor-phone-label">${esc(floor.phoneLabel.trim())}</span>`:''}<a class="guide-floor-phone" href="tel:${esc(String(floor.phone||'').replace(/\D/g,''))}">${esc(floor.phone||'')}</a><a class="guide-call-button" href="tel:${esc(String(floor.phone||'').replace(/\D/g,''))}" aria-label="${esc(floor.floor)} ${esc(floor.description)} 전화 연결하기">연결하기</a></div></div></div>${galleryControls(index,floor.floor)}</header><div class="guide-carousel"><div id="guide-gallery-${index}" class="guide-gallery" tabindex="0" role="region" aria-label="${esc(floor.floor)} 시설 사진. 좌우로 넘겨 보세요.">${floor.photos.map((photo,i)=>`<figure>${image(photo.src,photo.alt)}<figcaption><span>${esc(photo.caption)}</span><small>${i+1} / ${floor.photos.length}</small></figcaption></figure>`).join('')}</div></div></section>`).join('')}${hours(content)}`;
  }
  function doctors(content,schedule,scheduleState){
    if(content?.status!=='ready')return status(content);
    const name=d=>String(d.name).replace(/\s*원장\s*$/,'').trim();
    const rank=d=>{const i=reference.doctorOrder.indexOf(name(d));return i<0?Infinity:i;};
    const rows=content.doctors.filter(d=>content.profiles.some(p=>String(p.doctor_id)===String(d.id))).slice().sort((a,b)=>rank(a)-rank(b));
    return rows.map(d=>{
      const p=content.profiles.find(p=>String(p.doctor_id)===String(d.id));
      const weekly=schedule.doctors.find(row=>String(row.id)===String(d.id))?.weeklySchedules||[];
      const days=['일','월','화','수','목','금','토'];
      const weeklyHtml=scheduleState==='ready'?(weekly.length?`<dl class="guide-weekly">${weekly.slice().sort((a,b)=>(a.weekday+6)%7-(b.weekday+6)%7).map(row=>`<div><dt>${days[row.weekday]}요일${row.saturday_weeks==='first_third'?' · 첫째·셋째':row.saturday_weeks==='second_fourth'?' · 둘째·넷째':''}</dt><dd>${row.period!=='morning'&&String(row.end_time).slice(0,5)==='17:00'?'오후 5시까지 진료':(row.period==='morning'?'오전 진료':'종일 진료')+(row.period!=='morning'&&row.end_time?' · '+esc(String(row.end_time).slice(0,5))+'까지':'')}</dd></div>`).join('')}</dl>`:'<p>등록된 정기 일정이 없습니다.</p>'):`<p>${scheduleState==='error'?'일정을 불러오지 못했습니다. 진료 일정 메뉴에서 다시 확인해 주세요.':'정기 일정을 불러오는 중입니다.'}</p>`;
      return `<details class="guide-doctor" name="guide-doctors" data-guide-detail="doctor-${esc(d.id)}"><summary>${image(p.profile_photo_url||d.photo_url||'assets/doctor-placeholder.svg',d.name,'guide-doctor-avatar')}<span class="guide-doctor-title"><small>안과전문의</small><strong>${esc(d.name)}</strong></span><svg class="guide-expand" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></summary><div class="guide-doctor-body"><h3>진료과목</h3><span class="guide-specialties">${(p.specialties||[]).map(v=>`<span>${esc(v)}</span>`).join('')}</span><h3>인사말</h3><p class="managed-text">${esc(p.greeting||'인사말은 준비 중입니다.')}</p>${[['약력',p.career],['학회활동',p.activities]].map(([title,values])=>`<h3>${title}</h3>${values?.length?list(values):'<p>안내를 준비 중입니다.</p>'}`).join('')}<h3>진료일정</h3>${weeklyHtml}<p class="note">날짜별 변경·휴진 일정은 진료 일정 메뉴에서 확인해 주세요.</p><a class="guide-inline-link guide-doctor-schedule-link" href="#/schedule">자세한 진료 일정 보기 <span aria-hidden="true">→</span></a></div></details>`;
    }).join('')+(rows.length?'':'<section class="card"><p>의료진 소개를 준비 중입니다.</p></section>');
  }
  function equipment(content){
    if(content?.status!=='ready')return status(content);
    const labels={surgery:'수술 장비',exam:'검진 장비',treatment:'치료 장비'};
    return reference.equipmentOrder.map(category=>{
      const title=labels[category];
      const rows=content.equipment.filter(r=>r.category===category);
      return `<details class="guide-equipment-group" name="guide-equipment" data-guide-detail="equipment-${category}"><summary><span>${title}<small>${rows.length}종</small></span><svg class="guide-expand" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></summary><div class="guide-equipment-list">${rows.map(r=>`<article><div class="guide-equipment-photo">${image(r.image_url,r.title+' 장비')}</div><div class="guide-equipment-copy"><small>${esc(title.replace(/\s/g,''))}</small><h3>${esc(r.title)}</h3><p>${esc(r.description||'')}</p></div></article>`).join('')||'<p>장비 안내를 준비 중입니다.</p>'}</div></details>`;
    }).join('');
  }
  function history(){return reference.historyMarkup;}
  function render(content,schedule,scheduleState){
    const panes={support:()=>support(content),facility:()=>facilities(content),director:()=>doctors(content,schedule,scheduleState),equipment:()=>equipment(content),history};
    return `<div class="guide-sticky-header" id="guide-sticky-header"><header class="guide-topbar"><a class="guide-home-logo" href="#/" aria-label="연세제일안과 홈"><img src="${esc(safeUrl(content?.settings?.logo_url)||'assets/logo.svg')}" alt="연세제일안과" width="140" height="25"></a><h1>병원 이용 안내</h1></header><div class="guide-tabs" id="guide-tabs" role="tablist" aria-label="병원 이용 안내 항목">${tabs.map(([id,label])=>`<button type="button" role="tab" id="guide-tab-${id}" data-guide-tab="${id}" aria-controls="guide-panel" aria-selected="${active===id}" tabindex="${active===id?'0':'-1'}">${label}</button>`).join('')}</div></div><section id="guide-panel" class="guide-panel" role="tabpanel" tabindex="0" aria-labelledby="guide-tab-${active}">${panes[active]()}</section>`;
  }
  function veterans(){
    const data=reference.veterans;
    const emphasis="'제주지역 안과'로는 최초, 유일하게 보훈위탁병원으로 지정";
    const intro=esc(data.intro).replace(esc(emphasis),`<strong>${esc(emphasis)}</strong>`);
    const personBadge=person=>`<span class="guide-benefit-person">${esc(person)}</span>`;
    const notes=items=>items.map(p=>`<p class="guide-veterans-note">${esc(p.text)}${p.links.map(a=>safeUrl(a.url)?` <a href="${esc(safeUrl(a.url))}" target="_blank" rel="noopener noreferrer">${esc(a.label)}</a>`:'').join('')}</p>`).join('');
    return `<header class="guide-modal-header"><h2 id="veterans-title">보훈위탁병원 안내</h2><button type="button" class="guide-close" data-close autofocus>닫기 <span aria-hidden="true">×</span></button></header><div class="guide-modal-content">${image(reference.logo,'국가보훈부','guide-veterans-logo')}<p class="guide-veterans-intro">${intro}</p><h3>보훈위탁병원 진료비 지원 기준</h3><div class="guide-benefits">${data.groups.map(r=>`<article><h4><span class="guide-benefit-title">${supportLabel(r.target)}</span>${personBadge(r.person)}</h4><dl><div><dt>진료비 지원</dt><dd>${esc(r.care)}</dd></div><div><dt>약제비 지원</dt><dd>${esc(r.medicine)}</dd></div></dl></article>`).join('')}</div>${notes(data.footnotes.slice(0,-1))}<h3>공통 적용 조건 및 지원 제외 항목</h3><dl class="guide-condition-list">${data.conditions.map(r=>`<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}</dl>${notes(data.footnotes.slice(-1))}<button type="button" class="primary-button" data-close>닫기</button></div>`;
  }
  window.ClinicGuide={tabs,render,veterans,get active(){return active;},select(id){if(tabs.some(([key])=>key===id))active=id;}};
}());

;
/* scripts/vision-before.js */
// Content and heading icons imported from the reference website; adapted for the app.
window.clinicVisionBeforeHtml = "<section class=\"information-section\" id=\"beforeSurgery\" aria-labelledby=\"heading-beforeSurgery\">\n        <div class=\"vision-guide\" data-section=\"beforeSurgery\" data-static-content translate=\"no\">\n          <header class=\"vision-guide-header\"><h2 id=\"heading-beforeSurgery\" class=\"vision-guide-header-title\">시력교정 검사/수술 전 안내사항</h2></header>\n          <div class=\"vision-guide-content\">\n            <section class=\"vision-guide-notice\" aria-labelledby=\"vision-before-check\"><h4 id=\"vision-before-check\" class=\"vision-heading-with-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"vision-heading-icon\"><path d=\"M9 5h10v16H5V5h2 M9 3h6v4H9z M8 11l1 1 2-2 M13 11h3 M8 16l1 1 2-2 M13 16h3\"/></svg>수술을 계획하기 전에!</h4><ul><li>임신 중이거나 임신 계획 중이신 분들은 전후 3개월이 지난 후에, 수유 중인 분들은 수유가 끝난 후 검사와 수술을 계획하시는 것이 좋습니다.</li><li>안질환이 있는 경우 검사 진행이 불가합니다.</li></ul></section>\n            <section class=\"vision-guide-section\" aria-labelledby=\"vision-preparation\"><h4 id=\"vision-preparation\">검사/수술 전 준비사항</h4>\n              <p class=\"vision-guide-tag\">내원 전</p><h5 class=\"vision-heading-with-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"vision-heading-icon\"><path d=\"M3 9c.7 6 3.8 9 9 9s8.3-3 9-9 M3 9c1.4 1.2 4.8 2 9 2s7.6-.8 9-2 M6 6c2-.7 4-.9 6-.9s4 .2 6 .9\"/></svg>렌즈 착용 중단</h5><p>렌즈를 사용하고 계시다면 착용을 중단해 주세요. 중단 시작일은 검사/수술일을 포함해 거꾸로 계산해 주세요. 미착용 기간을 지키지 않으면 일정이 변경될 수 있습니다.</p>\n              <table class=\"vision-lens-table\"><caption class=\"visually-hidden\">렌즈 종류별 검사/수술 전 미착용 기간</caption><tbody><tr><th scope=\"row\">소프트렌즈</th><td>7일 이상 미착용</td></tr><tr><th scope=\"row\">난시용 렌즈</th><td>10일 이상 미착용</td></tr><tr><th scope=\"row\">하드렌즈</th><td>10일 이상 미착용</td></tr><tr><th scope=\"row\">드림렌즈</th><td>최소 1개월 이상 미착용</td></tr></tbody></table>\n              <p class=\"vision-guide-tag\">검사/수술 당일</p><h5 class=\"vision-heading-with-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"vision-heading-icon\"><path d=\"M3 10c2 3 5 5 9 5s7-2 9-5 M6 13l-1 3 M10 15l-.5 3 M14 15l.5 3 M18 13l1 3\"/></svg>눈화장은 피해주세요.</h5><p>정확한 검사와 안전한 수술을 위해 눈화장 없이내원해 주세요. 화장을 하셨다면 클렌징을 할 수 있는 세안실이 준비되어 있습니다. (3층)</p>\n              <h5 class=\"vision-heading-with-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"vision-heading-icon\"><path d=\"M4 16h16l-1-7H5z M7 9V6h10v3 M6 16v2 M18 16v2 M7 13h.01 M17 13h.01\"/></svg>대중교통 이용 또는 보호자 동반 내원 <span>(본인 운전 X)</span></h5><p>망막·시신경 상태 확인과 정확한 도수 측정을 위해 동공 확대 안약을 눈에 넣는 산동검사를 합니다.</p><p>동공 확대 안약이 체내에서 빠지는 3~4시간 정도 근거리 작업(독서, 컴퓨터 작업, 핸드폰 사용 등)이 불편하실 수 있으며, 눈부심이 있을 수 있어 선글라스나 모자를 챙겨오시면 좋습니다.</p><p>검사/수술 당일은 자가운전이 어려우므로 가급적 대중교통을 이용하시거나 보호자를 동반하여 내원해 주시기 바랍니다.</p>\n              <h5 class=\"vision-heading-with-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"vision-heading-icon\"><path d=\"M3 6h18v12H3z M7 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0z M6 15c1-2 5-2 6 0 M14 10h4 M14 13h4\"/></svg>신분증 필수 지참</h5><p>2024년 5월부터 병·의원 본인 확인 의무화에 따라 주민등록증, 운전면허증, 여권 중 하나를 꼭 지참해 주세요.</p>\n            </section>\n            <section class=\"vision-guide-section\" aria-labelledby=\"vision-cost\"><h4 id=\"vision-cost\">검사 안내</h4><div class=\"vision-fee-card\"><div><span class=\"vision-fee-tag\">필수</span><h5 class=\"vision-heading-with-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"vision-heading-icon\"><path d=\"M4 20h16 M7 20v-3h10v3 M12 17v-5 M8 4h8v7H8z M10 6h4 M10 9h4 M6 6H4v5h4 M16 6h3v5h-3\"/></svg>시력교정수술을 위한 기초검사</h5><p>소요시간 <strong>약 2~3시간</strong></p></div><div><span class=\"vision-fee-tag\">선택</span><h5 class=\"vision-heading-with-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"vision-heading-icon\"><path d=\"M8 3c0 6 8 6 8 12 0 3-2 5-4 6 M16 3c0 6-8 6-8 12 0 3 2 5 4 6 M9 6h6 M9 18h6 M9 12h6\"/></svg>각막이상증 유전자 검사</h5><p>아벨리노 각막이상증 외 4종(전문 검사 기관 의뢰)</p><p>수술 확정 시 검사 진행됩니다.</p></div></div></section>\n            <section class=\"vision-guide-section\" aria-labelledby=\"vision-visit\"><h4 id=\"vision-visit\">병원 이용 안내</h4><h5 class=\"vision-heading-with-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"vision-heading-icon\"><path d=\"M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h3 M13 14h3 M8 17h3\"/></svg>일정 변경 시</h5><p>예약 변경은 최소 하루 전에 병원으로 꼭 연락 주세요.</p><a class=\"vision-phone\" href=\"tel:0647272703\"><span>시력교정수술센터</span><strong><svg class=\"vision-phone-icon\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m6 3 4 4-2 3a16 16 0 0 0 6 6l3-2 4 4-2 3C10 22 2 14 3 5Z\"/></svg>064-727-2703</strong></a><h5 class=\"vision-heading-with-icon\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\" class=\"vision-heading-icon\"><path d=\"M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12z M12 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z\"/></svg>층 안내</h5><p>시력교정수술센터 <strong>3층</strong>으로 내원해 주세요.</p></section>\n          </div>\n        </div>\n      </section>";

;
/* scripts/cataract-before.js */
(function(){
  'use strict';
  const paths={
    medicine:'M10 4a4 4 0 0 1 6 6l-6 6a4 4 0 0 1-6-6l6-6Zm-3 3 6 6 M17 15a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-2 1 4 4',
    calendar:'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h3 M13 17h3',
    wash:'M5 9h14 M8 9V6a4 4 0 0 1 8 0 M5 13h14l-2 7H7l-2-7Zm7-7v3 M4 4l2 2 M20 4l-2 2',
    check:'M20 11a8 8 0 1 1-5-7 M8 11l4 4 8-10',
    hearing:'M8 8a4 4 0 0 1 8 0c0 4-4 4-4 7 0 2-1 4-3 4s-3-1-3-3 M10 9a2 2 0 0 1 4 0c0 2-2 2-2 4'
  };
  const svg=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
  const cards=[
    ['medicine','복용 중인 약이 있어요','당뇨, 고혈압 등',[
      '수술과 상관없이 당일에도 복용하고 오세요.',
      '혈전억제제(예: 아스피린)를 복용하실 경우 의료진에게 미리 말씀해 주세요.'
    ]],
    ['calendar','음주, 파마·염색을 하고 싶어요','미리 확인해 주세요',[
      '음주는 수술 3일 전부터 피해주세요.',
      '파마·염색은 수술 1달 후부터 가능하니 필요하시다면 미리 해두시면 좋습니다.'
    ]],
    ['wash','수술 후 바로 씻어도 되나요?','수술 전 준비',[
      '수술 후 머리감기, 세안 등이 제한됩니다.',
      '수술 전 미리 깨끗하게 씻고 오세요.'
    ]]
  ];
  const checks=[
    ['아침식사는 간단히!','처방 안약, 복용 중이던 약 확인하기'],
    ['세안 후에는 스킨, 로션만!','화장을 하셨다면 당일 원내 세안실 이용 가능'],
    ['편안한 복장으로!','치마, 목티, 후드티는 피해주세요!'],
    ['오실 때 직접 운전 금지','반드시 보호자와 함께 동행']
  ];
  window.renderCataractPrecautions=()=>`<div class="cataract-precautions"><div class="cataract-preop-cards">${cards.map(([name,title,label,items])=>`<section class="cataract-preop-card"><div class="cataract-preop-icon">${svg(name)}</div><div><p class="cataract-preop-label">${label}</p><h3>${title}</h3><ul>${items.map(text=>`<li>${text}</li>`).join('')}</ul></div></section>`).join('')}</div><section class="cataract-day-check"><header><span>수술 당일</span><h3>꼭 확인하세요!</h3></header><ul>${checks.map(([title,text])=>`<li>${svg('check')}<div><h4>${title}</h4><p>${text}</p></div></li>`).join('')}</ul><p class="cataract-hearing-note">${svg('hearing')}<span>보청기를 사용 중이시면 수술실 들어가실 때는 빼주세요.</span></p></section></div>`;
})();

;
/* scripts/cataract-medication.js */
(function(){
  'use strict';
  const KEY='jeileye-cataract-preop-v1';
  let toastTimer;
  const doseFeedbackTimers=new WeakMap();
  let cardSequence=0,planSequence=0;
  const newPlanId=()=>`plan-${Date.now().toString(36)}-${++planSequence}`;
  const eyes={left:'왼쪽 눈',right:'오른쪽 눈',both:'양쪽 눈'};
  const periods={am:'오전',pm:'오후'};
  const medicines=[
    {id:'moxitra',name:'목시트라',type:'항생제',photo:'assets/medicines/moxitra.jpg',slots:['아침','점심','저녁','주무시기 전']},
    {id:'bronac',name:'브로낙',type:'소염제',photo:'assets/medicines/bronac.jpg',slots:['아침','저녁']}
  ];
  const pad=n=>String(n).padStart(2,'0');
  const hasTime=plan=>Number.isInteger(plan?.hour)&&plan.hour>=1&&plan.hour<=12&&Number.isInteger(plan?.minute)&&plan.minute>=0&&plan.minute<=59;
  const timeLabel=plan=>hasTime(plan)?`${periods[plan.period]||''} ${plan.hour}시 ${pad(plan.minute)}분`.trim():'';
  const key=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  function parseDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
    const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d,12);
    return key(date)===value?date:null;
  }
  function validPlan(plan){return !!(plan&&(Object.hasOwn(eyes,plan.eye)||plan.eye==='pending')&&parseDate(plan.surgeryDate)&&(!plan.period||Object.hasOwn(periods,plan.period)));}
  function cleanAppointment(value){
    if(!parseDate(value?.surgeryDate))return null;
    const appointment={surgeryDate:value.surgeryDate};
    if(Object.hasOwn(periods,value.period))appointment.period=value.period;
    if(hasTime(value)){appointment.hour=value.hour;appointment.minute=value.minute;}
    return appointment;
  }
  function read(){
    try{
      const value=JSON.parse(localStorage.getItem(KEY)||'null'),appointment=cleanAppointment(value?.appointment);
      const plans=Array.isArray(value?.plans)?value.plans.filter(validPlan).map((p,i)=>({...p,id:/^[a-z0-9-]{1,70}$/.test(p.id||'')?p.id:`record-${i}`})):[];
      if(!plans.length){const legacy=validPlan(value?.plan)?value.plan:appointment?{...appointment,eye:'pending'}:null;if(legacy)plans.push({...legacy,id:'legacy'});}
      plans.forEach((p,i)=>{p.archived=typeof p.archived==='boolean'?p.archived:i<plans.length-1;});
      const requested=location.hash.match(/[?&]plan=([a-z0-9-]+)/)?.[1];
      const plan=plans.find(p=>p.id===requested)||plans.find(p=>p.id===value?.activeId)||plans[0]||null;
      return {plan,plans,activeId:plan?.id||'',appointment:plan?cleanAppointment(plan):appointment,checks:value?.checks&&typeof value.checks==='object'&&!Array.isArray(value.checks)?value.checks:{}};
    }catch{return {plan:null,plans:[],activeId:'',appointment:null,checks:{}};}
  }
  function write(value){try{localStorage.setItem(KEY,JSON.stringify(value));return true;}catch{return false;}}
  function stepArrivalMinute(input,direction){
    const current=Number(input.value),base=Number.isFinite(current)?Math.round(current):0;
    input.value=pad(((base+direction)%60+60)%60);
    input.dispatchEvent?.(new Event('change',{bubbles:true}));
  }
  document.addEventListener('keydown',event=>{
    if(!event.target.matches?.('input[data-arrival-minute]')||!['ArrowUp','ArrowDown'].includes(event.key))return;
    event.preventDefault();stepArrivalMinute(event.target,event.key==='ArrowUp'?10:-10);
  });
  function dates(plan){
    const surgery=parseDate(plan.surgeryDate);
    return [3,2,1,0].map(offset=>{const date=new Date(surgery);date.setDate(date.getDate()-offset);return key(date);});
  }
  const weekday=value=>['일','월','화','수','목','금','토'][parseDate(value).getDay()];
  const label=(value,withWeekday=true)=>{const d=parseDate(value);return `${d.getMonth()+1}월 ${d.getDate()}일${withWeekday?` (${weekday(value)})`:''}`;};
  const doseKey=(plan,date,medicine,slot)=>[...(plan.id&&plan.id!=='legacy'?[plan.id]:[]),plan.surgeryDate,plan.eye,date,medicine,slot].join(':');
  function formPlan(form){
    const number=name=>Number(form.elements.namedItem(name).value);
    const surgeryDate=form.elements.namedItem('surgeryDate').value;
    const plan={eye:form.elements.namedItem('eye').value,surgeryDate,period:form.elements.namedItem('period').value,hour:number('hour'),minute:number('minute')};
    return validPlan(plan)&&Object.hasOwn(eyes,plan.eye)&&Object.hasOwn(periods,plan.period)&&hasTime(plan)&&String(form.elements.namedItem('minute').value).trim()!==''?plan:null;
  }
  function appointmentFields(plan,formId){
    const dateId=`cataract-date-${formId}`;
    const date=plan?parseDate(plan.surgeryDate):null;
    const year=date?date.getFullYear():Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Seoul'}).format(new Date()));
    return `<label for="${dateId}">수술 예정일</label><div class="medication-date-picker"><span data-date-display class="${date?'':'is-empty'}">${date?`${year}년 ${label(plan.surgeryDate)}`:'달력에서 날짜를 선택하세요.'}</span><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2"/></svg><input id="${dateId}" type="date" name="surgeryDate" min="2000-01-01" max="2100-12-31" value="${date?plan.surgeryDate:''}" required aria-label="수술 예정일 달력에서 선택"></div><p class="medication-time-label">내원 시간</p><div class="medication-time-row"><fieldset class="medication-period" aria-label="내원 시간 오전·오후 선택">${Object.entries(periods).map(([id,title])=>`<label><input type="radio" name="period" value="${id}" required ${plan?.period===id?'checked':''}><span>${title}</span></label>`).join('')}</fieldset><div class="medication-time-fields"><label><input type="number" name="hour" min="1" max="12" required inputmode="numeric" placeholder="시" value="${hasTime(plan)?plan.hour:''}" aria-label="내원 시"><span>시</span></label><div class="medication-minute-field"><div class="medication-minute-control"><input type="number" name="minute" min="0" max="59" step="any" data-arrival-minute required inputmode="numeric" placeholder="분" value="${hasTime(plan)?pad(plan.minute):''}" aria-label="내원 분"><div class="medication-minute-steps"><button type="button" data-minute-step="10" aria-label="내원 분 10분 늘리기"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 10 4-4 4 4"/></svg></button><button type="button" data-minute-step="-10" aria-label="내원 분 10분 줄이기"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></button></div></div><span>분</span></div></div></div><p id="medication-date-preview" aria-live="polite">${plan?`${label(dates(plan)[0])}부터 ${label(plan.surgeryDate)} 수술 당일까지 사용`:'수술일을 입력하면 안약 사용 시작일을 알려드려요.'}</p>`;
  }
  function eyeFields(plan){return `<fieldset class="medication-eye"><legend class="cataract-eye-heading"><span>수술할 눈을 선택하세요.</span><button type="button" data-close-cataract-appointment>닫기 ×</button></legend>${Object.entries(eyes).map(([id,title])=>`<label><input type="radio" name="eye" value="${id}" required ${plan?.eye===id?'checked':''}><span>${title}</span></label>`).join('')}</fieldset>`;}
  function renderSetupCard(plan){
    const formId=`cataract-appointment-form-${++cardSequence}`;
    const fields=appointmentFields(plan,formId).replace(/<p id="medication-date-preview"[\s\S]*?<\/p>/,'');
    return `<form id="${formId}" data-cataract-appointment data-plan-id="${plan?.id||''}" class="cataract-appointment-form cataract-appointment-card">${eyeFields(plan)}<div class="medication-date">${fields}<button class="primary-button" type="submit">저장</button><p class="medication-storage-note appointment-status" role="status"></p></div></form>`;
  }
  function renderSetup(){
    const {plans}=read();
    return `<section class="cataract-appointment-panel" aria-label="수술 일정"><div class="cataract-appointment-cards">${plans.map(renderSavedCard).join('')}</div><button type="button" class="cataract-appointment-add" data-add-cataract-appointment>+ ${plans.length?'항목 추가':'수술일 생성'}</button></section>`;
  }
  function renderSavedCard(plan){
    return `<article class="cataract-saved-card${plan.archived?' is-archived':''}" data-saved-plan="${plan.id}"><header><div class="cataract-saved-heading"><strong>${eyes[plan.eye]||'수술할 눈 미선택'}</strong><span class="cataract-disease-badge">백내장</span></div><div class="cataract-saved-actions">${plan.archived?'':`<button type="button" data-edit-cataract-appointment="${plan.id}">수정</button>`}<button type="button" data-delete-cataract-appointment="${plan.id}" aria-label="${label(plan.surgeryDate)} ${eyes[plan.eye]||''} 수술일 삭제">삭제</button></div></header><dl><div><dt>수술 예정일</dt><dd>${plan.surgeryDate.slice(0,4)}년 ${label(plan.surgeryDate)}</dd></div><div><dt>내원 시간</dt><dd>${timeLabel(plan)||'미입력'}</dd></div></dl></article>`;
  }
  function renderArrivalCard(){
    const {plan}=read();
    if(!plan)return '';
    return '<section class="medication-arrival-card"><p><span>수술 예정일</span><strong>'+label(plan.surgeryDate)+'</strong></p>'+(timeLabel(plan)?'<p class="medication-arrival-time"><strong>'+timeLabel(plan)+'</strong>까지 내원해주세요.</p>':'<a href="#/before/cataract">수술 예정 시·분 입력하기 →</a>')+'</section>';
  }
  function renderGuideSummary(){
    const {plans}=read();
    if(!plans.length)return '<section class="medication-saved-plan"><p>이전 목록에서 수술 정보를 저장해 주세요.</p><a href="#/before/cataract">수술 정보 입력 →</a></section>';
    return plans.map(plan=>'<section class="medication-saved-plan'+(plan.archived?' is-archived':'')+'" aria-label="저장한 수술 정보"><dl><div><dt>수술할 눈</dt><dd class="medication-eye-value"><span>'+(eyes[plan.eye]||'미선택')+'</span><span class="cataract-disease-badge">백내장</span></dd></div><div><dt>수술 예정일</dt><dd>'+plan.surgeryDate.slice(0,4)+'년 '+label(plan.surgeryDate)+'</dd></div><div><dt>내원 시간</dt><dd>'+(timeLabel(plan)||'미입력')+'</dd></div></dl>'+'</section>').join('');
  }
  function renderGuide(){
    return `<div class="medication-guide"><p class="medication-intro"><strong>수술 3일 전부터</strong> 병원에서 미리 처방해드린 안약을 <strong>수술할 눈</strong>에 넣어주세요.</p>${renderGuideSummary()}<div class="medication-products">${medicines.map(m=>`<article class="medication-product ${m.id}"><img src="${m.photo}" alt="${m.name} 안약과 포장" width="220" height="220"><h3>${m.name}</h3><span class="medication-type">${m.type}</span><strong>하루 ${m.slots.length}번</strong><p>${m.slots.join(' / ')}</p></article>`).join('')}</div><p class="medication-interval">겹치는 시간대(아침, 저녁)에는 <strong>순서와 상관없이 5분 이상 간격</strong>을 두고 넣어주세요.</p><p class="medication-oral-note">미리 받으신 안과 처방 <strong>먹는 약</strong>은 <strong>수술 후</strong>에 드셔야 합니다.</p><a class="medication-guide-link" href="#/eye-drops?from=medication">올바른 안약 사용 바로가기</a></div>`;
  }
  const dailySlots=(plan,date)=>date===plan.surgeryDate&&plan.period==='am'?['아침']:date===plan.surgeryDate&&plan.period==='pm'?['아침','점심']:['아침','점심','저녁','주무시기 전'];
  function totals(store){
    if(!store.plan)return {done:0,total:0};
    let done=0,total=0;
    for(const date of dates(store.plan))for(const m of medicines)for(let i=0;i<m.slots.length;i++){if(!dailySlots(store.plan,date).includes(m.slots[i]))continue;total++;if(store.checks[doseKey(store.plan,date,m.id,i)]===true)done++;}
    return {done,total};
  }
  function timeIcon(slot){
    const paths={
      '아침':'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
      '점심':'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 12V6 M12 12V8',
      '저녁':'M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10',
      '주무시기 전':'M3 9c2 3 5 5 9 5s7-2 9-5 M6 12l-2 3 M10 14l-1 3 M14 14l1 3 M18 12l2 3'
    };
    return `<svg class="medication-time-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[slot]}"/></svg>`;
  }
  function renderScheduleDay(plan,store,date,index){
    const slots=dailySlots(plan,date),today=key(new Date()),isToday=date===today;
    return `<details class="medication-day" data-medication-date="${date}" data-past="${date<today}" ${isToday?'open':''}><summary class="medication-day-summary"><span class="medication-day-summary-date"><strong>${label(date,false)}</strong><small class="medication-day-weekday">(${weekday(date)})</small></span><span class="medication-day-summary-phase">${index===3?'수술 당일':`수술 ${3-index}일 전`}</span><svg class="medication-day-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></summary><div class="medication-day-content"><header class="medication-day-date"><div class="medication-day-photos">${medicines.map(m=>`<figure class="${m.id}"><img src="${m.photo}" alt="${m.name} 안약과 포장" width="76" height="84" loading="lazy"><figcaption>${m.name}</figcaption></figure>`).join('')}</div></header><div class="medication-day-doses">${slots.map(slot=>`<div class="medication-time-group" role="group" aria-label="${slot}"><h4 class="medication-time-title">${timeIcon(slot)}${slot}</h4><div class="medication-dose-grid">${medicines.filter(m=>m.slots.includes(slot)).map(m=>{const dose=doseKey(plan,date,m.id,m.slots.indexOf(slot));return `<div class="medication-dose-item"><label><span class="medication-dose-name"><i class="medication-dose-dot ${m.id}" aria-hidden="true"></i>${m.name}</span><input type="checkbox" data-cataract-dose="${dose}" ${store.checks[dose]===true?'checked':''} ${plan.archived?'disabled':''}></label><span class="medication-dose-feedback" data-dose-feedback role="status" aria-live="polite" hidden></span></div>`;}).join('')}</div></div>`).join('')}</div></div></details>`;
  }
  function renderPlanSummary(plan){
    return `<section class="medication-plan-summary"><header class="medication-summary-header"><h2><span class="medication-title-eye">${eyes[plan.eye]||'수술할 눈 미선택'}</span><span>백내장 수술 전</span></h2></header><div class="medication-summary-body"><dl><div><dt>수술일</dt><dd>${plan.surgeryDate.slice(0,4)}년 ${label(plan.surgeryDate)}</dd></div><div><dt>내원시간</dt><dd>${timeLabel(plan)||'미입력'}</dd></div></dl>${plan.archived?'<p class="medication-readonly-note">이전 수술 기록 · 조회 전용</p>':''}</div></section>`;
  }
  function renderProgressSteps(store){
    return dates(store.plan).map(date=>{
      let done=0,total=0;
      for(const m of medicines)for(let i=0;i<m.slots.length;i++){
        if(!dailySlots(store.plan,date).includes(m.slots[i]))continue;
        total++;if(store.checks[doseKey(store.plan,date,m.id,i)]===true)done++;
      }
      const state=done===total?'complete':done?'active':'pending';
      const text=state==='complete'?'완료':state==='active'?'진행 중':'대기';
      return `<div class="medication-progress-step" data-progress-date="${date}" data-state="${state}"><span class="medication-step-date">${Number(date.slice(5,7))}월 ${Number(date.slice(8))}일</span><progress max="${total}" value="${done}" aria-label="${label(date)} 안약 체크 ${done}/${total}회"></progress><small>${text} · ${done}/${total}</small></div>`;
    }).join('');
  }
  function renderMedicationProgress(store){
    const {done,total}=totals(store);
    return `<section class="medication-tracker-progress"><div class="medication-management-heading"><h3 class="medication-management-title">안약 스케줄 관리</h3><p id="medication-progress" role="status">${done} / ${total}회 완료</p></div><div id="medication-progress-bar" class="medication-progress-steps" role="group" aria-label="날짜별 안약 체크 진행 상황">${renderProgressSteps(store)}</div><div id="medication-complete-sticker" class="medication-complete-sticker" role="status" ${done===total&&total>0?'':'hidden'}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><strong>완료</strong><span>모든 체크를 마쳤어요</span></div></section>`;
  }
  function renderSchedule(){
    const store=read(),plan=store.plan;
    if(!plan)return `<section class="medication-empty"><h2>백내장 수술 전</h2><p>수술할 눈과 수술일을 입력하면 안약 사용 일정을 체크할 수 있습니다.</p><a class="primary-button" href="#/before/cataract">약 사용 일정 설정</a></section>`;
    return `<div class="medication-tracker${plan.archived?' is-archived':''}"><section class="medication-tracker-reference" aria-label="약 사용 안내"><p class="medication-oral-note">미리 받으신 안과 처방 <strong>먹는 약</strong>은 <strong>수술 후</strong>에 드셔야 합니다.</p></section><p class="medication-tracker-hint medication-check-intro">안약을 넣은 후 <span class="medication-check-phrase"><svg class="medication-check-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="#2d83f5" stroke="#2d83f5"/><path d="m7 12 3 3 7-7" stroke="#fff" stroke-width="2"/></svg>체크해</span> 주세요.</p>${renderPlanSummary(plan)}<p class="medication-tracker-hint">안약과 안약 사이에는 5분 이상 간격으로 넣어주세요.</p>${renderMedicationProgress(store)}${dates(plan).map((date,index)=>renderScheduleDay(plan,store,date,index)).join('')}${renderArrivalCard()}<aside class="medication-arrival-notices" aria-label="수술 당일 내원 시 주의사항"><p><strong>*수술실 입실까지 약 1시간 정도 대기시간이 있습니다.</strong></p><p><strong>*내원시간 이후 도착 시 수술 순서가 변경될 수 있습니다.</strong></p></aside><p class="medication-storage-note" id="medication-check-status" role="status">체크 기록은 현재 기기에만 저장됩니다.</p></div>`;
  }
  function showSavedToast(message='저장되었습니다.'){
    const toast=document.querySelector('#toast');
    clearTimeout(toastTimer);toast.textContent=message;toast.classList.add('visible');
    toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);
  }
  function showDoseFeedback(input){
    const feedback=input.closest?.('label')?.nextElementSibling;
    if(!feedback?.hasAttribute?.('data-dose-feedback'))return;
    clearTimeout(doseFeedbackTimers.get(feedback));
    feedback.textContent=input.checked?'저장 되었습니다.':'취소 되었습니다.';
    feedback.hidden=false;
    doseFeedbackTimers.set(feedback,setTimeout(()=>{feedback.hidden=true;doseFeedbackTimers.delete(feedback);},2500));
  }
  function saveAppointment(form){
    const status=form.querySelector?.('.appointment-status')||document.querySelector('#appointment-status'),plan=formPlan(form);
    if(!plan){status.textContent='수술할 눈, 올바른 날짜와 오전·오후, 시·분을 입력해 주세요.';return;}
    const store=read();
    const requestedId=form.dataset?.planId;
    plan.id=requestedId===undefined?(store.plan?.id||newPlanId()):store.plans.some(p=>p.id===requestedId)?requestedId:newPlanId();
    const previous=store.plans.find(p=>p.id===plan.id);
    if(previous?.archived){status.textContent='이전 수술 일정은 수정할 수 없습니다.';return;}
    plan.archived=false;
    if(previous?.eye==='pending'&&previous.surgeryDate===plan.surgeryDate){
      for(const date of dates(plan))for(const m of medicines)for(let i=0;i<m.slots.length;i++){
        const oldKey=doseKey(previous,date,m.id,i),newKey=doseKey(plan,date,m.id,i);
        if(store.checks[oldKey]===true&&!Object.hasOwn(store.checks,newKey))store.checks[newKey]=true;
      }
    }
    store.plan=plan;store.appointment={surgeryDate:plan.surgeryDate,period:plan.period,hour:plan.hour,minute:plan.minute};
    const existing=store.plans.findIndex(p=>p.id===plan.id);
    if(existing<0){store.plans.forEach(p=>p.archived=true);store.plans.push(plan);}else store.plans[existing]=plan;
    store.activeId=plan.id;
    if(!write(store)){status.textContent='기기에 저장하지 못했습니다. 다시 시도해 주세요.';return;}
    if(!form.dataset)form.dataset={};form.dataset.planId=plan.id;
    status.textContent='';showSavedToast();
    const panel=form.closest?.('.cataract-appointment-panel');
    if(panel){
      form.outerHTML=renderSavedCard(plan);
      for(const p of store.plans.filter(p=>p.archived)){
        const old=panel.querySelector(`[data-saved-plan="${p.id}"]`)||panel.querySelector(`form[data-plan-id="${p.id}"]`);
        if(old)old.outerHTML=renderSavedCard(p);
      }
      const add=panel.querySelector('[data-add-cataract-appointment]');
      add.textContent='+ 항목 추가';
    }
  }
  document.addEventListener('submit',event=>{
    if(!event.target.id?.startsWith('cataract-appointment-form'))return;
    event.preventDefault();saveAppointment(event.target);
  });
  document.addEventListener('change',event=>{
    const input=event.target;
    if(input.name==='surgeryDate'){
      const date=parseDate(input.value),display=input.closest('.medication-date-picker').querySelector('[data-date-display]');
      display.textContent=date?`${date.getFullYear()}년 ${label(input.value)}`:'달력에서 날짜를 선택하세요.';
      display.classList.toggle('is-empty',!date);
    }
    const appointmentForm=input.closest?.('form[data-cataract-appointment]');
    if(appointmentForm){appointmentForm.querySelector('.appointment-status').textContent='';return;}
    if(!input.matches?.('input[data-cataract-dose]'))return;
    const store=read(),allowed=new Set();
    if(!store.plan)return;
    if(store.plan.archived){input.checked=store.checks[input.dataset.cataractDose]===true;return;}
    for(const date of dates(store.plan))for(const m of medicines)for(let i=0;i<m.slots.length;i++)if(dailySlots(store.plan,date).includes(m.slots[i]))allowed.add(doseKey(store.plan,date,m.id,i));
    if(!allowed.has(input.dataset.cataractDose))return;
    store.checks[input.dataset.cataractDose]=input.checked;
    const status=document.querySelector('#medication-check-status');
    if(!write(store)){input.checked=!input.checked;status.textContent='기록을 저장하지 못했습니다. 다시 시도해 주세요.';return;}
    const {done,total}=totals(store);
    document.querySelector('#medication-progress').textContent=`${done} / ${total}회 완료`;
    document.querySelector('#medication-progress-bar').innerHTML=renderProgressSteps(store);
    document.querySelector('#medication-complete-sticker').hidden=!(total>0&&done===total);
    status.textContent='체크 기록은 현재 기기에만 저장됩니다.';
    showDoseFeedback(input);
  });
  function renderProfileLinks(){
    const {plans}=read();
    return plans.map(p=>`<a class="surgery-category-button${p.archived?' is-archived':''}" href="#/profile/cataract-before${plans.length>1?'?plan='+p.id:''}"><span class="profile-plan-copy"><strong class="profile-plan-eye">${eyes[p.eye]||'수술할 눈 미선택'}</strong><span class="profile-plan-description">백내장 수술 전 안약 스케줄 관리</span><small>수술예정일 ${p.surgeryDate.slice(0,4)}년 ${label(p.surgeryDate)}${timeLabel(p)?'<br>내원시간 '+timeLabel(p):''}</small></span><svg class="menu-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a>`).join('');
  }
  let pendingRecordAction=null;
  function recordHasChecks(store,id){
    return Object.entries(store.checks).some(([key,checked])=>checked===true&&(id==='legacy'?/^\d{4}-\d{2}-\d{2}:/.test(key):key.startsWith(id+':')));
  }
  function runRecordAction(type,button){
    if(type==='delete'){const remove=button;
      const store=read(),id=remove.dataset.deleteCataractAppointment;
      if(!store.plans.some(p=>p.id===id))return;
      store.plans=store.plans.filter(p=>p.id!==id);
      for(const check of Object.keys(store.checks))if(id==='legacy'?/^\d{4}-\d{2}-\d{2}:/.test(check):check.startsWith(id+':'))delete store.checks[check];
      store.plan=store.plans.find(p=>p.id===store.activeId)||store.plans[0]||null;
      store.activeId=store.plan?.id||'';store.appointment=cleanAppointment(store.plan);
      if(!write(store)){showSavedToast('삭제하지 못했습니다. 다시 시도해 주세요.');return;}
      const panel=remove.closest('.cataract-appointment-panel');
      remove.closest('.cataract-saved-card').remove();
      const add=panel.querySelector('[data-add-cataract-appointment]');
      const empty=!store.plans.length&&!panel.querySelector('form[data-cataract-appointment]');
      add.textContent=empty?'+ 수술일 생성':'+ 항목 추가';
      showSavedToast('삭제되었습니다.');return;
    }
    else{const edit=button;
      const plan=read().plans.find(p=>p.id===edit.dataset.editCataractAppointment);
      if(plan&&!plan.archived){const panel=edit.closest('.cataract-appointment-panel');edit.closest('.cataract-saved-card').outerHTML=renderSetupCard(plan);panel.querySelector(`form[data-plan-id="${plan.id}"] input`)?.focus({preventScroll:true});}
      return;
    }
  }
  function requestRecordAction(type,button){
    const id=type==='delete'?button.dataset.deleteCataractAppointment:button.dataset.editCataractAppointment;
    const store=read(),plan=store.plans.find(p=>p.id===id);
    if(!plan||(type==='edit'&&plan.archived))return;
    if(!recordHasChecks(store,id)){runRecordAction(type,button);return;}
    pendingRecordAction={type,button};
    const dialog=document.querySelector('#cataract-record-dialog');
    document.querySelector('#cataract-record-title').textContent=type==='delete'?'일정과 체크 기록을 삭제할까요?':'수술 정보를 수정할까요?';
    document.querySelector('#cataract-record-description').textContent=type==='delete'?'이 항목에는 체크한 약 사용 기록이 있습니다. 항목을 삭제하면 체크 기록도 함께 삭제됩니다.':'이 항목에는 체크한 약 사용 기록이 있습니다. 내정보와 약 사용법의 기록에도 반영됩니다.';
    document.querySelector('#cataract-record-confirm').textContent=type==='delete'?'삭제':'수정 계속';
    dialog.classList.toggle('is-delete',type==='delete');
    if(!dialog.open)dialog.showModal();
  }
  document.querySelector('#cataract-record-dialog')?.addEventListener?.('close',()=>{pendingRecordAction=null;});
  document.addEventListener('click',event=>{
    if(event.target.name==='surgeryDate'){
      try{event.target.showPicker?.();}catch{}
      return;
    }
    const minuteStep=event.target.closest?.('[data-minute-step]');
    if(minuteStep){
      const input=minuteStep.closest('.medication-minute-control').querySelector('input');
      stepArrivalMinute(input,Number(minuteStep.dataset.minuteStep));input.focus({preventScroll:true});return;
    }
    const choice=event.target.closest?.('[data-cataract-record-choice]');
    if(choice){const pending=pendingRecordAction;pendingRecordAction=null;document.querySelector('#cataract-record-dialog').close();if(choice.dataset.cataractRecordChoice==='confirm'&&pending&&pending.button.isConnected!==false)runRecordAction(pending.type,pending.button);return;}

    const close=event.target.closest?.('[data-close-cataract-appointment]');
    if(close){
      const form=close.closest('form[data-cataract-appointment]'),panel=form.closest('.cataract-appointment-panel');
      const original=read().plans.find(p=>p.id===form.dataset.planId);
      if(original)form.outerHTML=renderSavedCard(original);else form.remove();
      const add=panel.querySelector('[data-add-cataract-appointment]');
      add.textContent=!read().plans.length&&!panel.querySelector('form[data-cataract-appointment]')?'+ 수술일 생성':'+ 항목 추가';
      add.focus?.({preventScroll:true});return;
    }
    const remove=event.target.closest?.('[data-delete-cataract-appointment]');
    if(remove){requestRecordAction('delete',remove);return;}
    const edit=event.target.closest?.('[data-edit-cataract-appointment]');
    if(edit){requestRecordAction('edit',edit);return;}
    const button=event.target.closest?.('[data-add-cataract-appointment]');
    if(!button)return;
    const panel=button.closest('.cataract-appointment-panel'),store=read();
    if(store.plans.some(p=>!p.archived)){
      store.plans.forEach(p=>p.archived=true);
      if(!write(store)){showSavedToast('항목을 추가하지 못했습니다. 다시 시도해 주세요.');return;}
      for(const plan of store.plans){
        const old=panel.querySelector(`[data-saved-plan="${plan.id}"]`)||panel.querySelector(`form[data-plan-id="${plan.id}"]`);
        if(old)old.outerHTML=renderSavedCard(plan);
      }
    }
    const list=panel.querySelector('.cataract-appointment-cards');
    list.insertAdjacentHTML('beforeend',renderSetupCard(null));
    button.textContent='+ 항목 추가';
    list.lastElementChild.querySelector('input')?.focus({preventScroll:true});
    list.lastElementChild.scrollIntoView({block:'nearest',behavior:'smooth'});
  });
  window.CataractMedication={renderGuide,renderSchedule,renderSetup,renderArrivalCard,renderProfileLinks,hasSchedule:()=>!!read().plan};
})();

;
/* scripts/eye-drops-guide.js */
// Imported from https://jeileye.vercel.app/eye-drops.html?lang=ko.
window.clinicEyeDropsGuideHtml = "<svg class=\"eye-guide-symbols\" xmlns=\"http://www.w3.org/2000/svg\" aria-hidden=\"true\">\n    <symbol id=\"eye-guide-drop\" viewBox=\"0 0 32 32\"><path d=\"M16 3S8 12 8 19a8 8 0 0 0 16 0c0-7-8-16-8-16Z\"/><path d=\"M12 19c0 2.5 1.5 4 4 4\"/></symbol>\n    <symbol id=\"eye-guide-eye\" viewBox=\"0 0 32 32\"><path d=\"M3 16s5-7 13-7 13 7 13 7-5 7-13 7S3 16 3 16Z\"/><circle cx=\"16\" cy=\"16\" r=\"3.5\"/></symbol>\n    <symbol id=\"eye-guide-clock\" viewBox=\"0 0 32 32\"><circle cx=\"16\" cy=\"16\" r=\"11\"/><path d=\"M16 9v7l5 3\"/></symbol>\n    <symbol id=\"eye-guide-bottle\" viewBox=\"0 0 32 32\"><path d=\"M12 4h8v4l3 3v14a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3V11l3-3V4Z\"/><path d=\"M12 8h8M9 15h14M13 20h6\"/></symbol>\n    <symbol id=\"eye-guide-check\" viewBox=\"0 0 32 32\"><rect x=\"5\" y=\"5\" width=\"22\" height=\"22\" rx=\"3\"/><path d=\"m10 16 4 4 8-9\"/></symbol>\n    <symbol id=\"eye-guide-calendar\" viewBox=\"0 0 32 32\"><rect x=\"5\" y=\"7\" width=\"22\" height=\"20\" rx=\"2\"/><path d=\"M10 4v6M22 4v6M5 13h22M10 18h4M18 18h4M10 22h4\"/></symbol>\n    <symbol id=\"eye-guide-clean-hand\" viewBox=\"0 0 32 32\"><path d=\"M6 21h5V11a1.5 1.5 0 0 1 3 0v5-3a1.5 1.5 0 0 1 3 0v3-2a1.5 1.5 0 0 1 3 0v3-1a1.5 1.5 0 0 1 3 0v5c0 4-3 7-7 7h-3c-3 0-5-2-7-4Z\"/><path d=\"M7 3s-3 3-3 5a3 3 0 0 0 6 0C10 6 7 3 7 3Z M25 4v4m-2-2h4\"/></symbol>\n    <symbol id=\"eye-guide-no-contact\" viewBox=\"0 0 32 32\"><path d=\"M3 22s4-5 10-5c3 0 5 1 7 2m-17 3s4 5 10 5c3 0 5-1 7-2 M11 19a3 3 0 0 0 0 6 M19 5l4-2 5 9-4 2z M23 14l-1 2 M24 19l5 5m0-5-5 5\"/></symbol>\n    <symbol id=\"eye-guide-closed-eye\" viewBox=\"0 0 32 32\"><path d=\"M3 12c3 5 7 8 13 8s10-3 13-8 M7 16l-2 4m7-1-1 5m9-5 1 5m4-8 2 4\"/></symbol>\n    <symbol id=\"eye-guide-interval\" viewBox=\"0 0 32 32\"><circle cx=\"19\" cy=\"11\" r=\"7\"/><path d=\"M19 7v4l3 2 M4 21h7v7H4z M6 17h3v4 M15 24h10 M22 21l3 3-3 3\"/></symbol>\n    <symbol id=\"eye-guide-ointment\" viewBox=\"0 0 32 32\"><path d=\"M4 6h7v4l2 2v8H4v-8l2-2V6 M6 3h3v3 M18 8h9l-2 12h-5L18 8z M20 20h5v4h-5z M16 26h12 M14 15h3\"/></symbol>\n    <symbol id=\"eye-guide-shake\" viewBox=\"0 0 32 32\"><path d=\"M12 5h8v4l2 2v13a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V11l2-2V5z M12 9h8 M12 17h8 M5 11C3 14 3 19 5 22 M27 11c2 3 2 8 0 11 M3 13l2-2 2 2 M25 20l2 2 2-2\"/></symbol>\n    <symbol id=\"eye-guide-both-eyes\" viewBox=\"0 0 32 32\"><path d=\"M2 14s3-4 7-4 7 4 7 4-3 4-7 4-7-4-7-4z M16 14s3-4 7-4 7 4 7 4-3 4-7 4-7-4-7-4z M9 13v2 M23 13v2 M5 23v4h4 M20 27v-4h3a1.5 1.5 0 0 1 0 3h-3m2 0 2 1\"/></symbol>\n    <symbol id=\"eye-guide-expiry\" viewBox=\"0 0 32 32\"><path d=\"M5 5h9v4l2 2v14H3V11l2-2V5z M5 9h9 M4 16h11 M21 4v3 M27 4v3 M18 8h11v17H18z M18 12h11 M21 16h2 M25 16h1 M21 20h2\"/></symbol>\n    <symbol id=\"eye-guide-no-share\" viewBox=\"0 0 32 32\"><circle cx=\"16\" cy=\"16\" r=\"12\"/><path d=\"M7.5 7.5l17 17 M7 21c0-2 1-3 3-3 M10 11a2.5 2.5 0 1 0 0 5 M25 21c0-2-1-3-3-3 M22 11a2.5 2.5 0 1 1 0 5 M14 13h4v10h-4z M15 10h2v3\"/></symbol>\n  </svg>\n<div class=\"container eye-guide-content\">\n    <section class=\"eye-guide-section\" id=\"eye-method\" aria-labelledby=\"eye-method-title\">\n      <div class=\"eye-guide-heading\"><span>01</span><h2 id=\"eye-method-title\">올바른 안약 점안 방법</h2></div>\n      <p class=\"eye-guide-lead\">많이 넣기보다 <strong>한 번에 한 방울</strong></p>\n      <ol class=\"eye-guide-list eye-guide-steps\">\n        <li><span class=\"eye-guide-icon\"><svg aria-hidden=\"true\"><use href=\"#eye-guide-clean-hand\"></use></svg></span><div><h3>손을 씻고 한 방울 점안하기</h3><p>손을 씻은 뒤 아래 눈꺼풀을 살짝 당겨 안쪽 공간에 한 방울을 넣어주세요.</p></div></li>\n        <li><span class=\"eye-guide-icon\"><svg aria-hidden=\"true\"><use href=\"#eye-guide-no-contact\"></use></svg></span><div><h3>용기 끝이 눈에 닿지 않게</h3><p>오염을 막기 위해 용기 끝이 눈·눈꺼풀·속눈썹이나 손에 닿지 않도록 해주세요.</p></div></li>\n        <li><span class=\"eye-guide-icon\"><svg aria-hidden=\"true\"><use href=\"#eye-guide-closed-eye\"></use></svg></span><div><h3>점안 후 눈을 가볍게 감기</h3><p>눈을 세게 감거나 반복해서 깜빡이지 말고 편안하게 감아주세요.</p></div></li>\n      </ol>\n    </section>\n    <section class=\"eye-guide-section\" id=\"eye-interval\" aria-labelledby=\"eye-interval-title\">\n      <div class=\"eye-guide-heading\"><span>02</span><h2 id=\"eye-interval-title\">여러 안약을 동시에 사용시</h2></div>\n      <p class=\"eye-guide-lead\">서로 다른 안약 사이에는 일반적으로 <strong>5분 간격</strong>을 둡니다.</p>\n      <ul class=\"eye-guide-list\">\n        <li><span class=\"eye-guide-icon\"><svg aria-hidden=\"true\"><use href=\"#eye-guide-interval\"></use></svg></span><div><h3>서로 다른 점안액</h3><p>같은 눈에 여러 종류를 넣을 때에는 일반적으로 각 안약 사이에 5분 간격을 둡니다.</p></div></li>\n        <li><span class=\"eye-guide-icon\"><svg aria-hidden=\"true\"><use href=\"#eye-guide-ointment\"></use></svg></span><div><h3>점안액과 안연고를 함께 사용시</h3><p>점안액을 먼저 넣고 5분 이상 지난 뒤 안연고를 사용합니다.</p></div></li>\n        <li><span class=\"eye-guide-icon\"><svg aria-hidden=\"true\"><use href=\"#eye-guide-shake\"></use></svg></span><div><h3>흔들어 사용해야 하는 안약</h3><p>제품 안내를 확인하고 흔들어야 하는 안약은 사용 전에 충분히 흔들어주세요.</p></div></li>\n      </ul>\n      <p class=\"eye-guide-priority\">제품별 사용법이나 의료진이 지정한 순서가 있다면 해당 안내를 우선 따라주세요.</p>\n    </section>\n    <section class=\"eye-guide-section\" id=\"eye-check\" aria-labelledby=\"eye-check-title\">\n      <div class=\"eye-guide-heading\"><span>03</span><h2 id=\"eye-check-title\">사용 전 확인사항</h2></div>\n      <p class=\"eye-guide-lead\">뚜껑 색보다 <strong>약 이름과 넣는 눈</strong>을 확인하세요.</p>\n      <ul class=\"eye-guide-list\">\n        <li><span class=\"eye-guide-icon\"><svg aria-hidden=\"true\"><use href=\"#eye-guide-both-eyes\"></use></svg></span><div><h3>오른쪽·왼쪽·양쪽 구분</h3><p>처방받은 눈을 확인하고 필요하면 약 봉투나 별도 표에 표시해 두세요.</p></div></li>\n        <li><span class=\"eye-guide-icon\"><svg aria-hidden=\"true\"><use href=\"#eye-guide-calendar\"></use></svg></span><div><h3>하루 횟수와 점안 시간 기록</h3><p>여러 약을 쓴다면 일정표로 중복하거나 빠뜨린 점안이 없는지 확인하세요.</p></div></li>\n        <li><span class=\"eye-guide-icon\"><svg aria-hidden=\"true\"><use href=\"#eye-guide-expiry\"></use></svg></span><div><h3>개봉일과 사용기한 확인</h3><p>제품별 개봉 후 사용기한과 보관 방법을 확인하고 지켜주세요.</p></div></li>\n        <li><span class=\"eye-guide-icon\"><svg aria-hidden=\"true\"><use href=\"#eye-guide-no-share\"></use></svg></span><div><h3>다른 사람과 함께 사용하지 않기</h3><p>겉모습이 비슷해도 성분과 사용 목적이 다를 수 있으므로 함께 사용하지 마세요.</p></div></li>\n      </ul>\n      <p class=\"eye-guide-priority\">남은 안약은 증상만 보고 임의로 다시 사용하지 마세요.</p>\n      <p class=\"eye-guide-sources\">참고: <a href=\"https://www.aao.org/eye-health/treatments/how-to-put-in-eye-drops\" target=\"_blank\" rel=\"noopener noreferrer\">미국안과학회 안약 점안 안내</a> · <a href=\"https://www.moorfields.nhs.uk/mediaLocal/i21m3rba/how-to-use-your-eye-drops.pdf\" target=\"_blank\" rel=\"noopener noreferrer\">Moorfields 안약 사용 안내</a></p>\n    </section>\n  </div>";

;
/* app.js */
'use strict';
const $ = selector => document.querySelector(selector);
const icons = {
  home: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7"/>',
  hospital: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 7h6m-3-3v6m-3 4h1m4 0h1m-6 3h1m4 0h1"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h2m4 0h2m-8 3h2"/>',
  before: '<rect x="5" y="4" width="14" height="17" rx="3"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="m9 13 2 2 4-4"/>',
  after: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  lens: '<ellipse cx="12" cy="8" rx="9" ry="4"/><path d="M3 8c0 7 4 12 9 12s9-5 9-12"/><path d="M6 9c1.5 1.3 3.6 2 6 2"/>',
  faq: '<path d="M21 11a9 9 0 0 1-9 9H4l-1 1v-9a9 9 0 1 1 18-1Z"/><path d="M10 8a2 2 0 0 1 4 0c0 2-2 2-2 4m0 3h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  chat: '<path d="M21 11a9 9 0 0 1-9 9H6l-4 2 1-6a9 9 0 1 1 18-5Z"/><path d="M8 11h.01m4 0h.01m4 0h.01"/>',
  phone: '<path d="m6 3 4 4-2 3a16 16 0 0 0 6 6l3-2 4 4-2 3C10 22 2 14 3 5Z"/>',
  arrow: '<path d="m9 5 7 7-7 7"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>'
};
const icon = (name, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.lens}</svg>`;
const translations = {
  '홈메뉴':['Home','首页'], '스케줄':['Schedule','日程'],
  '홈 메뉴':['Home menu','首页菜单'], '수술자 안약 스케줄':['Surgery eye drop schedule','手术用药日程'],
  '홈':['Home','首页'], '내정보':['My info','我的信息'], '언어선택':['Language','语言'], '문의':['Contact','咨询'],
  '병원 이용 안내':['Hospital guide','就诊指南'], '원장별 진료 일정':['Doctor schedules','医生出诊安排'],
  '수술 전':['Before surgery','术前指南'], '수술 후':['After surgery','术后指南'], '드림렌즈':['Dream lenses','角膜塑形镜'],
  'FAQ 자주묻는 질문':['Frequently asked questions','常见问题'], '진료시간과 내원 안내를 확인하세요':['Hours and visit information','查看门诊时间与就诊须知'],
  '방문 전 의료진의 일정을 살펴보세요':['Plan your visit with your doctor','就诊前查看医生安排'],
  '검사와 수술 전, 차근차근 준비해요':['Get ready for your examination and surgery','为检查和手术做好准备'],
  '수술 후 필요한 안내를 확인하세요':['Find your aftercare information','查看术后护理指南'],
  '렌즈 상담부터 사용 안내까지':['Consultation and lens care guides','咨询与镜片使用指南'],
  '궁금한 내용을 빠르게 찾아보세요':['Find answers to your questions','快速查找问题答案'],
  '이전':['Back','返回'], '앱 설치 안내':['Install app','安装应用'], '문의하기':['Contact us','联系我们'],
  '편한 방법으로 연세제일안과에 문의하세요.':['Choose how to contact our clinic.','请选择联系方式。'],
  '카카오톡 상담':['KakaoTalk','KakaoTalk 咨询'], '채팅으로 문의하기':['Chat with our clinic','在线咨询'],
  '네이버 예약':['Naver booking','Naver 预约'], '예약 페이지로 이동':['Open booking page','前往预约页面'],
  '전화 상담':['Call our clinic','电话咨询'], '닫기':['Close','关闭'], '검색 결과가 없습니다.':['No results found.','未找到结果。'],
  '필요한 안내를 한곳에':['Your guide, in one place','所需指南，一站查看'],
  '연세제일안과와 함께하는':['Here with Yonsei Jeil Eye Clinic','延世第一眼科与您同行'],
  '더 편안한 눈 건강 관리':['Care for a clearer tomorrow','让眼健康管理更轻松'],
  '방문 전부터 진료 후까지, 필요한 메뉴를 선택해 주세요.':['Before and after your visit, choose a guide below.','从就诊前到就诊后，请选择所需菜单。'],
  '당신의 눈을 위한 바른 진료':['Care for your eyes','用心守护您的眼健康'],
  '언어를 선택해 주세요.':['Choose your language.','请选择语言。'],
  '기본 메뉴와 화면 안내의 언어를 변경합니다. 병원 원문 안내는 한국어로 제공됩니다.':['Changes menus and basic navigation. Original clinic information is provided in Korean.','更改菜单和基本导航语言。医院原始指南以韩语提供。']
};
let language = 'ko';
try { language = ['ko','en','zh'].includes(localStorage.getItem('clinic-language')) ? localStorage.getItem('clinic-language') : 'ko'; } catch {}
const t = value => language === 'ko' ? value : translations[value]?.[language === 'en' ? 0 : 1] || value;
const menus = [
  ['guide','hospital','병원 이용 안내','진료시간과 내원 안내를 확인하세요'],
  ['schedule','calendar','원장별 진료 일정','방문 전 의료진의 일정을 살펴보세요'],
  ['before','before','수술 전','검사와 수술 전, 차근차근 준비해요'],
  ['after','after','수술 후','수술 후 필요한 안내를 확인하세요'],
  ['dream','lens','드림렌즈','렌즈 상담부터 사용 안내까지'],
  ['faq','faq','FAQ 자주묻는 질문','궁금한 내용을 빠르게 찾아보세요']
];
const main = $('#main');
let currentRoute = '';
let calendarMonth = new Date(new Date().toLocaleString('en-US', {timeZone:'Asia/Seoul'}));
let selectedDate = new Date(calendarMonth);
const todayKey = date => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
let scheduleData = { doctors: [], schedules: [], closures: [] };
let scheduleState = 'idle';
let scheduleDoctor = '';
let scheduleLoadedAt = 0;
let scheduleRequest;
let scheduleGeneration = 0;
let scheduleAccessToastTimer;
function hasSurgerySchedule() { return window.CataractMedication?.hasSchedule() === true; }
function showScheduleAccessNotice() {
  const toast = $('#toast');
  if (scheduleAccessToastTimer) clearTimeout(scheduleAccessToastTimer);
  toast.textContent = '수술일을 생성한 후 이용할 수 있습니다.';
  toast.classList?.add('visible');
  scheduleAccessToastTimer = setTimeout(() => { toast.classList?.remove('visible'); scheduleAccessToastTimer = null; }, 2600);
}
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const scheduleDateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const faqs = [
  ['예약은 어떻게 하나요?','하단 가운데 문의 버튼을 누르면 네이버 예약, 카카오톡 상담, 전화 상담을 선택할 수 있습니다.'],
  ['병원 진료시간이 궁금해요.','평일 08:30~19:00, 토요일 08:30~17:00입니다. 점심시간은 12:30~14:00입니다. 공휴일 및 원장별 일정은 방문 전 병원에 확인해 주세요.'],
  ['원장별 진료 일정은 어디에서 확인하나요?','홈 화면의 원장별 진료 일정 메뉴에서 날짜와 원장을 선택하면 홈페이지와 동일한 진료 및 휴진 일정을 확인할 수 있습니다.'],
  ['수술 일정 변경은 어떻게 하나요?','기존 시력교정 안내에 따라 예약 변경은 최소 하루 전에 병원으로 연락해 주세요. 시력교정수술센터 전화는 064-727-2703입니다.'],
  ['휴대폰에 앱으로 설치할 수 있나요?','홈 화면 아래 앱 설치 안내를 눌러 주세요. 아이폰은 Safari의 공유 메뉴에서, 안드로이드는 브라우저 메뉴에서 홈 화면에 추가할 수 있습니다.'],
  ['내 진료 정보가 보이지 않아요.','현재 버전은 병원 안내용 앱입니다. 로그인, 예약 내역, 개인 진료 정보는 아직 연결되어 있지 않습니다.']
];
function accordion(title, body) { return `<details class="accordion"><summary>${title}${icon('arrow')}</summary><div class="accordion-body">${body}</div></details>`; }
function pageTop(title, description) { return `<div class="page-top"><p class="eyebrow">YONSEI JEIL EYE CLINIC</p><h1>${t(title)}</h1><p class="page-description">${t(description)}</p></div>`; }
function clinicPhone(){const phone=window.clinicContent?.settings?.phone;return /^[+\d\s()-]{5,30}$/.test(phone||'')?phone:'064-727-2700';}
function callButton() { const phone=clinicPhone();return `<a class="primary-button" href="tel:${phone.replace(/[^\d+]/g,'')}">${icon('phone')}${escapeHtml(phone)}</a>`; }
function safeContentUrl(value){if(/^assets\/[\w./-]+$/.test(value||'')&&!value.includes('..'))return value;try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}}
function contentImage(url){const safe=safeContentUrl(url);return safe?`<img class="managed-image" src="${escapeHtml(safe)}" alt="" loading="lazy">`:'';}
function managedPage(key){
  const content=window.clinicContent;if(!content||content.status==='disabled')return null;
  const menu=menus.find(row=>row[0]===key);let html=pageTop(menu[2],menu[3]);
  if(content.status!=='ready')return html+`<section class="card"><p>${content.status==='loading'?'안내를 불러오는 중입니다.':'안내를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'}</p></section>`;
  const pages=content.pages.filter(row=>row.page_key===key);
  html+=pages.map(row=>accordion(escapeHtml(row.title),contentImage(row.image_url)+`<div class="managed-text">${escapeHtml(row.content)}</div>`)).join('');
  if(!pages.length)html+='<section class="card"><p>상세 안내를 준비 중입니다.</p></section>';
  if(key==='guide'){
    html+=`<section class="card"><h2>병원 진료시간</h2><dl class="hours">${content.hours.map(row=>`<div><dt>${escapeHtml({weekday:'월 ~ 금요일',saturday:'토요일',holiday:'공휴일',substitute:'대체공휴일',lunch:'점심시간'}[row.id]||row.id)}</dt><dd>${formatClinicTime(row.start_time)} ~ ${formatClinicTime(row.end_time)}</dd></div>`).join('')}</dl></section>`;
    html+=content.profiles.map(row=>{const doctor=content.doctors.find(d=>String(d.id)===String(row.doctor_id));return accordion(escapeHtml(doctor?.name||'의료진 소개'),contentImage(row.profile_photo_url||doctor?.photo_url)+`<div class="managed-text">${escapeHtml(row.greeting||'')}</div>`+[['약력',row.career],['학회활동',row.activities],['진료분야',row.specialties]].map(([label,list])=>Array.isArray(list)&&list.length?`<h3>${label}</h3><ul>${list.map(value=>`<li>${escapeHtml(value)}</li>`).join('')}</ul>`:'').join(''));}).join('');
    if(content.equipment.length)html+='<section class="card"><h2>보유장비</h2>'+content.equipment.map(row=>accordion(escapeHtml(row.title),contentImage(row.image_url)+`<div class="managed-text">${escapeHtml(row.description||'')}</div>`)).join('')+'</section>';
  }
  return html;
}
function activeFaqs(){const content=window.clinicContent;return !content||content.status==='disabled'?faqs:content.status==='ready'?content.pages.filter(row=>row.page_key==='faq').map(row=>[row.title,row.content]):[];}
function blogPage(){const content=window.clinicContent;return pageTop('병원 블로그','병원이 전하는 눈 건강 이야기')+(content?.status==='ready'?content.blog.map(row=>accordion(escapeHtml(row.title),`<p class="note">${escapeHtml(row.post_date)}</p>`+contentImage(row.image_url)+`<div class="managed-text">${escapeHtml(row.content)}</div>`+(safeContentUrl(row.source_url)?`<a class="text-button" href="${escapeHtml(safeContentUrl(row.source_url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.source||'출처 보기')} ↗</a>`:''))).join(''):'<section class="card"><p>블로그를 불러오는 중입니다.</p></section>');}
function home() {
  return `<div class="menu-list">${menus.map(([id,name,title]) => `<a class="menu-bar" href="#/${id}"><span class="menu-icon">${icon(name)}</span><span class="menu-copy"><span class="menu-title">${t(title)}</span></span>${icon('arrow','menu-arrow')}</a>`).join('')}</div>`;
}
function guide() {
  return window.ClinicGuide.render(window.clinicContent,scheduleData,scheduleState);
}
function schedule() {
  return `<div class="guide-sticky-header schedule-sticky-header"><header class="guide-topbar"><a class="guide-home-logo" href="#/" aria-label="연세제일안과 홈"><img src="${escapeHtml(safeContentUrl(window.clinicContent?.settings?.logo_url)||'assets/logo.svg')}" alt="연세제일안과" width="140" height="25"></a><h1>${t('원장별 진료 일정')}</h1></header></div><section class="schedule-calendar-card"><div class="calendar-head"><button class="icon-button" data-month="-1" aria-label="이전 달">${icon('back')}</button><strong id="month-label"></strong><button class="icon-button" data-month="1" aria-label="다음 달">${icon('arrow')}</button></div><div class="doctor-filters" id="doctor-filters" role="group" aria-label="원장별 일정 필터"></div><div class="calendar-key"><span><i class="legend-full"></i>종일 진료(5시/7시)</span><span><i class="legend-morning"></i>오전 진료</span></div><p class="schedule-select-hint">날짜를 선택하세요.</p><div class="calendar" id="calendar" aria-label="날짜 선택"></div><p class="schedule-calendar-notice">휴진 일정은 최대한 신속히 안내드리고 있으나, 갑작스러운 사정으로 변경될 수 있으니 내원전 다시 한번 확인 부탁드립니다.</p></section><section class="schedule-day-panel"><p class="section-label">선택한 날짜의 일정</p><h2 id="selected-label"></h2><div id="schedule-detail" aria-live="polite"></div></section><section class="schedule-hours-panel"><h2>병원 진료시간</h2><dl class="schedule-hours-list" id="schedule-hours"></dl></section>`;
}
function scheduleOptions() {
  const button = (id,label,cls='',style='') => `<button type="button" class="doctor-filter ${cls}" style="${style}" data-schedule-doctor="${escapeHtml(id)}" aria-pressed="${scheduleDoctor===id}">${escapeHtml(label)}</button>`;
  return '<div class="schedule-filter-status">' + button('','전체','all-filter') + button('__closed','휴진','closure-filter') + '</div><div class="schedule-filter-doctors">' + scheduleData.doctors.map(doctor=>button(doctor.id,doctor.name.replace(/\s*원장\s*$/,''),'',`--doctor-color:${doctorColor(doctor)}`)).join('') + '</div>';
}
async function loadSchedules(force = false) {
  if (scheduleRequest) return scheduleRequest;
  if (!force && scheduleState === 'ready' && Date.now() - scheduleLoadedAt < 60000) return;
  scheduleState = 'loading';
  if (currentRoute === 'schedule') calendar();
  const generation = scheduleGeneration;
  scheduleRequest = (async () => {
    try {
      const data = await window.loadDoctorScheduleData();
      if (generation !== scheduleGeneration) return;
      scheduleData = data;
      scheduleState = 'ready'; scheduleLoadedAt = Date.now();
      if (scheduleDoctor && scheduleDoctor !== '__closed' && !scheduleData.doctors.some(doctor => doctor.id === scheduleDoctor)) scheduleDoctor = '';
    } catch {
      if (generation !== scheduleGeneration) return;
      scheduleState = 'error';
      scheduleData = { doctors: [], schedules: [], closures: [] };
    } finally {
      if (generation === scheduleGeneration) {
        scheduleRequest = null;
        if (currentRoute === 'schedule') calendar();
        else if (currentRoute === 'guide' && window.ClinicGuide?.active === 'director') render();
      }
    }
  })();
  return scheduleRequest;
}
function doctorColor(doctor) {
  const colors = {blue:'#2d83f5',amber:'#c48a25',teal:'#22a396',purple:'#9070c8'};
  return /^#[0-9a-f]{6}$/i.test(doctor?.color || '') ? doctor.color : colors[doctor?.color] || colors.blue;
}
function selectedSchedule(date) {
  const filter = scheduleDoctor === '__closed' ? '' : scheduleDoctor;
  return { entries: scheduleDoctor === '__closed' ? [] : window.ClinicSchedule.entries(scheduleData,date,filter), closures: window.ClinicSchedule.closuresOn(scheduleData,date,filter) };
}
function renderScheduleDetail() {
  const detail = $('#schedule-detail');
  if (scheduleState !== 'ready') {
    const failed = scheduleState === 'error';
    detail.innerHTML = `<div class="empty">${icon('calendar')}<h2>${failed?'일정을 불러오지 못했습니다':'원장 일정을 불러오는 중입니다'}</h2><p>${failed?'인터넷 연결을 확인한 후 다시 시도해 주세요.':'잠시만 기다려 주세요.'}</p>${failed?'<button class="primary-button" data-schedule-retry>다시 불러오기</button>':''}</div>`;
    return;
  }
  const date = scheduleDateKey(selectedDate), day = selectedSchedule(date);
  const doctorById = id => scheduleData.doctors.find(doctor => doctor.id === id);
  const heading = (doctor,closed,label) => {
    const photo = safeContentUrl(doctor?.photoUrl) || 'assets/doctor-placeholder.svg';
    return `<div class="schedule-doctor"><img class="schedule-portrait" src="${escapeHtml(photo)}" alt="" style="--doctor-color:${doctorColor(doctor)}"><strong>${escapeHtml((doctor?.name || '의료진').replace(/\s*원장\s*$/,''))}</strong><span class="doctor-title">원장</span><span class="period-tag ${closed?'closed-tag':label==='오전'?'morning-tag':''}">${label}</span></div>`;
  };
  detail.innerHTML = day.closures.map(closure => `<article class="schedule-entry">${heading(doctorById(closure.doctorId),true,'휴진')}<p class="schedule-time closure-time"><span>| 휴진일 |</span> <strong>${formatClosureDates(closure)}</strong></p></article>`).join('') + day.entries.map(entry => {
    const work = window.ClinicSchedule.workHours(entry,date);
    return `<article class="schedule-entry">${heading(doctorById(entry.doctorId),false,work.label)}<p class="schedule-time"><span>| 진료시간 |</span> <strong>${work.hours.split(' ~ ').map(formatClinicTime).join(' ~ ')}</strong></p></article>`;
  }).join('');
  const holiday = window.holidayData?.dates?.[date];
  if (holiday) detail.innerHTML = `<p class="holiday-notice">${escapeHtml(holiday)}${holiday.includes('대체공휴일')?' · 정상 진료':''}</p>` + detail.innerHTML;
  if (!day.closures.length && !day.entries.length) detail.innerHTML += `<div class="empty"><p>${!scheduleData.doctors.length?'등록된 원장 정보가 없습니다.':scheduleDoctor==='__closed'?'선택한 날짜에는 휴진 일정이 없습니다.':'등록된 일정이 없습니다.<br>일정 미등록은 휴진을 의미하지 않습니다.'}</p></div>`;
}
function formatClinicTime(value) {
  const [hour,minute] = String(value).split(':').map(Number);
  return `${hour<12?'오전':'오후'} ${hour%12||12}:${String(minute).padStart(2,'0')}`;
}
function formatClosureDates(closure) {
  const parse = value => value.split('-').map(Number);
  const a=parse(closure.startDate),b=parse(closure.endDate),week=['일','월','화','수','목','금','토'];
  const label = parts => `${parts[2]}일(${week[new Date(parts[0],parts[1]-1,parts[2]).getDay()]})`;
  const prefix = `${a[0]}년 ${a[1]}월 `;
  if(closure.startDate===closure.endDate)return prefix+label(a);
  const endPrefix=a[0]!==b[0]?`${b[0]}년 ${b[1]}월 `:a[1]!==b[1]?`${b[1]}월 `:'';
  const duration=Math.round((Date.UTC(b[0],b[1]-1,b[2])-Date.UTC(a[0],a[1]-1,a[2]))/86400000)+1;
  return `${prefix}${label(a)} ~ ${endPrefix}${label(b)} <small>${duration}일간</small>`;
}
function renderScheduleHours() {
  const rows=[['weekday','월 ~ 금요일','08:30','19:00'],['saturday','토요일','08:30','17:00'],['holiday','공휴일','08:30','13:00'],['substitute','대체공휴일','08:30','19:00'],['lunch','점심시간','12:30','14:00']];
  $('#schedule-hours').innerHTML=rows.map(([id,label,start,end])=>{
    const stored=scheduleData.clinicHours?.find(row=>row.id===id);
    const valid=value=>/^\d{2}:\d{2}(:\d{2})?$/.test(value||'');
    if(valid(stored?.start_time)&&valid(stored?.end_time)){start=stored.start_time;end=stored.end_time;}
    return `<div class="hours-${id}"><dt>${label}${id==='holiday'?'<small>오전진료</small>':''}</dt><dd>${formatClinicTime(start)} ~ ${formatClinicTime(end)}</dd></div>`;
  }).join('');
}
function calendar() {
  const year = calendarMonth.getFullYear(), month = calendarMonth.getMonth();
  $('#doctor-filters').innerHTML = scheduleOptions();
  renderScheduleHours();
  $('#month-label').textContent = new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : language === 'zh' ? 'zh-CN' : 'en-US',{year:'numeric',month:'long'}).format(calendarMonth);
  const weekdays = language === 'en' ? ['S','M','T','W','T','F','S'] : language === 'zh' ? ['日','一','二','三','四','五','六'] : ['일','월','화','수','목','금','토'];
  let html = `<div class="calendar-weekdays">${weekdays.map(day => `<span class="weekday">${day}</span>`).join('')}</div>`;
  const firstDay=new Date(year,month,1).getDay(),days=new Date(year,month+1,0).getDate();
  const weeks=Math.ceil((firstDay+days)/7),start=scheduleDateKey(new Date(year,month,1)),end=scheduleDateKey(new Date(year,month+1,0));
  const monthClosures=scheduleState==='ready'?scheduleData.closures.filter(row=>row.startDate<=end&&row.endDate>=start&&(!scheduleDoctor||scheduleDoctor==='__closed'||row.doctorId===scheduleDoctor)):[];
  const segments=monthClosures.map(closure=>{
    const from=closure.startDate<start?1:Number(closure.startDate.slice(-2)),to=closure.endDate>end?days:Number(closure.endDate.slice(-2));
    const list=[];
    for(let week=0;week<weeks;week++){
      const weekStart=week*7-firstDay+1,a=Math.max(weekStart,from),b=Math.min(weekStart+6,to);
      if(a<=b)list.push({week,start:a-weekStart+1,end:b-weekStart+1,from:a,to:b});
    }
    const longest=list.reduce((best,row)=>!best||row.end-row.start>best.end-best.start?row:best,null);
    return {closure,list,longest};
  });
  for(let week=0;week<weeks;week++){
    const weekStart=week*7-firstDay+1;
    let cells='';
    for(let column=0;column<7;column++){
    const day=weekStart+column;
    if(day<1||day>days){cells+=`<span class="calendar-outside" aria-hidden="true">${new Date(year,month,day).getDate()}</span>`;continue;}
    const date = new Date(year,month,day), selected = todayKey(date) === todayKey(selectedDate);
    const isToday = todayKey(date) === todayKey(new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Seoul'})));
    const key = scheduleDateKey(date);
    const state = scheduleState==='ready' ? selectedSchedule(key) : {entries:[],closures:[]};
    const dots = state.entries.map(entry=>{
      const morning=window.ClinicSchedule.workHours(entry,key).label==='오전';
      return `<i class="${morning?'morning-dot':'full-dot'}" style="--doctor-color:${doctorColor(scheduleData.doctors.find(doctor=>doctor.id===entry.doctorId))}"></i>`;
    }).join('');
    const holiday = window.holidayData?.dates?.[key];
    cells += `<button data-day="${day}" class="${date.getDay()===0 || holiday?'sun':date.getDay()===6?'sat':''} ${selected?'selected':''} ${isToday?'today':''}" ${isToday?'aria-current="date"':''} aria-label="${year}년 ${month+1}월 ${day}일${holiday?' '+escapeHtml(holiday):''}${state.entries.length?' 진료 '+state.entries.length+'명':''}${state.closures.length?' 휴진 '+state.closures.length+'명':''}" aria-pressed="${selected}">${isToday?'<small class="today-label">오늘</small>':''}<span class="day-number">${day}</span><span class="day-dots" aria-hidden="true">${dots}</span></button>`;
    }
    const lanes=[];let bands='';
    for(const segment of segments){
      const part=segment.list.find(row=>row.week===week);if(!part)continue;
      let lane=lanes.findIndex(list=>list.every(row=>row.end<part.start||row.start>part.end));
      if(lane<0){lane=lanes.length;lanes.push([]);}lanes[lane].push(part);
      const closure=segment.closure,doctor=scheduleData.doctors.find(row=>row.id===closure.doctorId);
      const label=`(휴)${doctor?.name||closure.doctorName} ${Number(closure.startDate.slice(5,7))}.${Number(closure.startDate.slice(8))}~${closure.startDate.slice(0,7)===closure.endDate.slice(0,7)?'':Number(closure.endDate.slice(5,7))+'.'}${Number(closure.endDate.slice(8))}`;
      const description=`${doctor?.name||closure.doctorName} 휴진 ${closure.startDate} ~ ${closure.endDate}`;
      bands+=`<button class="closure-band ${part.from===Number(closure.startDate.slice(8))?'band-start':''} ${part.to===Number(closure.endDate.slice(8))?'band-end':''}" style="grid-column:${part.start}/${part.end+1};grid-row:${lane+2}" data-day="${part.from}" aria-label="${escapeHtml(description)}" title="${escapeHtml(description)}">${segment.longest===part?escapeHtml(label):'&nbsp;'}</button>`;
    }
    html+=`<div class="calendar-week">${cells}${bands}</div>`;
  }
  $('#calendar').innerHTML = html;
  $('#selected-label').textContent = new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : language === 'zh' ? 'zh-CN' : 'en-US',{month:'long',day:'numeric',weekday:'short'}).format(selectedDate);
  renderScheduleDetail();
}
const surgeryCategories=[['vision','시력교정'],['cataract','백내장'],['glaucoma','녹내장'],['retina','망막']];
function surgeryMenu(stage) {
  const title=stage==='before'?'수술 전':'수술 후';
  const prompt=stage==='before'?'수술예정인 질환을 선택하세요.':'수술하신 질환을 선택하세요.';
  return emptyMenuPage(title)+'<p class="surgery-category-prompt">'+t(prompt)+'</p><div class="surgery-category-list">'+surgeryCategories.map(([id,label])=>
    '<a class="surgery-category-button" href="#/'+stage+'/'+id+'"><span>'+t(label)+'</span>'+icon('arrow','menu-arrow')+'</a>'
  ).join('')+'</div>';
}
const cataractPreopSections=[['precautions','수술 전 주의사항'],['medication','수술 전 약 사용법']];
function surgeryDetail(stage,categoryId,sectionId) {
  const category=surgeryCategories.find(([id])=>id===categoryId);
  if(!category)return surgeryMenu(stage);
  const title=stage==='before'?'수술 전':'수술 후';
  if(stage==='before'&&categoryId==='cataract'){
    const section=cataractPreopSections.find(([id])=>id===sectionId);
    if(section){
      const nav='<nav class="cataract-detail-nav" aria-label="백내장 수술 전 안내">'+cataractPreopSections.map(([id,label])=>'<a href="#/before/cataract/'+id+'"'+(id===sectionId?' aria-current="page"':'')+'>'+t(id==='precautions'?'주의사항':label)+'</a>').join('')+'</nav>';
      return emptyMenuPage(title,nav)+'<section class="surgery-detail-page"><a class="surgery-detail-back" href="#/before/cataract">'+icon('back')+'백내장 목록</a><h2>'+t(sectionId==='precautions'?'백내장 수술 전 주의사항':'백내장 수술 전 약 사용법')+'</h2>'+(sectionId==='precautions'?window.renderCataractPrecautions():window.CataractMedication.renderGuide())+'</section>';
    }
    return emptyMenuPage(title)+'<section class="surgery-detail-page"><a class="surgery-detail-back" href="#/before">'+icon('back')+'수술 전 목록</a><h2>백내장 수술 전</h2><div class="surgery-category-list cataract-menu-bars">'+cataractPreopSections.map(([id,label])=>'<a class="surgery-category-button" href="#/before/cataract/'+id+'"><span>'+t(id==='precautions'?'주의사항':label)+'</span>'+icon('arrow','menu-arrow')+'</a>').join('')+'</div><aside class="cataract-arrival-notice" aria-label="내원 시 주의사항"><p>*수술실 입실까지 약 1시간 정도 대기시간이 있습니다.</p><p>*내원시간 이후 도착 시 수술 순서가 변경될 수 있습니다.</p></aside>'+window.CataractMedication.renderSetup()+'</section>';
  }
  return emptyMenuPage(title)+'<section class="surgery-detail-page"><a class="surgery-detail-back" href="#/'+stage+'">'+icon('back')+t(title)+' 목록</a>'+(stage==='before'&&categoryId==='vision'?'':'<h2>'+t(category[1])+'</h2>')+(stage==='before'&&categoryId==='vision'?'<div class="surgery-vision-before">'+window.clinicVisionBeforeHtml+'</div>':'')+'</section>';
}
function before() { return surgeryMenu('before'); }
function after() { return surgeryMenu('after'); }
function emptyMenuPage(title,subnav='') {
  return `<div class="guide-sticky-header"><header class="guide-topbar"><a class="guide-home-logo" href="#/" aria-label="연세제일안과 홈"><img src="${escapeHtml(safeContentUrl(window.clinicContent?.settings?.logo_url)||'assets/logo.svg')}" alt="연세제일안과" width="140" height="25"></a><h1>${t(title)}</h1></header>${subnav}</div>`;
}
function dream() { return emptyMenuPage(menus[4][2]); }
function faq() { return emptyMenuPage(menus[5][2]); }
function eyeDropsGuide() {
  const fromMedication=location.hash.includes('from=medication'),plan=location.hash.match(/[?&]plan=([a-z0-9-]+)/)?.[1];
  const back=fromMedication?'#/before/cataract/medication':'#/profile/cataract-before'+(plan?'?plan='+plan:'');
  const nav='<nav class="eye-drops-nav" aria-label="올바른 안약 사용 목차">'+[['eye-method','점안 방법'],['eye-interval','여러 안약 사용 시'],['eye-check','사용 전 확인']].map(([id,title],i)=>'<button type="button" data-eye-guide-target="'+id+'"'+(i===0?' aria-current="location"':'')+'>'+title+'</button>').join('')+'</nav>';
  return emptyMenuPage('올바른 안약 사용',nav)+'<section class="eye-drops-page"><a class="surgery-detail-back" href="'+back+'">'+icon('back')+'이전 화면</a>'+window.clinicEyeDropsGuideHtml+'</section>';
}
function profile() {
  const section=location.hash.replace(/^#\/?/,'').split('?')[0].split('/')[1];
  const header=emptyMenuPage('내정보');
  if(section==='cataract-before')return header+window.CataractMedication.renderSchedule();
  if(section==='cataract-after')return header+'<section class="surgery-detail-page"><h2>백내장 수술 후</h2></section>';
  return header+'<div class="surgery-category-list">'+window.CataractMedication.renderProfileLinks()+'</div>';
}
function resetNavigationState() {
  if (scheduleAccessToastTimer) clearTimeout(scheduleAccessToastTimer);
  scheduleAccessToastTimer = null;
  window.ClinicGuide?.select('support');
  calendarMonth = new Date(new Date().toLocaleString('en-US', {timeZone:'Asia/Seoul'}));
  selectedDate = new Date(calendarMonth);
  scheduleDoctor = '';
  scheduleData = {doctors:[],schedules:[],closures:[]};
  scheduleState = 'idle';
  scheduleLoadedAt = 0;
  scheduleGeneration++;
  scheduleRequest = null;
  currentRoute = '';
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  const toast = $('#toast');
  toast.classList?.remove('visible');
  toast.textContent = '';
}
function goHome() {
  resetNavigationState();
  if (window.history?.replaceState) {
    window.history.replaceState(null, '', '#/');
    render(true);
  } else if (location.hash !== '#/') location.hash = '#/';
  else render(true);
}
function render(focus = false) {
  const [route,categoryId,sectionId] = location.hash.replace(/^#\/?/,'').split('?')[0].split('/');
  if (route === 'profile' && !hasSurgerySchedule()) {
    if (window.history?.replaceState) window.history.replaceState(null, '', '#/');
    else location.hash = '#/';
    render(true);
    showScheduleAccessNotice();
    return;
  }
  if (!route && currentRoute) resetNavigationState();
  currentRoute = route;
  const pages = {guide,schedule,before,after,dream,faq,profile,blog:blogPage,'eye-drops':eyeDropsGuide};
  const openGuideDetails=route==='guide'?Array.from(main.querySelectorAll?.('details[data-guide-detail][open]')||[]).map(node=>node.dataset.guideDetail):[];
  main.innerHTML = (['before','after'].includes(route)&&categoryId?surgeryDetail(route,categoryId,sectionId):(pages[route] || home)());
  if(openGuideDetails.length)for(const node of main.querySelectorAll('details[data-guide-detail]'))if(openGuideDetails.includes(node.dataset.guideDetail))node.open=true;
  main.className = route === 'schedule' ? 'schedule-view' : route === 'guide' ? 'guide-view' : ['before','after','dream','faq','profile','eye-drops'].includes(route) ? 'plain-menu-view' : 'home-view';
  const settings=window.clinicContent?.settings||{};
  const headerLogo=$('.app-header img');
  if(settings.logo_url&&safeContentUrl(settings.logo_url))headerLogo.src=safeContentUrl(settings.logo_url);
  if(settings.clinic_name)headerLogo.alt=settings.clinic_name;
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
  document.title = `${t(menus.find(item => item[0] === route)?.[2] || (route === 'profile' ? '내정보' : route === 'eye-drops' ? '올바른 안약 사용' : '홈'))} · 연세제일안과`;
  if(['before','after'].includes(route)&&categoryId){const category=surgeryCategories.find(([id])=>id===categoryId);if(category)document.title=t(category[1])+' · '+document.title;}
  if(settings.clinic_name)document.title=document.title.replace('연세제일안과',settings.clinic_name);
  $('#header-language').innerHTML = [['ko','KR','한국어'],['en','EN','English'],['zh','CN','简体中文']].map(([id,label,name])=>`<button type="button" data-language="${id}" lang="${id}" aria-label="${name}" aria-pressed="${language===id}">${label}</button>`).join('<span aria-hidden="true">|</span>');
  $('#bottom-nav').innerHTML = `<a class="nav-item ${!route?'active':''}" ${!route?'aria-current="page"':''} href="#/">${icon('home')}<span>${t('홈메뉴')}</span></a><span class="nav-divider" aria-hidden="true">|</span><button class="nav-item contact-nav-item" data-action="contact" aria-haspopup="dialog" aria-controls="contact-dialog">${icon('chat')}<span>${t('문의')}</span></button><span class="nav-divider" aria-hidden="true">|</span><a class="nav-item schedule-nav-item ${route==='profile'?'active':''}" ${route==='profile'?'aria-current="page"':''} href="#/profile">${icon('calendar')}<span>${t('수술자 안약 스케줄')}</span></a>`;
  if (route === 'schedule') { calendar(); loadSchedules(); }
  if (route === 'guide' && window.ClinicGuide.active === 'director' && ['idle','ready'].includes(scheduleState)) loadSchedules();
  if (focus) { window.scrollTo(0,0); main.focus({preventScroll:true}); }
}
function sheetHeader(title, id) { return `<div class="sheet-header"><h2 id="${id}">${t(title)}</h2><button class="icon-button" data-close aria-label="${t('닫기')}">${icon('close')}</button></div>`; }
function openSheet(kind) {
  if (kind === 'install') { window.ClinicInstall.open(); return; }
  const dialog = $(`#${kind}-dialog`);
  if (kind === 'veterans') dialog.innerHTML = window.ClinicGuide.veterans();
  if (kind === 'contact') dialog.innerHTML = sheetHeader('문의하기','contact-title') + `<p>${t('편한 방법으로 연세제일안과에 문의하세요.')}</p><a class="contact-option" href="https://pf.kakao.com/_mRjtn/chat" target="_blank" rel="noopener noreferrer"><span class="channel kakao">${icon('chat')}</span><span><strong>${t('카카오톡 상담')}</strong><small>${t('채팅으로 문의하기')}</small></span>${icon('arrow','menu-arrow')}</a><a class="contact-option" href="https://m.booking.naver.com/booking/13/bizes/1336750?theme=place&lang=ko&area=pll" target="_blank" rel="noopener noreferrer"><span class="channel naver">N</span><span><strong>${t('네이버 예약')}</strong><small>${t('예약 페이지로 이동')}</small></span>${icon('arrow','menu-arrow')}</a><a class="contact-option" href="tel:0647272700"><span class="channel phone">${icon('phone')}</span><span><strong>${t('전화 상담')}</strong><small>064-727-2700</small></span>${icon('arrow','menu-arrow')}</a>`;
  if (kind === 'language') dialog.innerHTML = sheetHeader('언어선택','language-title') + `<p>${t('언어를 선택해 주세요.')}<br>${t('기본 메뉴와 화면 안내의 언어를 변경합니다. 병원 원문 안내는 한국어로 제공됩니다.')}</p>${[['ko','한국어','Korean'],['en','English','영어'],['zh','简体中文','중국어']].map(([id,label,desc])=>`<button class="language-option ${language===id?'selected':''}" data-language="${id}" lang="${id}" aria-pressed="${language===id}"><span>${label} <small>· ${desc}</small></span>${language===id?icon('check'):''}</button>`).join('')}`;
  if(kind==='contact'){
    const settings=window.clinicContent?.settings||{},links=dialog.querySelectorAll('a');
    if(safeContentUrl(settings.kakao_url))links[0].href=safeContentUrl(settings.kakao_url);
    if(safeContentUrl(settings.naver_url))links[1].href=safeContentUrl(settings.naver_url);
    links[2].href='tel:'+clinicPhone().replace(/[^\d+]/g,'');links[2].querySelector('small').textContent=clinicPhone();
  }
  dialog.showModal();
}
document.addEventListener('click',async event=>{
  const button = event.target.closest('[href="#/"],[href^="#/profile"],[data-action],[data-close],[data-language],[data-month],[data-day],[data-schedule-retry],[data-schedule-doctor],[data-guide-tab],[data-guide-gallery],[data-guide-retry],[data-eye-guide-target]');
  if (!button) return;
  if (button.getAttribute?.('href')?.startsWith('#/profile') && !hasSurgerySchedule()) {
    event.preventDefault();showScheduleAccessNotice();return;
  }
  if (button.getAttribute?.('href') === '#/' && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && (event.button == null || event.button === 0)) {
    event.preventDefault();goHome();return;
  }
  if (button.dataset.eyeGuideTarget) {
    const target=button.dataset.eyeGuideTarget;
    if(!['eye-method','eye-interval','eye-check'].includes(target))return;
    $('#'+target).scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    document.querySelectorAll('[data-eye-guide-target]').forEach(node=>{if(node===button)node.setAttribute('aria-current','location');else node.removeAttribute('aria-current');});return;
  }
  if (button.dataset.guideTab) {
    window.ClinicGuide.select(button.dataset.guideTab);render();
    $(`#guide-tab-${window.ClinicGuide.active}`).focus({preventScroll:true});
    $(`#guide-tab-${window.ClinicGuide.active}`).scrollIntoView({block:'nearest',inline:'nearest'});
    $('#guide-sticky-header').scrollIntoView({block:'start'});return;
  }
  if (button.hasAttribute('data-guide-retry')) { window.reloadClinicContent?.();return; }
  if (button.hasAttribute('data-guide-gallery')) {
    const gallery=$(`#guide-gallery-${button.dataset.guideGallery}`);
    gallery.scrollBy({left:Number(button.dataset.direction)*(gallery.clientWidth*.9+12),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});return;
  }
  if (button.dataset.action) openSheet(button.dataset.action);
  if (button.hasAttribute('data-close')) button.closest('dialog').close();
  if (button.dataset.language) { language = button.dataset.language; try { localStorage.setItem('clinic-language',language); } catch {} $('#language-dialog').close();render(); }
  if (button.hasAttribute('data-schedule-retry')) loadSchedules(true);
  if (button.hasAttribute('data-schedule-doctor')) { scheduleDoctor=button.dataset.scheduleDoctor;calendar(); }
  if (button.dataset.month) { calendarMonth = new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+Number(button.dataset.month),1);selectedDate = new Date(calendarMonth);calendar(); }
  if (button.dataset.day) { selectedDate = new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),Number(button.dataset.day));calendar(); $('.schedule-day-panel').scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}); }
});
document.addEventListener('change',event=>{if(event.target.id==='doctor') { scheduleDoctor=event.target.value; calendar(); }});
document.addEventListener('keydown',event=>{
  const tab=event.target.closest?.('[data-guide-tab]');
  if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const tabs=window.ClinicGuide.tabs,index=tabs.findIndex(([id])=>id===tab.dataset.guideTab);
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  window.ClinicGuide.select(tabs[next][0]);render();$(`#guide-tab-${tabs[next][0]}`).focus({preventScroll:true});$(`#guide-tab-${tabs[next][0]}`).scrollIntoView({block:'nearest',inline:'nearest'});
});
document.addEventListener('error',event=>{if(event.target.matches?.('.schedule-portrait')&&!event.target.src.endsWith('/assets/doctor-placeholder.svg'))event.target.src='assets/doctor-placeholder.svg';},true);
document.addEventListener('input',event=>{
  if(event.target.id!=='faq-search')return;
  const query=event.target.value.trim().toLocaleLowerCase();
  const matches=activeFaqs().filter(item=>item.join(' ').toLocaleLowerCase().includes(query));
  $('#faq-list').innerHTML=matches.length?matches.map(([q,a])=>accordion(escapeHtml(q),escapeHtml(a))).join(''):`<p class="faq-empty">${t('검색 결과가 없습니다.')}</p>`;
});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{
  if(event.target!==dialog)return;
  const bounds=dialog.getBoundingClientRect();
  if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();
}));
window.addEventListener('hashchange',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());render(true);});
window.addEventListener('clinic-content-updated',()=>render());
window.addEventListener('offline',()=>{const toast=$('#toast');toast.textContent='오프라인입니다. 저장된 안내 화면을 표시합니다. 외부 문의 연결은 인터넷이 필요합니다.';toast.classList.add('visible');setTimeout(()=>toast.classList.remove('visible'),5000);});
if('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('./sw.js').catch(()=>console.warn('오프라인 기능을 시작하지 못했습니다.'));
render();

;