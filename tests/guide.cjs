const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const data=JSON.parse(read('data/public-import.json'));
const content={status:'ready',pages:data.content_pages,doctors:data.doctors,profiles:data.doctor_about_profiles,equipment:data.equipment,hours:data.clinic_hours,settings:{},notices:[],blog:[]};
const elements=new Map(),handlers={},windowHandlers={};
function el(key){
  if(!elements.has(key))elements.set(key,{innerHTML:'',value:'',textContent:'',open:false,clientWidth:300,focus(){},scrollIntoView(options){this.lastView=options;},scrollBy(options){this.lastScroll=options;},querySelectorAll:()=>[],showModal(){this.open=true;},close(){this.open=false;}});
  return elements.get(key);
}
let scheduleCalls=0,scheduleFails=false;
const schedule={doctors:data.doctors.map(d=>({...d,id:String(d.id),weeklySchedules:data.doctor_weekly_schedules.filter(r=>r.doctor_id===d.id)})),schedules:[],closures:[],clinicHours:data.clinic_hours};
const context=vm.createContext({window:{clinicContent:content,addEventListener:(name,fn)=>windowHandlers[name]=fn,scrollTo(){},matchMedia:()=>({matches:true}),loadDoctorScheduleData:async()=>{scheduleCalls++;if(scheduleFails)throw Error('offline');return schedule;}},document:{querySelector:el,querySelectorAll:()=>[],documentElement:{},addEventListener:(name,fn)=>handlers[name]=fn},location:{hash:'#/guide',protocol:'file:'},navigator:{},localStorage:{getItem:()=>null,setItem(){}},URL,console,setTimeout});
for(const file of ['scripts/guide-reference.js','scripts/guide.js','scripts/holidays.js','scripts/schedule-model.js','scripts/vision-before.js','scripts/cataract-before.js','app.js'])vm.runInContext(read(file),context,{filename:file});
const reference=context.window.clinicGuideReference,guide=context.window.ClinicGuide;
const click=dataset=>handlers.click({target:{closest:()=>({dataset,hasAttribute:name=>Object.hasOwn(dataset,name.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase()))})}});
(async()=>{
  assert.equal((el('#main').innerHTML.match(/role="tab" /g)||[]).length,5);
  assert.ok(!el('#main').innerHTML.includes('class="page-top"'));
  assert.ok(!el('#main').innerHTML.includes('class="back"'));
  assert.match(el('#main').innerHTML,/국가유공자 및 국가유공자의 유가족/);
  assert.match(el('#main').innerHTML,/유족 및 며느리 카드 소지자<small class="guide-support-note">\(1954\.12\.31 이전 출생자\)<\/small>/);
  assert.ok(!el('#main').innerHTML.includes('병원 진료시간'));
  assert.ok(!el('#main').innerHTML.includes('<h2>내원 안내</h2>'));
  await click({action:'veterans'});
  const modal=el('#veterans-dialog');assert.equal(modal.open,true);
  assert.match(modal.innerHTML,/2026년 1월/);assert.ok(!modal.innerHTML.includes('2025년 1월'));
  assert.equal((modal.innerHTML.match(/data-close/g)||[]).length,2);
  assert.equal((modal.innerHTML.match(/<article>/g)||[]).length,12);
  assert.match(modal.innerHTML,/약제비 신청/);assert.match(modal.innerHTML,/국가보훈부 안내 보기/);
  await handlers.click({target:{closest:()=>({dataset:{},hasAttribute:name=>name==='data-close',closest:()=>modal})}});assert.equal(modal.open,false);
  await click({guideTab:'facility'});assert.equal(guide.active,'facility');
  assert.equal((el('#main').innerHTML.match(/<figure>/g)||[]).length,21);
  assert.ok(el('#main').innerHTML.indexOf('guide-location-photos')<el('#main').innerHTML.indexOf('class="guide-floor"'));
  for(const name of ['building-exterior','building-parking'])assert.ok(fs.existsSync(path.join(root,'assets/facility/'+name+'.jpg')));
  assert.ok(el('#main').innerHTML.includes('제주시 연북로 449 메디온빌딩 2,3층'));
  assert.ok(el('#main').innerHTML.includes('건물 뒤편 주차장'));
  assert.ok(el('#main').innerHTML.indexOf('병원 진료시간')>el('#main').innerHTML.lastIndexOf('</figure>'));
  assert.equal(reference.facilities.length,2);
  for(const floor of reference.facilities)for(const photo of floor.photos)assert.ok(fs.existsSync(path.join(root,photo.src)),photo.src);
  assert.equal((el('#main').innerHTML.match(/class="guide-gallery-controls"/g)||[]).length,2);
  await click({guideGallery:'0',direction:'1'});assert.ok(el('#guide-gallery-0').lastScroll.left>0);
  await click({guideGallery:'1',direction:'-1'});assert.ok(el('#guide-gallery-1').lastScroll.left<0);
  await click({guideTab:'director'});await new Promise(setImmediate);
  assert.equal(scheduleCalls,1);assert.equal(vm.runInContext('scheduleState',context),'ready');
  let html=el('#main').innerHTML;
  for(const summary of html.match(/<summary>[\s\S]*?<\/summary>/g)||[])assert.ok(!summary.includes('guide-specialties'));
  assert.match(html,/<h3>진료과목<\/h3><span class="guide-specialties">/);
  assert.ok(html.includes('오후 5시까지 진료'));assert.ok(!html.includes('종일 진료 · 17:00까지'));
  assert.ok(html.includes('자세한 진료 일정 보기'));
  // Use canonical doctor names from data to verify source ordering, independent of allocated IDs.
  let previous=-1;for(const name of reference.doctorOrder){const doctor=data.doctors.find(d=>d.name.startsWith(name));const at=html.indexOf('<strong>'+doctor.name+'</strong>');assert.ok(at>previous);previous=at;}
  assert.match(html,/약력/);assert.match(html,/학회활동/);assert.match(html,/guide-weekly/);
  await click({guideTab:'equipment'});assert.equal((el('#main').innerHTML.match(/<article>/g)||[]).length,41);
  assert.ok(el('#main').innerHTML.indexOf('수술 장비')<el('#main').innerHTML.indexOf('검진 장비'));
  await click({guideTab:'history'});for(const year of ['2017','2019','2020','2022','2025','2026'])assert.ok(el('#main').innerHTML.includes('<h4>'+year+'</h4>'));
  await handlers.keydown({key:'Home',preventDefault(){},target:{closest:()=>({dataset:{guideTab:'history'}})}});assert.equal(guide.active,'support');
  content.status='error';guide.select('equipment');vm.runInContext('render()',context);assert.match(el('#main').innerHTML,/다시 불러오기/);assert.ok(!el('#main').innerHTML.includes('<article>'));
  content.status='ready';content.profiles[0].greeting='<img src=x onerror=alert(1)>';guide.select('director');vm.runInContext('render()',context);assert.ok(el('#main').innerHTML.includes('&lt;img src=x'));assert.ok(!el('#main').innerHTML.includes('<img src=x'));
  scheduleFails=true;await vm.runInContext('loadSchedules(true)',context);await new Promise(setImmediate);assert.equal(vm.runInContext('scheduleState',context),'error');assert.equal(scheduleCalls,2,'failed guide schedule must not auto-retry in a render loop');
  for(const route of ['before','after','dream','faq','profile','schedule']){context.location.hash='#/'+route;vm.runInContext('render()',context);assert.ok(!el('#main').innerHTML.includes('class="back"'),route);}
  await click({day:'12'});assert.equal(el('.schedule-day-panel').lastView.block,'start');assert.equal(vm.runInContext('selectedDate.getDate()',context),12);
  for(const stage of ['before','after']){
    context.location.hash='#/'+stage;vm.runInContext('render()',context);
    assert.equal((el('#main').innerHTML.match(/class="surgery-category-button"/g)||[]).length,4);
    for(const [id,label] of [['vision','시력교정'],['cataract','백내장'],['glaucoma','녹내장'],['retina','망막']]){
      context.location.hash='#/'+stage+'/'+id;vm.runInContext('render()',context);
      if(stage==='before'&&id==='vision'){
        assert.ok(el('#main').innerHTML.includes('<h2 id="heading-beforeSurgery" class="vision-guide-header-title">시력교정 검사/수술 전 안내사항</h2>'));
        assert.ok(!el('#main').innerHTML.includes('<h2>시력교정</h2>'));
        assert.ok(!el('#main').innerHTML.includes('section-number'));
      }else assert.ok(el('#main').innerHTML.includes('<h2>'+label+'</h2>'));
      assert.equal(el('#main').innerHTML.includes('id="beforeSurgery"'),stage==='before'&&id==='vision');
      assert.ok(el('#main').innerHTML.includes('href="#/'+stage+'"'));
    }
  }
  context.location.hash='#/before/cataract';vm.runInContext('render()',context);
  assert.equal((el('#main').innerHTML.match(/class="surgery-category-button"/g)||[]).length,2);
  for(const [id,title] of [['precautions','수술 전 주의사항'],['medication','수술 전 약 사용법']]){
    context.location.hash='#/before/cataract/'+id;vm.runInContext('render()',context);
    assert.ok(el('#main').innerHTML.includes('<h2>'+title+'</h2>'));
    assert.ok(el('#main').innerHTML.includes('href="#/before/cataract"'));
    if(id==='precautions'){
      assert.equal((el('#main').innerHTML.match(/class="cataract-preop-card"/g)||[]).length,3);
      for(const text of ['혈전억제제(예: 아스피린)','수술 3일 전','수술 1달 후','아침식사는 간단히!','반드시 보호자와 함께 동행','보청기'])assert.ok(el('#main').innerHTML.includes(text));
    }else assert.ok(!el('#main').innerHTML.includes('cataract-precautions'));
  }
  for(const resource of ['guide.css','scripts/guide.js','scripts/guide-reference.js','assets/veterans-logo.svg'])assert.ok(read('sw.js').includes("'./"+resource+"'"));
  console.log('Guide: tab navigation, 19 facility photos, source ordering, 12 benefit groups, modal close, 2026 correction, managed content escaping, offline handling and back-link removal passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
