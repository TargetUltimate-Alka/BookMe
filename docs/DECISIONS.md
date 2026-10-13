# BookMe – Architectural & Contract Decisions

**Status:** Living Document  
**Date:** October 13, 2026  
**Source of Truth:** [docs/SRS.md](./SRS.md)

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
- **Impact:** Eliminates floating-point discrepancies across payment gateways, database math, and dispute calculations. For backward compatibility with pre-existing V1 callers (`event-booking-service` and legacy frontend components), responses also include legacy `price` / `basePrice` in INR derived strictly from integer paise (`Math.round(paise) / 100`), while all internal storage and math use integer paise (`BIGINT`).

### ADR-004: Date, Time, and Timezones
- **Context:** Events and bookings span multiple Indian timezones and deadlines (e.g. 12-hour response window, 2-hour deposit timer).
- **Decision:** All timestamps in APIs and events MUST be ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`) stored as PostgreSQL `TIMESTAMPTZ`. Client display formatting handles IST (`Asia/Kolkata`, UTC+05:30) conversions. Calendar dates without time components use `YYYY-MM-DD`.

### ADR-005: Idempotency & Replay Protection
- **Context:** Network retries, gateway webhooks, and distributed consumers can produce duplicate calls.
- **Decision:**
  - All mutating `POST` endpoints creating bookings, payments, refunds, payouts, capacity holds, or wallet debits support an `Idempotency-Key` HTTP header (or `bookingId` deduplication key for internal capacity operations).
  - Replays of identical requests return the cached response without re-executing transactions.
  - Consumers verify message deduplication keys before acting.

### ADR-006: PII Masking & Privacy (FR-COM-01)
- **Context:** To preserve the lead-billing model and protect user privacy, direct contact details must never be exchanged directly between customers and vendors.
- **Decision:**
  - Customer and vendor phone numbers, emails, raw Aadhaar numbers, PAN numbers, bank account numbers, and internal KYC references are never returned in public or customer-facing vendor/search/package responses.
  - Communication is strictly mediated via in-app chat (with server-side regex PII blocking) and in-app VoIP tokens.

---

## 3. Domain Specific Decisions & Assumptions

### ADR-007: Mobile Platform Baseline (SRS §11.1)
- **Context:** The SRS states "Android first, plus web admin panel, then iOS", but web technology is used in the frontend.
- **Decision:** React Native is chosen for mobile development (SRS Option A), while the web portal and admin panel use React/Vite (`frontend/`). In-app VoIP (WebRTC) and push notifications (FCM) are most reliable with native device SDKs.

### ADR-008: Payment Escrow & Gateway Integration (SRS §11.5)
- **Context:** BookMe must comply with RBI marketplace guidelines and avoid holding customer funds directly.
- **Decision:** A licensed payment gateway supporting marketplace split/escrow (e.g., Razorpay Route / Cashfree Marketplace) is used. Customer payments for Deposit (40%) and Balance (60%) are authorized into an escrow account. Payout to vendor is released automatically 24 hours after event completion if no dispute is open.

### ADR-009: KYC & Aadhaar Compliance (SRS §7 & §11.5)
- **Context:** Storing raw Aadhaar numbers is strictly illegal under Indian DPDP and Aadhaar regulations.
- **Decision:** Verification is conducted via DigiLocker OAuth or an approved KYC aggregator. BookMe stores ONLY the verification reference ID (`digilocker_ref`), consent timestamp, full legal name (`verified_name`), and masked last 4 digits (`aadhaar_masked`). Any payload containing a 12-digit raw Aadhaar number is rejected or immediately stripped before persistence. PAN and bank account are stored only as masked values + provider verification reference (`pan_ref`, `bank_ref`).

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

---

## 4. Vendor Module Implementation Decisions

### ADR-016: Backward-Compatible Schema Evolution & Dual-Mode Persistence
- **Context:** `services/vendor-service` had existing tables (`vendors`, `services`, `packages`, `availability`) and endpoints (`/api/vendors`, `/internal/vendors/:id/summary`, `/internal/availability/*`) used by `event-booking-service`, `payment-feedback-service`, and existing integration tests. Additionally, local developer environments may not have Docker/PostgreSQL running.
- **Decision:**
  1. Preserve all existing columns and routes while adding versioned, reversible SQL migrations (`services/vendor-service/migrations/001_vendor_module_srs.up.sql` and `.down.sql`) for all SRS tables (`categories`, `vendor_categories`, `vendor_status_history`, `package_addons`, `discounts`, `media_assets`, `availability_capacity`, `capacity_holds`, `vendor_wallets`, `wallet_ledger`, `notify_requests`, `configs`, `config_history`, `audit_logs`).
  2. Follow the repository's established pattern (`auth-service`, `event-booking-service`, `payment-feedback-service`) by equipping `vendor-service/src/shared/db.js` with automatic fallback to a deterministic, transactional in-memory store (`inMemoryStore.js`) when PostgreSQL is unreachable, while reporting exact DB connectivity in `/health`.

### ADR-017: Regulated Service Categories & Safety Flags
- **Context:** Section 4 of the prompt requires 60 service categories across 8 parent domains and requires appropriate legal/safety restrictions for regulated services (e.g., `Fireworks/Special Effects`, `Drone Videography`, `Generator Rental`, `Security Staff`).
- **Decision:** The `categories` table includes `is_regulated BOOLEAN DEFAULT FALSE` and `compliance_note TEXT`. Regulated categories require vendors to acknowledge safety/licensing compliance when creating packages in those categories.

### ADR-018: PostGIS & Haversine Distance Calculation Fallback
- **Context:** SRS §11.4 specifies PostgreSQL with PostGIS for radius/location queries and `pg_trgm` for vendor name matching, while `docker-compose.yml` uses `postgres:16-alpine` (which includes `pg_trgm` in `contrib` but may not have the `postgis` binary installed unless the PostGIS image is used).
- **Decision:** Migrations attempt `CREATE EXTENSION IF NOT EXISTS pg_trgm` and `CREATE EXTENSION IF NOT EXISTS postgis` inside safe `DO $$ BEGIN ... EXCEPTION WHEN OTHERS THEN ... END $$;` blocks so migrations never fail on standard `postgres:16-alpine`. Spatial distance queries use indexed bounding-box pre-filtering + exact Haversine spherical distance in SQL (and PostGIS `ST_DWithin` when available), checking both customer search `radiusKm` and the vendor's `service_radius_km`.

### ADR-019: External Provider Adapter Boundary (KYC, Bank, PAN, S3 Media, Maps, RabbitMQ)
- **Context:** Live credentials for DigiLocker, PAN verification, penny-drop bank verification, S3 object storage, Maps geocoding, and RabbitMQ may not be configured in local/test environments.
- **Decision:** Implemented `src/shared/providers/externalProviders.js` with strict provider interfaces. When production environment variables (`DIGILOCKER_CLIENT_ID`, `STORAGE_BUCKET`, etc.) are absent:
  - In `NODE_ENV === 'production'`, unconfigured provider calls fail with `503 UPSTREAM_GATEWAY_ERROR` and never fabricate verification.
  - In `development`/`test` mode, a clearly labelled `sandbox_adapter` (`isSandbox: true`, `providerMode: 'SANDBOX_DEV_ADAPTER'`) executes deterministic verification/presigned-URL generation for local development and automated testing.

### ADR-020: Package Publish Eligibility & Media Moderation Rules (FR-VEN-02)
- **Context:** A package needs at least 3 photos and 1 video to be published. Uploads enter a moderation queue and duplicate files across vendors are rejected by SHA-256 hash.
- **Decision:**
  - Packages are created in `DRAFT` status by default (or `PUBLISHED` only if legacy V1 endpoint is called or media requirements are met).
  - Publishing a package via `POST /vendors/me/packages/:id/publish` or `PATCH /vendors/me/packages/:id` (`status: 'PUBLISHED'`) validates that the package (or vendor portfolio linked to the package) has at least 3 non-rejected photos (`image/jpeg`, `image/png`, `image/webp`, <= 5 MB) and 1 non-rejected video (`video/mp4`, 5–10 seconds, <= 20 MB), and that none of the media hashes collide with another vendor's media (`409 DUPLICATE_MEDIA_HASH`).

### ADR-021: Atomic Capacity Reservation & Concurrency Control (FR-VEN-06, §11.4)
- **Context:** Competing requests for the last available unit of a package on a date/slot must never double-book, and counts must never become negative.
- **Decision:**
  - In PostgreSQL, capacity holds execute a single atomic statement:
    `UPDATE availability_capacity SET held_units = held_units + $qty WHERE package_id = $pkg AND date = $date AND slot = $slot AND (total_units - held_units - booked_units) >= $qty RETURNING *`
    backed by `CHECK (held_units >= 0 AND booked_units >= 0 AND held_units + booked_units <= total_units)`.
  - In the in-memory store, operations are serialized per `(package_id, date, slot)` key with identical guard conditions, verified by a 50-parallel-request concurrency test.

### ADR-022: Demo Data Isolation (`is_demo = true`)
- **Context:** 500 synthetic demo vendors and 60+ services are required for demonstration, but must never masquerade as live verified vendors or pollute production workflows.
- **Decision:**
  - All generated demo records set `is_demo = true`, `verified = false`, `kyc_status = 'DRAFT'`, and use deterministic IDs (`vnd_demo_0001`..`vnd_demo_0500`) so `generateDemoData.js` is 100% idempotent without truncating tables.
  - Live customer search (`/search/vendors` and `/api/vendors`) excludes `is_demo = true` records by default unless `includeDemo=true` is explicitly requested for demo preview, and every demo record returned includes `isDemo: true` and `demoLabel: "Fictional Demo Data - Unverified"`.

---

## 5. Event & Booking Lifecycle Implementation Decisions

### ADR-023: Complete 12-State Booking Lifecycle & Transition Enforcement (FR-BKG-01..09, FR-CAN-01..03, FR-PAY-06)
- **Context:** `contracts/openapi/booking.yaml` and `docs/SRS.md` specify 12 distinct lifecycle states (`REQUESTED`, `NEGOTIATING`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONFIRMED`, `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_VENDOR`, `IN_PROGRESS`, `NO_SHOW`, `COMPLETED`, `DISPUTED`). Earlier service prototypes only tracked 4 legacy states.
- **Decision:**
  - Initial booking requests always start in `REQUESTED`.
  - Database schema constraint `chk_booking_status` explicitly enforces all 12 contract states while maintaining backward-compatible string handling for legacy `PENDING` and `CANCELLED` aliases.
  - All status transitions must pass strict state-machine transition validation in `src/modules/booking/stateMachine.js`, returning `409 INVALID_STATE_TRANSITION` on invalid transitions.
  - Every transition transaction atomically writes to `booking_history` and emits an envelope-compliant CloudEvent (`envelope.schema.json`, `booking.events.yaml`).

### ADR-024: Multi-Round Structured Counter-Offer Negotiation Protocol (FR-BKG-03)
- **Context:** Customers and vendors need to negotiate pricing and terms before booking confirmation without breaking capacity holds or creating race conditions.
- **Decision:**
  - Counter-offers are stored in a dedicated `counter_offers` table with `proposed_by_role`, `amount_paise`, and `status`.
  - Maximum negotiation depth is capped at 3 counter-offers per booking request (`FR-BKG-03`). The 4th counter-offer attempt is rejected with `400 VALIDATION_ERROR`.
  - Each counter-offer has a mandatory 6-hour expiration timer (`expires_at = now() + 6 hours`).
  - Opposing party can accept via `PATCH /bookings/:id/counter/:counterId/accept`, transitioning booking status to `ACCEPTED` and setting deposit payment due timer to 2 hours.

### ADR-025: Tiered Cancellation Surcharge & Penalty Valuation Algorithm (SRS §2.4, FR-CAN-01..03)
- **Context:** Cancellations require deterministic refund calculations and vendor penalties governed by `docs/SRS.md` Section 2.4.
- **Decision:**
  - `GET /bookings/:id/cancellation-quote` computes charges dynamically based on lead time before event:
    - **Customer Cancellation:** Free cancellation if within 12h of confirmation and > 7 days to event. > 14 days: 0% charge, 100% refund. 7–14 days: 10% charge. 3–7 days: 25% charge. 1–3 days: 50% charge. < 24h: 100% charge (0% refund).
    - **Vendor Cancellation:** Always 100% customer refund. Vendor penalty fee owed to platform: > 14 days: 20%. 7–14 days: 30%. 3–7 days: 50%. < 3 days: 100% penalty.
  - All charges and refunds are calculated strictly in integer paise (`chargeAmountPaise`, `refundAmountPaise`, `vendorPenaltyPaise`).

### ADR-026: Vendor GPS Check-In (Arrived State) & Fulfillment Verification (FR-BKG-07)
- **Context:** To reduce disputes and verify physical vendor arrival at event locations, vendors must record a GPS-verified check-in.
- **Decision:**
  - `POST /bookings/:id/check-in` captures `latitude` and `longitude` with timestamp `check_in_at`.
  - Transitions booking from `CONFIRMED` to `IN_PROGRESS` (vendor arrived).
  - Emits `booking.in_progress` domain event to notify customer and downstream services.

### ADR-027: Notify-Me Quota Management & Availability Alerting (FR-NOT-02)
- **Context:** When vendors are unavailable or fully booked on requested dates, customers can subscribe to slot reopening alerts without overloading notification delivery systems.
- **Decision:**
  - Alerts are stored in `notify_requests` table with `target_date`, `status = ACTIVE`, and `expires_at = target_date 23:59:59`.
  - Quota is strictly enforced at 3 active requests per customer per 24 hours (`FR-NOT-02`). Excess requests are rejected with `429 RATE_LIMIT_EXCEEDED`.

### ADR-028: Web UI Dual-Mode Authentication & Strict Contract Schema Key Conformance
- **Context:** The frontend React client communicates with `auth-service` via email and password for login/signup alongside 1-click demo buttons, while the OpenAPI contract test suite enforces strict schema properties for phone-and-OTP authentication.
- **Decision:**
  - `authController.login`: Dual identifier resolution. If the identifier contains `@`, resolves user by `email`; otherwise resolves by encrypted/hashed `phone`.
  - `authController.register`: Dual validation. When `phone` is provided, enforces phone regex and valid OTP `verificationToken`. When `email` is provided from the Web UI without a phone number, synthesizes an internal deterministic phone hash to fulfill database constraints without requiring SMS OTP.
  - Strict Schema Keys: `POST /v1/auth/register` returns strictly `{ id, name, role, accessToken, refreshToken, expiresIn }` and `POST /v1/auth/login` returns strictly `{ accessToken, refreshToken, expiresIn, user: { id, name, role } }` to preserve 100% conformance with OpenAPI `identity.yaml`. The frontend client enriches local auth state with the known email upon successful response.
  - Development Pre-seeding: `inMemoryStore` seeds demo accounts (`customer@bookme.com`, `vendor@bookme.com`, `admin@bookme.com` with `password123`) when running outside `NODE_ENV=test` to ensure immediate 1-click demo logins work seamlessly.

