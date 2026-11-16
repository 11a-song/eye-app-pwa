const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const handlers={},events={},data=new Map(),requests=[],testCalls=[],status={textContent:''},button={disabled:false};
let ready=true,opened=0,all=[{id:'native-plan',eye:'left',surgeryDate:'2030-06-10',period:'pm',hour:2,minute:0,archived:false}];
const bridge={status:()=>JSON.stringify({ready,reason:ready?'':'전체 화면 알림 권한을 허용해 주세요.'}),openSettings:()=>opened++,replace:json=>{requests.push(JSON.parse(json));return '{"ok":true}';},test:plan=>{testCalls.push(plan);return '{"ok":true}';}};
const context=vm.createContext({window:{JeileyeNativeAlarm:bridge,CataractMedication:{getPlans:()=>all},addEventListener:(name,fn)=>events[name]=fn},location:{hash:'#/profile/reminders?plan=native-plan'},
  document:{addEventListener:(name,fn)=>handlers[name]=fn,querySelector:selector=>selector==='#reminder-status'?status:null},localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},
  fetch:()=>{throw Error('Native alarms must not contact the push server');},Date,console,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync('scripts/native-alarms.js','utf8'),context);
vm.runInContext(fs.readFileSync('scripts/medication-reminders.js','utf8'),context);
function form(enabled=true){const fields={enabled:{checked:enabled},time0:{value:'07:00'},time1:{value:'12:00'},time2:{value:'18:00'},time3:{value:'22:00'}};for(let i=0;i<4;i++)fields['slot'+i]={checked:true};return {id:'medication-reminder-form',dataset:{plan:'native-plan'},elements:{namedItem:n=>fields[n]||null},querySelector:()=>button};}
async function save(enabled=true){await handlers.submit({target:form(enabled),preventDefault(){}});}
(async()=>{
  const html=context.window.MedicationReminders.render();
  assert.ok(html.includes('data-native-alarm-settings'));assert.ok(!html.includes('class="reminder-consent"'),'device alarms do not claim to upload personal data');
  assert.ok(!html.includes('data-test-medication-reminder disabled'));
  await save();assert.equal(requests.at(-1).jobs.length,14);assert.deepEqual(requests.at(-1).activePlans,['native-plan']);
  assert.ok(!data.get('jeileye-medication-reminders-v1').includes('subscription'),'native mode requires no Web Push subscription or login');
  await handlers.click({target:{closest:selector=>selector==='[data-test-medication-reminder]'?button:null}});assert.deepEqual(testCalls,['native-plan']);assert.match(status.textContent,/10초/);
  await save(false);assert.equal(requests.at(-1).jobs.length,0);assert.equal(requests.at(-1).activePlans.length,0);
  ready=false;const count=requests.length;await save();assert.equal(requests.length,count);assert.match(status.textContent,/전체 화면/);
  await handlers.click({target:{closest:selector=>selector==='[data-native-alarm-settings]'?button:null}});assert.equal(opened,1);
  ready=true;await save();all=[];context.window.MedicationReminders.plansChanged(all);await new Promise(resolve=>setTimeout(resolve,5));assert.equal(requests.at(-1).jobs.length,0,'deleting the surgery cancels native reservations');
  console.log('Native alarm bridge: offline scheduling, permissions, test alarm, consent isolation, cancellation and PWA separation passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
