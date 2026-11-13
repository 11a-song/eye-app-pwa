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
  const hasTime=plan=>Number.isInteger(plan?.hour)&&plan.hour>=1&&plan.hour<=12&&Number.isInteger(plan?.minute)&&plan.minute>=0&&plan.minute<=59;
  const timeLabel=plan=>hasTime(plan)?`${periods[plan.period]||''} ${plan.hour}시 ${pad(plan.minute)}분`.trim():'';
  const key=date=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
  function parseDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
    const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d,12);
    return key(date)===value?date:null;
  }
  function validPlan(plan){return !!(plan&&Object.hasOwn(eyes,plan.eye)&&parseDate(plan.surgeryDate)&&(!plan.period||Object.hasOwn(periods,plan.period)));}
  function cleanAppointment(value){
    if(!parseDate(value?.surgeryDate))return null;
    const appointment={surgeryDate:value.surgeryDate};
    if(Object.hasOwn(periods,value.period))appointment.period=value.period;
    if(hasTime(value)){appointment.hour=value.hour;appointment.minute=value.minute;}
    return appointment;
  }
  function read(){
    try{const value=JSON.parse(localStorage.getItem(KEY)||'null');return {plan:validPlan(value?.plan)?value.plan:null,appointment:cleanAppointment(value?.appointment),checks:value?.checks&&typeof value.checks==='object'&&!Array.isArray(value.checks)?value.checks:{}};}catch{return {plan:null,appointment:null,checks:{}};}
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
    const plan={eye:form.elements.namedItem('eye').value,surgeryDate,period:form.elements.namedItem('period').value,hour:number('hour'),minute:number('minute')};
    return validPlan(plan)&&Object.hasOwn(periods,plan.period)&&hasTime(plan)&&String(form.elements.namedItem('minute').value).trim()!==''?plan:null;
  }
  function appointmentFields(plan){
    const date=plan?parseDate(plan.surgeryDate):null;
    const year=date?date.getFullYear():Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Seoul'}).format(new Date()));
    return `<label for="cataract-month">수술 예정일</label><div class="medication-date-fields"><label><input name="year" type="number" min="2000" max="2100" value="${year}" required inputmode="numeric" aria-label="수술 연도"><span>년</span></label><label><input id="cataract-month" name="month" type="number" min="1" max="12" value="${date?date.getMonth()+1:''}" placeholder="월" required inputmode="numeric" aria-label="수술 월"><span>월</span></label><label><input name="day" type="number" min="1" max="31" value="${date?date.getDate():''}" placeholder="일" required inputmode="numeric" aria-label="수술 일"><span>일</span></label></div><fieldset class="medication-period"><legend>수술 시간</legend>${Object.entries(periods).map(([id,title])=>`<label><input type="radio" name="period" value="${id}" required ${plan?.period===id?'checked':''}><span>${title}</span></label>`).join('')}</fieldset><div class="medication-time-fields"><label><input type="number" name="hour" min="1" max="12" required inputmode="numeric" placeholder="시" value="${hasTime(plan)?plan.hour:''}" aria-label="수술 예정 시"><span>시</span></label><label><input type="number" name="minute" min="0" max="59" required inputmode="numeric" placeholder="분" value="${hasTime(plan)?pad(plan.minute):''}" aria-label="수술 예정 분"><span>분</span></label></div><p id="medication-date-preview" aria-live="polite">${plan?`${label(dates(plan)[0])}부터 ${label(plan.surgeryDate)} 수술 당일까지 사용`:'수술일을 입력하면 안약 사용 시작일을 알려드려요.'}</p>`;
  }
  function renderSetup(){
    const store=read(),plan=store.appointment||store.plan;
    return '<form id="cataract-appointment-form" class="cataract-appointment-form"><div class="medication-date">'+appointmentFields(plan)+'<p id="appointment-status" class="medication-storage-note" role="status">입력한 일정은 약 사용법에 자동 반영됩니다.</p></div></form>';
  }
  function renderArrivalCard(){
    const {plan}=read();
    if(!plan)return '';
    return '<section class="medication-arrival-card"><p><span>수술 예정일</span><strong>'+label(plan.surgeryDate)+'</strong></p>'+(timeLabel(plan)?'<p class="medication-arrival-time"><strong>'+timeLabel(plan)+'</strong>까지 내원해주세요.</p>':'<a href="#/before/cataract">수술 예정 시·분 입력하기 →</a>')+'</section>';
  }
  function renderGuide(){
    const store=read(),plan=store.plan||store.appointment,date=plan?parseDate(plan.surgeryDate):null;
    const year=date?date.getFullYear():Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Asia/Seoul'}).format(new Date()));
    return `<div class="medication-guide"><p class="medication-intro"><strong>수술 3일 전부터</strong> 병원에서 미리 처방해드린 안약을 <strong>수술할 눈</strong>에 넣어주세요.</p><form id="cataract-medication-form"><fieldset class="medication-eye"><legend>수술할 눈을 선택하세요.</legend>${Object.entries(eyes).map(([id,title])=>`<label><input type="radio" name="eye" value="${id}" required ${plan?.eye===id?'checked':''}><span>${title}</span></label>`).join('')}</fieldset><div class="medication-date">${appointmentFields(plan)}<button class="primary-button" type="submit">내정보에 일정 저장</button><p id="medication-form-status" class="medication-storage-note" role="status">일정과 체크 기록은 현재 기기에 저장됩니다.</p></div><div class="medication-products">${medicines.map(m=>`<article class="medication-product ${m.id}"><img src="${m.photo}" alt="${m.name} 안약과 포장" width="220" height="220"><h3>${m.name}</h3><span class="medication-type">${m.type}</span><strong>하루 ${m.slots.length}번</strong><p>${m.slots.join(' / ')}</p></article>`).join('')}</div><p class="medication-interval">겹치는 시간대(아침, 저녁)에는 <strong>순서와 상관없이 5분 이상 간격</strong>을 두고 넣어주세요.</p><p class="medication-oral-note">미리 받으신 안과 처방 <strong>먹는 약</strong>은 <strong>수술 후</strong>에 드셔야 합니다.</p></form></div>`;
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
    const slots=dailySlots(plan,date);
    return `<section class="medication-day"><header class="medication-day-date"><h3>${label(date)}</h3><small class="medication-day-weekday">${['일요일','월요일','화요일','수요일','목요일','금요일','토요일'][parseDate(date).getDay()]}</small><span>${index===3?'수술 당일':`수술 ${3-index}일 전`}</span></header><div class="medication-day-doses">${slots.map(slot=>`<div class="medication-time-group" role="group" aria-label="${slot}"><h4 class="medication-time-title">${timeIcon(slot)}${slot}</h4><div class="medication-dose-grid">${medicines.filter(m=>m.slots.includes(slot)).map(m=>{const dose=doseKey(plan,date,m.id,m.slots.indexOf(slot));return `<label><span class="medication-dose-name"><i class="medication-dose-dot ${m.id}" aria-hidden="true"></i>${m.name}</span><input type="checkbox" data-cataract-dose="${dose}" ${store.checks[dose]===true?'checked':''}></label>`;}).join('')}</div></div>`).join('')}</div></section>`;
  }
  function renderSchedule(){
    const store=read(),plan=store.plan;
    if(!plan)return `<section class="medication-empty"><h2>백내장 수술 전</h2><p>수술할 눈과 수술일을 입력하면 안약 사용 일정을 체크할 수 있습니다.</p><a class="primary-button" href="#/before/cataract/medication">약 사용 일정 설정</a></section>`;
    const {done,total}=totals(store);
    return `<div class="medication-tracker"><section class="medication-plan-summary"><span class="medication-plan-eye">${eyes[plan.eye]}</span><h2>백내장 수술 전</h2><p>수술일 ${label(plan.surgeryDate)}${timeLabel(plan)?' '+timeLabel(plan):periods[plan.period]?' '+periods[plan.period]:''} · ${plan.surgeryDate.slice(0,4)}년</p><a href="#/before/cataract/medication">수술일·수술할 눈 수정 →</a><p id="medication-progress" role="status">${done} / ${total}회 완료</p><progress id="medication-progress-bar" max="${total}" value="${done}" aria-label="안약 사용 완료 횟수"></progress></section><section class="medication-tracker-reference" aria-label="약 사용 안내"><p class="medication-oral-note">미리 받으신 안과 처방 <strong>먹는 약</strong>은 <strong>수술 후</strong>에 드셔야 합니다.</p><div class="medication-products">${medicines.map(m=>`<article class="medication-product ${m.id}"><img src="${m.photo}" alt="${m.name} 안약과 포장" width="220" height="220"><h3>${m.name}</h3></article>`).join('')}</div></section><p class="medication-tracker-hint">안약을 넣은 후 체크해 주세요.<br>아침·저녁에는 두 안약을 5분 이상 간격으로 사용하세요.</p>${dates(plan).map((date,index)=>renderScheduleDay(plan,store,date,index)).join('')}${renderArrivalCard()}<p class="medication-storage-note" id="medication-check-status" role="status">체크 기록은 현재 기기에 저장됩니다.</p></div>`;
  }
  function saveAppointment(form){
    const value=name=>form.elements.namedItem(name).value;
    const status=document.querySelector('#appointment-status');
    const appointment=cleanAppointment({surgeryDate:`${Number(value('year'))}-${pad(Number(value('month')))}-${pad(Number(value('day')))}`,period:value('period'),hour:String(value('hour')).trim()?Number(value('hour')):null,minute:String(value('minute')).trim()?Number(value('minute')):null});
    if(!appointment){status.textContent='올바른 수술 예정일을 입력해 주세요.';return;}
    const store=read();store.appointment=appointment;
    if(store.plan)store.plan={eye:store.plan.eye,...appointment};
    if(!write(store)){status.textContent='기기에 저장하지 못했습니다. 다시 시도해 주세요.';return;}
    status.textContent='자동 저장되었습니다. 약 사용법에도 반영됩니다.';
    document.querySelector('#medication-date-preview').textContent=`${label(dates(appointment)[0])}부터 ${label(appointment.surgeryDate)} 수술 당일까지 사용`;
  }
  document.addEventListener('submit',event=>{
    if(event.target.id==='cataract-appointment-form'){event.preventDefault();saveAppointment(event.target);return;}
    if(event.target.id!=='cataract-medication-form')return;
    event.preventDefault();
    const status=document.querySelector('#medication-form-status'),plan=formPlan(event.target);
    if(!plan){status.textContent='수술할 눈, 올바른 날짜와 오전·오후, 시·분을 입력해 주세요.';return;}
    const store=read();store.plan=plan;store.appointment={surgeryDate:plan.surgeryDate,period:plan.period,hour:plan.hour,minute:plan.minute};
    if(!write(store)){status.textContent='기기에 저장하지 못했습니다. 브라우저의 저장 설정을 확인해 주세요.';return;}
    const toast=document.querySelector('#toast');
    clearTimeout(toastTimer);toast.textContent='저장되었습니다.';toast.classList.add('visible');
    toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);
  });
  document.addEventListener('change',event=>{
    const input=event.target;
    const appointmentForm=input.closest?.('#cataract-appointment-form');
    if(appointmentForm){saveAppointment(appointmentForm);return;}
    if(input.closest?.('#cataract-medication-form')){
      const plan=formPlan(input.closest('form'));
      document.querySelector('#medication-date-preview').textContent=plan?`${label(dates(plan)[0])}부터 ${label(plan.surgeryDate)} 수술 당일까지 사용`:'수술할 눈과 수술일, 오전·오후를 선택해 주세요.';
    }
    if(!input.matches?.('input[data-cataract-dose]'))return;
    const store=read(),allowed=new Set();
    if(!store.plan)return;
    for(const date of dates(store.plan))for(const m of medicines)for(let i=0;i<m.slots.length;i++)if(dailySlots(store.plan,date).includes(m.slots[i]))allowed.add(doseKey(store.plan,date,m.id,i));
    if(!allowed.has(input.dataset.cataractDose))return;
    store.checks[input.dataset.cataractDose]=input.checked;
    const status=document.querySelector('#medication-check-status');
    if(!write(store)){input.checked=!input.checked;status.textContent='기록을 저장하지 못했습니다. 다시 시도해 주세요.';return;}
    const {done,total}=totals(store);
    document.querySelector('#medication-progress').textContent=`${done} / ${total}회 완료`;
    document.querySelector('#medication-progress-bar').value=done;
    status.textContent='저장되었습니다.';
  });
  window.CataractMedication={renderGuide,renderSchedule,renderSetup,renderArrivalCard};
})();
