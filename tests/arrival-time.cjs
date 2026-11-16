const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const handlers={},context=vm.createContext({window:{},document:{addEventListener:(type,fn)=>handlers[type]=fn}});
vm.runInContext(fs.readFileSync('scripts/arrival-time.js','utf8'),context);
const api=context.window.ClinicArrivalTime;
for(const value of ['08:29','07:59','19:01','20:00','24:00','12:60','8:30','bad',''])assert.equal(api.parse(value),null,value+' must be rejected');
for(const [value,period,hour,minute] of [['08:30','am',8,30],['11:59','am',11,59],['12:00','pm',12,0],['14:30','pm',2,30],['19:00','pm',7,0]]){
  const parsed=api.parse(value);assert.equal(parsed.period,period);assert.equal(parsed.hour,hour);assert.equal(parsed.minute,minute);
}
const saved={period:'am',hour:1,minute:50};
assert.ok(api.render(saved,'old').includes('value="08:30"'));assert.equal(saved.hour,1,'rendering an out-of-range existing time cannot rewrite saved records');
assert.ok(api.render({period:'pm',hour:7,minute:0},'end').includes('value="19:00"'));
const wheels={},time={value:'14:30'};
const picker={querySelector:selector=>selector==='input'?time:wheels[selector.match(/="(.*?)"/)[1]]};
function makeRows(values,part){return values.map(value=>({id:part+'-'+value,dataset:{arrivalOption:String(value)},setAttribute(){}}));}
for(const [part,values,initial] of [['hour',Array.from({length:12},(_,i)=>i+8),14],['minute',Array.from({length:60},(_,i)=>i),30]]){
  let rows=makeRows(values,part);
  wheels[part]={dataset:{value:String(initial),arrivalWheel:part,prefix:part},scrollTop:0,querySelectorAll:()=>rows,closest:()=>picker,setAttribute(){},set innerHTML(html){rows=makeRows([...html.matchAll(/data-arrival-option="(\d+)"/g)].map(m=>Number(m[1])),part);}};
}
api.initialize({querySelectorAll:()=>Object.values(wheels)});
assert.equal(wheels.hour.scrollTop,6*36);assert.equal(wheels.minute.scrollTop,30*36);
function swipe(part,index){wheels[part].scrollTop=index*36;handlers.scroll({target:{closest:()=>wheels[part]}});}
swipe('hour',0);assert.equal(time.value,'08:30');assert.equal(wheels.minute.querySelectorAll().length,30,'8 AM minutes start at 30');
swipe('minute',29);assert.equal(time.value,'08:59');
swipe('hour',11);assert.equal(time.value,'19:00');assert.equal(wheels.minute.querySelectorAll().length,1,'7 PM only permits minute 00');
swipe('hour',10);swipe('minute',37);assert.equal(time.value,'18:37','other hours permit every minute');
handlers.keydown({key:'Home',preventDefault(){},target:{closest:()=>wheels.hour}});assert.equal(time.value,'08:37');
handlers.keydown({key:'Home',preventDefault(){},target:{closest:()=>wheels.minute}});assert.equal(time.value,'08:30');
handlers.keydown({key:'ArrowUp',preventDefault(){},target:{closest:()=>wheels.hour}});assert.equal(time.value,'08:30','cannot go below opening time');
handlers.keydown({key:'End',preventDefault(){},target:{closest:()=>wheels.hour}});assert.equal(time.value,'19:00');
handlers.keydown({key:'ArrowDown',preventDefault(){},target:{closest:()=>wheels.hour}});assert.equal(time.value,'19:00','cannot exceed closing time');
const option=wheels.hour.querySelectorAll()[4];option.closest=()=>wheels.hour;
handlers.click({target:{closest:()=>option}});assert.equal(time.value,'12:00');assert.equal(api.parse(time.value).period,'pm');
api.flush({querySelectorAll:selector=>selector.includes('hour')?[wheels.hour]:[wheels.minute]});assert.equal(time.value,'12:00');
console.log('Arrival time: swipe/keyboard/tap selection, 08:30–19:00 limits, dynamic minute ranges, AM/PM conversion and legacy preservation passed');
