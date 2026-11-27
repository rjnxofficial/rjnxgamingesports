# Android app — build, install, release

Package id: `com.devkazzu.rjnxgamingesports`
Stack: Expo SDK 54 · React Native 0.81 · expo-router 6 · TypeScript
Not a WebView: every screen is native React Native, reading Supabase directly
with the publishable key under RLS.

## 1. Run it in development

```bash
cp apps/mobile/.env.example apps/mobile/.env
npm install
npm run mobile            # Expo dev server; press "a" for an Android device/emulator
```

`npm run mobile:android` starts the same server and opens Android directly.

## 2. Build an APK without EAS (GitHub Actions)

`.github/workflows/android.yml` → **Release APK + AAB** does:

1. `npm ci`, Node 24, JDK 17 (Temurin)
2. points Gradle at the Android SDK that ships with the runner
   (`ANDROID_SDK_ROOT`), then installs the exact packages listed by
   `node scripts/android-sdk-requirements.mjs` (currently
   `platform-tools`, `platforms;android-36`, `build-tools;36.0.0`,
   `ndk;27.1.12297006` — read from the React Native version catalog, so it
   tracks `compileSdk` instead of hard-coding it)
3. `npx expo prebuild -p android --no-install`
4. `node scripts/configure-android-signing.mjs` (adds the release keystore when
   the secrets exist) and `node scripts/verify-android-project.mjs`
5. `./gradlew assembleRelease --no-daemon` → `rjnx-esports-apk` artifact
6. `./gradlew bundleRelease --no-daemon` → `rjnx-esports-aab` artifact (Play upload)

Both artifacts are named `rjnx-esports-<version>-<signing-mode>.{apk,aab}`, so a
debug-signed CI build can never be mistaken for a Play-ready one. Download from
the workflow run → *Artifacts*. Install with
`adb install rjnx-esports-1.0.0-production.apk` (enable “install unknown apps”
when installing from the device).

### SDK versions

| Component | Version | Source |
| --- | --- | --- |
| compileSdk / targetSdk | 36 / 36 | `react-native/gradle/libs.versions.toml` (Expo `expoLibs` catalog) |
| minSdk | 24 | same catalog |
| Build tools | 36.0.0 | same catalog |
| NDK | 27.1.12297006 | same catalog |
| Gradle | 8.14.3 (wrapper) | `android/gradle/wrapper` |
| JDK | 17 | `actions/setup-java@v6` |

Run `npm run android:sdk -w @rjnx/mobile` to print the required SDK packages and
`npm run android:sdk -w @rjnx/mobile -- --check` to verify an installed SDK.

### Signing secrets

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 release.keystore` |
| `ANDROID_KEYSTORE_PASSWORD` | keystore password |
| `ANDROID_KEY_ALIAS` | key alias |
| `ANDROID_KEY_PASSWORD` | key password (optional, defaults to the keystore password) |

Generate the keystore once, locally, and store it in a password manager:

```bash
keytool -genkeypair -v -keystore release.keystore -alias rjnx \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "<password>" -keypass "<password>" \
  -dname "CN=DEVKAZZU, OU=RJNX GAMING ESPORTS, O=DEVKAZZU, L=Guwahati, ST=Assam, C=IN"
```

**Never commit** `release.keystore`, `*.jks`, `keystore.properties` or the
passwords. `.gitignore` covers the files; only the CI secrets hold the values.
Losing this keystore means you cannot publish updates to the same Play listing —
back it up.

Without signing secrets the workflow still produces an installable APK + AAB,
signed with the debug key, and logs an explicit
`[signing] no keystore provided — release build will be signed with the debug key`
line. Those files are fine for testers, not for the Play Store. Nothing is
uploaded to Play automatically: publishing stays manual.

## 3. Build with EAS (optional)

```bash
npm i -g eas-cli
eas login
cd apps/mobile
eas init                     # writes the real projectId into app.json
eas build -p android --profile production-apk   # APK
eas build -p android --profile production       # AAB
```

Profiles live in `apps/mobile/eas.json`:

| Profile | Output | Use |
| --- | --- | --- |
| `development` | APK (internal) | dev client builds |
| `preview` | APK (internal) | QA / stakeholders |
| `production-apk` | APK (internal, auto-increment) | sideload distribution |
| `production` | AAB (auto-increment) | Play Console upload |

From CI: *Actions → Android App → Run workflow* → pick a profile. Requires the
`EXPO_TOKEN` secret. `npm run android:apk` / `npm run android:aab` in
`apps/mobile` are the local equivalents.

## 4. Release AAB configuration (Play Console)

| Field | Value |
| --- | --- |
| Application ID | `com.devkazzu.rjnxgamingesports` |
| Version name / code | `1.0.0` / `1` (`android.versionCode`, bump per upload or let EAS `autoIncrement`) |
| Min / target SDK | 24 / 36 |
| Permissions | `INTERNET`, `POST_NOTIFICATIONS`, `VIBRATE` |
| App signing | Play App Signing (upload key = your keystore) |
| Category | Games → eSports |
| Data safety | email + username (account), device token (notifications); no data sold |

Store listing assets: icon `assets/icon.png` (1024²), feature graphic 1024×500,
phone screenshots (Home, Tournaments, My Matches, Leaderboard, Profile).
Upload the AAB from the `rjnx-esports-aab` artifact.

## 5. Push notifications

1. `eas init` (or set `EXPO_PUBLIC_EAS_PROJECT_ID`) so the app can request an
   Expo push token — with the placeholder project id the app skips push
   registration and only shows the in-app inbox.
2. Tokens land in `rjnx.push_tokens` on sign-in.
3. The website fans out via `apps/web/src/lib/push/expo.ts`
   (`sendPushToUsers`), called automatically from `notifyUser` / `notifyMany`.
   Requires `SUPABASE_SERVICE_ROLE_KEY` on the server.
4. Delivery failures and unregistered devices are pruned silently.

## 6. Deep links

Scheme `rjnx`. Notification payloads carry `data.link` such as
`/dashboard/matches`; the app maps them to native routes (`/matches`) and opens
the screen. Auth callbacks use `rjnx://auth/callback`.

## 7. What is cached offline

Every read is mirrored to AsyncStorage (`lib/cache.ts`). On a cold start without
connectivity, lists and the profile render from the last successful fetch and a
slim “OFFLINE · SHOWING CACHED ARENA DATA” strip appears. Writes always require
the network and surface a clear error.
