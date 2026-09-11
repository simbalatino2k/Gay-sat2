# AURA GAY 18+ — Store Subscription Configuration & Management Guide

## 1. Subscription Group & Product Architecture

All digital paid offerings for AURA belong to a single unified subscription group: **AURA Premium**.

### Logical Plans & Product Identifiers

| Plan Tier | Product ID (Android & iOS) | Billing Period | Renewal Type | Recommended Duration |
| :--- | :--- | :--- | :--- | :--- |
| **AURA Premium Monthly** | `aura.premium.monthly` | 1 Month (`P1M`) | Auto-renewable | 1 month |
| **AURA Premium 3 Months**| `aura.premium.3month` | 3 Months (`P3M`) | Auto-renewable | 3 months |
| **AURA Premium Yearly** | `aura.premium.yearly` | 1 Year (`P1Y`) | Auto-renewable | 12 months |

> **Critical Store Policy Rule**: Prices are determined dynamically by Google Play Console and Apple App Store Connect based on user locale and currency. The native paywall NEVER hardcodes fixed currency strings or rates.

---

## 2. Feature Gating Matrix

### AURA Premium Features
- **Unlimited Likes & Swipes**: No daily like quota in Discover.
- **Profile Visitors**: Full access to see who viewed your profile.
- **Stealth Incognito Mode**: Browse profiles without leaving view traces.
- **Priority Visibility**: Elevated placement in Discover grid and nearby Radar.
- **100% Ad-Free Experience**: Elimination of all native sponsored banner/card placements.
- **Extended Media Vaults**: Share extended Star Videos (up to 20s) and multi-photo locked vaults.

### Strictly Free Features (Apple Guideline 1.2 / Google Play UGC Safety)
The following safety and legal features are guaranteed 100% free and NEVER paywalled:
- Account creation, profile editing, and bio updates.
- Real-time blocking of other users (`/api/blocks`).
- DSA-compliant content & user reporting (`/api/reports`).
- Permanent account erasure and GDPR Right to Erasure (`/api/gdpr/erasure`).
- Location privacy mode configuration (Exact, Approximate, Hidden).
- Submitting moderation appeals (`/api/dsa/appeal`).
- Access to Terms of Service, Privacy Policy, and Child Safety Guidelines.

---

## 3. Google Play Subscription Setup (Google Play Console)
1. **Navigate to**: Monetize with Play → Products → Subscriptions.
2. **Subscription ID**: `aura.premium.monthly`, `aura.premium.3month`, `aura.premium.yearly`.
3. **Base Plans**:
   - Set billing period: `1 Month`, `3 Months`, `1 Year`.
   - Set renewal type: `Auto-renewing`.
   - Configure **Grace Period**: 16 days (maintains access while user resolves billing issue).
   - Configure **Account Hold**: 30 days (suspends access until payment method is updated).
4. **Real-time Developer Notifications (RTDN)**:
   - Create a Google Cloud Pub/Sub topic: `projects/<gcp-project>/topics/play-billing-rtdn`.
   - Grant publishing rights to `google-play-developer-notifications@system.gserviceaccount.com`.
   - Configure a Push Subscription targeting: `https://<YOUR_DOMAIN>/api/billing/rtdn/google-play`.

---

## 4. Apple App Store Connect Setup
1. **Navigate to**: App Store Connect → Apps → AURA GAY 18+ → In-App Purchases → Subscriptions.
2. **Create Subscription Group**: `AURA Premium`.
3. **Add Subscriptions**:
   - Product IDs: `aura.premium.monthly`, `aura.premium.3month`, `aura.premium.yearly`.
   - Set Subscription Duration: 1 Month, 3 Months, 1 Year.
   - Configure Localization: Enter localized display names and promotional descriptions.
   - Configure **Billing Grace Period**: Turn on (16 days).
4. **App Store Server Notifications V2**:
   - Production URL: `https://<YOUR_DOMAIN>/api/billing/webhook/apple-storekit`.
   - Sandbox URL: `https://<YOUR_DOMAIN>/api/billing/webhook/apple-storekit`.
   - Notification Version: **Version 2**.
