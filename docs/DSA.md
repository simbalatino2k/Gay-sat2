# AURA GAY 18+ — EU Digital Services Act (DSA) Compliance

**Regulation:** Regulation (EU) 2022/2065 (Digital Services Act)  
**Classification:** Online Platform (Hosting Service)  
**Designated Single Point of Contact (Art. 11 & 12):** legal@auragay.com  
**Languages Supported:** English, Spanish, German

---

## 1. Notice and Action Mechanism (Article 16)

AURA implements an electronic notice and takedown workflow accessible directly on all user profiles and in-chat:
- **Endpoint:** `POST /api/dsa/report`
- **Categorized Grounds for Notice:**
  1. `UNDERAGE_SUSPICION`: Suspicion of individual being under 18 years of age (Highest Priority).
  2. `NON_CONSENSUAL_MEDIA`: Distribution of non-consensual intimate imagery.
  3. `HARASSMENT_OR_HATE`: Discriminatory hate speech, threats, or severe harassment.
  4. `IMPERSONATION_OR_SCAM`: Catfishing, commercial fraud, or unauthorized identity theft.
  5. `COMMERCIAL_SOLICITATION`: Prostitution, commercial solicitation, or spam bots.
  6. `TERMS_VIOLATION`: General breach of Community Guidelines.

Notice acknowledgments are returned immediately with reference tracking tokens.

---

## 2. Statement of Reasons (Article 17)

Whenever content is removed, restricted, or an account is suspended, the affected user receives a detailed, formal **Statement of Reasons** delivered via their in-app feed:
- **Endpoint:** `GET /api/dsa/notices`
- **Mandatory Disclosures:**
  - Exact decision type (Warning, Content Removal, Account Suspension).
  - Legal or Terms of Service provision relied upon.
  - Plain-language statement of facts and rationale.
  - Information on redress options, internal appeal rights, and judicial recourse.

---

## 3. Internal Complaint-Handling System & Appeals (Article 20)

Users have the statutory right to appeal any moderation decision within **6 months** of notification:
- **Submission Endpoint:** `POST /api/dsa/appeal`
- **Admin Adjudication Endpoint:** `POST /api/admin/dsa/appeals/:appealId/decide`
- **Process Requirements:**
  - Human review mandatory: No automated rejections.
  - Available outcomes: `UPHELD` (sanction confirmed) or `OVERTURNED` (sanction revoked, user restored).
  - Written determination with full justification delivered to appellant.

---

## 4. Protection of Minors (Article 28)

- AURA is strictly an **18+ platform**.
- Users must pass an explicit age gate during registration verifying adult age.
- Reports flagged with `UNDERAGE_SUSPICION` trigger immediate provisional suspension pending age verification review.
- Minors are completely prohibited from registering, accessing, or being depicted on the platform.

---

## 5. Transparency Reporting (Article 15)

- **Public Telemetry Endpoint:** `GET /api/dsa/transparency`
- Publishes bi-annual statistics on:
  - Average monthly active recipients in the EU.
  - Total notices received by category.
  - Content removals and account suspensions.
  - Average resolution timeframe.
  - Zero automated AI sanctions statement.
