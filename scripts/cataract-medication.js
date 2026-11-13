(function(){
  'use strict';
  const KEY='jeileye-cataract-preop-v1';
  let toastTimer;
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
    return plans.map(plan=>'<section class="medication-saved-plan'+(plan.archived?' is-archived':'')+'" aria-label="저장한 수술 정보"><dl><div><dt>수술할 눈</dt><dd>'+(eyes[plan.eye]||'미선택')+'</dd></div><div><dt>수술 예정일</dt><dd>'+plan.surgeryDate.slice(0,4)+'년 '+label(plan.surgeryDate)+'</dd></div><div><dt>내원 시간</dt><dd>'+(timeLabel(plan)||'미입력')+'</dd></div></dl>'+(plan.archived?'':'<a href="#/before/cataract">수술 정보 수정 →</a>')+'</section>').join('');
  }
  function renderGuide(){
    return `<div class="medication-guide"><p class="medication-intro"><strong>수술 3일 전부터</strong> 병원에서 미리 처방해드린 안약을 <strong>수술할 눈</strong>에 넣어주세요.</p>${renderGuideSummary()}<div class="medication-products">${medicines.map(m=>`<article class="medication-product ${m.id}"><img src="${m.photo}" alt="${m.name} 안약과 포장" width="220" height="220"><h3>${m.name}</h3><span class="medication-type">${m.type}</span><strong>하루 ${m.slots.length}번</strong><p>${m.slots.join(' / ')}</p></article>`).join('')}</div><p class="medication-interval">겹치는 시간대(아침, 저녁)에는 <strong>순서와 상관없이 5분 이상 간격</strong>을 두고 넣어주세요.</p><p class="medication-oral-note">미리 받으신 안과 처방 <strong>먹는 약</strong>은 <strong>수술 후</strong>에 드셔야 합니다.</p></div>`;
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
    return `<section class="medication-day"><header class="medication-day-date"><div class="medication-date-label"><h3>${label(date,false)}</h3><small class="medication-day-weekday">(${weekday(date)})</small><span>${index===3?'수술 당일':`수술 ${3-index}일 전`}</span></div><div class="medication-day-photos">${medicines.map(m=>`<figure class="${m.id}"><img src="${m.photo}" alt="${m.name} 안약과 포장" width="76" height="84" loading="lazy"><figcaption>${m.name}</figcaption></figure>`).join('')}</div></header><div class="medication-day-doses">${slots.map(slot=>`<div class="medication-time-group" role="group" aria-label="${slot}"><h4 class="medication-time-title">${timeIcon(slot)}${slot}</h4><div class="medication-dose-grid">${medicines.filter(m=>m.slots.includes(slot)).map(m=>{const dose=doseKey(plan,date,m.id,m.slots.indexOf(slot));return `<label><span class="medication-dose-name"><i class="medication-dose-dot ${m.id}" aria-hidden="true"></i>${m.name}</span><input type="checkbox" data-cataract-dose="${dose}" ${store.checks[dose]===true?'checked':''} ${plan.archived?'disabled':''}></label>`;}).join('')}</div></div>`).join('')}</div></section>`;
  }
  function renderPlanSummary(plan,done,total){
    return `<section class="medication-plan-summary"><header class="medication-summary-header"><h2>백내장 수술 전</h2>${plan.archived?'':'<a class="medication-summary-edit" href="#/before/cataract">수정</a>'}</header><div class="medication-summary-body"><span class="medication-plan-eye">${eyes[plan.eye]||'수술할 눈 미선택'}</span><dl><div><dt>수술일</dt><dd>${plan.surgeryDate.slice(0,4)}년 ${label(plan.surgeryDate)}</dd></div><div><dt>내원시간</dt><dd>${timeLabel(plan)||'미입력'}</dd></div></dl>${plan.archived?'<p class="medication-readonly-note">이전 수술 기록 · 조회 전용</p>':''}<p id="medication-progress" role="status">${done} / ${total}회 완료</p><progress id="medication-progress-bar" max="${total}" value="${done}" aria-label="안약 사용 완료 횟수"></progress></div></section>`;
  }
  function renderSchedule(){
    const store=read(),plan=store.plan;
    if(!plan)return `<section class="medication-empty"><h2>백내장 수술 전</h2><p>수술할 눈과 수술일을 입력하면 안약 사용 일정을 체크할 수 있습니다.</p><a class="primary-button" href="#/before/cataract">약 사용 일정 설정</a></section>`;
    const {done,total}=totals(store);
    return `<div class="medication-tracker${plan.archived?' is-archived':''}">${renderPlanSummary(plan,done,total)}<section class="medication-tracker-reference" aria-label="약 사용 안내"><p class="medication-oral-note">미리 받으신 안과 처방 <strong>먹는 약</strong>은 <strong>수술 후</strong>에 드셔야 합니다.</p></section><p class="medication-tracker-hint">안약을 넣은 후 체크해 주세요.<br>아침·저녁에는 두 안약을 5분 이상 간격으로 사용하세요.</p>${dates(plan).map((date,index)=>renderScheduleDay(plan,store,date,index)).join('')}${renderArrivalCard()}<p class="medication-storage-note" id="medication-check-status" role="status">체크 기록은 현재 기기에만 저장됩니다.</p></div>`;
  }
  function showSavedToast(message='저장되었습니다.'){
    const toast=document.querySelector('#toast');
    clearTimeout(toastTimer);toast.textContent=message;toast.classList.add('visible');
    toastTimer=setTimeout(()=>toast.classList.remove('visible'),3000);
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
    document.querySelector('#medication-progress-bar').value=done;
    status.textContent='저장되었습니다.';
  });
  function renderProfileLinks(){
    const {plans}=read();
    return plans.map(p=>`<a class="surgery-category-button${p.archived?' is-archived':''}" href="#/profile/cataract-before${plans.length>1?'?plan='+p.id:''}"><span>백내장 수술 전<small>${label(p.surgeryDate)} · ${eyes[p.eye]||'수술할 눈 미선택'}${timeLabel(p)?'<br>내원 '+timeLabel(p):''}</small></span><svg class="menu-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg></a>`).join('');
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
