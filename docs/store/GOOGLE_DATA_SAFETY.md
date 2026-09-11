# Google Play Data Safety Section Declarations — AURA GAY 18+

## 1. Overview & High-Level Declarations
- **Does your app collect or share any user data?** YES
- **Is all of the user data collected by your app encrypted in transit?** YES (Strict HTTPS / TLS 1.3 enforcement)
- **Do you provide a way for users to request that their data be deleted?** YES (In-app GDPR Article 17 "Erase Personal Data & Delete Account" with instant permanent removal)

---

## 2. Data Types Collected and Purpose

| Data Category | Data Type | Collected? | Shared? | Purpose | Ephemeral? | Required / Optional |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Location** | Approximate location | Yes | No | App functionality (Discover & Radar nearby profiles) | No | Optional (User can set to Hidden) |
| **Location** | Precise location | Yes | No | App functionality (Radar distance calculation) | No | Optional (User can choose Approximate or Hidden) |
| **Personal Info** | Name / Nickname | Yes | No | App functionality, Account management | No | Required |
| **Personal Info** | Email address | Yes | No | Account management, authentication, security alerts | No | Required |
| **Personal Info** | Sexual orientation / Gender identity | Yes | No | Profile presentation & matchmaking filters | No | Optional |
| **Photos & Videos** | Photos | Yes | No | User profile pictures & private chat media | No | Optional |
| **Photos & Videos** | Videos | Yes | No | Profile Star Videos & private chat media | No | Optional |
| **Audio** | Voice recordings | Yes | No | In-app voice messaging in chat | No | Optional |
| **Messages** | In-app messages | Yes | No | Private chat functionality | No | Optional |
| **Financial Info** | In-app purchase history | Yes | No | Managing subscription entitlements and restoration | No | Optional (Only for paying users) |
| **App Info & Performance** | Diagnostics / Crash logs | Yes | No | Analytics & bug fixing | No | Optional |
| **Device IDs** | Device / advertising identifiers | Yes | No | Fraud prevention, session management, security | No | Required for auth security |

---

## 3. Data Deletion Mechanism
- **In-App Account Deletion**: Users navigate to `Settings` → `Account Actions` → `Erase Personal Data & Delete Account (Art. 17)`.
- **Scope of Deletion**: Completely and irreversibly wipes the user's account record, profile data, uploaded photos/videos, chat histories, active sessions, and internal entitlement records.
- **Store Subscription Notice**: Clear disclosure that active Google Play subscriptions must be cancelled through Google Play Console / Play Store Subscriptions.
