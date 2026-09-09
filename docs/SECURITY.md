# AURA GAY 18+ — Production Security Specification

**Product:** AURA GAY 18+  
**Architecture:** Node.js / Express + TypeScript (Backend) & React 18 + Vite + Tailwind CSS (Frontend)  
**Classification:** Adult 18+ Dating & Social Discovery Platform  
**Compliance Standard:** ISO/IEC 27001, OWASP Top 10, EU GDPR (2016/679), EU DSA (2022/2065)

---

## 1. Authentication & Session Security

1. **Password Hashing & Derivation:**
   - Passwords are salted with 16 bytes of cryptographically secure pseudo-random entropy (`crypto.randomBytes(16)`).
   - Key derivation utilizes Node.js standard `crypto.scryptSync` with 64-byte key length.
   - Stored format: `<hex_salt>:<hex_derived_key>`.
   - Verification employs `crypto.timingSafeEqual` to prevent side-channel timing attacks.

2. **Session Lifecycle & Tokens:**
   - Session identifiers are 256-bit entropy strings generated via `crypto.randomBytes(32).toString('hex')`.
   - Default session TTL is **7 days** (`7 * 24 * 60 * 60 * 1000` ms).
   - Expired sessions are automatically purged upon access.
   - Explicit token invalidation on `/api/auth/logout`, account deactivation, or GDPR right to erasure.

3. **Access Control & RBAC:**
   - Three distinct authorization tiers:
     - `USER`: Standard verified adult member.
     - `MODERATOR`: Adjudicates Notice & Action reports and reviews DSA appeals.
     - `SUPERADMIN`: Full administrative capability, audit trail inspection, and system metrics.
   - Strict IDOR (Insecure Direct Object Reference) guards on messages, moments, profile rectifications, and consent settings.

---

## 2. Network & Transport Hardening

1. **Production HTTP Headers:**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: SAMEORIGIN`
   - `X-XSS-Protection: 1; mode=block`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), payment=*, geolocation=(self)`
   - `Content-Security-Policy`: Restricts scripts, styles, fonts, and connections to verified first-party and trusted CDN endpoints (Google Maps, Google Fonts, Unsplash).

2. **Rate Limiting:**
   - In-memory sliding window rate limiter: 120 requests per 60-second window per remote IP.
   - HTTP 429 Too Many Requests response with clear JSON messaging upon threshold violation.

3. **Payload Inspection:**
   - JSON payload limit hard-capped at 10MB to accommodate Base64 encrypted media while preventing memory exhaustion Denial-of-Service.

---

## 3. Data Protection & Secrets Handling

1. **Secrets Management:**
   - Third-party secrets (`STRIPE_SECRET_KEY`, `GEMINI_API_KEY`) are accessed strictly on the server side (`process.env`).
   - SDK clients are lazily initialized at invocation time, ensuring graceful startup in sandboxed preview environments.

2. **Zero Plaintext Sensitive Storage:**
   - Passwords and private credentials are never stored in cleartext or serialized into client responses.
   - User database is persisted to `data/aura_db.json` with file-level isolation.
