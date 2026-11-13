(function(){
  'use strict';
  const paths={
    medicine:'M10 4a4 4 0 0 1 6 6l-6 6a4 4 0 0 1-6-6l6-6Zm-3 3 6 6 M17 15a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm-2 1 4 4',
    calendar:'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h3 M13 17h3',
    wash:'M5 9h14 M8 9V6a4 4 0 0 1 8 0 M5 13h14l-2 7H7l-2-7Zm7-7v3 M4 4l2 2 M20 4l-2 2',
    check:'M20 11a8 8 0 1 1-5-7 M8 11l4 4 8-10',
    hearing:'M8 8a4 4 0 0 1 8 0c0 4-4 4-4 7 0 2-1 4-3 4s-3-1-3-3 M10 9a2 2 0 0 1 4 0c0 2-2 2-2 4'
  };
  const svg=name=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]}"/></svg>`;
  const cards=[
    ['medicine','복용 중인 약이 있어요','당뇨, 고혈압 등',[
      '수술과 상관없이 당일에도 복용하고 오세요.',
      '혈전억제제(예: 아스피린)를 복용하실 경우 의료진에게 미리 말씀해 주세요.'
    ]],
    ['calendar','음주, 파마·염색을 하고 싶어요','미리 확인해 주세요',[
      '음주는 수술 3일 전부터 피해주세요.',
      '파마·염색은 수술 1달 후부터 가능하니 필요하시다면 미리 해두시면 좋습니다.'
    ]],
    ['wash','수술 후 바로 씻어도 되나요?','수술 전 준비',[
      '수술 후 머리감기, 세안 등이 제한됩니다.',
      '수술 전 미리 깨끗하게 씻고 오세요.'
    ]]
  ];
  const checks=[
    ['아침식사는 간단히!','처방 안약, 복용 중이던 약 확인하기'],
    ['세안 후에는 스킨, 로션만!','화장을 하셨다면 당일 원내 세안실 이용 가능'],
    ['편안한 복장으로!','치마, 목티, 후드티는 피해주세요!'],
    ['오실 때 직접 운전 금지','반드시 보호자와 함께 동행']
  ];
  window.renderCataractPrecautions=()=>`<div class="cataract-precautions"><div class="cataract-preop-cards">${cards.map(([name,title,label,items])=>`<section class="cataract-preop-card"><div class="cataract-preop-icon">${svg(name)}</div><div><p class="cataract-preop-label">${label}</p><h3>${title}</h3><ul>${items.map(text=>`<li>${text}</li>`).join('')}</ul></div></section>`).join('')}</div><section class="cataract-day-check"><header><span>수술 당일</span><h3>꼭 확인하세요!</h3></header><ul>${checks.map(([title,text])=>`<li>${svg('check')}<div><h4>${title}</h4><p>${text}</p></div></li>`).join('')}</ul><p class="cataract-hearing-note">${svg('hearing')}<span>보청기를 사용 중이시면 수술실 들어가실 때는 빼주세요.</span></p></section></div>`;
})();
