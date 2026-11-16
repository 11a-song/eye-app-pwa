const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
const source=fs.readFileSync('scripts/medication-reminders.js','utf8');
const KEY='jeileye-medication-reminders-v1';
const plan={id:'plan-one',eye:'left',surgeryDate:'2030-06-10',period:'am',hour:9,minute:0,archived:false};
const enabled={enabled:true,consent:true,times:['07:00','12:00','18:00','22:00'],slots:[true,true,true,true]};
let all=[plan],calls=[],permissionRequests=0,failNetwork=false,allowPermission=true;
const data=new Map(),handlers={},windowEvents={},status={textContent:''},submit={disabled:false},test={disabled:false};
const sub={endpoint:'https://fcm.googleapis.com/example',keys:{auth:'x'.repeat(22),p256dh:'y'.repeat(87)}};
const context=vm.createContext({
  window:{CataractMedication:{getPlans:()=>all},clinicBackend:{url:'https://example.supabase.co'},Notification:{permission:'granted'},PushManager:{},addEventListener:(t,f)=>windowEvents[t]=f},
  document:{addEventListener:(t,f)=>handlers[t]=f,querySelector:s=>s==='#reminder-status'?status:null},
  location:{hash:'#/profile/reminders?plan=plan-one'},isSecureContext:true,
  Notification:{permission:'granted',async requestPermission(){permissionRequests++;return allowPermission?'granted':'denied';}},
  navigator:{userAgent:'Android Chrome',serviceWorker:{ready:Promise.resolve({pushManager:{getSubscription:async()=>({toJSON:()=>sub})}})}},
  matchMedia:()=>({matches:true}),localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},
  fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body||'null')});if(failNetwork)throw Error('offline');return {ok:true,json:async()=>({ok:true})};},
  crypto:webcrypto,Date,URL,Uint8Array,AbortController,setTimeout,clearTimeout,console
});
vm.runInContext(source,context);
function stored(s){data.set(KEY,JSON.stringify(s));}
function form(value=enabled){const fields={enabled:{checked:value.enabled},consent:{checked:value.consent}};
  for(let i=0;i<4;i++){fields['time'+i]={value:value.times[i]};fields['slot'+i]={checked:value.slots[i]};}
  for(const [date,on] of Object.entries(value.days||{}))fields['day'+date]={checked:on};
  return {id:'medication-reminder-form',dataset:{plan:'plan-one'},elements:{namedItem:n=>fields[n]},querySelector:s=>s.includes('submit')?submit:test};}
