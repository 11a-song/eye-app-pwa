(function(){
  'use strict';
  const pad=n=>String(n).padStart(2,'0');
  const minutesFor=hour=>hour===8?Array.from({length:30},(_,i)=>i+30):hour===19?[0]:Array.from({length:60},(_,i)=>i);
  function parse(value){
    if(!/^\d{2}:\d{2}$/.test(value||''))return null;
    const [hour,minute]=value.split(':').map(Number),total=hour*60+minute;
    return minute<60&&total>=510&&total<=1140?{period:hour<12?'am':'pm',hour:hour%12||12,minute}:null;
  }
  function options(values,selected,prefix){return values.map(value=>`<button id="${prefix}-${value}" type="button" role="option" tabindex="-1" data-arrival-option="${value}" aria-selected="${value===selected}">${pad(value)}</button>`).join('');}
  function render(plan,id){
    const valid=Number.isInteger(plan?.hour)&&plan.hour>=1&&plan.hour<=12&&Number.isInteger(plan?.minute)&&plan.minute>=0&&plan.minute<60&&['am','pm'].includes(plan.period);
    const old=valid?(plan.hour%12+(plan.period==='pm'?12:0))*60+plan.minute:510;
    const total=Math.max(510,Math.min(1140,old)),hour=Math.floor(total/60),minute=total%60;
    return `<div class="arrival-picker" data-arrival-picker><input type="hidden" name="arrivalTime" value="${pad(hour)}:${pad(minute)}"><div class="arrival-wheel reminder-wheel" role="listbox" tabindex="0" aria-label="내원 시, 24시간제" aria-activedescendant="${id}-hour-${hour}" data-arrival-wheel="hour" data-prefix="${id}-hour" data-value="${hour}">${options(Array.from({length:12},(_,i)=>i+8),hour,id+'-hour')}</div><span>시</span><div class="arrival-wheel reminder-wheel" role="listbox" tabindex="0" aria-label="내원 분" aria-activedescendant="${id}-minute-${minute}" data-arrival-wheel="minute" data-prefix="${id}-minute" data-value="${minute}">${options(minutesFor(hour),minute,id+'-minute')}</div><span>분</span></div><p class="arrival-picker-note">08:30~19:00 · 24시간제로 위아래로 밀어 선택하세요.${valid&&old!==total?' 기존 내원시간은 범위 밖이므로 저장 시 선택한 시간으로 변경됩니다.':''}</p>`;
  }
  function select(wheel,index,scroll=false){
    const rows=Array.from(wheel.querySelectorAll('[data-arrival-option]'));
    index=Math.max(0,Math.min(rows.length-1,index));if(!rows[index])return;
    const before=wheel.dataset.value;
    wheel.dataset.value=rows[index].dataset.arrivalOption;
    rows.forEach((row,i)=>row.setAttribute('aria-selected',String(i===index)));
    wheel.setAttribute('aria-activedescendant',rows[index].id);
    if(scroll)wheel.scrollTop=index*36;
    const picker=wheel.closest('[data-arrival-picker]'),hour=Number(picker.querySelector('[data-arrival-wheel="hour"]').dataset.value);
    const minutes=picker.querySelector('[data-arrival-wheel="minute"]');
    if(wheel.dataset.arrivalWheel==='hour'&&before!==wheel.dataset.value){
      const values=minutesFor(hour),minute=Math.max(values[0],Math.min(values.at(-1),Number(minutes.dataset.value)));
      minutes.innerHTML=options(values,minute,minutes.dataset.prefix);minutes.dataset.value=String(minute);
      minutes.setAttribute('aria-activedescendant',`${minutes.dataset.prefix}-${minute}`);minutes.scrollTop=values.indexOf(minute)*36;
    }
    picker.querySelector('input').value=`${pad(hour)}:${pad(Number(minutes.dataset.value))}`;
  }
  function initialize(root=document){
    for(const wheel of root.querySelectorAll?.('[data-arrival-wheel]')||[]){
      const rows=Array.from(wheel.querySelectorAll('[data-arrival-option]'));
      wheel.scrollTop=Math.max(0,rows.findIndex(row=>row.dataset.arrivalOption===wheel.dataset.value))*36;
    }
  }
  function flush(form){
    for(const part of ['hour','minute'])for(const wheel of form.querySelectorAll?.(`[data-arrival-wheel="${part}"]`)||[])select(wheel,Math.round(wheel.scrollTop/36),true);
  }
  document.addEventListener('scroll',event=>{
    const wheel=event.target.closest?.('[data-arrival-wheel]');if(wheel)select(wheel,Math.round(wheel.scrollTop/36));
  },{capture:true,passive:true});
  document.addEventListener('keydown',event=>{
    const wheel=event.target.closest?.('[data-arrival-wheel]');if(!wheel||!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
    event.preventDefault();const last=wheel.querySelectorAll('[data-arrival-option]').length-1;
    select(wheel,event.key==='Home'?0:event.key==='End'?last:Math.round(wheel.scrollTop/36)+(event.key==='ArrowUp'?-1:1),true);
  });
  document.addEventListener('click',event=>{
    const option=event.target.closest?.('[data-arrival-option]');if(!option)return;
    const wheel=option.closest('[data-arrival-wheel]');select(wheel,Array.from(wheel.querySelectorAll('[data-arrival-option]')).indexOf(option),true);
  });
  window.ClinicArrivalTime={render,initialize,flush,parse};
})();
