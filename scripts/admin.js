(function(){
  'use strict';
  const $=s=>document.querySelector(s),{definitions,payload,safeUrl}=window.ClinicAdminModel;
  const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  const config=window.clinicBackend||{};
  let client,verified=false,authVersion=0,working=false,loading=false,current='doctors',rows=[],doctors=[],page=0,loadVersion=0,editing=null,dirty=false;
  const state=$('#auth-status'),editor=$('#editor'),form=$('#editor-form'),fields=$('#editor-fields');
  const configured=()=>config.adminEnabled===true&&/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(config.url||'')&&/^sb_publishable_/.test(config.publishableKey||'');
  function errorText(error){
    if(error?.code==='23503')return '관련된 원장 또는 다른 항목이 있어 처리할 수 없습니다. 연결된 항목을 먼저 확인해 주세요.';
    if(error?.code==='23505')return '같은 원장·날짜 또는 같은 구분의 항목이 이미 있습니다. 기존 항목을 편집해 주세요.';
    if(error?.code==='42501')return '저장 권한이 없습니다. 관리자 역할과 DB 정책을 확인해 주세요.';
    if(['42P01','PGRST205'].includes(error?.code))return '필요한 테이블이 아직 준비되지 않았습니다. 새 프로젝트의 DB 설정을 확인해 주세요.';
    if(error?.message==='Invalid login credentials')return '이메일 또는 비밀번호를 확인해 주세요.';
    return error?.message||'요청을 처리하지 못했습니다. 인터넷 연결을 확인해 주세요.';
  }
  function gate(value,message=''){
    verified=value;$('#workspace').hidden=!value;$('#logout').hidden=!value;
    if(!value&&configured())$('#login-panel').hidden=false;
    if(message)state.textContent=message;
  }
  async function requireAdmin(){
    if(!client||!configured())throw Error('새 Supabase 연결이 필요합니다.');
    const version=authVersion;
    try{const user=await window.ClinicAdminStore.verify(client);if(version!==authVersion)throw Error('관리자 권한을 다시 확인해 주세요.');return user;}
    catch(error){gate(false,'관리자 권한을 확인하지 못했습니다.');throw error;}
  }
  async function refreshAuth(){
    const version=++authVersion;gate(false,'관리자 권한을 확인하고 있습니다.');
    try{
      const session=await client.auth.getSession();
      if(version!==authVersion)return;
      if(!session.data.session){$('#login-panel').hidden=false;state.textContent='관리자 계정으로 로그인해 주세요.';return;}
      const user=await requireAdmin();if(version!==authVersion)return;
      $('#login-panel').hidden=true;gate(true,`${user.email} · 관리자`);
      if(!editor.open)await load();
    }catch(error){if(version===authVersion){gate(false,errorText(error));$('#login-panel').hidden=false;}}
  }
  function doctorName(id){return doctors.find(row=>String(row.id)===String(id))?.name||'원장 확인 필요';}
  function titleOf(row){const def=definitions[current];return row.title||row.name||(row.doctor_id?doctorName(row.doctor_id):def.fields.find(f=>f.key==='id')?.choices?.[row.id])||row.name||String(row.id||'');}
  function describe(row){
    return definitions[current].fields.filter(f=>!['image','color','checkbox'].includes(f.type)).map(field=>{
      let value=row[field.key];if(value===null||value===undefined||value==='')return '';
      if(field.type==='doctor')value=doctorName(value);
      else if(field.choices)value=field.choices[value]||value;
      else if(Array.isArray(value))value=value.join('\n');
      return field.label+': '+value;
    }).filter(Boolean).join('\n');
  }
  function drawNav(){
    const root=$('#admin-nav');root.replaceChildren();let group='';
    for(const [key,def] of Object.entries(definitions)){
      if(group!==def.group){group=def.group;root.append(el('span',group,'nav-group'));}
      const button=el('button',def.title);button.type='button';if(key===current)button.setAttribute('aria-current','page');
      button.addEventListener('click',()=>{if(working)return;current=key;page=0;$('#search').value='';drawNav();load();});root.append(button);
    }
  }
  async function readAll(table,key='id'){
    let result=[];
    for(;;){const response=await client.from(table).select('*').order(key).range(result.length,result.length+999);if(response.error)throw response.error;result=result.concat(response.data);if(response.data.length<1000)return result;}
  }
  async function load(){
    if(!verified)return;
    const version=++loadVersion,key=current,def=definitions[key];loading=true;rows=[];render();
    $('#group-label').textContent=def.group;$('#section-title').textContent=def.title;$('#section-description').textContent=def.description;$('#add').textContent=def.storage?'이미지 업로드':'새 항목';
    try{
      await requireAdmin();
      if(def.storage){
        let files=[];for(let offset=0;;offset+=100){const response=await client.storage.from('clinic-assets').list('media',{limit:100,offset,sortBy:{column:'name',order:'asc'}});if(response.error)throw response.error;files=files.concat(response.data.filter(file=>file.id));if(response.data.length<100)break;}if(version!==loadVersion||key!==current)return;rows=files;
      }else{
        const response=await Promise.all([readAll(def.table,def.key||'id'),def.table==='doctors'?Promise.resolve(null):readAll('doctors')]);
        if(version!==loadVersion||key!==current)return;
        rows=response[0];doctors=def.table==='doctors'?rows:response[1];
      }
      if(version!==loadVersion||key!==current)return;
      loading=false;$('#list-status').textContent='';render();
    }catch(error){if(version!==loadVersion)return;rows=[];loading=false;$('#list-status').textContent=errorText(error);render(true);}
  }
  function render(failed=false){
    const root=$('#records');root.replaceChildren();$('#add').disabled=loading||failed||!verified;
    $('#refresh').disabled=loading;$('#pagination').replaceChildren();
    if(loading){root.append(el('p','목록을 불러오는 중입니다.','empty-state'));return;}
    if(failed)return;
    const query=$('#search').value.trim().toLocaleLowerCase();
    const matches=rows.filter(row=>(definitions[current].storage?row.name:titleOf(row)+' '+describe(row)).toLocaleLowerCase().includes(query));
    const pages=Math.max(1,Math.ceil(matches.length/20));page=Math.min(page,pages-1);
    if(!matches.length){const empty=el('div',undefined,'empty-state');empty.append(el('h3',query?'검색 결과가 없습니다.':'아직 등록된 항목이 없습니다.'),el('p',query?'다른 검색어를 입력해 주세요.':'새 항목을 추가해 주세요.'));root.append(empty);}
    for(const row of matches.slice(page*20,page*20+20)){
      const article=el('article',undefined,'record'),body=el('div'),actions=el('div',undefined,'record-actions');
      body.append(el('h3',definitions[current].storage?row.name:titleOf(row)),el('p',definitions[current].storage?'클리닉 이미지 자료':describe(row)));
      if(definitions[current].storage){const image=el('img',undefined,'asset-preview');image.src=client.storage.from('clinic-assets').getPublicUrl('media/'+row.name).data.publicUrl;image.alt='등록 이미지';image.loading='lazy';body.prepend(image);}
      const meta=el('div',undefined,'record-meta');if('is_published'in row)meta.append(el('span',row.is_published?'공개':'비공개'));if('is_visible'in row)meta.append(el('span',row.is_visible?'공개':'숨김'));body.append(meta);
      const action=(label,fn)=>{const button=el('button',label,'button');button.addEventListener('click',fn);actions.append(button);};
      if(definitions[current].storage)action('주소 복사',async()=>{const url=client.storage.from('clinic-assets').getPublicUrl('media/'+row.name).data.publicUrl;try{await navigator.clipboard.writeText(url);$('#list-status').textContent='이미지 주소를 복사했습니다.';}catch{$('#list-status').textContent=url;}});
      else{action('미리보기',()=>preview(row));action('편집',()=>openEditor(row));}
      article.append(body,actions);root.append(article);
    }
    const pager=$('#pagination');const prev=el('button','이전','button'),next=el('button','다음','button');prev.disabled=page===0;next.disabled=page===pages-1;prev.onclick=()=>{page--;render();};next.onclick=()=>{page++;render();};pager.append(prev,el('span',`${page+1} / ${pages} · ${matches.length}개`),next);
  }
  function preview(row){$('#preview-title').textContent=titleOf(row);const target=$('#preview-content');target.replaceChildren(el('p',describe(row)));const url=safeUrl(row.image_url||row.photo_url||row.profile_photo_url,true);if(url){const img=el('img');img.src=url;img.alt='등록 이미지';target.prepend(img);}$('#preview').showModal();}
  function openEditor(row){
    if(!verified||working)return;
    const def=definitions[current];editing=row?{...row}:null;dirty=false;form.reset();fields.replaceChildren();$('#editor-error').textContent='';$('#delete').hidden=!row||def.storage;
    $('#editor-title').textContent=def.title+' · '+(row?'편집':'추가');
    if(def.storage){const label=el('label','이미지 선택','field'),input=el('input');input.type='file';input.name='asset';input.accept='image/jpeg,image/png,image/webp,image/gif';input.required=true;label.append(input,el('small','JPG, PNG, WebP, GIF · 최대 5MB'));fields.append(label);}
    for(const field of def.fields){
      const label=el('label',undefined,'field'+(field.type==='checkbox'?' checkbox-field':''));label.append(el('span',field.label));
      let input;
      if(field.type==='select'||field.type==='doctor'){
        input=el('select');const choices=field.type==='doctor'?Object.fromEntries(doctors.map(d=>[d.id,d.name])):field.choices;
        if(field.type==='doctor')input.append(new Option('원장을 선택해 주세요.',''));
        for(const [value,text]of Object.entries(choices))input.append(new Option(text,value));
      }else if(['textarea','lines'].includes(field.type))input=el('textarea');
      else{input=el('input');input.type=field.type==='image'?'text':field.type;}
      input.name=field.key;input.required=!!field.required;input.disabled=!!row&&def.manualKey&&field.key===(def.key||'id');
      let value=row?.[field.key]??field.default??'';
      if(field.type==='checkbox')input.checked=Boolean(value);
      else if(field.type==='lines')input.value=Array.isArray(value)?value.join('\n'):value;
      else{if(field.type==='time')value=String(value).slice(0,5);input.value=value;}
      label.append(input);fields.append(label);
      if(field.type==='image'){
        input.placeholder='https://… 또는 업로드한 이미지 주소';const uploader=el('input');uploader.type='file';uploader.accept='image/jpeg,image/png,image/webp,image/gif';uploader.setAttribute('aria-label',field.label+' 업로드');
        uploader.onchange=async()=>{if(!uploader.files[0])return;setBusy(true);try{const url=await uploadImage(uploader.files[0]);input.value=url;dirty=true;$('#editor-error').textContent='이미지를 업로드했습니다. 저장을 눌러 항목에 연결해 주세요.';}catch(error){$('#editor-error').textContent=errorText(error);}finally{setBusy(false);}};label.append(uploader);
      }
    }
    editor.showModal();
  }
  function setBusy(value){working=value;fields.disabled=value;form.querySelectorAll('button').forEach(button=>button.disabled=value);$('#delete-confirm').querySelectorAll('button').forEach(button=>button.disabled=value);}
  async function uploadImage(file){
    await requireAdmin();
    const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'};
    if(!types[file?.type]||file.size>5*1024*1024)throw Error('JPG, PNG, WebP, GIF 이미지를 5MB 이하로 선택해 주세요.');
    const name='media/'+crypto.randomUUID()+'.'+types[file.type];
    const result=await client.storage.from('clinic-assets').upload(name,file,{contentType:file.type,upsert:false});if(result.error)throw result.error;
    return client.storage.from('clinic-assets').getPublicUrl(name).data.publicUrl;
  }
  form.addEventListener('input',()=>{dirty=true;});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(working)return;$('#editor-error').textContent='';setBusy(true);
    try{
      await requireAdmin();const def=definitions[current];
      if(def.storage)await uploadImage(form.elements.asset.files[0]);
      else{
        const values={};for(const field of def.fields){const input=form.elements.namedItem(field.key);values[field.key]=field.type==='checkbox'?input.checked:input.value;}
        await window.ClinicAdminStore.save(client,current,values,editing);
      }
      dirty=false;editor.close();await load();$('#list-status').textContent='저장했습니다. 앱을 새로 열면 반영됩니다.';
    }catch(error){$('#editor-error').textContent=errorText(error);}finally{setBusy(false);}
  });
  function closeEditor(){if(working)return;if(dirty&&!window.confirm('저장하지 않은 변경을 버릴까요?'))return;editor.close();dirty=false;}
  document.querySelectorAll('[data-editor-close]').forEach(button=>button.onclick=closeEditor);
  editor.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
  $('#delete').onclick=()=>{if(working||!editing)return;$('#delete-name').textContent=titleOf(editing);$('#delete-confirm').showModal();};
  $('#delete-cancel').onclick=()=>$('#delete-confirm').close();
  $('#delete-confirm').addEventListener('cancel',event=>{if(working)event.preventDefault();});
  $('#delete-yes').onclick=async()=>{
    if(working||!editing)return;setBusy(true);
    try{await requireAdmin();await window.ClinicAdminStore.remove(client,current,editing);dirty=false;$('#delete-confirm').close();editor.close();await load();$('#list-status').textContent='삭제했습니다.';}catch(error){$('#delete-confirm').close();$('#editor-error').textContent=errorText(error);}finally{setBusy(false);}
  };
  $('#preview-close').onclick=()=>$('#preview').close();
  $('#search').oninput=()=>{page=0;render();};$('#add').onclick=()=>openEditor(null);$('#refresh').onclick=()=>load();
  $('#login-form').onsubmit=async event=>{
    event.preventDefault();const login=event.currentTarget,button=login.querySelector('button');button.disabled=true;state.textContent='로그인 중입니다.';
    try{const result=await client.auth.signInWithPassword({email:login.elements.email.value.trim(),password:login.elements.password.value});login.elements.password.value='';if(result.error)throw result.error;await refreshAuth();}catch(error){state.textContent=errorText(error);}finally{button.disabled=false;}
  };
  $('#logout').onclick=async()=>{if(working)return;if(editor.open){closeEditor();if(editor.open)return;}const result=await client.auth.signOut({scope:'local'});if(result.error){state.textContent=errorText(result.error);return;}authVersion++;loadVersion++;rows=[];doctors=[];$('#records').replaceChildren();gate(false,'로그아웃했습니다.');$('#login-panel').hidden=false;};
  window.addEventListener('beforeunload',event=>{if(dirty||working){event.preventDefault();event.returnValue='';}});
  document.addEventListener('visibilitychange',()=>{if(!client||working)return;if(document.visibilityState==='hidden'){authVersion++;loadVersion++;gate(false);}else refreshAuth();});
  drawNav();
  if(!configured()){$('#setup-panel').hidden=false;state.textContent='새 Supabase 연결 전에는 관리 데이터 조회와 저장을 실행하지 않습니다.';return;}
  if(!window.supabase?.createClient){state.textContent='인증 모듈을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';return;}
  client=window.supabase.createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}});
  client.auth.onAuthStateChange(event=>{if(['SIGNED_OUT','USER_DELETED'].includes(event)){authVersion++;loadVersion++;gate(false,'다시 로그인해 주세요.');$('#login-panel').hidden=false;}else if(event==='INITIAL_SESSION')window.setTimeout(refreshAuth,0);});
}());