async function save(value=enabled){await handlers.submit({target:form(value),preventDefault(){}});}
(async()=>{
  const api=context.window.MedicationReminders;
  assert.ok(api.render().includes('안약 알림 설정'));
  const state={plans:{'plan-one':enabled}},before=new Date(2030,5,6);
  const am=api.buildJobs([plan],state,before);
  assert.equal(am.length,13,'three full days and only surgery-day morning');
  const disabledDay={...enabled,days:{'2030-06-07':false}};
  const withoutOne=api.buildJobs([plan],{plans:{'plan-one':disabledDay}},before);
  assert.equal(withoutOne.length,9,'one disabled pre-op day removes its four reminders');
  assert.ok(withoutOne.every(j=>new Date(j.fire_at).getDate()!==7));
  const onlySurgery=api.buildJobs([plan],{plans:{'plan-one':{...enabled,days:{'2030-06-07':false,'2030-06-08':false,'2030-06-09':false}}}},before);
  assert.equal(onlySurgery.length,1,'the three pre-op toggles leave existing surgery-day rules intact');
  const monthPlan={...plan,surgeryDate:'2030-01-02'};
  assert.equal(api.buildJobs([monthPlan],{plans:{'plan-one':{...enabled,days:{'2029-12-30':false}}}},new Date(2029,11,28)).length,9,'date toggles work across year boundaries');
  const initialMarkup=api.render();
  assert.ok(initialMarkup.includes('name="day2030-06-10" checked'));
  assert.ok(initialMarkup.includes('<small>수술 당일</small>')&&!initialMarkup.includes('0일 전'));
  assert.ok(initialMarkup.includes('name="day2030-06-07" checked'));
  assert.equal((initialMarkup.match(/class="reminder-wheel"/g)||[]).length,12,'four independent AM/PM, hour and minute wheels');
  assert.ok(!initialMarkup.includes('type="time"'),'wheel picker replaces platform-dependent time inputs');
  const wheels={},hiddenTime={value:''};
  const picker={querySelector:selector=>selector==='input'?hiddenTime:wheels[selector.match(/="(.*?)"/)[1]]};
  for(const [part,values,initial] of [['period',['오전','오후'],'오전'],['hour',Array.from({length:12},(_,i)=>String(i+1)),'7'],['minute',Array.from({length:60},(_,i)=>String(i).padStart(2,'0')),'40']]){
    const options=values.map((value,i)=>({id:part+i,dataset:{wheelOption:value},setAttribute(){}}));
    wheels[part]={dataset:{value:initial},scrollTop:values.indexOf(initial)*36,querySelectorAll:()=>options,setAttribute(){},closest:selector=>selector==='fieldset'?null:picker};
  }
  const originalQuery=context.document.querySelectorAll;
  context.document.querySelectorAll=()=>Object.values(wheels);api.initializeWheels();
  assert.equal(wheels.hour.scrollTop,6*36);assert.equal(wheels.minute.scrollTop,40*36);
  wheels.minute.scrollTop=41*36;handlers.scroll({target:{closest:()=>wheels.minute}});assert.equal(hiddenTime.value,'07:41','vertical swipe updates minute selection');
  wheels.period.scrollTop=36;handlers.scroll({target:{closest:()=>wheels.period}});assert.equal(hiddenTime.value,'19:41','swiping to PM updates the saved 24-hour time');
  handlers.keydown({key:'ArrowDown',preventDefault(){},target:{closest:()=>wheels.hour}});assert.equal(hiddenTime.value,'20:41','keyboard navigation changes hour');
  wheels.hour.scrollTop=11*36;handlers.scroll({target:{closest:()=>wheels.hour}});assert.equal(hiddenTime.value,'12:41','12 PM is noon');
  wheels.period.scrollTop=0;handlers.scroll({target:{closest:()=>wheels.period}});assert.equal(hiddenTime.value,'00:41','12 AM is midnight');
  context.document.querySelectorAll=originalQuery;
  const pm=api.buildJobs([{...plan,period:'pm',hour:2}],state,before);
  assert.equal(pm.length,14,'afternoon surgery permits morning and noon');
  const surgeryOff={...enabled,days:{'2030-06-10':false}};
  assert.equal(api.buildJobs([plan],{plans:{'plan-one':surgeryOff}},before).length,12,'surgery-day off removes morning reminder');
  assert.equal(api.buildJobs([{...plan,period:'pm',hour:2}],{plans:{'plan-one':surgeryOff}},before).length,12,'surgery-day off removes morning and lunch reminders');
  const surgeryOnly=pm.filter(j=>new Date(j.fire_at).getDate()===10);
  assert.deepEqual(Array.from(surgeryOnly,j=>j.slot),[0,1],'surgery day never includes evening or bedtime');
  const atNoon=api.buildJobs([{...plan,period:'pm',hour:12}],state,before).filter(j=>new Date(j.fire_at).getDate()===10);
  assert.deepEqual(Array.from(atNoon,j=>j.slot),[0],'lunch at arrival time is not scheduled');
  assert.equal(api.buildJobs([{...plan,archived:true}],state,before).length,0);
  assert.equal(api.buildJobs([plan],{plans:{'plan-one':{...enabled,enabled:false}}},before).length,0);
  const late={plans:{'plan-one':{...enabled,times:['10:00','12:00','18:00','22:00']}}};
  assert.equal(api.buildJobs([plan],late,before).length,12,'no reminder after surgery-day arrival');
  assert.equal(api.buildJobs([plan],state,new Date(2030,5,11)).length,0,'past doses do not send');
  assert.ok(!api.renderMenu({...plan,archived:true}));
  await save({...enabled,consent:false});assert.match(status.textContent,/동의/);assert.equal(calls.length,0);
  await save({...enabled,times:['07:00','07:02','18:00','22:00']});assert.match(status.textContent,/5분/);assert.equal(calls.length,0);
  context.Notification.permission='default';allowPermission=false;
  await save();assert.match(status.textContent,/허용되지/);assert.equal(calls.length,0);assert.equal(permissionRequests,1);
  context.Notification.permission='granted';allowPermission=true;
  await save();assert.match(status.textContent,/설정되었습니다/);assert.ok(!submit.disabled);
  assert.equal(calls.at(-1).body.jobs.length,13);assert.equal(calls.at(-1).body.token.length,64);
  assert.ok(!JSON.stringify(calls).includes('checks'),'check records never go to server');
  assert.equal(JSON.parse(data.get(KEY)).pending,false);
  await save(disabledDay);assert.equal(calls.at(-1).body.jobs.length,9);
  assert.equal(JSON.parse(data.get(KEY)).plans['plan-one'].days['2030-06-07'],false,'day choice persists');
  assert.ok(!api.render().includes('name="day2030-06-07" checked'),'disabled date restores correctly');
  await save(surgeryOff);assert.equal(calls.at(-1).body.jobs.length,12);
  assert.equal(JSON.parse(data.get(KEY)).plans['plan-one'].days['2030-06-10'],false,'surgery-day off persists');
  assert.ok(!api.render().includes('name="day2030-06-10" checked'),'surgery-day choice restores');
  await save({...enabled,enabled:false});assert.equal(calls.at(-1).body.jobs.length,0,'off atomically cancels pending jobs');
  failNetwork=true;await save();assert.ok(JSON.parse(data.get(KEY)).pending,'failure stays pending for retry');assert.ok(!submit.disabled);
  failNetwork=false;all=[{...plan,archived:true}];api.plansChanged(all);
  await new Promise(r=>setTimeout(r,5));assert.equal(calls.at(-1).body.jobs.length,0,'archival cancels jobs');
  all=[plan];api.plansChanged(all);await new Promise(r=>setTimeout(r,5));
  all=[];api.plansChanged(all);await new Promise(r=>setTimeout(r,5));assert.equal(calls.at(-1).body.jobs.length,0,'deletion cancels jobs');
  const {validSubscription,validCredentials,validJobs}=await import('../supabase/functions/medication-reminders/validation.mjs');
  assert.ok(validSubscription(sub));
  for(const endpoint of ['http://fcm.googleapis.com/a','https://127.0.0.1/a','https://fcm.googleapis.com.evil.test/a','https://fcm.googleapis.com:444/a','https://user:pass@fcm.googleapis.com/a'])assert.equal(validSubscription({...sub,endpoint}),false);
  assert.ok(validCredentials({id:webcrypto.randomUUID(),token:'a'.repeat(64)}));
  assert.ok(validJobs([{plan_id:'plan-one',slot:0,fire_at:new Date(Date.now()+60000).toISOString()}]));
  assert.equal(validJobs([{plan_id:'<script>',slot:0,fire_at:new Date(Date.now()+60000).toISOString()}]),false);
  const events={},notifications=[],navigations=[];
  vm.runInNewContext(fs.readFileSync('sw.js','utf8'),{URL,Response,self:{registration:{scope:'https://example.com/',showNotification:async(...args)=>notifications.push(args)},addEventListener:(t,f)=>events[t]=f,clients:{matchAll:async()=>[{url:'https://example.com/',navigate:async url=>navigations.push(url),focus(){}}]}}});
  let work;events.push({data:{json:()=>({body:'알림',planId:'plan-one'})},waitUntil:p=>work=p});await work;
  assert.match(notifications[0][1].data.url,/#\/profile\/cataract-before\?plan=plan-one$/);
  events.notificationclick({notification:{data:notifications[0][1].data,close(){}},waitUntil:p=>work=p});await work;assert.equal(navigations.length,1);
  events.notificationclick({notification:{data:{url:'https://evil.example/'},close(){}},waitUntil:p=>work=p});await work;assert.equal(navigations.length,1,'notification cannot navigate to foreign origin');
  console.log('Medication reminders: schedules, AM/PM cutoffs, consent, permissions, persistence, cancellation, retries, endpoint validation and notification navigation passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
