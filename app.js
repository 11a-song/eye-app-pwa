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
  return `<section class="home-intro"><h1>${t('연세제일안과와 함께하는')}<br><em>${t('더 편안한 눈 건강 관리')}</em></h1></section><div class="menu-list">${menus.map(([id,name,title]) => `<a class="menu-bar" href="#/${id}"><span class="menu-icon">${icon(name)}</span><span class="menu-copy"><span class="menu-title">${t(title)}</span></span></a>`).join('')}</div><div class="home-foot"><span>${t('당신의 눈을 위한 바른 진료')}</span><button class="text-button" data-action="install">${icon('download')}${t('앱 설치 안내')}</button></div>`;
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
  scheduleRequest = (async () => {
    try {
      scheduleData = await window.loadDoctorScheduleData();
      scheduleState = 'ready'; scheduleLoadedAt = Date.now();
      if (scheduleDoctor && scheduleDoctor !== '__closed' && !scheduleData.doctors.some(doctor => doctor.id === scheduleDoctor)) scheduleDoctor = '';
    } catch {
      scheduleState = 'error';
      scheduleData = { doctors: [], schedules: [], closures: [] };
    } finally {
      scheduleRequest = null;
      if (currentRoute === 'schedule') calendar();
      else if (currentRoute === 'guide' && window.ClinicGuide?.active === 'director') render();
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
    if(section)return emptyMenuPage(title)+'<section class="surgery-detail-page"><a class="surgery-detail-back" href="#/before/cataract">'+icon('back')+'백내장 목록</a><h2>'+t(section[1])+'</h2>'+(sectionId==='precautions'?window.renderCataractPrecautions():'')+'</section>';
    return emptyMenuPage(title)+'<section class="surgery-detail-page"><a class="surgery-detail-back" href="#/before">'+icon('back')+'수술 전 목록</a><h2>백내장</h2><div class="surgery-category-list">'+cataractPreopSections.map(([id,label])=>'<a class="surgery-category-button" href="#/before/cataract/'+id+'"><span>'+t(label)+'</span>'+icon('arrow','menu-arrow')+'</a>').join('')+'</div></section>';
  }
  return emptyMenuPage(title)+'<section class="surgery-detail-page"><a class="surgery-detail-back" href="#/'+stage+'">'+icon('back')+t(title)+' 목록</a>'+(stage==='before'&&categoryId==='vision'?'':'<h2>'+t(category[1])+'</h2>')+(stage==='before'&&categoryId==='vision'?'<div class="surgery-vision-before">'+window.clinicVisionBeforeHtml+'</div>':'')+'</section>';
}
function before() { return surgeryMenu('before'); }
function after() { return surgeryMenu('after'); }
function emptyMenuPage(title) {
  return `<div class="guide-sticky-header"><header class="guide-topbar"><a class="guide-home-logo" href="#/" aria-label="연세제일안과 홈"><img src="${escapeHtml(safeContentUrl(window.clinicContent?.settings?.logo_url)||'assets/logo.svg')}" alt="연세제일안과" width="140" height="25"></a><h1>${t(title)}</h1></header></div>`;
}
function dream() { return emptyMenuPage(menus[4][2]); }
function faq() { return emptyMenuPage(menus[5][2]); }
function profile() { return pageTop('내정보','나의 진료 안내를 확인하는 공간입니다.') + `<section class="card empty"><div class="profile-icon">${icon('user')}</div><h2>내 진료 정보를 만날 공간</h2><p>로그인 및 개인 진료 정보 연동을 준비 중입니다.<br>현재는 병원 안내 메뉴를 이용해 주세요.</p><a class="primary-button" href="#/">홈으로 돌아가기</a></section><section class="card"><h2>예약 확인이 필요하신가요?</h2><p>네이버에서 예약하신 내역은 네이버 예약 페이지에서 확인할 수 있습니다.</p><button class="primary-button" data-action="contact">${t('문의하기')}</button></section>`; }
function render(focus = false) {
  const [route,categoryId,sectionId] = location.hash.replace(/^#\/?/,'').split('?')[0].split('/');
  currentRoute = route;
  const pages = {guide,schedule,before,after,dream,faq,profile,blog:blogPage};
  const openGuideDetails=route==='guide'?Array.from(main.querySelectorAll?.('details[data-guide-detail][open]')||[]).map(node=>node.dataset.guideDetail):[];
  main.innerHTML = (['before','after'].includes(route)&&categoryId?surgeryDetail(route,categoryId,sectionId):(pages[route] || home)()) + (route === 'profile' ? '<a class="admin-login-link" href="admin.html">병원 관리자 로그인</a>' : '');
  if(openGuideDetails.length)for(const node of main.querySelectorAll('details[data-guide-detail]'))if(openGuideDetails.includes(node.dataset.guideDetail))node.open=true;
  main.className = route === 'schedule' ? 'schedule-view' : route === 'guide' ? 'guide-view' : ['before','after','dream','faq'].includes(route) ? 'plain-menu-view' : '';
  const settings=window.clinicContent?.settings||{};
  const headerLogo=$('.app-header img');
  if(settings.logo_url&&safeContentUrl(settings.logo_url))headerLogo.src=safeContentUrl(settings.logo_url);
  if(settings.clinic_name)headerLogo.alt=settings.clinic_name;
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : language;
  document.title = `${t(menus.find(item => item[0] === route)?.[2] || (route === 'profile' ? '내정보' : '홈'))} · 연세제일안과`;
  if(['before','after'].includes(route)&&categoryId){const category=surgeryCategories.find(([id])=>id===categoryId);if(category)document.title=t(category[1])+' · '+document.title;}
  if(settings.clinic_name)document.title=document.title.replace('연세제일안과',settings.clinic_name);
  $('#header-language').innerHTML = [['ko','KR','한국어'],['en','EN','English'],['zh','CN','简体中文']].map(([id,label,name])=>`<button type="button" data-language="${id}" lang="${id}" aria-label="${name}" aria-pressed="${language===id}">${label}</button>`).join('<span aria-hidden="true">|</span>');
  $('#bottom-nav').innerHTML = `<a class="nav-item ${!route?'active':''}" ${!route?'aria-current="page"':''} href="#/">${icon('home')}<span>${t('홈')}</span></a><button class="nav-item contact-trigger" data-action="contact" aria-haspopup="dialog" aria-controls="contact-dialog"><span class="contact-orb">${icon('chat')}</span><span>${t('문의')}</span></button><a class="nav-item ${route==='profile'?'active':''}" ${route==='profile'?'aria-current="page"':''} href="#/profile">${icon('user')}<span>${t('내정보')}</span></a>`;
  if (route === 'schedule') { calendar(); loadSchedules(); }
  if (route === 'guide' && window.ClinicGuide.active === 'director' && ['idle','ready'].includes(scheduleState)) loadSchedules();
  if (focus) { window.scrollTo(0,0); main.focus({preventScroll:true}); }
}
function sheetHeader(title, id) { return `<div class="sheet-header"><h2 id="${id}">${t(title)}</h2><button class="icon-button" data-close aria-label="${t('닫기')}">${icon('close')}</button></div>`; }
let deferredInstall;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;});
function openSheet(kind) {
  const dialog = $(`#${kind}-dialog`);
  if (kind === 'veterans') dialog.innerHTML = window.ClinicGuide.veterans();
  if (kind === 'contact') dialog.innerHTML = sheetHeader('문의하기','contact-title') + `<p>${t('편한 방법으로 연세제일안과에 문의하세요.')}</p><a class="contact-option" href="https://pf.kakao.com/_mRjtn/chat" target="_blank" rel="noopener noreferrer"><span class="channel kakao">${icon('chat')}</span><span><strong>${t('카카오톡 상담')}</strong><small>${t('채팅으로 문의하기')}</small></span>${icon('arrow','menu-arrow')}</a><a class="contact-option" href="https://m.booking.naver.com/booking/13/bizes/1336750?theme=place&lang=ko&area=pll" target="_blank" rel="noopener noreferrer"><span class="channel naver">N</span><span><strong>${t('네이버 예약')}</strong><small>${t('예약 페이지로 이동')}</small></span>${icon('arrow','menu-arrow')}</a><a class="contact-option" href="tel:0647272700"><span class="channel phone">${icon('phone')}</span><span><strong>${t('전화 상담')}</strong><small>064-727-2700</small></span>${icon('arrow','menu-arrow')}</a>`;
  if (kind === 'language') dialog.innerHTML = sheetHeader('언어선택','language-title') + `<p>${t('언어를 선택해 주세요.')}<br>${t('기본 메뉴와 화면 안내의 언어를 변경합니다. 병원 원문 안내는 한국어로 제공됩니다.')}</p>${[['ko','한국어','Korean'],['en','English','영어'],['zh','简体中文','중국어']].map(([id,label,desc])=>`<button class="language-option ${language===id?'selected':''}" data-language="${id}" lang="${id}" aria-pressed="${language===id}"><span>${label} <small>· ${desc}</small></span>${language===id?icon('check'):''}</button>`).join('')}`;
  if (kind === 'install') dialog.innerHTML = sheetHeader('앱 설치 안내','install-title') + `<p>홈 화면에서 연세제일안과를 바로 만나보세요.</p><section class="card blue-card"><h3>아이폰 · iPad</h3><p>Safari에서 앱 주소를 연 뒤 공유 버튼 → <strong>홈 화면에 추가</strong>를 선택해 주세요.</p><h3>안드로이드</h3><p>Chrome 메뉴 → <strong>앱 설치</strong> 또는 <strong>홈 화면에 추가</strong>를 선택해 주세요.</p></section><p>실제 휴대폰 설치에는 HTTPS로 배포된 주소가 필요합니다.</p>${deferredInstall?'<button class="primary-button" data-install>지금 설치하기</button>':''}`;
  if(kind==='contact'){
    const settings=window.clinicContent?.settings||{},links=dialog.querySelectorAll('a');
    if(safeContentUrl(settings.kakao_url))links[0].href=safeContentUrl(settings.kakao_url);
    if(safeContentUrl(settings.naver_url))links[1].href=safeContentUrl(settings.naver_url);
    links[2].href='tel:'+clinicPhone().replace(/[^\d+]/g,'');links[2].querySelector('small').textContent=clinicPhone();
  }
  dialog.showModal();
}
document.addEventListener('click',async event=>{
  const button = event.target.closest('[data-action],[data-close],[data-language],[data-month],[data-day],[data-install],[data-schedule-retry],[data-schedule-doctor],[data-guide-tab],[data-guide-gallery],[data-guide-retry]');
  if (!button) return;
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
  if (button.hasAttribute('data-install') && deferredInstall) { const prompt = deferredInstall; deferredInstall=null;await prompt.prompt();await prompt.userChoice;$('#install-dialog').close(); }
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
