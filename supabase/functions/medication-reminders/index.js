import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import webpush from 'npm:web-push@3.6.7';
import {ALLOWED_ORIGINS,validSubscription,validCredentials,validJobs} from './validation.mjs';

const db=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const digest=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
const check=({data,error})=>{if(error)throw Error('database');return data;};
let keyPromise;
async function keys(){
  if(!keyPromise)keyPromise=(async()=>{
    let value=check(await db.rpc('medication_push_keys'));
    if(!value?.publicKey){const pair=webpush.generateVAPIDKeys();value=check(await db.rpc('medication_push_keys',{p_public:pair.publicKey,p_private:pair.privateKey}));}
    return value;
  })().catch(e=>{keyPromise=null;throw e;});
  return keyPromise;
}
async function send(subscription,payload,k){
  if(!validSubscription(subscription))return 410;
  const request=webpush.generateRequestDetails(subscription,JSON.stringify(payload),{
    TTL:600,urgency:'high',vapidDetails:{subject:'https://jeileye.2025work11a.workers.dev',publicKey:k.publicKey,privateKey:k.privateKey}
  });
  const response=await fetch(request.endpoint,{method:'POST',headers:request.headers,body:new Uint8Array(request.body),redirect:'error',signal:AbortSignal.timeout(8000)});
  await response.body?.cancel();
  return response.status;
}
const payload=(job,test=false)=>({title:'연세제일안과 · 안약 알림',body:test?'테스트 알림입니다. 안약 알림을 받을 준비가 되었습니다.':'안약을 넣을 시간입니다. 오늘의 안약 스케줄을 확인해 주세요.',
  planId:job.plan_id,tag:test?'jeileye-reminder-test':`jeileye-${job.id}`});
async function dispatch(k){
  const jobs=check(await db.rpc('medication_push_claim'))||[];
  let sent=0,failed=0;
  for(let offset=0;offset<jobs.length;offset+=10)await Promise.all(jobs.slice(offset,offset+10).map(async job=>{
    try {
      const device=check(await db.from('medication_push_devices').select('subscription').eq('id',job.device_id).maybeSingle());
      if(!device)return;
      // A concurrent settings replacement may already have cancelled this job.
      const current=check(await db.from('medication_push_jobs').select('id').eq('id',job.id).eq('state','processing').maybeSingle());
      if(!current)return;
      const code=await send(device.subscription,payload(job),k);
      if(code===404||code===410){check(await db.from('medication_push_devices').delete().eq('id',job.device_id));failed++;return;}
      const ok=code>=200&&code<300; if(ok)sent++;else failed++;
      check(await db.from('medication_push_jobs').update({state:ok?'sent':code===429||code>=500?'pending':'failed'}).eq('id',job.id));
    }catch{failed++;await db.from('medication_push_jobs').update({state:'pending'}).eq('id',job.id);}
  }));
  return {claimed:jobs.length,sent,failed};
}
Deno.serve(async req=>{
  const origin=req.headers.get('origin'),allowed=!origin||ALLOWED_ORIGINS.has(origin);
  const headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',
    ...(origin&&allowed?{'Access-Control-Allow-Origin':origin}:{}),
    'Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
  const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(!allowed)return reply({error:'origin'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  const action=new URL(req.url).pathname.split('/').pop();
  try {
    const k=await keys();
    if(action==='config'&&req.method==='GET')return reply({publicKey:k.publicKey});
    if(req.method!=='POST')return reply({error:'method'},405);
    if(action==='dispatch'){
      const token=req.headers.get('x-reminder-dispatch')||'';
      if(!token||await digest(token)!==await digest(k.dispatchToken))return reply({error:'unauthorized'},401);
      return reply(await dispatch(k));
    }
    if(Number(req.headers.get('content-length')||0)>65536)return reply({error:'size'},413);
    const text=await req.text();if(text.length>65536)return reply({error:'size'},413);
    let body;try{body=JSON.parse(text);}catch{return reply({error:'json'},400);}
    if(!validCredentials(body))return reply({error:'credentials'},400);
    const hash=await digest(body.token);
    if(action==='save'){
      if(!validSubscription(body.subscription)||!validJobs(body.jobs)||!Number.isSafeInteger(body.revision)||body.revision<=0)return reply({error:'settings'},400);
      const {data,error}=await db.rpc('medication_push_save',{p_id:body.id,p_hash:hash,p_endpoint_hash:await digest(body.subscription.endpoint),p_subscription:body.subscription,p_revision:body.revision,p_jobs:body.jobs});
      if(error)return reply({error:'save'},error.code==='28000'||error.code==='23505'?403:500);
      return reply({ok:true,applied:data});
    }
    if(action==='test'){
      const device=check(await db.from('medication_push_devices').select('subscription,token_hash').eq('id',body.id).maybeSingle());
      if(!device||device.token_hash!==hash)return reply({error:'unauthorized'},401);
      const threshold=new Date(Date.now()-30000).toISOString();
      const changed=check(await db.from('medication_push_devices').update({last_test_at:new Date().toISOString()}).eq('id',body.id).or(`last_test_at.is.null,last_test_at.lt.${threshold}`).select('id'));
      if(!changed?.length)return reply({error:'rate'},429);
      const code=await send(device.subscription,payload({plan_id:/^[a-z0-9-]{1,70}$/.test(body.planId||'')?body.planId:'',id:'test'},true),k);
      return code>=200&&code<300?reply({ok:true}):reply({error:'push',expired:code===404||code===410},502);
    }
    return reply({error:'route'},404);
  }catch{return reply({error:'server'},500);}
});
