const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),elements=new Map(),events={},clicks=[],historyWrites=[],saved=new Map();
function element(key){
  if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',hidden:true,open:false,querySelectorAll:()=>[],focus(){},showModal(){this.open=true;},close(){this.open=false;}});
  return elements.get(key);
}
const location={href:'https://example.com/#/',hash:'#/',protocol:'https:'};
const context=vm.createContext({
  window:{location,history:{replaceState(state,title,url){historyWrites.push(url);location.hash=url;}},matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(name,fn)=>events[name]=fn,dispatchEvent:event=>events[event.type]?.(event),scrollTo(){}},
  document:{querySelector:element,querySelectorAll:()=>[],documentElement:{toggleAttribute(){}},addEventListener(name,fn){if(name==='click')clicks.push(fn);}},
  location,navigator:{userAgent:'Android Chrome'},localStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value)},
  fetch:async()=>({ok:true,json:async()=>[]}),URL,URLSearchParams,AbortSignal,Event,console,setTimeout,clearTimeout
});
(async()=>{
  vm.runInContext(fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),context,{filename:'assets/app.js'});
  assert.equal((element('#main').innerHTML.match(/class="menu-bar"/g)||[]).length,6);
  saved.set('jeileye-cataract-preop-v1','patient records remain on this device');
  location.hash='#/guide';vm.runInContext('render()',context);
  vm.runInContext("window.ClinicGuide.select('equipment'); calendarMonth=new Date(2030,0,1); selectedDate=new Date(2030,0,12); scheduleDoctor='old-doctor';",context);
  let prevented=false;
  const homeLink={getAttribute:name=>name==='href'?'#/':null};
  for(const click of clicks)await click({button:0,preventDefault(){prevented=true;},target:{closest:selector=>selector.includes('[href="#/"]')?homeLink:null}});
  assert.equal(prevented,true);
  assert.equal(location.hash,'#/');
  assert.equal(historyWrites.at(-1),'#/');
  assert.equal(context.window.ClinicGuide.active,'support');
  assert.equal(vm.runInContext('scheduleDoctor',context),'');
  assert.notEqual(vm.runInContext('selectedDate.getFullYear()',context),2030);
  location.hash='#/guide';vm.runInContext('render()',context);
  context.window.ClinicGuide.select('facility');
  location.hash='#/';events.hashchange();
  assert.equal(context.window.ClinicGuide.active,'support','Browser navigation back to home resets branch state too');
  let finishOld,finishNew;
  context.window.loadDoctorScheduleData=()=>new Promise(resolve=>{finishOld=resolve;});
  const oldRequest=vm.runInContext('loadSchedules(true)',context);
  vm.runInContext('goHome()',context);
  context.window.loadDoctorScheduleData=()=>new Promise(resolve=>{finishNew=resolve;});
  const newRequest=vm.runInContext('loadSchedules(true)',context);
  finishOld({doctors:[{id:'old'}],schedules:[],closures:[]});
  await oldRequest;
  assert.equal(vm.runInContext('scheduleState',context),'loading','An abandoned branch cannot clear the new request');
  finishNew({doctors:[{id:'new'}],schedules:[],closures:[]});
  await newRequest;
  assert.equal(vm.runInContext('scheduleData.doctors[0].id',context),'new');
  assert.equal(saved.get('jeileye-cataract-preop-v1'),'patient records remain on this device');
  assert.equal(element('#install-welcome').hidden,false);
  assert.ok(context.window.CataractMedication);
  assert.ok(context.window.ClinicGuide);
  assert.ok(context.window.ClinicSchedule);
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(context.window.clinicContent.status,'ready');
  assert.equal((element('#main').innerHTML.match(/class="menu-bar"/g)||[]).length,6);
  const css=fs.readFileSync(path.join(root,'fonts.css'),'utf8');
  const faces=[...css.matchAll(/@font-face\s*\{([^}]+)\}/g)];
  assert.equal(faces.length,92);
  for(const face of faces){
    const file=face[1].match(/url\(([^)]+)\)/)[1];
    assert.equal(fs.readFileSync(path.join(root,file)).subarray(0,4).toString(),'wOF2');
  }
  saved.delete('jeileye-cataract-preop-v1');
  location.hash='#/guide';vm.runInContext('render()',context);
  const scheduleLink={dataset:{},getAttribute:name=>name==='href'?'#/profile':null,hasAttribute:()=>false};
  let blocked=false;
  for(const click of clicks)await click({preventDefault(){blocked=true;},target:{closest:selector=>selector.includes('[href^="#/profile"]')?scheduleLink:null}});
  assert.equal(blocked,true);
  assert.equal(location.hash,'#/guide','No saved surgery date: keep the current page');
  assert.match(element('#toast').textContent,/수술일을 생성한 후/);
  location.hash='#/profile/cataract-before';vm.runInContext('render()',context);
  assert.equal(location.hash,'#/','Direct links cannot bypass the schedule requirement');
  const plan={id:'test-plan',eye:'left',surgeryDate:'2026-11-20',period:'am',hour:9,minute:0};
  saved.set('jeileye-cataract-preop-v1',JSON.stringify({plans:[plan],checks:{}}));
  blocked=false;
  for(const click of clicks)await click({preventDefault(){blocked=true;},target:{closest:selector=>selector.includes('[href^="#/profile"]')?scheduleLink:null}});
  assert.equal(blocked,false);
  location.hash='#/profile';vm.runInContext('render()',context);
  assert.equal(location.hash,'#/profile');
  assert.match(element('#main').innerHTML,/백내장 수술 전/);
  vm.runInContext('goHome()',context);
  console.log('Startup: production bundle, mobile welcome, home render, content refresh and local font slices passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
