// Read-only export of the reference site's public API. No Auth or patient tables.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const sourceRoot='C:/Users/2025w/OneDrive/Desktop/Git-song22/song-22';
const origin='https://yzrpwqkcpkqimfpuexqd.supabase.co';
const key='sb_publishable_XWXSCiDaDlkwRd4lsFquCw_4dBJKEKK';
const tables={
  doctors:'id,name,initial,color,photo_url',
  doctor_weekly_schedules:'doctor_id,weekday,period,end_time,saturday_weeks',
  doctor_date_schedules:'doctor_id,schedule_date,period,end_time',
  doctor_closures:'doctor_id,start_date,end_date',
  clinic_hours:'id,start_time,end_time',
  doctor_about_profiles:'doctor_id,greeting,career,activities,specialties,profile_photo_url,is_visible',
  equipment:'category,title,description,image_url',
  notices:'notice_date,title,content,image_url',
  blog_posts:'post_date,title,content,source,source_url,is_published'
};
async function read(table,select){
  const rows=[];
  for(;;){
    const params=new URLSearchParams({select,limit:'500',offset:String(rows.length)});
    if(table==='blog_posts')params.set('is_published','eq.true');
    if(table==='doctor_about_profiles')params.set('is_visible','eq.true');
    const response=await fetch(origin+'/rest/v1/'+table+'?'+params,{headers:{apikey:key},signal:AbortSignal.timeout(30000)});
    if(!response.ok)throw Error(table+': '+response.status+' '+await response.text());
    const batch=await response.json();rows.push(...batch);if(batch.length<500)return rows;
  }
}
(async()=>{
  const result={};
  for(const [table,select] of Object.entries(tables)){result[table]=await read(table,select);console.log(table,result[table].length);}
  result.notices.forEach(row=>row.is_published=true);
  const images=new Map();fs.mkdirSync(path.join(root,'assets/imported'),{recursive:true});
  for(const rows of Object.values(result))for(const row of rows)for(const field of ['photo_url','profile_photo_url','image_url']){
    const url=row[field];if(!url)continue;
    if(!images.has(url)){
      let bytes,ext;
      if(url.startsWith('assets/')&&!url.includes('..')){bytes=fs.readFileSync(path.join(sourceRoot,url));ext=path.extname(url);}
      else {
        const parsed=new URL(url);if(parsed.protocol!=='https:'||parsed.hostname!==new URL(origin).hostname)throw Error('Review image host: '+url);
        const response=await fetch(url,{signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error('Image '+response.status+': '+url);
        const mime=response.headers.get('content-type')?.split(';')[0];ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif'}[mime];
        if(!ext)throw Error('Review image MIME: '+mime);bytes=Buffer.from(await response.arrayBuffer());
      }
      const relative='assets/imported/'+crypto.createHash('sha256').update(bytes).digest('hex').slice(0,24)+ext;
      fs.writeFileSync(path.join(root,relative),bytes);images.set(url,relative);
    }
    row[field]=images.get(url);
  }
  fs.mkdirSync(path.join(root,'data'),{recursive:true});
  fs.writeFileSync(path.join(root,'data/reference-public.json'),JSON.stringify(result,null,2)+'\n');
  fs.writeFileSync(path.join(root,'data/image-map.json'),JSON.stringify(Object.fromEntries(images),null,2)+'\n');
  console.log('Independent local image copies:',images.size);
})().catch(error=>{console.error(error);process.exitCode=1;});
