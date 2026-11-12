// Read-only verification of the new project's real public API and imported data.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const expected=JSON.parse(read('data/public-import.json'));
let finished;
const ready=new Promise(resolve=>finished=resolve);
const context=vm.createContext({window:{dispatchEvent:finished},fetch,URLSearchParams,AbortSignal,Event});
vm.runInContext(read('scripts/supabase-config.js'),context);
vm.runInContext(read('scripts/public-content.js'),context);
(async()=>{
  await ready;const store=context.window.clinicContent;
  assert.equal(store.status,'ready');
  for(const [field,table] of Object.entries({pages:'content_pages',notices:'notices',profiles:'doctor_about_profiles',doctors:'doctors',equipment:'equipment',hours:'clinic_hours',blog:'blog_posts'})){
    assert.equal(store[field].length,expected[table].length,table+' count');
    const sorted=rows=>rows.map(row=>{const copy={...row};delete copy.id;return JSON.stringify(Object.fromEntries(Object.entries(copy).sort()));}).sort();
    // Compare exactly the fields that the public client requested; generated target IDs differ.
    if(!['profiles','doctors'].includes(field)){
      const keys=Object.keys(store[field][0]||{}).filter(key=>key!=='id');
      const wanted=expected[table].map(row=>Object.fromEntries(keys.map(key=>[key,row[key]??null])));
      assert.deepEqual(sorted(JSON.parse(JSON.stringify(store[field]))),sorted(wanted),table+' content');
    }
  }
  assert.deepEqual(JSON.parse(JSON.stringify(store.settings)),Object.fromEntries(expected.app_settings.map(row=>[row.id,row.value])));
  for(const row of [...store.doctors,...store.profiles,...store.equipment,...store.pages,...store.notices])for(const key of ['photo_url','profile_photo_url','image_url']){
    if(!row[key])continue;assert.ok(row[key].startsWith('assets/'),'independent local asset');assert.ok(fs.existsSync(path.join(root,row[key])));
  }
  assert.ok(store.doctors.some(row=>row.photo_url?.startsWith('assets/imported/')));
  console.log('Live public client: all 8 reads, imported content, settings and independent image files passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
