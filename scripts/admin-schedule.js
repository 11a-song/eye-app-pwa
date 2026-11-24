(function(){
  'use strict';
  const keys=['doctors','weekly','dates','closures'],weekdays=['일','월','화','수','목','금','토'];
  const make=(tag,text,cls)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(cls)node.className=cls;return node;};
  function valueLabel(key,field,row,doctors){
    const value=row[field.key];
    if(field.key==='weekday')return weekdays[value]+'요일';
    if(field.type==='doctor')return doctors.find(doctor=>String(doctor.id)===String(value))?.name||'원장 정보 확인 필요';
    if(field.key==='end_time'){
      if(row.period==='morning')return '—';
      const saturday=key==='weekly'?Number(row.weekday)===6:row.schedule_date&&new Date(row.schedule_date+'T12:00:00').getDay()===6;
      return String(value|| (saturday?'17:00':'19:00')).slice(0,5)==='17:00'?'오후 5:00까지':'오후 7:00까지';
    }
    if(field.key==='saturday_weeks'&&Number(row.weekday)!==6)return '—';
    if(field.choices)return field.choices[value]||'—';
    return value===undefined||value===null||value===''?'—':String(value);
  }
  function render(root,options){
    const {data,errors,queries,canEdit,definitions,safeUrl,onEdit}=options,doctors=data.doctors||[];
    const stack=make('div',undefined,'schedule-management');
    for(const key of keys){
      const def=definitions[key],card=make('article',undefined,'schedule-admin-card'),heading=make('div',undefined,'schedule-card-heading');
      card.dataset.scheduleSection=key;
      const title=make('div');title.append(make('h3',def.title),make('p',errors[key]?'조회 실패':'DB 연결 · '+(data[key]||[]).length+'개 항목','schedule-source'));heading.append(title);
      const tools=make('div',undefined,'schedule-card-tools'),searchLabel=make('label',undefined,'schedule-search');
      searchLabel.append(make('span',def.title+' 전체 검색','sr-only'));
      const search=make('input');search.type='search';search.placeholder='원장·일정 찾기';search.value=queries[key]||'';search.disabled=!!errors[key];searchLabel.append(search);tools.append(searchLabel);
      const available=canEdit&&!errors[key]&&(key==='doctors'||(!errors.doctors&&doctors.length>0));
      const add=make('button','새 항목','button');add.type='button';add.disabled=!available;add.onclick=()=>onEdit(key,null);tools.append(add);heading.append(tools);card.append(heading);
      const contents=make('div');card.append(contents);
      function editButton(row,label){const button=make('button','편집','button');button.type='button';button.disabled=!available;button.setAttribute('aria-label',label+' 편집');button.onclick=()=>onEdit(key,row);return button;}
      function draw(){
        contents.replaceChildren();
        if(errors[key]){const error=make('p',errors[key],'error');error.setAttribute('role','alert');contents.append(error);return;}
        if(key!=='doctors'&&errors.doctors)contents.append(make('p','원장 정보를 불러오지 못해 일정 편집이 제한됩니다. 새로고침해 주세요.','error'));
        const terms=search.value.normalize('NFC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
        const rows=(data[key]||[]).filter(row=>{const text=def.fields.map(field=>valueLabel(key,field,row,doctors)).join(' ').normalize('NFC').toLocaleLowerCase();return terms.every(term=>text.includes(term));});
        if(!rows.length){contents.append(make('p',terms.length?'검색 결과가 없습니다.':'등록된 항목이 없습니다.','schedule-empty'));return;}
        if(key==='weekly'){
          const groups=new Map();
          for(const row of rows){const id=String(row.doctor_id);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(row);}
          for(const [id,items] of groups){
            const name=doctors.find(doctor=>String(doctor.id)===id)?.name||'원장 정보 확인 필요',details=make('details',undefined,'schedule-weekly-group');
            details.append(make('summary',name+' · '+items.length+'개 일정'));
            const list=make('div',undefined,'schedule-weekly-list');
            for(const row of items.slice().sort((a,b)=>Number(a.weekday)-Number(b.weekday))){
              const week=Number(row.weekday)===6?' · '+({all:'매주 토요일',first_third:'첫째·셋째 토요일',second_fourth:'둘째·넷째 토요일'}[row.saturday_weeks||'all']||'토요일'):'',period=row.period==='morning'?'오전':'종일 · '+valueLabel(key,{key:'end_time'},row,doctors);
              const line=make('div',undefined,'schedule-weekly-row');line.append(make('span',weekdays[row.weekday]+'요일'+week+' · '+period),editButton(row,name+' '+weekdays[row.weekday]+'요일 일정'));list.append(line);
            }
            details.append(list);contents.append(details);
          }
          return;
        }
        const scroll=make('div',undefined,'schedule-table-scroll');scroll.tabIndex=0;scroll.setAttribute('role','region');scroll.setAttribute('aria-label',def.title+' 표');
        const table=make('table',undefined,'schedule-admin-table');table.append(make('caption',def.title,'sr-only'));
        const fields=def.fields.filter(field=>field.key!=='initial'),head=make('thead'),headRow=make('tr');
        for(const field of fields){const th=make('th',field.label);th.scope='col';headRow.append(th);}
        const actionHead=make('th','작업');actionHead.scope='col';headRow.append(actionHead);head.append(headRow);table.append(head);
        const body=make('tbody');
        for(const row of rows){
          const tr=make('tr');
          for(const field of fields){
            const td=make('td');
            if(field.type==='color'){
              const swatch=make('span',undefined,'schedule-color-swatch');swatch.style.backgroundColor=/^#[0-9a-f]{6}$/i.test(row[field.key]||'')?row[field.key]:'#2d83f5';swatch.setAttribute('aria-label','구분 색상 '+(row[field.key]||''));td.append(swatch);
            }else if(field.type==='image'){
              const url=safeUrl(row[field.key],true);
              if(url){const image=make('img',undefined,'schedule-doctor-photo');image.src=url;image.alt=(row.name||'원장')+' 사진';image.loading='lazy';td.append(image);}else td.textContent='없음';
            }else td.textContent=valueLabel(key,field,row,doctors);
            tr.append(td);
          }
          const actions=make('td');actions.append(editButton(row,key==='doctors'?row.name:valueLabel(key,{key:'doctor_id',type:'doctor'},row,doctors)));tr.append(actions);body.append(tr);
        }
        table.append(body);scroll.append(table);contents.append(scroll);
      }
      search.addEventListener('input',()=>{queries[key]=search.value;draw();});draw();stack.append(card);
    }
    root.append(stack);
  }
  window.ClinicAdminSchedule={render,valueLabel};
}());
