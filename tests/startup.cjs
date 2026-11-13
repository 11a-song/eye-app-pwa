const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),elements=new Map(),events={};
function element(key){
  if(!elements.has(key))elements.set(key,{innerHTML:'',textContent:'',hidden:true,open:false,querySelectorAll:()=>[],focus(){},showModal(){this.open=true;},close(){this.open=false;}});
  return elements.get(key);
}
const location={href:'https://example.com/#/',hash:'#/',protocol:'https:'};
const context=vm.createContext({
  window:{location,matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener:(name,fn)=>events[name]=fn,dispatchEvent:event=>events[event.type]?.(event),scrollTo(){}},
  document:{querySelector:element,querySelectorAll:()=>[],documentElement:{toggleAttribute(){}},addEventListener(){}},
  location,navigator:{userAgent:'Android Chrome'},localStorage:{getItem:()=>null,setItem(){}},
  fetch:async()=>({ok:true,json:async()=>[]}),URL,URLSearchParams,AbortSignal,Event,console,setTimeout
});
(async()=>{
  vm.runInContext(fs.readFileSync(path.join(root,'assets/app.js'),'utf8'),context,{filename:'assets/app.js'});
  assert.equal((element('#main').innerHTML.match(/class="menu-bar"/g)||[]).length,6);
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
  console.log('Startup: production bundle, mobile welcome, home render, content refresh and local font slices passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
