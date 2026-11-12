(function () {
  'use strict';
  const f=(key,label,type='text',options={})=>({key,label,type,...options});
  const doctor=f('doctor_id','원장','doctor',{required:true});
  const period=f('period','진료 구분','select',{required:true,choices:{full:'종일',morning:'오전'}});
  const published=f('is_published','앱에 공개','checkbox',{default:true});
  const photo=(key='image_url',label='이미지')=>f(key,label,'image');
  const definitions={
    doctors:{group:'진료 일정',title:'원장 정보',description:'원장 이름, 달력 색상과 사진을 관리합니다.',table:'doctors',fields:[f('name','원장 이름','text',{required:true}),f('initial','표시 문자'),f('color','색상','color',{default:'#2d83f5'}),photo('photo_url','원장 사진')]},
    weekly:{group:'진료 일정',title:'정기 진료 일정',description:'매주 반복되는 진료와 격주 토요일 일정을 설정합니다.',table:'doctor_weekly_schedules',fields:[doctor,f('weekday','요일','select',{required:true,number:true,choices:{0:'일',1:'월',2:'화',3:'수',4:'목',5:'금',6:'토'}}),period,f('end_time','종일 진료 종료','select',{choices:{'19:00':'오후 7시','17:00':'오후 5시'},default:'19:00'}),f('saturday_weeks','토요일 주차','select',{choices:{all:'매주',first_third:'첫째·셋째',second_fourth:'둘째·넷째'},default:'all'})]},
    dates:{group:'진료 일정',title:'날짜별 변경 일정',description:'선택한 날짜에 한해 정기 일정보다 우선 적용합니다.',table:'doctor_date_schedules',fields:[doctor,f('schedule_date','진료 날짜','date',{required:true}),period,f('end_time','종료 시간','select',{choices:{'19:00':'오후 7시','17:00':'오후 5시'},default:'19:00'})]},
    closures:{group:'진료 일정',title:'휴진 기간',description:'시작일과 종료일을 포함하며 다른 진료 일정보다 우선합니다.',table:'doctor_closures',fields:[doctor,f('start_date','시작일','date',{required:true}),f('end_date','종료일','date',{required:true})]},
    hours:{group:'병원 정보',title:'병원 진료시간',description:'앱의 병원 이용 안내와 일정 화면에 반영됩니다.',table:'clinic_hours',key:'id',manualKey:true,fields:[f('id','구분','select',{required:true,choices:{weekday:'월~금',saturday:'토요일',holiday:'공휴일',substitute:'대체공휴일',lunch:'점심시간'}}),f('start_time','시작','time',{required:true}),f('end_time','종료','time',{required:true})]},
    profiles:{group:'병원 정보',title:'의료진 소개',description:'인사말, 약력, 학회활동과 진료분야를 관리합니다.',table:'doctor_about_profiles',key:'doctor_id',manualKey:true,fields:[doctor,f('greeting','인사말','textarea'),f('career','약력 · 한 줄에 하나씩','lines'),f('activities','학회활동 · 한 줄에 하나씩','lines'),f('specialties','진료분야 · 한 줄에 하나씩','lines'),photo('profile_photo_url','소개 사진'),f('is_visible','소개 공개','checkbox',{default:true})]},
    equipment:{group:'병원 정보',title:'보유장비',description:'장비 분류와 사진, 설명을 관리합니다.',table:'equipment',fields:[f('category','분류','select',{required:true,choices:{exam:'검사',surgery:'수술',treatment:'치료'}}),f('title','장비명','text',{required:true}),f('description','설명','textarea'),photo()]},
    pages:{group:'앱 콘텐츠',title:'안내문 · FAQ',description:'메뉴별 안내문과 자주 묻는 질문을 작성하고 공개합니다.',table:'content_pages',fields:[f('page_key','메뉴','select',{required:true,choices:{guide:'병원 이용 안내',before:'수술 전',after:'수술 후',dream:'드림렌즈',faq:'FAQ'}}),f('title','제목 / 질문','text',{required:true}),f('content','내용 / 답변','textarea',{required:true}),photo(),f('sort_order','표시 순서','number',{default:0}),published]},
    notices:{group:'앱 콘텐츠',title:'공지사항',description:'공개된 공지는 앱 홈 화면에 표시됩니다.',table:'notices',fields:[f('notice_date','공지 날짜','date',{required:true}),f('title','제목','text',{required:true}),f('content','내용','textarea',{required:true}),photo(),published]},
    blog:{group:'앱 콘텐츠',title:'블로그',description:'글과 출처를 저장하고 공개 여부를 관리합니다.',table:'blog_posts',fields:[f('post_date','작성일','date',{required:true}),f('title','제목','text',{required:true}),f('content','본문','textarea',{required:true}),f('source','출처'),f('source_url','출처 주소','url'),photo(),published]},
    settings:{group:'설정',title:'앱 기본 설정',description:'병원명, 로고, 상담과 예약 주소를 관리합니다.',table:'app_settings',key:'id',manualKey:true,fields:[f('id','설정 이름','select',{required:true,choices:{clinic_name:'병원명',logo_url:'로고 주소',kakao_url:'카카오톡 주소',naver_url:'네이버 예약 주소',phone:'대표전화'}}),f('value','설정 값','text',{required:true})]},
    assets:{group:'설정',title:'이미지 자료실',description:'사진을 업로드한 뒤 주소를 복사해 콘텐츠에서 사용하세요.',storage:true,fields:[]}
  };
  const safeUrl=(value,relative=false)=>{
    if(!value)return '';
    if(relative&&/^assets\/[\w./-]+$/.test(value)&&!value.includes('..'))return value;
    try{const url=new URL(value);return url.protocol==='https:'?url.href:'';}catch{return '';}
  };
  function payload(def,values){
    const result={};
    for(const field of def.fields){
      let value=values[field.key];
      if(field.required&&(value===null||value===undefined||String(value).trim()===''))throw Error(field.label+'을(를) 입력해 주세요.');
      if(field.type==='checkbox')value=Boolean(value);
      else if(field.type==='lines')value=String(value||'').split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
      else if(field.type==='number'||field.number||field.type==='doctor'){
        value=Number(value);if(!Number.isSafeInteger(value)||(field.type==='doctor'&&value<1))throw Error(field.label+' 값을 확인해 주세요.');
      }else value=String(value??'').trim();
      if(field.required&&(value===''||value===undefined))throw Error(field.label+'을(를) 입력해 주세요.');
      if(field.choices&&!Object.prototype.hasOwnProperty.call(field.choices,String(value)))throw Error(field.label+' 값을 확인해 주세요.');
      if((field.type==='image'||field.type==='url')&&value&&!safeUrl(value,field.type==='image'))throw Error(field.label+'에는 HTTPS 주소를 입력해 주세요.');
      if(field.type==='color'&&!/^#[0-9a-f]{6}$/i.test(value))throw Error('색상을 확인해 주세요.');
      result[field.key]=value===''?null:value;
    }
    if(result.start_date&&result.end_date&&result.end_date<result.start_date)throw Error('종료일은 시작일보다 빠를 수 없습니다.');
    if(result.start_time&&result.end_time&&result.end_time<=result.start_time)throw Error('종료 시간은 시작 시간보다 늦어야 합니다.');
    if(def.table==='app_settings'){
      if(/_url$/.test(result.id)&&!safeUrl(result.value,result.id==='logo_url'))throw Error('유효한 HTTPS 주소를 입력해 주세요.');
      if(result.id==='phone'&&!/^[+\d\s()-]{5,30}$/.test(result.value))throw Error('전화번호를 확인해 주세요.');
    }
    return result;
  }
  window.ClinicAdminModel={definitions,payload,safeUrl};
}());
