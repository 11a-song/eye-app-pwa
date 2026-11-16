(function(){
  'use strict';
  const bridge=window.JeileyeNativeAlarm;if(!bridge)return;
  function result(value){const data=JSON.parse(value);if(data.ok===false)throw Error(data.error||'기기에 알람을 저장하지 못했습니다.');return data;}
  window.ClinicNativeAlarm={
    status:()=>JSON.parse(bridge.status()),
    openSettings:()=>bridge.openSettings(),
    save:(jobs,activePlans)=>result(bridge.replace(JSON.stringify({jobs,activePlans}))),
    test:plan=>result(bridge.test(plan||'test'))
  };
})();
