const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');
for (const file of ['app.js','sw.js','scripts/schedule-source.js','scripts/schedule-model.js','scripts/holidays.js']) new vm.Script(read(file),{filename:file});
const context = vm.createContext({window:{},fetch,URLSearchParams,AbortSignal});
for (const file of ['scripts/holidays.js','scripts/schedule-model.js','scripts/schedule-source.js']) vm.runInContext(read(file),context);
const model = context.window.ClinicSchedule;
const doctor = {id:'1',name:'검증용',weekdays:[1,6],weeklySchedules:[{weekday:1,period:'full'},{weekday:6,period:'morning',saturday_weeks:'first_third'}]};
const data = {doctors:[doctor],schedules:[],closures:[]};
assert.equal(model.entries(data,'2026-11-07').length,1,'first Saturday');
assert.equal(model.entries(data,'2026-11-14').length,0,'second Saturday excluded');
assert.equal(model.entries(data,'2026-11-21').length,1,'third Saturday');
assert.equal(model.entries(data,'2026-11-28').length,0,'fourth Saturday excluded');
assert.equal(model.entries(data,'2026-11-09','other').length,0,'doctor filter');
data.schedules.push({doctorId:'1',date:'2026-11-09',period:'morning'});
assert.equal(model.entries(data,'2026-11-09').length,1,'override replaces weekly rule');
assert.equal(model.entries(data,'2026-11-09')[0].period,'morning');
data.closures.push({doctorId:'1',startDate:'2026-11-09',endDate:'2026-11-11'});
assert.equal(model.entries(data,'2026-11-09').length,0,'closure overrides date schedule');
assert.equal(model.closuresOn(data,'2026-11-11').length,1,'inclusive closure end');
assert.equal(model.closuresOn(data,'2026-11-12').length,0);
assert.equal(model.workHours({period:'full'},'2026-12-25').label,'오전','holiday morning');
assert.equal(model.workHours({period:'morning'},'2026-10-05').hours,'08:30 ~ 19:00','substitute holiday');
assert.equal(model.workHours({period:'full',endTime:'17:00:00'},'2026-11-09').hours,'08:30 ~ 17:00');
for (const icon of JSON.parse(read('manifest.webmanifest')).icons) assert.ok(fs.existsSync(path.join(root,icon.src)));
console.log('Syntax, schedule priority, alternating Saturdays, filtering, holiday hours, and PWA assets: passed');
if (process.argv.includes('--live')) (async()=>{
  const result = await context.window.loadDoctorScheduleData();
  assert.ok(result.doctors.length > 0,'live doctors returned');
  assert.ok(result.doctors.some(d=>d.weeklySchedules.length),'live weekly schedules returned');
  // Compare with the reference homepage's actual scheduling functions.
  const sourceRoot = 'C:/Users/2025w/OneDrive/Desktop/Git-song22/song-22';
  const original = fs.readFileSync(path.join(sourceRoot,'js/home.js'),'utf8');
  const functions = original.slice(original.indexOf('  function entries(date)'),original.indexOf('  function renderDoctorFilters()'));
  const reference = vm.createContext({window:context.window,doctors:result.doctors,schedules:result.schedules,closures:result.closures,holidays:context.window.holidayData,selectedDoctor:'',closureOnly:false,doctorById:id=>result.doctors.find(d=>d.id===id)});
  vm.runInContext(functions,reference);
  let compared = 0;
  for (const filter of ['',...result.doctors.map(d=>d.id)]) {
    reference.selectedDoctor=filter;
    for(let day=1;day<=30;day++) {
      const date='2026-11-'+String(day).padStart(2,'0');
      const actual=model.entries(result,date,filter), expected=reference.entries(date);
      const normalize=rows=>rows.map(row=>[row.doctorId,row.period,row.endTime || null]).sort();
      assert.equal(JSON.stringify(normalize(actual)),JSON.stringify(normalize(expected)),date+' filter '+filter);
      for(const row of actual) assert.equal(model.workHours(row,date).label,reference.workHours(row,date).morning?'오전':'종일');
      compared++;
    }
  }
  const elements = new Map();
  const element = selector => {
    if(!elements.has(selector)) elements.set(selector,{innerHTML:'',textContent:'',value:'',focus(){}});
    return elements.get(selector);
  };
  const app = vm.createContext({window:{...context.window,loadDoctorScheduleData:async()=>result,addEventListener(){},scrollTo(){}},document:{querySelector:element,querySelectorAll:()=>[],documentElement:{},addEventListener(){}},location:{hash:'#/schedule',protocol:'file:'},navigator:{},localStorage:{getItem:()=>null},console,setTimeout});
  vm.runInContext(read('app.js'),app);
  await vm.runInContext('loadSchedules()',app);
  vm.runInContext('calendarMonth=new Date(2026,10,1);selectedDate=new Date(2026,10,12);calendar()',app);
  assert.equal(vm.runInContext('scheduleState',app),'ready');
  assert.ok(element('#doctor').innerHTML.includes(result.doctors[0].name),'live doctor options');
  assert.ok(element('#schedule-detail').innerHTML.includes('schedule-entry'),'selected date cards');
  assert.equal((element('#calendar').innerHTML.match(/data-day=/g)||[]).length,30);
  app.window.loadDoctorScheduleData=async()=>{throw Error('offline');};
  await vm.runInContext('loadSchedules(true)',app);
  assert.ok(element('#schedule-detail').innerHTML.includes('다시 불러오기'),'retry on failure');
  assert.ok(!element('#schedule-detail').innerHTML.includes('schedule-entry'),'no stale schedules on failure');
  console.log(JSON.stringify({liveDoctors:result.doctors.length,weeklyRules:result.doctors.reduce((n,d)=>n+d.weeklySchedules.length,0),dateOverrides:result.schedules.length,closures:result.closures.length,referenceComparisons:compared,appRendering:'passed',offlineError:'passed'}));
})().catch(error=>{console.error(error);process.exitCode=1;});
