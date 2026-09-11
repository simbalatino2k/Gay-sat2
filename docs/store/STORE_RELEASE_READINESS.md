# AURA GAY 18+ — Store Release Readiness Matrix

**Target Application Version**: `2.0.0` (Android `versionCode: 20000`, iOS `CFBundleVersion: 20000`)  
**Package / Bundle Identifier**: `app.aura.gay18`  
**Classification**: Social Networking / Dating (18+ / 17+ Mature)

---

## 1. Release Specification Matrix

| Component | Target Requirement | Implementation Status | Verification |
| :--- | :--- | :--- | :--- |
| **Android compileSdk** | API 36 (Android 16 preview / current stable) | Configured in `android/variables.gradle` (`compileSdkVersion = 36`) | PASS |
| **Android targetSdkVersion** | API 36 | Configured in `android/variables.gradle` (`targetSdkVersion = 36`) | PASS |
| **Android minSdkVersion** | API 24 (Android 7.0+) | Configured in `android/variables.gradle` | PASS |
| **64-bit Architecture** | arm64-v8a & x86_64 support | Default AGP 8.x NDK ABI packaging | PASS |
| **Android Code Shrinking** | R8 Minification & Resource Shrinking | Enabled in `android/app/build.gradle` (`minifyEnabled true`, `shrinkResources true`) | PASS |
| **Proguard Rules** | Keep Capacitor, JS interfaces & Billing | Configured in `android/app/proguard-rules.pro` | PASS |
| **Signing Configuration** | External keystore via environment variables | Configured in `android/app/build.gradle` (`AURA_KEYSTORE_PATH`) | PASS |
| **Network Security** | HTTPS strictly enforced, cleartext blocked | Defined in `network_security_config.xml` (`cleartextTrafficPermitted="false"`) | PASS |
| **Permissions Audit** | Location, Camera, Mic, Media, Notifications | Audited in `AndroidManifest.xml`; no broad contacts/storage | PASS |
| **iOS Versioning** | `2.0.0` (Build `20000`) | Set in `ios/App/App/Info.plist` | PASS |
| **iOS Privacy Descriptions**| Location, Camera, Microphone, Photo Library | Configured in `ios/App/App/Info.plist` with clear purpose strings | PASS |
| **Google Play Billing** | Google Play Subscriptions v2 + RTDN | Backend verification in `billingService.ts`, UI in `PremiumPaywallModal.tsx` | PASS |
| **Apple StoreKit 2** | StoreKit 2 JWS transactions + Server Notifications V2 | Signed JWS verification in `billingService.ts`, UI in `PremiumPaywallModal.tsx`| PASS |
| **Unified Entitlements** | Single normalized entitlement API (`/api/billing/entitlements`) | Implemented in `billingService.ts` & `store.ts` | PASS |
| **Restore Purchases** | In-app one-tap restore | Integrated in `PremiumPaywallModal` and `SettingsView` | PASS |
| **Subscription Management**| Direct deep links to Google Play and Apple ID subscriptions | Integrated in `PremiumPaywallModal` and `SettingsView` | PASS |
| **Account Deletion Warning**| Explicit store subscription disclosure prior to deletion | Implemented in `SettingsView.tsx` | PASS |
| **Child Safety (CSAE)** | Zero-tolerance 18+ policy & reporting | Documented in `docs/CHILD_SAFETY.md` and in-app reporting flow | PASS |

---

## 2. Platform Build Verification
- **Web Production Bundle**: `npm run build` completes with 0 errors.
- **Capacitor Android Project**: Synchronized with `/dist` assets via `npx cap sync android`.
- **Capacitor iOS Project**: Synchronized with `/dist` assets via `npx cap sync ios`.
- **Backend API Routes**: All billing, verification, and webhook endpoints mounted under `/api/billing/*`.
