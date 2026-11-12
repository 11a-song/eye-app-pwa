// 새 app-PWA-eye 연결을 확인한 뒤 이 파일에 공개용 URL/Publishable Key를 설정합니다.
// Secret Key, service_role 또는 비밀번호를 넣지 마세요.
// 준비 전에는 기존 공개 진료 일정만 유지하며 관리자 쓰기는 비활성화합니다.
window.clinicBackend = Object.freeze({
  url: '',
  publishableKey: '',
  adminEnabled: false
});
