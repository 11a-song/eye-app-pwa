param([switch]$Lint)
$ErrorActionPreference='Stop'
$workspace=Split-Path $PSScriptRoot -Parent
$toolchain=Join-Path $workspace '.tmp/android-toolchain'
if(-not $env:JAVA_HOME){$java=Get-ChildItem (Join-Path $toolchain 'java') -Directory -ErrorAction SilentlyContinue | Select-Object -First 1; if($java){$env:JAVA_HOME=$java.FullName}}
if(-not $env:ANDROID_HOME){$sdk=Join-Path $toolchain 'sdk'; if(Test-Path $sdk){$env:ANDROID_HOME=$sdk}}
if(-not $env:JAVA_HOME -or -not $env:ANDROID_HOME){throw 'JDK 17 및 Android SDK 36을 설정해 주세요. Android Studio에서도 android 폴더를 열어 빌드할 수 있습니다.'}
$env:GRADLE_USER_HOME=Join-Path $toolchain 'cache'
$gradle=Join-Path $toolchain 'gradle/gradle-8.13/bin/gradle.bat'
if(-not(Test-Path $gradle)){throw 'Gradle 8.13을 준비하거나 Android Studio에서 빌드해 주세요.'}
$tasks=@('assembleDebug');if($Lint){$tasks+='lintDebug'}
& $gradle -p $PSScriptRoot @tasks --console=plain --no-daemon
if($LASTEXITCODE -ne 0){throw 'Android build failed'}
Write-Output (Join-Path $PSScriptRoot 'app/build/outputs/apk/debug/app-debug.apk')
