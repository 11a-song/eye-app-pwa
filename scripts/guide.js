(function(){
  'use strict';
  const reference=window.clinicGuideReference;
  const tabs=[['support','보훈·지원'],['facility','시설'],['director','의료진'],['equipment','장비'],['history','History']];
  let active='support';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function safeUrl(value){
    if(/^assets\/[\w./-]+$/.test(value||'')&&!value.includes('..'))return value;
    try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password?url.href:'';}catch{return '';}
  }
  const image=(value,alt,cls='')=>safeUrl(value)?`<img class="${cls}" src="${esc(safeUrl(value))}" alt="${esc(alt)}" loading="lazy" decoding="async">`:'';
  const list=values=>`<ul>${(Array.isArray(values)?values:[]).map(v=>`<li>${esc(v)}</li>`).join('')}</ul>`;
  function supportLabel(value){
    const text=String(value??'');
    const note=text.includes('유족 및 며느리 카드 소지자')?text.match(/\s*(\([^)]*\))\s*$/):null;
    return note?`${esc(text.slice(0,note.index))}<small class="guide-support-note">${esc(note[1])}</small>`:esc(text);
  }
  function status(content){
    if(content?.status==='ready')return '';
    return `<div class="card guide-status" role="status"><p>${content?.status==='loading'?'병원 정보를 불러오는 중입니다.':'병원 정보를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.'}</p>${content?.status==='loading'?'':'<button class="text-button" data-guide-retry>다시 불러오기</button>'}</div>`;
  }
  function hours(content){
    if(content?.status!=='ready')return status(content);
    const labels={weekday:'월 ~ 금요일',saturday:'토요일',holiday:'공휴일',substitute:'대체공휴일',lunch:'점심시간'};
    const rows=Object.keys(labels).map(id=>content.hours.find(r=>r.id===id)).filter(Boolean);
    const time=value=>String(value||'').slice(0,5);
    return `<section class="card guide-hours"><h2>병원 진료시간</h2><dl class="hours">${rows.map(r=>`<div><dt>${labels[r.id]}</dt><dd>${esc(time(r.start_time))} ~ ${esc(time(r.end_time))}</dd></div>`).join('')}</dl><a class="guide-inline-link" href="#/schedule">원장별 진료 일정 확인 <span aria-hidden="true">→</span></a></section>`;
  }
  function documents(){
    const data=reference.documents;
    if(!data)return '';
    const note=value=>value&&value!=='-'?`<small>${esc(value)}</small>`:'';
    return `<section class="guide-documents" aria-labelledby="guide-documents-title"><h2 id="guide-documents-title">${esc(data.title)}</h2><p class="guide-documents-intro">${esc(data.description)}</p><section class="guide-document-section"><h3>각종 증명서 발급 공통 안내</h3><ol class="guide-document-notes">${data.notes.map(text=>`<li>${esc(text)}</li>`).join('')}</ol></section><section class="guide-document-section"><h3>대상별 구비서류 현황</h3><div class="guide-document-applicants">${data.applicants.map(row=>`<article><h4>${esc(row.name)}</h4><p>${esc(row.required)}</p>${note(row.note)}</article>`).join('')}</div></section><section class="guide-document-section"><h3>증명서 발급 수수료</h3><dl class="guide-document-fees">${data.fees.map(row=>`<div><dt>${esc(row.name)}</dt><dd><strong>${esc(row.price)}</strong>${note(row.note)}</dd></div>`).join('')}</dl></section><section class="guide-document-section"><h3>서식 다운로드</h3><div class="guide-document-downloads">${data.forms.map(form=>`<article><h4>${esc(form.title)}</h4><div>${form.files.map(file=>`<a href="assets/forms/${esc(file.file)}" download="${esc(file.file)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(form.title)} ${esc(file.format)} 다운로드"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/></svg>${esc(file.format)} 다운로드</a>`).join('')}</div></article>`).join('')}</div></section></section>`;
  }
  function support(content){
    return `<section class="guide-veterans" aria-labelledby="guide-veterans-title">${image(reference.logo,'국가보훈부','guide-veterans-logo')}<h2 id="guide-veterans-title">연세제일안과는 <strong>보훈위탁병원</strong>입니다.</h2><dl class="guide-info-rows">${reference.summary.details.map(r=>`<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}</dl><div class="guide-detail-action"><button class="guide-outline-button" data-action="veterans" aria-haspopup="dialog" aria-controls="veterans-dialog">보훈안내 자세히 <span aria-hidden="true">↗</span></button></div><h3>진료비 지원</h3><ul class="guide-support-list">${reference.summary.support.map(item=>`<li>${supportLabel(item)}</li>`).join('')}</ul></section>${documents()}${content?.status==='ready'?content.pages.filter(r=>r.page_key==='guide'&&r.title.replace(/\s/g,'')!=='내원안내').map(r=>`<section class="card"><h2>${esc(r.title)}</h2><div class="managed-text">${esc(r.content)}</div></section>`).join(''):''}`;
  }
  function locationPhotos(){
    return `<div class="guide-carousel guide-location-carousel"><div id="guide-gallery-location" class="guide-location-photos" tabindex="0" role="region" aria-roledescription="캐러셀" aria-label="병원 건물과 주차장. 좌우로 넘겨 보세요."><figure>${image('assets/facility/building-parking.jpg','메디온빌딩 뒤편 주차장')}<figcaption>건물 뒤편 주차장</figcaption></figure><figure>${image('assets/facility/building-exterior.jpg','연세제일안과 메디온빌딩 외관')}<figcaption>제주시 연북로 449 메디온빌딩 2,3층</figcaption></figure></div></div>`;
  }
  function initializeLocationCarousel(previousScroll){
    const gallery=document.querySelector('#guide-gallery-location');
    if(!gallery||!Number.isFinite(gallery.scrollWidth))return;
    gallery.scrollLeft=Number.isFinite(previousScroll)?previousScroll:Math.max(0,gallery.scrollWidth-gallery.clientWidth);
  }
  function galleryControls(id,label){
    return `<div class="guide-gallery-controls"><button type="button" data-guide-gallery="${id}" data-direction="-1" aria-label="${esc(label)} 이전 사진">←</button><button type="button" data-guide-gallery="${id}" data-direction="1" aria-label="${esc(label)} 다음 사진">→</button></div>`;
  }
  function facilities(content){
    return `${locationPhotos()}${reference.facilities.map((floor,index)=>`<section class="guide-floor"><header><div class="guide-floor-heading"><h3>${esc(floor.floor)}</h3><div class="guide-floor-copy"><strong>${esc(floor.description)}</strong><div class="guide-floor-contact">${floor.phoneLabel?`<span class="guide-floor-phone-label">${esc(floor.phoneLabel.trim())}</span>`:''}<a class="guide-floor-phone" href="tel:${esc(String(floor.phone||'').replace(/\D/g,''))}">${esc(floor.phone||'')}</a><a class="guide-call-button" href="tel:${esc(String(floor.phone||'').replace(/\D/g,''))}" aria-label="${esc(floor.floor)} ${esc(floor.description)} 전화 연결하기">연결하기</a></div></div></div>${galleryControls(index,floor.floor)}</header><div class="guide-carousel"><div id="guide-gallery-${index}" class="guide-gallery" tabindex="0" role="region" aria-label="${esc(floor.floor)} 시설 사진. 좌우로 넘겨 보세요.">${floor.photos.map((photo,i)=>`<figure>${image(photo.src,photo.alt)}<figcaption><span>${esc(photo.caption)}</span><small>${i+1} / ${floor.photos.length}</small></figcaption></figure>`).join('')}</div></div></section>`).join('')}${hours(content)}`;
  }
  function doctors(content,schedule,scheduleState){
    if(content?.status!=='ready')return status(content);
    const name=d=>String(d.name).replace(/\s*원장\s*$/,'').trim();
    const rank=d=>{const i=reference.doctorOrder.indexOf(name(d));return i<0?Infinity:i;};
    const rows=content.doctors.filter(d=>content.profiles.some(p=>String(p.doctor_id)===String(d.id))).slice().sort((a,b)=>rank(a)-rank(b));
    return rows.map(d=>{
      const p=content.profiles.find(p=>String(p.doctor_id)===String(d.id));
      const weekly=schedule.doctors.find(row=>String(row.id)===String(d.id))?.weeklySchedules||[];
      const days=['일','월','화','수','목','금','토'];
      const weeklyHtml=scheduleState==='ready'?(weekly.length?`<dl class="guide-weekly">${weekly.slice().sort((a,b)=>(a.weekday+6)%7-(b.weekday+6)%7).map(row=>`<div><dt>${days[row.weekday]}요일${row.saturday_weeks==='first_third'?' · 첫째·셋째':row.saturday_weeks==='second_fourth'?' · 둘째·넷째':''}</dt><dd>${row.period!=='morning'&&String(row.end_time).slice(0,5)==='17:00'?'오후 5시까지 진료':(row.period==='morning'?'오전 진료':'종일 진료')+(row.period!=='morning'&&row.end_time?' · '+esc(String(row.end_time).slice(0,5))+'까지':'')}</dd></div>`).join('')}</dl>`:'<p>등록된 정기 일정이 없습니다.</p>'):`<p>${scheduleState==='error'?'일정을 불러오지 못했습니다. 진료 일정 메뉴에서 다시 확인해 주세요.':'정기 일정을 불러오는 중입니다.'}</p>`;
      return `<details class="guide-doctor" name="guide-doctors" data-guide-detail="doctor-${esc(d.id)}"><summary>${image(p.profile_photo_url||d.photo_url||'assets/doctor-placeholder.svg',d.name,'guide-doctor-avatar')}<span class="guide-doctor-title"><small>안과전문의</small><strong>${esc(d.name)}</strong></span><svg class="guide-expand" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></summary><div class="guide-doctor-body"><h3>진료과목</h3><span class="guide-specialties">${(p.specialties||[]).map(v=>`<span>${esc(v)}</span>`).join('')}</span><h3>인사말</h3><p class="managed-text">${esc(p.greeting||'인사말은 준비 중입니다.')}</p>${[['약력',p.career],['학회활동',p.activities]].map(([title,values])=>`<h3>${title}</h3>${values?.length?list(values):'<p>안내를 준비 중입니다.</p>'}`).join('')}<h3>진료일정</h3>${weeklyHtml}<p class="note">날짜별 변경·휴진 일정은 진료 일정 메뉴에서 확인해 주세요.</p><a class="guide-inline-link guide-doctor-schedule-link" href="#/schedule">자세한 진료 일정 보기 <span aria-hidden="true">→</span></a></div></details>`;
    }).join('')+(rows.length?'':'<section class="card"><p>의료진 소개를 준비 중입니다.</p></section>');
  }
  function equipment(content){
    if(content?.status!=='ready')return status(content);
    const labels={surgery:'수술 장비',exam:'검진 장비',treatment:'치료 장비'};
    return reference.equipmentOrder.map(category=>{
      const title=labels[category];
      const rows=content.equipment.filter(r=>r.category===category);
      return `<details class="guide-equipment-group" name="guide-equipment" data-guide-detail="equipment-${category}"><summary><span>${title}<small>${rows.length}종</small></span><svg class="guide-expand" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></summary><div class="guide-equipment-list">${rows.map(r=>`<article><div class="guide-equipment-photo">${image(r.image_url,r.title+' 장비')}</div><div class="guide-equipment-copy"><small>${esc(title.replace(/\s/g,''))}</small><h3>${esc(r.title)}</h3><p>${esc(r.description||'')}</p></div></article>`).join('')||'<p>장비 안내를 준비 중입니다.</p>'}</div></details>`;
    }).join('');
  }
  function history(){return reference.historyMarkup;}
  function render(content,schedule,scheduleState){
    const panes={support:()=>support(content),facility:()=>facilities(content),director:()=>doctors(content,schedule,scheduleState),equipment:()=>equipment(content),history};
    return `<div class="guide-sticky-header" id="guide-sticky-header"><header class="guide-topbar"><a class="guide-home-logo" href="#/" aria-label="연세제일안과 홈"><img src="${esc(safeUrl(content?.settings?.logo_url)||'assets/logo.svg')}" alt="연세제일안과" width="140" height="25"></a><h1>병원 이용 안내</h1></header><div class="guide-tabs" id="guide-tabs" role="tablist" aria-label="병원 이용 안내 항목">${tabs.map(([id,label])=>`<button type="button" role="tab" id="guide-tab-${id}" data-guide-tab="${id}" aria-controls="guide-panel" aria-selected="${active===id}" tabindex="${active===id?'0':'-1'}">${label}</button>`).join('')}</div></div><section id="guide-panel" class="guide-panel" role="tabpanel" tabindex="0" aria-labelledby="guide-tab-${active}">${panes[active]()}</section>`;
  }
  function veterans(){
    const data=reference.veterans;
    const emphasis="'제주지역 안과'로는 최초, 유일하게 보훈위탁병원으로 지정";
    const intro=esc(data.intro).replace(esc(emphasis),`<strong>${esc(emphasis)}</strong>`);
    const personBadge=person=>`<span class="guide-benefit-person">${esc(person)}</span>`;
    const notes=items=>items.map(p=>`<p class="guide-veterans-note">${esc(p.text)}${p.links.map(a=>safeUrl(a.url)?` <a href="${esc(safeUrl(a.url))}" target="_blank" rel="noopener noreferrer">${esc(a.label)}</a>`:'').join('')}</p>`).join('');
    return `<header class="guide-modal-header"><h2 id="veterans-title">보훈위탁병원 안내</h2><button type="button" class="guide-close" data-close autofocus>닫기 <span aria-hidden="true">×</span></button></header><div class="guide-modal-content">${image(reference.logo,'국가보훈부','guide-veterans-logo')}<p class="guide-veterans-intro">${intro}</p><h3>보훈위탁병원 진료비 지원 기준</h3><div class="guide-benefits">${data.groups.map(r=>`<article><h4><span class="guide-benefit-title">${supportLabel(r.target)}</span>${personBadge(r.person)}</h4><dl><div><dt>진료비 지원</dt><dd>${esc(r.care)}</dd></div><div><dt>약제비 지원</dt><dd>${esc(r.medicine)}</dd></div></dl></article>`).join('')}</div>${notes(data.footnotes.slice(0,-1))}<h3>공통 적용 조건 및 지원 제외 항목</h3><dl class="guide-condition-list">${data.conditions.map(r=>`<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}</dl>${notes(data.footnotes.slice(-1))}<button type="button" class="primary-button" data-close>닫기</button></div>`;
  }
  window.ClinicGuide={tabs,render,veterans,initializeLocationCarousel,get active(){return active;},select(id){if(tabs.some(([key])=>key===id))active=id;}};
}());
