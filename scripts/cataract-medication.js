(function(){
  'use strict';
  const KEY='jeileye-cataract-preop-v1';
  let toastTimer;
  const eyes={left:'왼쪽 눈',right:'오른쪽 눈',both:'양쪽 눈'};
  const periods={am:'오전',pm:'오후'};
  const medicines=[
    {id:'moxitra',name:'목시트라',type:'항생제',photo:'assets/medicines/moxitra.jpg',slots:['아침','점심','저녁','주무시기 전']},
    {id:'bronac',name:'브로낙',type:'소염제',photo:'assets/medicines/bronac.jpg',slots:['아침','저녁']}
  ];
  const pad=n=>String(n).padStart(2,'0');
  const key=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  function parseDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
    const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d,12);
    return key(date)===value?date:null;
  }
  function validPlan(plan){return !!(plan&&Object.hasOwn(eyes,plan.eye)&&parseDate(plan.surgeryDate)&&(!plan.period||Object.hasOwn(periods,plan.period)));}
  function read(){
    try{const value=JSON.parse(localStorage.getItem(KEY)||'null');return {plan:validPlan(value?.plan)?value.plan:null,checks:value?.checks&&typeof value.checks==='object'&&!Array.isArray(value.checks)?value.checks:{}};}catch{return {plan:null,checks:{}};}
  }
  function write(value){try{localStorage.setItem(KEY,JSON.stringify(value));return true;}catch{return false;}}
  function dates(plan){
    const surgery=parseDate(plan.surgeryDate);
    return [3,2,1,0].map(offset=>{const date=new Date(surgery);date.setDate(date.getDate()-offset);return key(date);});
  }
  const label=value=>{const d=parseDate(value);return `${d.getMonth()+1}월 ${d.getDate()}일`;};
  const doseKey=(plan,date,medicine,slot)=>[plan.surgeryDate,plan.eye,date,medicine,slot].join(':');
  function formPlan(form){
    const number=name=>Number(form.elements.namedItem(name).value);
    const surgeryDate=`${number('year')}-${pad(number('month'))}-${pad(number('day'))}`;
    const plan={eye:form.elements.namedItem('eye').value,surgeryDate,period:form.elements.namedItem('period').value};
    return validPlan(plan)&&Object.hasOwn(periods,plan.period)?plan:null;
  }
  function renderGuide(){
    const {plan}=read(),date=plan?parseDate(plan.surgeryDate):null;
    const year=date?date.getFullYear():Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Seoul'}).format(new Date()));
    return `<div class="medication-guide"><p class="medication-intro"><strong>수술 3일 전부터</strong> 병원에서 미리 처방해드린 안약을 <strong>수술할 눈</strong>에 넣어주세요.</p><form id="cataract-medication-form"><fieldset class="medication-eye"><legend>수술할 눈을 선택하세요.</legend>${Object.entries(eyes).map(([id,title])=>`<label><input type="radio" name="eye" value="${id}" required ${plan?.eye===id?'checked':''}><span>${title}</span></label>`).join('')}</fieldset><div class="medication-date"><label for="cataract-month">수술 예정일</label><div class="medication-date-fields"><label><input name="year" type="number" min="2000" max="2100" value="${year}" required inputmode="numeric" aria-label="수술 연도"><span>년</span></label><label><input id="cataract-month" name="month" type="number" min="1" max="12" value="${date?date.getMonth()+1:''}" placeholder="월" required inputmode="numeric" aria-label="수술 월"><span>월</span></label><label><input name="day" type="number" min="1" max="31" value="${date?date.getDate():''}" placeholder="일" required inputmode="numeric" aria-label="수술 일"><span>일</span></label></div><fieldset class="medication-period"><legend>수술 시간</legend>${Object.entries(periods).map(([id,title])=>`<label><input type="radio" name="period" value="${id}" required ${plan?.period===id?'checked':''}><span>${title}</span></label>`).join('')}</fieldset><p id="medication-date-preview" aria-live="polite">${plan?`${label(dates(plan)[0])}부터 ${label(plan.surgeryDate)} 수술 당일까지 사용`:'수술일을 입력하면 안약 사용 시작일을 알려드려요.'}</p><button class="primary-button" type="submit">내정보에 일정 저장</button><p id="medication-form-status" class="medication-storage-note" role="status">일정과 체크 기록은 현재 기기에 저장됩니다.</p></div><div class="medication-products">${medicines.map(m=>`<article class="medication-product ${m.id}"><img src="${m.photo}" alt="${m.name} 안약과 포장" width="220" height="220"><h3>${m.name}</h3><span class="medication-type">${m.type}</span><strong>하루 ${m.slots.length}번</strong><p>${m.slots.join(' / ')}</p></article>`).join('')}</div><p class="medication-interval">겹치는 시간대(아침, 저녁)에는 <strong>순서와 상관없이 5분 이상 간격</strong>을 두고 넣어주세요.</p><p class="medication-oral-note">미리 받으신 안과 처방 <strong>먹는 약</strong>은 <strong>수술 후</strong>에 드셔야 합니다.</p></form></div>`;
  }
  function totals(store){
    if(!store.plan)return {done:0,total:0};
    let done=0,total=0;
    for(const date of dates(store.plan))for(const m of medicines)for(let i=0;i<m.slots.length;i++){total++;if(store.checks[doseKey(store.plan,date,m.id,i)]===true)done++;}
    return {done,total};
  }
  function renderScheduleDay(plan,store,date,index){
    const slots=['아침','점심','저녁','주무시기 전'];
    return `<section class="medication-day"><header class="medication-day-date"><h3>${label(date)}</h3><small class="medication-day-weekday">${['일요일','월요일','화요일','수요일','목요일','금요일','토요일'][parseDate(date).getDay()]}</small><span>${index===3?'수술 당일':`수술 ${3-index}일 전`}</span></header><div class="medication-day-doses">${slots.map(slot=>`<fieldset class="medication-time-group"><legend>${slot}</legend><div class="medication-dose-grid">${medicines.filter(m=>m.slots.includes(slot)).map(m=>{const dose=doseKey(plan,date,m.id,m.slots.indexOf(slot));return `<label><span>${m.name}</span><input type="checkbox" data-cataract-dose="${dose}" ${store.checks[dose]===true?'checked':''}></label>`;}).join('')}</div></fieldset>`).join('')}</div></section>`;
  }
  function renderSchedule(){
    const store=read(),plan=store.plan;
    if(!plan)return `<section class="medication-empty"><h2>백내장 수술 전</h2><p>수술할 눈과 수술일을 입력하면 안약 사용 일정을 체크할 수 있습니다.</p><a class="primary-button" href="#/before/cataract/medication">약 사용 일정 설정</a></section>`;
    const {done,total}=totals(store);
    return `<div class="medication-tracker"><section class="medication-plan-summary"><span class="medication-plan-eye">${eyes[plan.eye]}</span><h2>백내장 수술 전</h2><p>수술일 ${label(plan.surgeryDate)}${periods[plan.period]?' '+periods[plan.period]:''} · ${plan.surgeryDate.slice(0,4)}년</p><a href="#/before/cataract/medication">수술일·수술할 눈 수정 →</a><p id="medication-progress" role="status">${done} / ${total}회 완료</p><progress id="medication-progress-bar" max="${total}" value="${done}" aria-label="안약 사용 완료 횟수"></progress></section><section class="medication-tracker-reference" aria-label="약 사용 안내"><p class="medication-oral-note">미리 받으신 안과 처방 <strong>먹는 약</strong>은 <strong>수술 후</strong>에 드셔야 합니다.</p><div class="medication-products">${medicines.map(m=>`<article class="medication-product ${m.id}"><img src="${m.photo}" alt="${m.name} 안약과 포장" width="220" height="220"><h3>${m.name}</h3></article>`).join('')}</div></section><p class="medication-tracker-hint">안약을 넣은 후 체크해 주세요.<br>아침·저녁에는 두 안약을 5분 이상 간격으로 사용하세요.</p>${dates(plan).map((date,index)=>renderScheduleDay(plan,store,date,index)).join('')}<p class="medication-storage-note" id="medication-check-status" role="status">체크 기록은 현재 기기에 저장됩니다.</p></div>`;
  }
  document.addEventListener('submit',event=>{
    if(event.target.id!=='cataract-medication-form')return;
    event.preventDefault();
    const status=document.querySelector('#medication-form-status'),plan=formPlan(event.target);
    if(!plan){status.textContent='수술할 눈, 올바른 날짜와 오전·오후를 선택해 주세요.';return;}
    const store=read();store.plan=plan;
    if(!write(store)){status.textContent='기기에 저장하지 못했습니다. 브라우저의 저장 설정을 확인해 주세요.';return;}
    const toast=document.querySelector('#toast');
    clearTimeout(toastTimer);toast.textContent='저장되었습니다.';toast.classList.add('visible');
    toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);
  });
  document.addEventListener('change',event=>{
    const input=event.target;
    if(input.closest?.('#cataract-medication-form')){
      const plan=formPlan(input.closest('form'));
      document.querySelector('#medication-date-preview').textContent=plan?`${label(dates(plan)[0])}부터 ${label(plan.surgeryDate)} 수술 당일까지 사용`:'수술할 눈과 수술일, 오전·오후를 선택해 주세요.';
    }
    if(!input.matches?.('input[data-cataract-dose]'))return;
    const store=read(),allowed=new Set();
    if(!store.plan)return;
    for(const date of dates(store.plan))for(const m of medicines)for(let i=0;i<m.slots.length;i++)allowed.add(doseKey(store.plan,date,m.id,i));
    if(!allowed.has(input.dataset.cataractDose))return;
    store.checks[input.dataset.cataractDose]=input.checked;
    const status=document.querySelector('#medication-check-status');
    if(!write(store)){input.checked=!input.checked;status.textContent='기록을 저장하지 못했습니다. 다시 시도해 주세요.';return;}
    const {done,total}=totals(store);
    document.querySelector('#medication-progress').textContent=`${done} / ${total}회 완료`;
    document.querySelector('#medication-progress-bar').value=done;
    status.textContent='저장되었습니다.';
  });
  window.CataractMedication={renderGuide,renderSchedule};
})();
