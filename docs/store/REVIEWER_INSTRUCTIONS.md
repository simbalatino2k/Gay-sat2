# App Store & Google Play Reviewer Test Guide — AURA GAY 18+

## Quick Navigation & Verification Checklist for App Reviewers

This document provides step-by-step instructions to verify compliance with UGC safety, in-app purchases, privacy, and adult-gating rules.

---

### Test 1: User Blocking (UGC Compliance)
1. Log in with `reviewer.standard@aura.test` (or `appreview.standard@aura.test`).
2. On the **Discover** tab, tap any user profile card.
3. Tap the **Shield / Block** icon.
4. Select **"Block User"**.
5. **Expected Result**: The user disappears immediately from the Discover grid and cannot message you.

---

### Test 2: User Reporting (UGC Compliance)
1. Tap any profile card or chat message.
2. Tap the **Report** button (flag / shield icon).
3. Select any category (e.g., "Inappropriate Media" or "Harassment").
4. Enter optional details and tap **"Submit Report"**.
5. **Expected Result**: A confirmation message confirms that the report was dispatched to the moderation team under EU DSA Article 16 standards.

---

### Test 3: Location Privacy Modes
1. Open **Radar** or **Settings**.
2. Notice the location mode toggle:
   - **Exact**: Displays distance in meters/kilometers.
   - **Approximate**: Rounds distance to the nearest 1–2 km for personal privacy.
   - **Hidden**: Hides distance completely while still allowing you to view nearby venues.
3. **Expected Result**: Location coordinates are never broadcast publicly; distances update according to user preference.

---

### Test 4: In-App Purchases (StoreKit 2 / Google Play Billing)
1. In **Settings**, tap **"Unlock AURA Premium"** or tap any locked VIP feature (e.g., Profile Visitors).
2. The store-compliant **AURA VIP Pass** paywall opens.
3. Observe:
   - Dynamic plan cards (Monthly, 3-Month, Yearly) with localized prices.
   - Comprehensive terms disclosure including renewal terms and cancellation policy.
   - Active **"Restore Purchases"** button.
   - Active **"Manage Subscription"** link pointing to store settings.
   - Links to Privacy Policy, Terms of Service, and Child Safety.
4. In Sandbox / Test environment, complete a test purchase:
   - **Expected Result**: Premium entitlement is granted immediately; the paywall updates to "Verified Active VIP".

---

### Test 5: Account Erasure & Subscription Disclosure (GDPR Art. 17 / Guideline 5.1.1(v))
1. Navigate to **Settings** → scroll to the bottom.
2. Tap **"Erase Personal Data & Delete Account (Art. 17)"**.
3. Observe the prominent warning banner:
   - *"Store Subscription Notice: Deleting your AURA account does NOT automatically cancel any active Google Play or Apple App Store subscriptions..."*
   - Direct button: *"Open Store Subscription Settings"*.
4. Tap **"Confirm Erasure"**.
5. **Expected Result**: The session is terminated immediately and the user is redirected to the onboarding/login screen.
