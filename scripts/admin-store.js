(function(){
  'use strict';
  async function verify(client){
    const user=await client.auth.getUser();
    if(user.error||!user.data?.user)throw Error('관리자 계정으로 로그인해 주세요.');
    const profile=await client.from('profiles').select('id,role').eq('id',user.data.user.id).maybeSingle();
    if(profile.error||profile.data?.id!==user.data.user.id||profile.data.role!=='admin')throw Error('이 계정은 관리자 권한이 없습니다.');
    return user.data.user;
  }
  function definition(key){const def=window.ClinicAdminModel.definitions[key];if(!def?.table)throw Error('허용된 관리 항목이 아닙니다.');return def;}
  async function save(client,key,values,original){
    const def=definition(key),body=window.ClinicAdminModel.payload(def,values),id=def.key||'id';
    await verify(client);
    let request;if(original){delete body[id];request=client.from(def.table).update(body).eq(id,original[id]);}else request=client.from(def.table).insert(body);
    const result=await request.select(id).single();if(result.error)throw result.error;if(!result.data)throw Error('저장 결과를 확인하지 못했습니다.');return result.data;
  }
  async function remove(client,key,original){
    const def=definition(key),id=def.key||'id';
    if(original?.[id]===null||original?.[id]===undefined)throw Error('삭제할 항목이 없습니다.');
    await verify(client);
    const result=await client.from(def.table).delete().eq(id,original[id]).select(id).single();
    if(result.error)throw result.error;if(!result.data)throw Error('삭제 결과를 확인하지 못했습니다.');return result.data;
  }
  window.ClinicAdminStore={verify,save,remove};
}());
