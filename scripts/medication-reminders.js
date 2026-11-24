(function(){
  'use strict';
  const KEY='jeileye-medication-reminders-v1';
  const slots=['아침','점심','저녁','취침 전'];
  const native=()=>window.ClinicNativeAlarm;
  function nativeControls(){return native()?'<button type="button" class="reminder-test-button" data-native-alarm-settings>기기 알람 권한 설정</button><p class="reminder-note">알림, 알람 및 리마인더, 전체 화면 알림을 허용하고 알람 음량을 확인해 주세요.</p>':'';}
  function platformNote(){return '<p class="reminder-note">'+(native()?'이 앱은 휴대폰에 알람을 예약합니다. 권한 허용 후 잠금화면에서 테스트해 주세요. 휴대폰 강제 종료, 알람 음량, 방해 금지 설정에 따라 동작이 제한될 수 있습니다.':'아이폰은 iOS 16.4 이상에서 홈 화면에 설치한 앱의 알림을 허용해야 합니다. 인터넷 연결과 휴대폰 설정에 따라 알림이 지연되거나 전달되지 않을 수 있습니다.')+'</p>';}
  const bell='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M12 2V1"/></svg>';
  const plans=()=>window.CataractMedication.getPlans();
  const selected=()=>{const id=location.hash.match(/[?&]plan=([a-z0-9-]+)/)?.[1];return plans().find(p=>p.id===id)||plans().find(p=>!p.archived)||plans()[0];};
  function read(){try{const s=JSON.parse(localStorage.getItem(KEY)||'null');return s&&typeof s==='object'&&s.plans&&typeof s.plans==='object'?s:{plans:{}};}catch{return {plans:{}};}}
  function write(s){localStorage.setItem(KEY,JSON.stringify(s));}
  const settings=(s,id)=>s.plans[id]||{enabled:false,times:['','','',''],slots:[false,false,false,false]};
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const support=()=>isSecureContext&&'Notification' in window&&'PushManager' in window&&'serviceWorker' in navigator;
  const ios=()=>/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;
  const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  function guidance(){
    if(native()){const value=native().status();return value.ready?'':value.reason||'휴대폰 알람 권한을 설정해 주세요.';}
    if(ios()&&!standalone())return '아이폰에서는 Safari에서 홈 화면에 추가한 뒤, 설치된 앱을 열어 알림을 허용해 주세요.';
    if(!support())return '이 브라우저에서는 푸시 알림을 지원하지 않습니다. 설치된 앱 또는 최신 Chrome에서 이용해 주세요.';
    if(Notification.permission==='denied')return '알림이 차단되어 있습니다. 휴대폰 또는 브라우저의 사이트 알림 설정에서 허용해 주세요.';
    return '';
  }
  const pad=n=>String(n).padStart(2,'0');
  function reminderDates(plan){
    const [y,m,d]=plan.surgeryDate.split('-').map(Number);
    return [3,2,1,0].map(offset=>{const date=new Date(y,m-1,d-offset,12);return {value:`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`,weekday:['일','월','화','수','목','금','토'][date.getDay()],label:`${date.getMonth()+1}/${date.getDate()}`,offset};});
  }
  function renderDays(plan,value){
    const timeInputHint='시·분을 위아래로 밀어 시간을 선택하세요. 분은 10분 단위로 설정할 수 있습니다.';
    return `<section class="reminder-days" aria-labelledby="reminder-days-title"><h3 id="reminder-days-title">알림 받을 날짜</h3><div class="reminder-day-buttons">${reminderDates(plan).map(day=>`<label class="reminder-day-button"><input type="checkbox" name="day${day.value}" ${value.enabled&&value.days?.[day.value]!==false?'checked':''} aria-label="${day.label} (${day.weekday}) ${day.offset?'수술 '+day.offset+'일 전':'수술 당일'} 알림"><span class="reminder-day-circle">${day.weekday}</span><strong>${day.label}</strong><small>${day.offset?day.offset+'일 전':'수술 당일'}</small></label>`).join('')}</div><p>수술 3일 전부터 수술 당일까지 날짜별로 켜고 끌 수 있습니다.</p></section><p class="reminder-wheel-hint">${timeInputHint}${value.times?.some(Boolean)?'':' 처음 표시되는 시간은 예시입니다. 처방에 맞춰 조정해 주세요.'}</p>`;
  }
  function wheel(slot,part,values,selectedValue){
    const prefix=`reminder-wheel-${slot}-${part}`,selected=values.findIndex(value=>String(value)===String(selectedValue));
    return `<div class="reminder-wheel" data-reminder-wheel="${part}" data-value="${selectedValue}" role="listbox" tabindex="0" aria-activedescendant="${prefix}-${selected}" aria-label="${slots[slot]} ${part==='hour'?'오전·오후 포함 시':'분'}">${values.map((value,i)=>`<button id="${prefix}-${i}" type="button" role="option" tabindex="-1" data-wheel-option="${value}" ${part==='hour'?`data-period="${Number(value)<12?'am':'pm'}"`:''} aria-selected="${String(value)===String(selectedValue)}">${part==='hour'?`${Number(value)<12?'오전':'오후'} ${Number(value)%12||12}시`:value}</button>`).join('')}</div>`;
  }
  function renderTimePicker(index,value){
    const time=/^([01]\d|2[0-3]):[0-5]\d$/.test(value||'')?value:['07:00','12:00','18:00','22:00'][index];
    const [hour,previousMinute]=time.split(':').map(Number),minute=Math.floor(previousMinute/10)*10;
    return `<div class="reminder-time-picker" data-time-picker data-period="${hour<12?'am':'pm'}"><input type="hidden" name="time${index}" value="${pad(hour)}:${pad(minute)}">${wheel(index,'hour',Array.from({length:24},(_,i)=>i),hour)}${wheel(index,'minute',Array.from({length:6},(_,i)=>pad(i*10)),pad(minute))}<span class="reminder-picker-unit">분</span></div>`;
  }
  const wheelHeight=36;
  function selectWheel(wheel,index,scroll=false){
    if(wheel.closest('fieldset')?.disabled)return;
    const options=Array.from(wheel.querySelectorAll('[data-wheel-option]'));
    index=Math.max(0,Math.min(options.length-1,index));if(!options[index])return;
    wheel.dataset.value=options[index].dataset.wheelOption;
    options.forEach((option,i)=>option.setAttribute('aria-selected',String(i===index)));
    wheel.setAttribute('aria-activedescendant',options[index].id);
    if(scroll)wheel.scrollTop=index*wheelHeight;
    const picker=wheel.closest('[data-time-picker]');
    const part=name=>picker.querySelector(`[data-reminder-wheel="${name}"]`).dataset.value;
    const hour=Number(part('hour'));
    picker.querySelector('input').value=`${pad(hour)}:${part('minute')}`;
    picker.dataset.period=hour<12?'am':'pm';
  }
  function initializeWheels(){
    for(const wheel of document.querySelectorAll?.('[data-reminder-wheel]')||[]){
      const options=Array.from(wheel.querySelectorAll('[data-wheel-option]'));
      const index=options.findIndex(option=>option.dataset.wheelOption===wheel.dataset.value);
      wheel.scrollTop=Math.max(0,index)*wheelHeight;
    }
  }
  document.addEventListener('scroll',event=>{
    const wheel=event.target.closest?.('[data-reminder-wheel]');
    if(wheel)selectWheel(wheel,Math.round(wheel.scrollTop/wheelHeight));
  },{capture:true,passive:true});
  document.addEventListener('keydown',event=>{
    const wheel=event.target.closest?.('[data-reminder-wheel]');if(!wheel||!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();const last=wheel.querySelectorAll('[data-wheel-option]').length-1;
    const index=event.key==='Home'?0:event.key==='End'?last:Math.round(wheel.scrollTop/wheelHeight)+(event.key==='ArrowUp'?-1:1);
    selectWheel(wheel,index,true);
  });
  document.addEventListener('change',event=>{
    const input=event.target;
    if(input.name!=='enabled')return;
    const form=input.closest?.('#medication-reminder-form');if(!form)return;
    for(const toggle of form.querySelectorAll('input[name^="slot"],input[name^="day"]'))toggle.checked=input.checked;
  });
  function renderMenu(plan){
    if(!plan||plan.archived)return '';
    const s=read(),on=settings(s,plan.id).enabled;
    return `<a class="medication-reminder-menu" href="#/profile/reminders?plan=${plan.id}">${bell}<span>안약 알림 설정<small>${s.pending?'변경 사항 연결 대기':on?'알림 켜짐 · 시간 변경':'시간을 설정하고 푸시 알림 받기'}</small></span><span class="reminder-menu-arrow" aria-hidden="true">›</span></a>`;
  }
  function render(){
    const plan=selected();if(!plan)return '<p>먼저 수술 스케줄을 생성해 주세요.</p>';
    const s=read(),value=settings(s,plan.id),blocked=guidance(),disabled=plan.archived;
    return `<section class="reminder-page"><a class="surgery-detail-back" href="#/profile/cataract-before?plan=${plan.id}">‹ 안약 스케줄로</a><h2>${bell}안약 알림 설정</h2><p class="reminder-plan">${escape({left:'왼쪽 눈',right:'오른쪽 눈',both:'양쪽 눈'}[plan.eye]||'수술 일정')} · ${escape(plan.surgeryDate.replaceAll('-','.'))}</p>${nativeControls()}<form id="medication-reminder-form" data-plan="${plan.id}"><fieldset ${disabled?'disabled':''}><legend class="visually-hidden">안약 알림 시간 설정</legend><label class="reminder-master"><span><strong>안약 알림 받기</strong><small>설정한 시간에 푸시 알림을 받습니다.</small></span><input type="checkbox" name="enabled" role="switch" ${value.enabled?'checked':''}></label>${renderDays(plan,value)}<div class="reminder-times">${slots.map((title,i)=>`<div class="reminder-time-row"><div><strong class="reminder-slot-title">${title}</strong><small>${i===0||i===2?'목시트라 · 브로낙':'목시트라'}</small></div>${renderTimePicker(i,value.times?.[i])}<label class="reminder-slot-switch"><input type="checkbox" name="slot${i}" role="switch" ${value.enabled&&value.slots?.[i]!==false?'checked':''} aria-label="${title} 알림 켜기"><span>알림</span></label></div>`).join('')}</div><p class="reminder-status" id="reminder-status" role="status">${disabled?'이전 수술 일정은 알림을 설정할 수 없습니다.':escape(blocked|| (s.pending?'이전 변경을 서버에 반영하지 못했습니다. 인터넷 연결 후 다시 저장해 주세요.':''))}</p><p class="reminder-note">시간은 현재 기기의 시간대를 기준으로 합니다. 처방받은 횟수와 간격에 맞춰 설정해 주세요.<br>수술 당일은 오전 내원 시 아침, 오후 내원 시 아침·점심만 알립니다. 내원시간 이후 알림은 보내지 않습니다.</p>${native()?'':`<label class="reminder-consent"><input type="checkbox" name="consent" ${value.consent?'checked':''}><span>알림 발송을 위한 기기 수신 정보와 발송 시간을 서버에 저장하는 데 동의합니다. 체크 기록은 전송하지 않습니다.</span></label>`}<button class="primary-button" type="submit">알림 설정 저장</button><button class="reminder-test-button" type="button" data-test-medication-reminder ${!native()&&!s.subscription?'disabled':''}>테스트 알림 보내기</button></fieldset></form>${platformNote()}</section>`;
  }
  function buildJobs(all,s,now=new Date()){
    const jobs=[];
    for(const p of all){
      const value=settings(s,p.id);if(p.archived||!value.enabled)continue;
      const [y,m,d]=p.surgeryDate.split('-').map(Number);
      const arrival=new Date(y,m-1,d,(p.hour%12)+(p.period==='pm'?12:0),p.minute);
      for(let offset=3;offset>=0;offset--)for(let slot=0;slot<4;slot++){
        if(value.slots?.[slot]===false||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value.times?.[slot]||''))continue;
        if(offset===0&&slot>(p.period==='am'?0:1))continue;
        const [h,min]=value.times[slot].split(':').map(Number),date=new Date(y,m-1,d-offset,h,min);
        const day=`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
        if(value.days?.[day]===false)continue;
        if(date<=now||offset===0&&date>=arrival)continue;
        jobs.push({plan_id:p.id,slot,fire_at:date.toISOString()});
      }
    }
    return jobs;
  }
  let queue=Promise.resolve(),revision=0,lastPlans='';
  async function request(action,body){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
    try{
      const response=await fetch(`${window.clinicBackend.url}/functions/v1/medication-reminders/${action}`,{
        method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});
      const data=await response.json();
      if(!response.ok)throw Error(data.error==='rate'?'테스트 알림은 30초 후 다시 보낼 수 있습니다.':data.expired?'알림 연결이 만료되었습니다. 설정을 다시 저장해 주세요.':'서버에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 저장해 주세요.');
      return data;
    }catch(error){throw Error(/[가-힣]/.test(error.message||'')?error.message:'알림 서버에 연결하지 못했습니다. 인터넷 연결 후 다시 저장해 주세요.');}
    finally{clearTimeout(timer);}
  }
  function identity(s){
    if(!s.id||!s.token){s.id=crypto.randomUUID();s.token=Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');write(s);}
    return {id:s.id,token:s.token};
  }
  async function subscription(s){
    let timer;
    const registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('앱 연결 준비가 지연되고 있습니다. 앱을 다시 열고 저장해 주세요.')),20000);})]).finally(()=>clearTimeout(timer));
    let sub=await registration.pushManager.getSubscription();
    if(!sub){const {publicKey}=await request('config');const raw=atob(publicKey.replace(/-/g,'+').replace(/_/g,'/'));sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});}
    s.subscription=sub.toJSON();write(s);return s.subscription;
  }
  async function updateStatusNotification(jobs){
    if(native()||typeof Notification==='undefined'||Notification.permission!=='granted'||!navigator.serviceWorker)return;
    const registration=await navigator.serviceWorker.ready;
    if(!registration.getNotifications||!registration.showNotification)return;
    const tag='jeileye-reminder-settings',existing=await registration.getNotifications({tag});
    if(!jobs.length){existing.forEach(notice=>notice.close());return;}
    const next=jobs.reduce((first,job)=>job.fire_at<first.fire_at?job:first),signature=JSON.stringify(jobs);
    if(existing.some(notice=>notice.data?.signature===signature))return;
    const when=new Date(next.fire_at).toLocaleString('ko-KR',{month:'long',day:'numeric',hour:'numeric',minute:'2-digit'});
    await registration.showNotification('안약 알림이 설정되었습니다',{
      body:`다음 알림: ${when}. 예약한 시간에 안약 알림을 받습니다.`,tag,icon:'assets/icon-192.png',
      silent:true,requireInteraction:true,data:{url:'./#/profile',signature}
    });
  }
  function synchronize(){
    const task=async()=>{
      if(native()){
        const s=read(),all=plans();s.pending=true;write(s);
        native().save(buildJobs(all,s),all.filter(p=>!p.archived&&settings(s,p.id).enabled).map(p=>p.id));
        const latest=read();latest.pending=false;latest.nativeRegistered=true;write(latest);return;
      }
      const s=read();if(!s.id||!s.subscription)return;
      const jobs=(typeof Notification!=='undefined'&&Notification.permission==='granted')?buildJobs(plans(),s):[];
      revision=Math.max(Date.now(),revision+1,Number(s.revision||0)+1);s.revision=revision;s.pending=true;write(s);
      await request('save',{...identity(s),subscription:s.subscription,revision,jobs});
      // Preserve newer form edits that may have been made while this request was in flight.
      const latest=read();if(latest.revision===revision){latest.pending=false;write(latest);}
      // A status notice is supplementary; a blocked status channel must not undo saved jobs.
      if(latest.revision===revision)await updateStatusNotification(jobs).catch(()=>{});
    };
    queue=queue.catch(()=>{}).then(task);return queue;
  }
  function status(text){const el=document.querySelector('#reminder-status');if(el)el.textContent=text;}
  function toast(text){const el=document.querySelector('#toast');if(!el)return;el.textContent=text;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),3000);}
  let busy=false;
  document.addEventListener('submit',async event=>{
    const form=event.target;if(form.id!=='medication-reminder-form')return;event.preventDefault();if(busy)return;
    const p=plans().find(p=>p.id===form.dataset.plan);if(!p||p.archived)return;
    const field=name=>form.elements.namedItem(name),enabled=field('enabled').checked;
    // Flush a wheel still moving when the user taps Save.
    for(const wheel of form.querySelectorAll?.('[data-reminder-wheel]')||[])selectWheel(wheel,Math.round(wheel.scrollTop/wheelHeight),true);
    const value={enabled,consent:field('consent')?.checked===true,times:slots.map((_,i)=>field('time'+i).value),slots:slots.map((_,i)=>field('slot'+i).checked),days:Object.fromEntries(reminderDates(p).map(day=>[day.value,field('day'+day.value)?.checked!==false]))};
    if(enabled){
      const blocked=guidance();if(blocked){status(blocked);return;}
      if(!native()&&!value.consent){status('알림 발송을 위한 정보 저장에 동의해 주세요.');return;}
      const active=value.times.filter((_,i)=>value.slots[i]);
      if(!active.length||active.some(t=>!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))){status('알림을 받을 항목을 켜고 시간을 입력해 주세요.');return;}
      if(active.some(t=>Number(t.slice(3))%10!==0)){status('알림 시간의 분은 00·10·20·30·40·50 중에서 선택해 주세요.');return;}
      const minutes=active.map(t=>Number(t.slice(0,2))*60+Number(t.slice(3)));
      if(minutes.some((t,i)=>i>0&&t-minutes[i-1]<5)){status('아침부터 취침 전까지 시간 순서대로, 5분 이상 간격으로 설정해 주세요.');return;}
      if(!buildJobs([p],{plans:{[p.id]:value}}).length){status('선택한 시간에는 남은 알림 일정이 없습니다. 수술일과 내원시간을 확인해 주세요.');return;}
    }
    busy=true;const button=form.querySelector('[type="submit"]');button.disabled=true;status('알림 설정을 저장하고 있습니다…');
    try{
      // Permission must be requested directly from the user's gesture, before any network await.
      if(!native()&&enabled&&Notification.permission!=='granted'){
        const result=await Notification.requestPermission();if(result!=='granted')throw Error('알림이 허용되지 않았습니다. 기기 설정에서 알림을 허용해 주세요.');
      }
      let s=read();if(!native()){identity(s);if(enabled)await subscription(s);}
      s=read();s.plans[p.id]=value;s.pending=!!s.subscription;write(s);
      await synchronize();status(enabled?'알림이 설정되었습니다. 테스트 알림으로 수신을 확인해 주세요.':'이 수술 일정의 알림을 껐습니다.');toast('저장되었습니다.');
      const test=form.querySelector('[data-test-medication-reminder]');if(test)test.disabled=!native()&&!s.subscription;
    }catch(error){status(error.message||'저장하지 못했습니다. 다시 시도해 주세요.');}
    finally{busy=false;button.disabled=false;}
  });
  document.addEventListener('click',async event=>{
    if(event.target.closest?.('[data-native-alarm-settings]')){native()?.openSettings();return;}
    const option=event.target.closest?.('[data-wheel-option]');
    if(option){const wheel=option.closest('[data-reminder-wheel]');selectWheel(wheel,Array.from(wheel.querySelectorAll('[data-wheel-option]')).indexOf(option),true);return;}
    const button=event.target.closest?.('[data-test-medication-reminder]');if(!button||busy)return;
    busy=true;button.disabled=true;
    try{
      if(native()){const blocked=guidance();if(blocked)throw Error(blocked);native().test(selected()?.id);status('10초 뒤 기기 알람이 울립니다. 지금 전원 버튼으로 화면을 끄고 확인해 주세요.');return;}
      const s=read();if(!s.subscription||!support()||Notification.permission!=='granted')throw Error('먼저 알림을 허용하고 설정을 저장해 주세요.');
      await request('test',{...identity(s),planId:selected()?.id});status('테스트 알림을 보냈습니다. 휴대폰 알림을 확인해 주세요.');
    }catch(error){status(error.message);}finally{busy=false;button.disabled=false;}
  });
  function plansChanged(all){
    const signature=JSON.stringify(all.map(p=>[p.id,p.surgeryDate,p.period,p.hour,p.minute,p.archived]));
    if(signature===lastPlans)return;lastPlans=signature;
    const s=read();if(!s.subscription&&!native())return;s.pending=true;try{write(s);}catch{return;}
    synchronize().catch(()=>toast('알림 변경을 연결하지 못했습니다. 인터넷 연결 후 다시 시도합니다.'));
  }
  window.MedicationReminders={render,renderMenu,plansChanged,buildJobs,initializeWheels};
  lastPlans=JSON.stringify(plans().map(p=>[p.id,p.surgeryDate,p.period,p.hour,p.minute,p.archived]));
  const retry=()=>{const s=read();if(s.subscription||native()&&s.nativeRegistered)synchronize().catch(()=>{});};
  window.addEventListener('jeileye-native-resume',retry);
  window.addEventListener('online',retry);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')retry();});
  if(read().subscription||native()&&read().nativeRegistered)retry();
})();
