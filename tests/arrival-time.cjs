const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const handlers={},context=vm.createContext({window:{},document:{addEventListener:(type,fn)=>handlers[type]=fn}});
vm.runInContext(fs.readFileSync('scripts/arrival-time.js','utf8'),context);
const api=context.window.ClinicArrivalTime;
for(const value of ['09:37','11:59','08:29','07:59','19:01','20:00','24:00','12:60','8:30','bad',''])assert.equal(api.parse(value),null,value+' must be rejected');
for(const [value,period,hour,minute] of [['08:30','am',8,30],['11:50','am',11,50],['12:00','pm',12,0],['14:30','pm',2,30],['19:00','pm',7,0]]){
  const parsed=api.parse(value);assert.equal(parsed.period,period);assert.equal(parsed.hour,hour);assert.equal(parsed.minute,minute);
}
const saved={period:'am',hour:1,minute:50};
const oldMinute={period:'am',hour:9,minute:37};
assert.ok(api.render(oldMinute,'legacy').includes('value="09:40"'));assert.equal(oldMinute.minute,37,'new picker does not overwrite old saved minutes');
const labels=api.render(null,'labels');
for(const label of ['오전 8시','오전 9시','오후 12시','오후 1시','오후 7시'])assert.ok(labels.includes('>'+label+'</button>'));
assert.ok(api.render(saved,'old').includes('value="08:30"'));assert.equal(saved.hour,1,'rendering an out-of-range existing time cannot rewrite saved records');
assert.ok(api.render({period:'pm',hour:7,minute:0},'end').includes('value="19:00"'));
const wheels={},time={value:'14:30'};
const editors={},error={hidden:true,textContent:'',hasAttribute:()=>true};
const picker={dataset:{},nextElementSibling:error,querySelector:selector=>selector==='input'?time:selector.startsWith('[data-arrival-input')?editors[selector.match(/="(.*?)"/)[1]]:wheels[selector.match(/="(.*?)"/)[1]],querySelectorAll:()=>Object.values(wheels)};
for(const part of ['hour','minute'])editors[part]={hidden:true,value:'',dataset:{arrivalInput:part},style:{},attributes:{},closest:()=>picker,matches:()=>true,setAttribute(name,value){this.attributes[name]=value;},removeAttribute(name){delete this.attributes[name];},focus(){this.focused=true;},select(){}};
function makeRows(values,part){return values.map(value=>({id:part+'-'+value,dataset:{arrivalOption:String(value)},setAttribute(){}}));}
for(const [part,values,initial] of [['hour',Array.from({length:12},(_,i)=>i+8),14],['minute',[0,10,20,30,40,50],30]]){
  let rows=makeRows(values,part);
  wheels[part]={dataset:{value:String(initial),arrivalWheel:part,prefix:part},scrollTop:0,querySelectorAll:()=>rows,closest:()=>picker,setAttribute(){},set innerHTML(html){rows=makeRows([...html.matchAll(/data-arrival-option="(\d+)"/g)].map(m=>Number(m[1])),part);}};
}
api.initialize({querySelectorAll:()=>Object.values(wheels)});
assert.equal(wheels.hour.scrollTop,6*36);assert.equal(wheels.minute.scrollTop,3*36);
function swipe(part,index){wheels[part].scrollTop=index*36;handlers.scroll({target:{closest:()=>wheels[part]}});}
swipe('hour',0);assert.equal(time.value,'08:30');assert.equal(wheels.minute.querySelectorAll().length,3,'8 AM minutes start at 30');
swipe('minute',2);assert.equal(time.value,'08:50');
swipe('hour',11);assert.equal(time.value,'19:00');assert.equal(wheels.minute.querySelectorAll().length,1,'7 PM only permits minute 00');
assert.equal(picker.dataset.period,'pm');
swipe('hour',10);swipe('minute',4);assert.equal(time.value,'18:40','other hours use ten-minute steps');
handlers.keydown({key:'Home',preventDefault(){},target:{closest:()=>wheels.hour}});assert.equal(time.value,'08:40');
assert.equal(picker.dataset.period,'am');
handlers.keydown({key:'Home',preventDefault(){},target:{closest:()=>wheels.minute}});assert.equal(time.value,'08:30');
handlers.keydown({key:'ArrowUp',preventDefault(){},target:{closest:()=>wheels.hour}});assert.equal(time.value,'08:30','cannot go below opening time');
handlers.keydown({key:'End',preventDefault(){},target:{closest:()=>wheels.hour}});assert.equal(time.value,'19:00');
handlers.keydown({key:'ArrowDown',preventDefault(){},target:{closest:()=>wheels.hour}});assert.equal(time.value,'19:00','cannot exceed closing time');
const option=wheels.hour.querySelectorAll()[4];option.closest=()=>wheels.hour;
handlers.click({target:{closest:()=>option}});assert.equal(time.value,'12:00');assert.equal(api.parse(time.value).period,'pm');
const form={querySelectorAll:selector=>selector==='[data-arrival-input]'?Object.values(editors):selector.includes('hour')?[wheels.hour]:[wheels.minute]};
assert.equal(api.flush(form),true);assert.equal(time.value,'12:00');
function type(part,value,key='Enter'){
  handlers.keydown({key:'Enter',preventDefault(){},target:{closest:()=>wheels[part]}});
  assert.equal(editors[part].hidden,false,'selected wheel opens a numeric editor');
  editors[part].value=value;
  handlers.keydown({key,preventDefault(){},target:editors[part]});
}
type('hour','2');assert.equal(time.value,'14:00','typing 2 selects afternoon 2 within clinic hours');assert.equal(picker.dataset.period,'pm');
type('minute','40');assert.equal(time.value,'14:40');
type('hour','8');assert.equal(time.value,'08:40');assert.equal(picker.dataset.period,'am');
type('minute','20');assert.equal(editors.minute.hidden,false);assert.equal(editors.minute.attributes['aria-invalid'],'true');assert.equal(error.hidden,false);assert.equal(time.value,'08:40');
assert.equal(api.flush(form),false,'invalid typed values prevent Save');
editors.minute.value='30';handlers.focusout({target:editors.minute});assert.equal(time.value,'08:30');assert.equal(editors.minute.hidden,true);
type('hour','19');assert.equal(time.value,'19:00','typing closing hour clamps minutes to 00');
type('minute','10');assert.equal(api.flush(form),false,'cannot type a time beyond closing');
handlers.keydown({key:'Escape',preventDefault(){},target:editors.minute});assert.equal(editors.minute.hidden,true);assert.equal(time.value,'19:00');
type('hour','20');assert.equal(api.flush(form),false,'typed hour must remain in operating range');
handlers.keydown({key:'Escape',preventDefault(){},target:editors.hour});
type('hour','13');assert.equal(time.value,'13:00','24-hour input is also accepted');
type('minute','37');assert.equal(api.flush(form),false,'typed minutes follow the ten-minute rule');
editors.minute.value='50';assert.equal(api.flush(form),true);assert.equal(time.value,'13:50','Save commits pending valid typing');
const currentOption=wheels.hour.querySelectorAll().find(row=>row.dataset.arrivalOption==='13');currentOption.closest=()=>wheels.hour;
handlers.click({target:{closest:()=>currentOption}});assert.equal(editors.hour.hidden,false,'tapping the selected hour opens typing');
handlers.keydown({key:'Escape',preventDefault(){},target:editors.hour});
swipe('hour',0);assert.equal(time.value,'08:50','swipe selection remains usable after typing');
console.log('Arrival time: swipe and numeric typing, blur/Enter/Save/Escape, operating limits, ten-minute validation, AM/PM colors and legacy preservation passed');
