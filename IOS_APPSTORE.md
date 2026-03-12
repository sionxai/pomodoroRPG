# iOS App Store 전환 메모

이 프로젝트는 이제 `Vite + Capacitor` 기반으로 iOS 셸을 만들 수 있는 구조다.

## 1. 의존성 설치

```bash
npm install
```

## 2. iOS 프로젝트 생성

```bash
npx cap add ios
npm run ios:sync
```

만약 `xcodebuild requires Xcode` 오류가 나오면 먼저 아래를 한 번 실행해야 한다.

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

## 3. Firebase / Apple 설정

- Firebase Authentication에서 `Google`, `Apple` 제공자를 모두 활성화해야 한다.
- Apple 로그인은 Apple Developer에서 `Service ID`, `Key`, `Team ID` 구성이 필요하다.
- 현재 iOS 프로젝트에는 `Sign in with Apple` entitlement가 포함돼 있다. Xcode Signing Team을 연결한 뒤 Apple Developer App ID에도 같은 capability가 켜져 있어야 한다.
- Google 로그인은 iOS용 Firebase 앱을 추가한 뒤 `GoogleService-Info.plist`를 받아 Xcode 프로젝트에 넣어야 한다.
- iOS 앱 번들 ID는 현재 [capacitor.config.json](/Users/nohshinhee/Documents/2. coding/Pomodoro  ios/capacitor.config.json) 기준 `com.freeiwan.focusquest`로 잡혀 있다.
- 현재 iOS 앱은 `skipNativeAuth` 모드로 동작한다. 즉 Apple 로그인은 네이티브 인증창으로 토큰만 받고, 실제 Firebase 세션은 웹 SDK가 유지한다.
- `GoogleService-Info.plist`가 아직 없어서 iOS 네이티브 `Google 로그인`은 숨겨 둔 상태다. 나중에 iOS용 Firebase 앱을 붙일 때는 `capacitor.config.json`의 `skipNativeAuth` 정책과 Google 버튼 노출 여부를 같이 조정하면 된다.

## 4. Xcode 마무리

- `ios/App/App.xcworkspace`를 열어 Signing Team, Bundle Identifier, App Icons를 확정한다.
- 실제 App Store 제출 전에는 기본 SVG 아이콘 대신 정식 앱 아이콘 세트를 교체해야 한다.
- 현재 머신은 Xcode 앱은 있지만 활성 개발자 디렉터리가 Command Line Tools로 잡혀 있어, `sudo xcode-select`를 한 번 실행해야 전체 sync/build 검증이 끝난다.
