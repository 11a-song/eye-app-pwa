const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
class Node{
  constructor(tag='div',text=''){this.tagName=tag.toUpperCase();this.textContent=text;this.children=[];this.dataset={};this.style={};this.attrs={};this.events={};this.value='';this.hidden=false;this.disabled=false;}
  append(...nodes){for(const node of nodes){node.parentElement=this;this.children.push(node);}}
  prepend(node){node.parentElement=this;this.children.unshift(node);}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  setAttribute(key,value){this.attrs[key]=value;}
  addEventListener(key,fn){this.events[key]=fn;}
  querySelectorAll(tag){return descendants(this).filter(node=>node.tagName===tag.toUpperCase());}
  closest(){return this.parentElement;}
  reset(){}
  showModal(){this.open=true;}
  close(){this.open=false;}
}
const descendants=node=>node.children.flatMap(child=>[child,...descendants(child)]);
const text=node=>[node.textContent,...node.children.map(text)].join(' ');
const tags=(node,tag)=>descendants(node).filter(child=>child.tagName===tag.toUpperCase());
const nodes=new Map(),get=selector=>{if(!nodes.has(selector))nodes.set(selector,new Node());return nodes.get(selector);};
const document={createElement:tag=>new Node(tag),querySelector:get,querySelectorAll:()=>[],addEventListener(){}};
get('#add').parentElement=new Node();
get('#editor-form').elements={namedItem:name=>descendants(get('#editor-fields')).find(node=>node.name===name)};
const context=vm.createContext({window:{addEventListener(){},setTimeout},document,URL,console,Option:class extends Node{constructor(label,value){super('option',label);this.value=value;}},setTimeout});
for(const file of ['scripts/admin-model.js','scripts/admin-schedule.js'])vm.runInContext(read(file),context,{filename:file});
const {definitions,safeUrl}=context.window.ClinicAdminModel,view=context.window.ClinicAdminSchedule;
const data={doctors:[{id:1,name:'테스트 원장',color:'#ff0000',photo_url:'javascript:alert(1)'}],weekly:[{id:11,doctor_id:1,weekday:6,period:'full',end_time:'17:00:00',saturday_weeks:'first_third'},{id:12,doctor_id:1,weekday:1,period:'morning'}],dates:[{id:21,doctor_id:1,schedule_date:'2026-11-24',period:'full',end_time:'19:00:00'}],closures:[{id:31,doctor_id:1,start_date:'2026-11-25',end_date:'2026-11-26'}]};
let edits=[];
const root=new Node(),queries={};
view.render(root,{data,errors:{},queries,definitions,safeUrl,canEdit:true,onEdit:(key,row)=>edits.push([key,row])});
const cards=descendants(root).filter(node=>node.dataset.scheduleSection);
assert.equal(cards.length,4);
assert.equal(tags(cards[0],'img').length,0,'unsafe photo URL excluded');
assert.match(text(cards[1]),/테스트 원장 · 2개 일정/);
assert.ok(text(cards[1]).indexOf('월요일')<text(cards[1]).indexOf('토요일'),'weekly entries sorted');
assert.match(text(cards[1]),/첫째·셋째 토요일/);
assert.match(text(cards[1]),/오후 5:00까지/);
tags(cards[1],'button').find(node=>node.textContent==='편집').onclick();
assert.equal(edits[0][0],'weekly');assert.equal(edits[0][1].id,12);
tags(cards[2],'button')[0].onclick();assert.deepEqual(edits[1],['dates',null]);
const search=tags(cards[1],'input')[0];search.value='토요일';search.events.input();assert.match(text(cards[1]),/1개 일정/);assert.equal(queries.weekly,'토요일');
search.value='없는 원장';search.events.input();assert.match(text(cards[1]),/검색 결과가 없습니다/);
const failed=new Node();view.render(failed,{data,errors:{doctors:'조회 오류'},queries:{},definitions,safeUrl,canEdit:true,onEdit(){throw Error('must not edit');}});
assert.ok(tags(failed,'button').every(button=>button.disabled),'doctor query failure disables dependent writes');
const escaped=new Node();view.render(escaped,{data:{...data,doctors:[{id:1,name:'<img src=x onerror=alert(1)>'}]},errors:{},queries:{},definitions,safeUrl,canEdit:true,onEdit(){}});
assert.equal(tags(escaped,'img').length,0,'untrusted name is text, not markup');
assert.match(text(escaped),/<img src=x/);

