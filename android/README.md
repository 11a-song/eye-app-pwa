# 안드로이드 기기 알람 앱

현재 PWA 화면을 APK 안에 포함하고, 안약 예약을 Android AlarmManager에 저장합니다. PWA에 접속만 해서는 기기 알람 기능이 생기지 않습니다. 이 APK를 설치해 이용해야 합니다.

## 빌드

JDK 17, Gradle 8.13, Android SDK Platform 36, Build Tools 36을 사용합니다. 플러그인은 `8.13.0`으로 고정했고 Java 외의 런타임 의존성은 없습니다.

1. 프로젝트 루트에서 `node scripts/build.cjs`로 웹 번들을 갱신합니다.
2. `powershell -File android/build-local.ps1 -Lint` 또는 Android Studio에서 `android` 폴더를 열어 `assembleDebug`와 `lintDebug`를 실행합니다.
3. 결과: `android/app/build/outputs/apk/debug/app-debug.apk`. 디버그 서명된 **테스트용 APK**이며 스토어 배포용 서명·등록은 별도입니다. 웹 배포는 수행하지 않습니다.

## 휴대폰 확인

1. APK를 휴대폰으로 전달해 설치합니다. 출처가 확인되지 않는 앱이나 Play Protect 차단을 무조건 해제하지 마세요. 실제 배포 전 정식 서명과 배포 경로를 준비해야 합니다.
2. 수술 일정을 생성하고 ‘안약 알림 설정’에서 ‘기기 알람 권한 설정’을 엽니다.
3. 알림/팝업, 알람 및 리마인더, 전체 화면 알림을 허용합니다. 알람 음량도 확인합니다. 무음·방해 금지는 기기 설정을 따릅니다.
4. 알림을 켜고 시간을 저장합니다. 수술 당일 저녁·취침 전과 내원시간 이후는 예약하지 않습니다.
5. ‘테스트 알림 보내기’를 누르고 전원 버튼으로 화면을 끕니다. **10초 뒤** 잠금화면이 켜지고 알람음·진동이 작동하는지 확인합니다.
6. ‘알람 끄기’로 종료합니다. 또는 ‘안약 스케줄 열기’로 이동합니다. 알람은 최대 2분 후 자동 종료합니다.
7. 화면 꺼짐, 앱을 최근 목록에서 제거, 재부팅 후 예약, 일정 수정·삭제·OFF에 따른 취소, 알람 도중 해제와 스케줄 이동을 각각 확인합니다.

앱 강제 종료, 전원 꺼짐, 제조사 절전 정책, 권한 회수, 음량/방해 금지 설정은 동작에 영향을 줄 수 있습니다. 실제 갤럭시 등 기기의 잠금화면 시험 없이 동작 보장을 주장하지 않습니다.

## 저장·보안

- 웹 화면은 APK의 로컬 자산만 로드하고 외부 링크는 별도 앱으로 엽니다. JavaScript 브리지는 이 로컬 화면에만 제공하며 iframe·외부 스크립트·파일 접근을 제한합니다.
- 수술 기록과 체크 기록은 WebView의 기기 저장소, 알람 예약은 앱 전용 SharedPreferences에 저장합니다. Android 모드에서는 서버 푸시 구독이나 환자 체크 기록 업로드를 하지 않습니다.
- **기존 Chrome/PWA와 APK의 저장소는 서로 다릅니다.** 기존 PWA 기록을 삭제하거나 자동 이전하지 않았습니다. 테스트 APK에서는 수술 일정을 다시 입력해야 합니다. 양쪽 알림을 모두 켜면 중복 알림이 올 수 있으니 사용하지 않는 쪽은 꺼 주세요.
- 재부팅·앱 업데이트·시각 변경 후 남은 예약을 재등록합니다. 기기의 시간대를 바꾼 경우 앱에서 설정을 다시 확인해 저장하세요.
- 전체 화면 알림은 Android의 사용자 권한과 정책을 준수하며 우회하지 않습니다. Google Play 배포 시 정확한 알람·전체 화면 알림 권한의 용도와 심사 요건을 별도로 검토해야 합니다.

참고: [Android 알람](https://developer.android.com/develop/background-work/services/alarms), [잠금화면과 전체 화면 알림](https://developer.android.com/develop/ui/views/notifications/time-sensitive), [전체 화면 권한](https://support.google.com/googleplay/android-developer/answer/13392821).
