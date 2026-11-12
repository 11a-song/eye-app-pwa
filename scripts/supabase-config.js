// app-PWA-eye: 공개용 연결 설정. 관리자 계정은 Supabase에서 별도로 만듭니다.
// Secret Key, service_role 또는 비밀번호를 넣지 마세요.
// 앱과 관리자 페이지는 같은 프로젝트를 사용하며 DB RLS로 쓰기 권한을 검사합니다.
window.clinicBackend = Object.freeze({
  url: 'https://issyhftzmzpudoeidoum.supabase.co',
  publishableKey: 'sb_publishable_CbpJX_u72nTaGtas8OtX1g_Esh3bXAA',
  adminEnabled: true
});
