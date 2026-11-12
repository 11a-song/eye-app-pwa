// 새 프로젝트의 공개 콘텐츠만 읽습니다. 관리자 초안/개인 정보는 조회하지 않습니다.
(function(){
  'use strict';
  const config=window.clinicBackend||{};
  const store={status:'disabled',pages:[],notices:[],profiles:[],doctors:[],equipment:[],hours:[],settings:{},blog:[]};
  window.clinicContent=store;
  if(!config.url||!config.publishableKey)return;
  store.status='loading';
  const read=async(table,query)=>{
    let rows=[];for(;;){const params=new URLSearchParams({...query,offset:String(rows.length),limit:'1000'});
      const response=await fetch(config.url.replace(/\/$/,'')+'/rest/v1/'+table+'?'+params,{headers:{apikey:config.publishableKey},cache:'no-store',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error('공개 안내를 불러오지 못했습니다.');const data=await response.json();if(!Array.isArray(data))throw Error('응답 오류');rows=rows.concat(data);if(data.length<1000)return rows;
    }
  };
  window.reloadClinicContent=async()=>{
    try{
      const result=await Promise.all([
        read('content_pages',{select:'id,page_key,title,content,image_url,sort_order',is_published:'eq.true',order:'sort_order.asc,id.asc'}),
        read('notices',{select:'id,title,content,notice_date,image_url',is_published:'eq.true',order:'notice_date.desc,id.desc'}),
        read('doctor_about_profiles',{select:'doctor_id,greeting,career,activities,specialties,profile_photo_url',is_visible:'eq.true',order:'doctor_id.asc'}),
        read('doctors',{select:'id,name,photo_url',order:'id.asc'}),read('equipment',{select:'id,title,category,description,image_url',order:'id.asc'}),
        read('clinic_hours',{select:'id,start_time,end_time',order:'id.asc'}),read('app_settings',{select:'id,value',order:'id.asc'}),
        read('blog_posts',{select:'id,title,content,post_date,image_url,source,source_url',is_published:'eq.true',order:'post_date.desc,id.desc'})
      ]);
      [store.pages,store.notices,store.profiles,store.doctors,store.equipment,store.hours,,store.blog]=result;
      store.settings=Object.fromEntries(result[6].map(row=>[row.id,row.value]));store.status='ready';
    }catch{store.status='error';}
    window.dispatchEvent(new Event('clinic-content-updated'));
  };
  window.reloadClinicContent();
}());
