# Auth / Identity Service Audit

**Audit Date:** 2026-10-13  
**Service Path:** `services/auth-service`  
**Contract Version:** `contracts/openapi/identity.yaml` (v1.0.0, FROZEN)  
**Common Schemas:** `contracts/openapi/common.yaml` (v1.0.0, FROZEN)  
**SRS Reference:** Sections 2.1, 2.3, 3.1 (FR-ONB-01, FR-ONB-02, FR-ONB-04, FR-ONB-05, FR-ADM-01), 11.3, 11.5  

---

## 1. OpenAPI Operations Audit Table

| HTTP Method & Path | Operation ID | Status | Evidence (File Paths) | Work Needed | Size |
| :--- | :--- | :---: | :--- | :--- | :---: |
| `POST /auth/otp/send` | `sendOtp` | **BUILD** | `src/routes/authRoutes.js`<br>`src/controllers/authController.js` | Implement 6-digit OTP generation, SHA-256 hash storage with CONFIG expiry (default 300s) and cooldown (default 30s). Per-phone & per-IP rate limiting (`429 RATE_LIMIT_EXCEEDED`). Anti-enumeration uniform response for registered and unregistered phones. Console/Mock `SmsSender` interface. Phone number encryption at rest and log masking. | **M** |
| `POST /auth/otp/verify` | `verifyOtp` | **BUILD** | `src/routes/authRoutes.js`<br>`src/controllers/authController.js` | Verify 6-digit OTP against stored hash, enforce single-use, verify within expiry window. Account lockout tracking: 5 failed attempts lock the account for 15 minutes (FR-ONB-01). Generate signed `verificationToken` required for registration. | **M** |
| `POST /auth/register` | `registerUser` | **MODIFY** | `src/controllers/authController.js:12-97`<br>`src/routes/authRoutes.js:8`<br>`src/repository/userRepository.js:4-13` | Add validation for `phone` (`^\+91[0-9]{10}$`) and check `verificationToken`. Password validation: minimum 8 characters. Allow all roles defined in `UserRole` (`customer`, `vendor`, etc.). Encrypt phone at rest. Record `CUSTOMER_DAMAGE_LIABILITY` terms acceptance if `acceptLiabilityTerms` is true (FR-ONB-04). Return `201` with `{ id, name, role, accessToken, refreshToken, expiresIn }`. Strict `ErrorResponse` envelope. | **M** |
| `POST /auth/login` | `loginUser` | **MODIFY** | `src/controllers/authController.js:100-174`<br>`src/routes/authRoutes.js:9` | Migrate credentials from `email` to `phone` (`+91...`). Check lockout state before password check; increment failed attempt count on bad password; lock account for 15 minutes if failed attempts reach 5. Return `{ accessToken, refreshToken, expiresIn, user: { id, name, role } }`. Anti-enumeration identical error responses for unknown phone and bad password. Strict `ErrorResponse` schema. | **M** |
| `POST /auth/refresh` | `refreshToken` | **MODIFY** | `src/controllers/authController.js:177-231`<br>`src/routes/authRoutes.js:10`<br>`src/repository/tokenRepository.js:4-33` | Store refresh tokens as SHA-256 hashes. Implement token family rotation on every refresh call. Detect token reuse: if a previously revoked refresh token is presented, immediately revoke the entire token family for that user. Return `{ accessToken, expiresIn }`. | **S** |
| `POST /auth/logout` | `logoutUser` | **KEEP / MODIFY** | `src/controllers/authController.js:234-250`<br>`src/routes/authRoutes.js:13` | Validate Bearer access token; revoke associated refresh token and session. Maintain 204 No Content response. Format any 401 error as standard `ErrorResponse`. | **S** |
| `GET /auth/me` | `getCurrentUser` | **MODIFY** | `src/controllers/authController.js:254-279`<br>`src/routes/authRoutes.js:14` | Return profile fields per contract: `{ id, name, phone, email, role, status, createdAt }`. Decrypt phone number for caller; ensure `status` ("ACTIVE" / "LOCKED") is included. | **S** |
| `PATCH /auth/me` | `updateCurrentUser` | **MODIFY** | `src/controllers/authController.js:282-318`<br>`src/routes/authRoutes.js:15` | Add support for updating optional `email` along with `name`. Validate email uniqueness. Return `{ id, name, email }`. | **S** |
| `POST /auth/agreements/accept` | `acceptTerms` | **BUILD** | `src/routes/authRoutes.js`<br>`src/controllers/authController.js` | Implement append-only agreement acceptance audit log (table `agreement_acceptances`) storing `userId`, `agreementType` (`CUSTOMER_DAMAGE_LIABILITY` or `VENDOR_SERVICE_AGREEMENT`), `version`, client IP address, user agent, and timestamp (FR-ONB-04, FR-ONB-05). Return `200 { accepted: true, acceptedAt }`. | **M** |
| `GET /auth/agreements/status` | `getAgreementStatus` | **BUILD** | `src/routes/authRoutes.js`<br>`src/controllers/authController.js` | Query agreement status for the authenticated user. Return `200 { damageLiabilityAccepted, vendorAgreementSigned, currentAgreementVersion }`. | **S** |
| `GET /internal/users/{id}` | `getInternalUser` | **MODIFY** | `src/controllers/authController.js:321-345`<br>`src/routes/internalRoutes.js` | Return `{ id, name, role, phone, email }` with decrypted phone. Ensure authentication via `X-Internal-Key` and conform 404 response to `ErrorResponse`. | **S** |

---

## 2. Endpoints Not in `identity.yaml` (To Deprecate or Leave)

1. **`GET /health` and `GET /api/auth/health`:**
   - **Decision:** **LEAVE** as internal operational utilities for container health checking and orchestration probes.
2. **Mount Path Aliases (`/api/auth/*` vs `/v1/auth/*` vs `/auth/*`):**
   - **Decision:** **LEAVE** mount aliases. The contract uses gateway prefix `/v1` (e.g. `/v1/auth/register`). In `src/app.js`, mount routes at `/v1/auth` and `/v1/internal`, while preserving `/auth`, `/api/auth`, and `/internal` as backwards-compatible aliases so existing frontends or test callers continue to function smoothly.

---

## 3. Out-of-Scope Code Found in `AUTH_SERVICE_PATH`

- **External Domain Logic:** None present. There are no models, routes, or database operations referencing catalog, booking, payment, wallet, reviews, or notifications in this service.
- **KYC / DigiLocker / PAN / Bank Details:** None present. Per task instructions, these remain out of scope and will not be added to auth-service.
- **In-Memory and File-Backed Store (`src/db/inMemoryStore.js`):**
  - Found fallback persistence to local file (`data/auth_db.json`) used when PostgreSQL is disconnected during local development.
  - **Decision:** Retain this resilient fallback layer, extending it to support OTP hashes, lockouts, and agreements so tests and local runs work seamlessly both with and without a live PostgreSQL instance.
- **Identity Events:**
  - Checked `contracts/events/`: No identity-domain event contracts exist (`contracts/events/` contains only `booking`, `catalog`, `communication`, `notification`, `payment`, `review`, `support`, `vendor`, `wallet`).
  - Per specification: "If none exist, publish nothing." No outbox or RabbitMQ publishing is required for identity.
