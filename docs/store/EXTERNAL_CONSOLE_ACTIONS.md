# External Store Console Action Checklist — AURA GAY 18+

This checklist outlines the manual administrative actions required in Google Play Console and Apple App Store Connect prior to submitting the binary for production review.

---

## 1. Google Play Console Actions

- [ ] **Upload Android App Bundle (`.aab`)**:
  - Build release bundle using `cd android && ./gradlew bundleRelease`.
  - Upload bundle to the Internal Testing or Production track.
- [ ] **Set Up Google Play In-App Products & Subscriptions**:
  - Create subscription `aura.premium.monthly` ($14.99 / mo or local equivalent).
  - Create subscription `aura.premium.3month` ($34.99 / 3 mos or local equivalent).
  - Create subscription `aura.premium.yearly` ($99.99 / yr or local equivalent).
  - Configure Grace Period (16 days) and Account Hold (30 days).
- [ ] **Configure Cloud Pub/Sub RTDN (Real-time Developer Notifications)**:
  - Topic: `projects/<YOUR_GCP_PROJECT>/topics/play-billing-rtdn`.
  - Service Account: Grant `Pub/Sub Publisher` to `google-play-developer-notifications@system.gserviceaccount.com`.
  - Push Subscription: `https://<YOUR_DOMAIN>/api/billing/rtdn/google-play`.
- [ ] **Complete App Content Declarations**:
  - **Data Safety**: Import declarations from `docs/store/GOOGLE_DATA_SAFETY.md`.
  - **Target Audience & Content**: Declare age group: **18 and over only**.
  - **Government Apps**: No.
  - **Financial Features**: In-app digital subscriptions only.
  - **Child Safety / CSAE**: Confirm zero-tolerance compliance per `docs/CHILD_SAFETY.md`.
- [ ] **App Access Credentials**:
  - Provide test account credentials from `docs/store/GOOGLE_PLAY_REVIEW_NOTES.md`.

---

## 2. Apple App Store Connect Actions

- [ ] **Upload iOS Archive**:
  - In Xcode, select `Any iOS Device (arm64)` → `Product` → `Archive` → `Distribute App` to App Store Connect.
- [ ] **Configure StoreKit 2 Subscriptions**:
  - Subscription Group: `AURA Premium`.
  - Product IDs: `aura.premium.monthly`, `aura.premium.3month`, `aura.premium.yearly`.
  - Configure subscription localized titles, descriptions, and duration tiers.
  - Turn on Billing Grace Period (16 days).
- [ ] **Configure App Store Server Notifications V2**:
  - Production URL: `https://<YOUR_DOMAIN>/api/billing/webhook/apple-storekit`.
  - Sandbox URL: `https://<YOUR_DOMAIN>/api/billing/webhook/apple-storekit`.
  - Notification Version: **Version 2**.
- [ ] **App Privacy Nutrition Labels**:
  - Complete disclosures using `docs/store/APPLE_PRIVACY_DISCLOSURE.md`.
- [ ] **App Review Information**:
  - Provide test credentials from `docs/store/APPLE_REVIEW_NOTES.md`.
  - Attach Reviewer Test Guide from `docs/store/REVIEWER_INSTRUCTIONS.md`.