// Exercise the real admin controller with an in-memory client; no network or DB writes.
let authChange,readError=null,saved=[],removed=[],role='admin';
const client={auth:{getSession:async()=>({data:{session:{}}}),onAuthStateChange(fn){authChange=fn;}},from(table){return {select(){return this;},order(){return this;},async range(){if(table===readError)return {error:Error('query failed')};const key=Object.keys(definitions).find(key=>definitions[key].table===table);return {data:data[key]||[]};}};}};
context.window.clinicBackend={adminEnabled:true,url:'https://example.supabase.co',publishableKey:'sb_publishable_test'};
context.window.supabase={createClient:()=>client};
context.window.ClinicAdminStore={async verify(){if(role!=='admin')throw Error('관리자 권한 없음');return {email:'test@example.invalid'};},async save(client,key,values,row){saved.push({key,values,row});},async remove(client,key,row){removed.push({key,row});}};
vm.runInContext(read('scripts/admin.js'),context,{filename:'scripts/admin.js'});
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
(async()=>{
  authChange('INITIAL_SESSION');await new Promise(resolve=>setTimeout(resolve,10));await flush();
  assert.equal(get('#workspace').hidden,false);
  assert.equal(get('#section-title').textContent,'원장별 일정 관리');
  assert.equal(descendants(get('#records')).filter(node=>node.dataset.scheduleSection).length,4);
  const weekly=descendants(get('#records')).find(node=>node.dataset.scheduleSection==='weekly');
  tags(weekly,'button').find(node=>node.attrs['aria-label']?.includes('토요일')).onclick();
  assert.equal(get('#editor').open,true);
  const fields=get('#editor-form').elements;
  assert.equal(fields.namedItem('end_time').value,'17:00','database time seconds normalized for select');
  for(const [key,value] of Object.entries({doctor_id:'1',weekday:'6',period:'full',end_time:'17:00',saturday_weeks:'first_third'}))fields.namedItem(key).value=value;
  await get('#editor-form').events.submit({preventDefault(){}});
  assert.equal(saved.length,1);assert.equal(saved[0].key,'weekly','grouped view saves to selected table');assert.equal(saved[0].row.id,11);
  assert.ok(tags(get('#records'),'button').some(node=>!node.disabled),'controls reenabled after save');
  const dates=descendants(get('#records')).find(node=>node.dataset.scheduleSection==='dates');tags(dates,'button').find(node=>node.textContent==='편집').onclick();
  assert.equal(fields.namedItem('end_time').value,'19:00');
  fields.namedItem('period').value='morning';get('#editor-fields').onchange({target:fields.namedItem('period')});
  assert.equal(fields.namedItem('end_time').disabled,true,'morning period hides irrelevant end time');
  get('#delete').onclick();await get('#delete-yes').onclick();
  assert.equal(removed[0].key,'dates');assert.equal(removed[0].row.id,21,'delete targets selected record in grouped view');
  readError='doctor_closures';await get('#refresh').onclick();await flush();
  const closures=descendants(get('#records')).find(node=>node.dataset.scheduleSection==='closures');
  assert.match(text(closures),/query failed/);assert.ok(tags(closures,'button').every(node=>node.disabled));
  assert.ok(tags(get('#records'),'details').length,'other successfully loaded sections remain usable');
  role='user';await get('#refresh').onclick();await flush();assert.equal(get('#workspace').hidden,true,'revoked role hides management');
  console.log('Admin schedule: grouped view, sorted weekly accordions, search, safe text/photos, correct save target, partial failures, and authorization passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
