# BookMe – Architectural & Contract Decisions

**Status:** Living Document  
**Date:** October 13, 2026  
**Source of Truth:** [docs/SRS.md](file:///d:/Personal_details_alkaJha_26-05-2026/mca_3RD_Semester/web%20service%20materials/BookMe_team_project/BookMe/docs/SRS.md)

---

## 1. Architectural Baseline & Service Boundaries

### ADR-001: Developer Ownership & Domain Division
- **Context:** Two developers are implementing the BookMe marketplace microservices in parallel.
- **Decision:**
  - **Developer A (`x-owner: "A"`)**: Owns `identity`, `vendor`, `catalog`, `availability`, `search`, `planner`, and `booking`. In the current codebase, this spans `auth-service`, `vendor-service`, and the planner/booking components of `event-booking-service`.
  - **Developer B (`x-owner: "B"`)**: Owns `payment`, `wallet`, `communication`, `review`, `support`, `admin`, and `notification`. In the current codebase, this spans `payment-feedback-service` and its companion modules.
- **Impact:** Decoupled contracts allow both developers to mock dependencies using Prism and develop services independently.

### ADR-002: Modular Contract Architecture (OpenAPI 3.1 & AsyncAPI 3.0)
- **Context:** A monolithic contract file causes merge conflicts between developers.
- **Decision:** Split OpenAPI 3.1 specifications into 14 domain-specific files plus a shared `common.yaml`. Asynchronous events are specified using AsyncAPI 3.0 schemas with a standardized event envelope.
- **Rules:**
  - Common schemas (error envelopes, monetary types, pagination, address, security) reside strictly in `common.yaml` and are referenced via `$ref`.
  - No duplication of shared models across domain specs.

---

## 2. Global Conventions & Standards

### ADR-003: Monetary Fields & Currency
- **Context:** Floating-point currency calculations create rounding errors in financial transactions, deposits, cancellation charges, and wallet credits.
- **Decision:** All monetary amounts MUST be represented as 64-bit integer paise (1 INR = 100 paise). Field names MUST end with `Paise` (e.g., `basePricePaise`, `depositAmountPaise`, `balanceAmountPaise`, `leadFeePaise`, `walletBalancePaise`).
- **Impact:** Eliminates floating-point discrepancies across payment gateways, database math, and dispute calculations.

### ADR-004: Date, Time, and Timezones
- **Context:** Events and bookings span multiple Indian timezones and deadlines (e.g. 12-hour response window, 2-hour deposit timer).
- **Decision:** All timestamps in APIs and events MUST be ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`). Client display formatting handles IST conversions. Calendar dates without time components use `YYYY-MM-DD`.

### ADR-005: Idempotency & Replay Protection
- **Context:** Network retries, gateway webhooks, and distributed consumers can produce duplicate calls.
- **Decision:**
  - All mutating `POST` endpoints creating bookings, payments, refunds, payouts, or wallet debits require an `Idempotency-Key` HTTP header.
  - Replays of identical requests return the cached response without re-executing transactions.
  - Consumers verify message deduplication keys before acting.

### ADR-006: PII Masking & Privacy (FR-COM-01)
- **Context:** To preserve the lead-billing model and protect user privacy, direct contact details must never be exchanged directly between customers and vendors.
- **Decision:**
  - Customer phone numbers, emails, and exact external identifiers are never returned in public or vendor-facing booking/chat responses.
  - Communication is strictly mediated via in-app chat (with server-side regex PII blocking) and in-app VoIP tokens.

---

## 3. Domain Specific Decisions & Assumptions

### ADR-007: Mobile Platform Baseline (SRS §11.1)
- **Context:** The SRS states "Android first, plus web admin panel, then iOS", but web technology is used in the frontend.
- **Decision:** React Native is chosen for mobile development (SRS Option A), while the web admin panel uses React/Vite. In-app VoIP (WebRTC) and push notifications (FCM) are most reliable with native device SDKs.

### ADR-008: Payment Escrow & Gateway Integration (SRS §11.5)
- **Context:** BookMe must comply with RBI marketplace guidelines and avoid holding customer funds directly.
- **Decision:** A licensed payment gateway supporting marketplace split/escrow (e.g., Razorpay Route / Cashfree Marketplace) is used. Customer payments for Deposit (40%) and Balance (60%) are authorized into an escrow account. Payout to vendor is released automatically 24 hours after event completion if no dispute is open.

### ADR-009: KYC & Aadhaar Compliance (SRS §7 & §11.5)
- **Context:** Storing raw Aadhaar numbers is strictly illegal under Indian DPDP and Aadhaar regulations.
- **Decision:** Verification is conducted via DigiLocker OAuth or an approved KYC aggregator. BookMe stores ONLY the verification reference ID, consent timestamp, full legal name, and masked last 4 digits. PAN and bank account are verified via penny-drop.

### ADR-010: Lead Qualification & Deduplication (FR-COM-04, FR-COM-05)
- **Context:** Defining the exact criteria for a billable call lead.
- **Decision:**
  - A lead is qualified and debited ONLY when:
    1. The customer initiated the in-app call.
    2. The customer is OTP-verified.
    3. Both parties remain connected for >= 30 seconds (computed server-side from provider webhook events).
  - Deduplication: At most one billable lead per customer-vendor pair per 7 rolling days.
  - Daily customer cap: At most 10 billable calls per customer per day. Excess calls are held for spam review.

### ADR-011: Booking State Machine Transitions & Timers (SRS Section 5)
- **Context:** Complex transitions between `REQUESTED`, `NEGOTIATING`, `ACCEPTED`, `CONFIRMED`, `CANCELLED`, `IN_PROGRESS`, `COMPLETED`, `DISPUTED`, and `NO_SHOW`.
- **Decision:**
  - Timers are tracked via database expiration columns (`expires_at`, `payment_due_at`) as the source of truth, backed by RabbitMQ delayed queues (`booking.deadlines`) and a 1-minute fallback sweeper worker.
  - Max 3 counter-offers during negotiation; each counter-offer is valid for 6 hours.
  - Customer cancellation charge ladder (§2.4) is computed by the booking service prior to cancellation confirmation.

### ADR-012: OTP Dispatch Interface & Development SMS Mock (FR-ONB-01)
- **Context:** The frozen OpenAPI contracts (`identity.yaml`) define `/auth/otp/send` and `/auth/otp/verify` but intentionally do not specify the external SMS gateway mechanism (e.g. Twilio, Gupshup, Fast2SMS). Calling another internal microservice for SMS delivery without a defined event/HTTP contract violates microservice independence.
- **Decision:**
  - An internal `SmsSender` interface is created inside `services/auth-service/src/services/smsSender.js`.
  - A `ConsoleSmsSender` / `MockSmsSender` implementation is registered for local development and integration testing.
  - OTPs are logged with phone numbers strictly masked (e.g., `+91******3210`).
  - Production deployments inject the live SMS gateway provider adapter satisfying the `SmsSender` interface without altering any public contract or external service boundaries.

### ADR-013: Distributed Token Verification Standard for Downstream Services
- **Context:** Microservices (e.g., `vendor-service`, `event-booking-service`, `payment-feedback-service`) must authenticate user requests from JWT Bearer tokens without making a high-latency synchronous HTTP hop to `auth-service` on every API request.
- **Decision:**
  - **Algorithm & Secret:** Tokens are signed using HMAC-SHA256 with the shared configuration key `JWT_SECRET` (in production, upgradable to RS256/asymmetric public key verification).
  - **Token Claims:** Access tokens carry:
    - `sub`: User UUID string (e.g., `c1f1c8a6-8096-4a57-8984-b040e698ea12`).
    - `role`: Exactly one of the `UserRole` enums (`customer`, `vendor`, `superAdmin`, `verifier`, `supportAgent`, `financeAdmin`, `contentModerator`).
    - `iat`: Timestamp issued (seconds).
    - `exp`: Expiration timestamp (seconds, valid for 900 seconds / 15 minutes).
  - **Downstream Verification:** Peer microservices verify token signatures locally using `jsonwebtoken.verify(token, JWT_SECRET)` and extract `req.user = { id: decoded.sub, role: decoded.role }`. Peer services MUST NOT query the `auth` database directly.

### ADR-014: Phone Number Encryption at Rest & Deterministic Blind Indexing (FR-ONB-01)
- **Context:** Under DPDP regulations, personal phone numbers must be encrypted at rest in the database, but user lookup queries (`findByPhone`) must remain fast and indexable without full-table decryption.
- **Decision:**
  - Raw phone numbers are encrypted at rest using AES-256-GCM (`phone_encrypted`), producing `iv:authTag:ciphertext`.
  - A deterministic blind index (`phone_hash`) is generated via HMAC-SHA256 (`crypto.createHmac('sha256', ENCRYPTION_KEY).update(phone).digest('hex')`) and given a UNIQUE index.
  - All database queries match on `phone_hash`. Decryption occurs only in memory when returning data to authorized profile endpoints (`/auth/me` and `/internal/users/:id`).
  - Phone numbers are never emitted in plaintext logs or error traces, using the `maskPhone` utility.

### ADR-015: Refresh Token Family Rotation & Reuse Detection (FR-ONB-01)
- **Context:** Storing refresh tokens in plaintext allows database read compromise to forge sessions. Replay attacks on refresh tokens must be actively neutralized.
- **Decision:**
  - Refresh tokens are stored ONLY as SHA-256 hashes in `refresh_tokens.token_hash`.
  - Every token belongs to a `family_id`. When `/auth/refresh` is called with a valid token, the token is revoked and a new access token is returned.
  - If a refresh token that was ALREADY revoked is presented, a token reuse attack is detected: the entire token family is revoked immediately (`WHERE family_id = $1`), terminating all active sessions for that user.
