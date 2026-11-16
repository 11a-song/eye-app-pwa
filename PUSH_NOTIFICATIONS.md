# 안약 푸시 알림 운영

배포 주소: `https://jeileye.2025work11a.workers.dev/`

## 환자 사용 순서

1. 수술 스케줄을 생성합니다.
2. 하단 ‘수술자 안약 스케줄’ → 해당 일정 아래 ‘안약 알림 설정’을 엽니다. 체크리스트 안에도 같은 메뉴가 있습니다.
3. 아침·점심·저녁·취침 전 시간을 선택하고 필요한 항목을 켭니다.
4. 정보 저장 동의와 ‘안약 알림 받기’를 켜고 저장합니다. 기기의 알림 권한도 허용합니다.
5. ‘테스트 알림 보내기’를 눌러 실제 휴대폰 수신을 확인합니다.

아이폰: iOS 16.4 이상, 홈 화면에 설치한 앱에서 알림 허용이 필요합니다. 서버 발송 및 인터넷 기반 알림이며 기기의 시계 알람처럼 정확한 시각의 울림을 보장하지 않습니다. 처방에 따른 투약을 대체하지 않습니다.

## 서버 구성

- Supabase 프로젝트 `issyhftzmzpudoeidoum`, Edge Function `medication-reminders`.
- `sql/medication-reminders.sql`: 서비스 역할만 접근 가능한 설정·기기·발송 작업 테이블 및 함수, 매분 발송 cron, 일별 만료 데이터 정리.
- VAPID 개인키와 cron 인증키는 Supabase Vault에 암호화 보관합니다. 공개키만 `/config`로 반환합니다.
- 로그인 대신 기기에 생성한 256비트 비밀 토큰의 SHA-256 해시로 설정 변경을 인증합니다. 기존 기기를 다른 토큰으로 덮어쓸 수 없습니다.
- `/save`는 모든 대기 작업을 트랜잭션으로 교체합니다. 각 기기에서 증가하는 revision을 사용하여 오래된 요청을 거절합니다.
- 발송 주소는 HTTPS Chrome/Apple/Firefox 푸시 서비스로 제한하고 리디렉션을 거절합니다.
- 서버에는 이름, 전화번호, 수술할 눈, 약 이름, 체크 기록을 보내지 않습니다. 기기 수신 주소·암호화 공개키, 발송 시각·항목 번호·임의 일정 ID만 저장합니다.
- 종료된 일정 데이터는 만료 후 일별 정리합니다. 발송 기록은 하루 후 삭제합니다.
- 일정 수정·삭제·보관 시 대기 알림도 교체합니다. 오프라인에서는 서버 변경을 즉시 적용할 수 없으므로 연결 대기를 표시하고 재접속 시 재시도합니다.
- 이미 발송 서비스로 넘긴 알림은 회수할 수 없습니다. 발송 후 체크 상태는 서버에 전송하지 않으므로 체크 여부와 무관하게 설정된 시간의 알림을 보냅니다.
- Edge Function은 JWT 검사 대신 기기별 토큰, 서버 cron 전용 비밀키로 각 쓰기·발송 요청을 인증합니다. 공개키 조회만 익명입니다.

## 배포 및 확인

프론트엔드: `node scripts/build.cjs`, `node tests/medication-reminders.cjs`, 기존 startup/PWA/medication 테스트 후 GitHub push.

함수 소스: `supabase/functions/medication-reminders/index.js`, `validation.mjs`. 의존성 버전을 고정했습니다. 비밀키를 파일·Git·프론트엔드 설정에 넣지 마세요.

실제 잠금 화면 수신은 Android/iPhone에서 설치·권한 허용·테스트 알림 및 예약 시간 수신을 확인해야 합니다. 자동 테스트는 예약 계산, 권한 거절, 동의, 취소, 실패 재시도, 요청 검증 및 알림 이동을 검증합니다.

보안 검사: 알림 테이블 3개 모두 RLS와 서비스 역할 전용 정책을 적용하고 익명·로그인 사용자 접근 권한을 제거했습니다. 기존 `pg_net` 설치 위치에 대한 [확장 스키마 경고](https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public)는 운영 확장 재설치가 자동 승인 검토에서 거부되어 그대로 유지했습니다. 기존 관리자 인증의 [유출 비밀번호 보호 설정](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)은 이번 변경 범위에서 수정하지 않았습니다.
