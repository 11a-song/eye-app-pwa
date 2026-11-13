(function(){
  'use strict';
  const reference=window.clinicGuideReference;
  const tabs=[['support','보훈·지원'],['facility','시설'],['director','의료진'],['equipment','장비'],['history','연혁']];
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
  function support(content){
    return `<section class="guide-veterans" aria-labelledby="guide-veterans-title">${image(reference.logo,'국가보훈부','guide-veterans-logo')}<h2 id="guide-veterans-title">연세제일안과는 <strong>보훈위탁병원</strong>입니다.</h2><dl class="guide-info-rows">${reference.summary.details.map(r=>`<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}</dl><div class="guide-detail-action"><button class="guide-outline-button" data-action="veterans" aria-haspopup="dialog" aria-controls="veterans-dialog">보훈안내 자세히 <span aria-hidden="true">↗</span></button></div><h3>진료비 지원</h3><ul class="guide-support-list">${reference.summary.support.map(item=>`<li>${supportLabel(item)}</li>`).join('')}</ul></section>${content?.status==='ready'?content.pages.filter(r=>r.page_key==='guide'&&r.title.replace(/\s/g,'')!=='내원안내').map(r=>`<section class="card"><h2>${esc(r.title)}</h2><div class="managed-text">${esc(r.content)}</div></section>`).join(''):''}`;
  }
  function facilities(content){
    return `<div class="guide-section-heading"><h2>시설 안내</h2><p>사진을 좌우로 넘겨 병원 내부를 둘러보세요.</p></div>${reference.facilities.map((floor,index)=>`<section class="guide-floor"><header><div><h3>${esc(floor.floor)}</h3><p>${esc(floor.description)}</p></div><div class="guide-gallery-controls"><button type="button" data-guide-gallery="${index}" data-direction="-1" aria-label="${esc(floor.floor)} 이전 사진">←</button><button type="button" data-guide-gallery="${index}" data-direction="1" aria-label="${esc(floor.floor)} 다음 사진">→</button></div></header><div id="guide-gallery-${index}" class="guide-gallery" tabindex="0" role="region" aria-label="${esc(floor.floor)} 시설 사진. 좌우로 넘겨 보세요.">${floor.photos.map((photo,i)=>`<figure>${image(photo.src,photo.alt)}<figcaption><span>${esc(photo.caption)}</span><small>${i+1} / ${floor.photos.length}</small></figcaption></figure>`).join('')}</div></section>`).join('')}${hours(content)}`;
  }
  function doctors(content,schedule,scheduleState){
    if(content?.status!=='ready')return status(content);
    const name=d=>String(d.name).replace(/\s*원장\s*$/,'').trim();
    const rank=d=>{const i=reference.doctorOrder.indexOf(name(d));return i<0?Infinity:i;};
    const rows=content.doctors.filter(d=>content.profiles.some(p=>String(p.doctor_id)===String(d.id))).slice().sort((a,b)=>rank(a)-rank(b));
    return '<div class="guide-section-heading"><h2>의료진 소개</h2><p>원장님을 선택하면 인사말과 약력을 확인할 수 있습니다.</p></div>'+rows.map(d=>{
      const p=content.profiles.find(p=>String(p.doctor_id)===String(d.id));
      const weekly=schedule.doctors.find(row=>String(row.id)===String(d.id))?.weeklySchedules||[];
      const days=['일','월','화','수','목','금','토'];
      const weeklyHtml=scheduleState==='ready'?(weekly.length?`<dl class="guide-weekly">${weekly.slice().sort((a,b)=>(a.weekday+6)%7-(b.weekday+6)%7).map(row=>`<div><dt>${days[row.weekday]}요일${row.saturday_weeks==='first_third'?' · 첫째·셋째':row.saturday_weeks==='second_fourth'?' · 둘째·넷째':''}</dt><dd>${row.period==='morning'?'오전 진료':'종일 진료'}${row.period!=='morning'&&row.end_time?' · '+esc(String(row.end_time).slice(0,5))+'까지':''}</dd></div>`).join('')}</dl>`:'<p>등록된 정기 일정이 없습니다.</p>'):`<p>${scheduleState==='error'?'일정을 불러오지 못했습니다. 진료 일정 메뉴에서 다시 확인해 주세요.':'정기 일정을 불러오는 중입니다.'}</p>`;
      return `<details class="guide-doctor" name="guide-doctors" data-guide-detail="doctor-${esc(d.id)}"><summary>${image(p.profile_photo_url||d.photo_url||'assets/doctor-placeholder.svg',d.name,'guide-doctor-avatar')}<span class="guide-doctor-title"><small>안과전문의</small><strong>${esc(d.name)}</strong><span class="guide-specialties">${(p.specialties||[]).map(v=>`<span>${esc(v)}</span>`).join('')}</span></span><span class="guide-expand" aria-hidden="true">+</span></summary><div class="guide-doctor-body"><h3>인사말</h3><p class="managed-text">${esc(p.greeting||'인사말은 준비 중입니다.')}</p>${[['약력',p.career],['학회활동',p.activities]].map(([title,values])=>`<h3>${title}</h3>${values?.length?list(values):'<p>안내를 준비 중입니다.</p>'}`).join('')}<h3>진료일정</h3>${weeklyHtml}<p class="note">날짜별 변경·휴진 일정은 진료 일정 메뉴에서 확인해 주세요.</p><a class="guide-inline-link" href="#/schedule">진료 일정 보기 <span aria-hidden="true">→</span></a></div></details>`;
    }).join('')+(rows.length?'':'<section class="card"><p>의료진 소개를 준비 중입니다.</p></section>');
  }
  function equipment(content){
    if(content?.status!=='ready')return status(content);
    const labels={surgery:'수술 장비',exam:'검진 장비',treatment:'치료 장비'};
    return '<div class="guide-section-heading"><h2>보유장비</h2><p>분류를 선택하면 장비 사진과 설명을 볼 수 있습니다.</p></div>'+reference.equipmentOrder.map(category=>{
      const title=labels[category];
      const rows=content.equipment.filter(r=>r.category===category);
      return `<details class="guide-equipment-group" name="guide-equipment" data-guide-detail="equipment-${category}"><summary><span>${title}<small>${rows.length}종</small></span><span class="guide-expand" aria-hidden="true">+</span></summary><div class="guide-equipment-list">${rows.map(r=>`<article>${image(r.image_url,r.title+' 장비')}<div><h3>${esc(r.title)}</h3><p>${esc(r.description||'')}</p></div></article>`).join('')||'<p>장비 안내를 준비 중입니다.</p>'}</div></details>`;
    }).join('');
  }
  function history(){
    return `<div class="guide-section-heading"><h2>History</h2><p>제주 안과의 '최초'를 선도해온 기록</p></div><ol class="guide-history">${reference.history.map(row=>`<li><h3>${esc(row.year)}</h3>${list(row.items)}</li>`).join('')}</ol>`;
  }
  function render(content,schedule,scheduleState){
    const panes={support:()=>support(content),facility:()=>facilities(content),director:()=>doctors(content,schedule,scheduleState),equipment:()=>equipment(content),history};
    return `<div class="guide-tabs" id="guide-tabs" role="tablist" aria-label="병원 이용 안내 항목">${tabs.map(([id,label])=>`<button type="button" role="tab" id="guide-tab-${id}" data-guide-tab="${id}" aria-controls="guide-panel" aria-selected="${active===id}" tabindex="${active===id?'0':'-1'}">${label}</button>`).join('')}</div><section id="guide-panel" class="guide-panel" role="tabpanel" tabindex="0" aria-labelledby="guide-tab-${active}">${panes[active]()}</section>`;
  }
  function veterans(){
    const data=reference.veterans;
    const personBadge=person=>`<span class="guide-benefit-person">${esc(person)}</span>`;
    const notes=items=>items.map(p=>`<p class="guide-veterans-note">${esc(p.text)}${p.links.map(a=>safeUrl(a.url)?` <a href="${esc(safeUrl(a.url))}" target="_blank" rel="noopener noreferrer">${esc(a.label)}</a>`:'').join('')}</p>`).join('');
    return `<header class="guide-modal-header"><h2 id="veterans-title">보훈위탁병원 안내</h2><button type="button" class="guide-close" data-close autofocus>닫기 <span aria-hidden="true">×</span></button></header><div class="guide-modal-content">${image(reference.logo,'국가보훈부','guide-veterans-logo')}<p class="guide-veterans-intro">${esc(data.intro)}</p><h3>보훈위탁병원 진료비 지원 기준</h3><div class="guide-benefits">${data.groups.map(r=>`<article><h4>${supportLabel(r.target)}${r.person==='본인'?personBadge(r.person):''}</h4>${r.person!=='본인'?`<p>${personBadge(r.person)}</p>`:''}<dl><div><dt>진료비 지원</dt><dd>${esc(r.care)}</dd></div><div><dt>약제비 지원</dt><dd>${esc(r.medicine)}</dd></div></dl></article>`).join('')}</div>${notes(data.footnotes.slice(0,-1))}<h3>공통 적용 조건 및 지원 제외 항목</h3><dl class="guide-condition-list">${data.conditions.map(r=>`<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`).join('')}</dl>${notes(data.footnotes.slice(-1))}<button type="button" class="primary-button" data-close>닫기</button></div>`;
  }
  window.ClinicGuide={tabs,render,veterans,get active(){return active;},select(id){if(tabs.some(([key])=>key===id))active=id;}};
}());
