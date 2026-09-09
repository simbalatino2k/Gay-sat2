# AURA GAY 18+ — GDPR & Privacy Compliance Specification

**Regulation:** Regulation (EU) 2016/679 (General Data Protection Regulation)  
**Territory:** European Union / European Economic Area (EEA) & Global Standard  
**Data Controller:** AURA Compliance EU S.L.  
**Contact:** privacy@auragay.com / Calle de Hortaleza 48, 28004 Madrid, Spain

---

## 1. Legal Bases for Processing

1. **Article 6(1)(b) — Performance of a Contract:**
   - Account registration, profile creation, discovery matching, messaging delivery, and payment processing.

2. **Article 6(1)(a) & Article 9(2)(a) — Explicit Consent for Special Category Data:**
   - Because AURA GAY 18+ is an LGBTQ+ platform, processing of data revealing sexual orientation is strictly subject to the user's explicit, informed, revocable consent obtained during onboarding and managed via `/api/gdpr/consents`.

3. **Article 6(1)(f) — Legitimate Interests:**
   - Platform safety, fraud prevention, abuse detection, and network security.

---

## 2. Exercise of Data Subject Rights

All data subject rights are accessible natively via the in-app **Privacy & Settings Center** or directly through authenticated REST endpoints:

### Article 15 (Right of Access) & Article 20 (Right to Data Portability)
- **Endpoint:** `GET /api/gdpr/export`
- **Payload:** Comprehensive machine-readable JSON package including:
  - Account credentials & profile attributes
  - Declared consents history
  - User-authored moments & reactions
  - Active matches & conversation histories
  - Cryptographic integrity checksum (`sha256Checksum`)
  - Export metadata and generation timestamp

### Article 16 (Right to Rectification)
- **Endpoint:** `POST /api/gdpr/rectify`
- Allows instant rectification of inaccurate personal data, including email address, display name, and bio descriptions.

### Article 17 (Right to Erasure / "Right to be Forgotten")
- **Endpoints:** `POST /api/gdpr/erase` and `DELETE /api/account`
- Irreversibly purges:
  - Profile identity and media
  - Stored moments
  - Conversations and direct messages
  - Likes and match records
  - Active session tokens
- Retains only a pseudonymized, salted cryptographic hash tombstone in an audit trail for legal defense obligations under Article 17(3)(e).

### Article 18 (Right to Restriction of Processing)
- **Endpoint:** `POST /api/gdpr/restrict`
- Immediately suspends user discovery, matching, and active sessions pending verification.

### Article 21 (Right to Object)
- **Endpoint:** `POST /api/gdpr/object`
- Immediate opt-out from automated profiling, machine-learning suggestions, and analytics processing.

---

## 3. Location Privacy & Minimization (Privacy by Design)

Users maintain granular control over geospatial telemetry:
- **Approximate Mode (Default):** Coordinates are fuzzed within ~1.0 kilometer radius to prevent triangulation.
- **Exact Mode:** User explicitly opts in for fine-grained proximity.
- **Stealth / Hidden Mode:** Location telemetry is entirely omitted from the public Radar.
