# Audit Report: BookMe Vendor Module (`docs/VENDOR_MODULE_AUDIT.md`)

**Date:** October 13, 2026  
**Repository:** `https://github.com/TargetUltimate-Alka/BookMe.git`  
**Target Service:** `services/vendor-service` & `frontend/src/features/vendor`  
**Primary Source of Truth:** `docs/SRS.md` (BookMe Software Requirements Specification v1.0) and `contracts/openapi/*.yaml`

---

## 1. Existing Repository & Architecture Audit

### 1.1 Monorepo Structure & Service Boundaries
- **`services/auth-service` (`KEEP`)**: Implements JWT issuance (`Bearer` tokens with `{ sub, role }`), user registration/login, refresh tokens, rate limiting, and resilient in-memory fallback when PostgreSQL is unavailable.
- **`services/vendor-service` (`MODIFY` / `BUILD`)**: Owned by Person B. Currently contains basic CRUD for `vendors`, `services`, `packages`, and binary `availability` date-blocking using raw SQL (`pg`), plus a basic `generateDemoData.js` script and `tests/demoData.test.js`. Lacks SRS-compliant onboarding/KYC state machine, 60 hierarchical categories, integer paise pricing, package tiers/GST/HSN/security deposit, add-ons, discounts, media moderation/hash deduplication, atomic capacity reservations (`total_units`, `held_units`, `booked_units`), PostGIS/`pg_trgm` customer search, CONFIG table, and immutable audit logging.
- **`services/event-booking-service` (`KEEP` / `INTEGRATE`)**: Implements event creation, budget, checklist items, booking lifecycle state machine, and `vendorClient.js` communicating with `vendor-service` via `/internal/vendors/:vendorId/validate` and `/internal/availability/{check,hold,book,release}`.
- **`services/payment-feedback-service` (`KEEP` / `INTEGRATE`)**: Implements deposit/balance payment orders, payouts, reviews, and complaints, syncing vendor ratings via `PATCH /internal/vendors/:id/rating`.
- **`frontend/src/features/vendor` (`MODIFY` / `BUILD`)**: Contains `VendorDashboard.jsx`, `VendorDiscovery.jsx`, `VendorPackages.jsx`, `VendorCalendar.jsx`, `VendorGallery.jsx`, `VendorCard.jsx`, and `api.js`. Currently uses simplified fields and static demo fallbacks; needs full SRS onboarding wizard, KYC/agreement management, multi-category selection, tiered paise-based package/add-on/discount management, media upload moderation status, capacity calendar editor, advanced customer search filters + "Notify Me", and EN/HI/GU localization support.
- **`contracts/` (`KEEP`)**: Contains OpenAPI 3.1 specs (`vendor.yaml`, `catalog.yaml`, `availability.yaml`, `search.yaml`, `admin.yaml`, `wallet.yaml`, `notification.yaml`, `common.yaml`), AsyncAPI 3.0 event specs, and `traceability.md`.

### 1.2 Database, ORM & Migration System
- Uses raw SQL over `pg` (`Pool`) with SQL migration files (as established in `services/event-booking-service/migrations/`).
- `services/vendor-service/src/shared/db.js` previously exited the process immediately if `DATABASE_URL` was missing or PostgreSQL was offline, unlike `auth-service`, `event-booking-service`, and `payment-feedback-service` which include a resilient repository/store layer when local Docker/PostgreSQL is unavailable.
- Existing tables (`vendors`, `services`, `packages`, `availability`) use floating/numeric prices (`NUMERIC(10,2)`) instead of `BIGINT` paise and lack SRS columns. We must preserve backward compatibility for existing endpoints and inter-service calls while adding versioned, reversible SQL migrations (`services/vendor-service/migrations/001_vendor_module_srs.up.sql` and `.down.sql`) and full dual-field support (`price` in INR for legacy callers + `*Paise` in integer paise per SRS/OpenAPI).

---

## 2. SRS Requirement Status Matrix (`KEEP` / `MODIFY` / `BUILD` / `BLOCKED`)

### 2.1 Onboarding and Verification (`FR-ONB-*`)

| Requirement ID | Summary | Status | Audit Findings & Implementation Action |
| :--- | :--- | :--- | :--- |
| **FR-ONB-01** | Customer OTP registration & login lockout | `KEEP` | Handled by `auth-service`. Preserved as-is. |
| **FR-ONB-02** | Vendor registration with photo, categories, map pin/address, service radius/areas | `MODIFY` | Existing `POST /api/vendors` only took `businessName, category, description, location` and auto-verified (`verified: true`). Extended to support `photoUrl`, multiple `categoryIds`, structured `serviceLocation` (lat/lng, address, city, state, postalCode), `serviceRadiusKm`, `serviceAreas`, draft saving, and `SUBMITTED` validation rules. |
| **FR-ONB-03** | Vendor KYC via DigiLocker, PAN, and penny-drop bank verification (masked Aadhaar only) | `BUILD` | Built `/vendors/me/kyc/digilocker/start`, `/vendors/me/kyc/digilocker/callback`, `/vendors/me/kyc/pan`, `/vendors/me/kyc/bank`, and `/vendors/me/kyc/status` with provider adapter boundary. Raw Aadhaar is strictly rejected/never stored; only `digilocker_ref`, `verified_name`, `aadhaar_masked` (last 4 digits), consent timestamp, `pan_ref`, and `bank_ref` are persisted. |
| **FR-ONB-04** | Vendor e-signs vendor agreement with version, timestamp, IP | `BUILD` | Built `/vendors/me/agreement/sign` and `/vendors/me/agreement/status`. Stores `agreement_version`, `agreement_signed_at` (UTC), and signer IP. Prevents going live unless signed on current `REQUIRED_AGREEMENT_VERSION` config. |
| **FR-ONB-05** | Customer accepts damage-liability terms before first booking | `KEEP` | Customer booking domain (`event-booking-service`). |
| **FR-ONB-06** | Verifier approves/rejects vendor with mandatory reason; statuses `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `SUSPENDED` | `BUILD` | Built state machine, status history table (`vendor_status_history`), `/vendors/me/submit`, `/vendors/:id/verification`, and `/admin/vendors/:id/verification` (`verifier` / `superAdmin` RBAC). Enforces mandatory reason on decision and checks `APPROVED` + wallet minimum (`MINIMUM_WALLET_BALANCE_PAISE`) + current agreement in live customer search. |

### 2.2 Vendor Listing and Availability (`FR-VEN-*`)

| Requirement ID | Summary | Status | Audit Findings & Implementation Action |
| :--- | :--- | :--- | :--- |
| **FR-VEN-01** | Vendor profile shows name, description, location, categories, media, ratings, packages | `MODIFY` | Enhanced `GET /api/vendors/:id`, `GET /api/vendors/me`, `PATCH /api/vendors/me`, and `/categories` hierarchy (seeded with all 60 required SRS service types across 8 parent categories). Redacts all private KYC/contact fields from public responses. |
| **FR-VEN-02** | Media rules: JPG/PNG/WEBP <= 5MB, MP4 5-10s <= 20MB; min 3 photos + 1 video to publish package; moderation queue; SHA-256 duplicate check across vendors | `BUILD` | Built `/media/upload-url`, `/vendors/me/media`, `/media/:id/status`, and `/admin/media/:id/moderate`. Validates MIME type, magic bytes/extension, byte size, video duration (5–10s), SHA-256 duplicate hash across other vendors (`409 DUPLICATE_MEDIA_HASH`), moderation queue (`PENDING` -> `APPROVED`/`REJECTED`), and package publish guard (min 3 approved/uploaded photos + 1 video). |
| **FR-VEN-03** | Packages with tiers (`Basic`, `Standard`, `Premium`), base price (paise), pricing unit (`per_day`, `per_hour`, `per_plate`, `flat`), inclusions/exclusions, guest min/max, duration, overtime rate, brand attributes | `MODIFY` | Upgraded `packages` schema and endpoints (`POST /vendors/me/packages`, `GET /vendors/:vendorId/packages`, `GET /packages/:id`, `PATCH /vendors/me/packages/:id`, `POST /vendors/me/packages/:id/publish`) while keeping legacy `POST /vendors/:id/packages` working. All prices stored as integer paise (`BIGINT`). |
| **FR-VEN-04** | Add-ons (extra hour, equipment, generator, distance slab delivery) with independent prices and basis | `BUILD` | Built `package_addons` table and CRUD endpoints (`/vendors/me/packages/:id/addons`, `PATCH/DELETE /vendors/me/packages/:id/addons/:addonId`). |
| **FR-VEN-05** | Discounts: percent or flat, package/vendor scope, start/end dates, min order, promo code; display original & discounted price | `BUILD` | Built `discounts` table, CRUD endpoints (`/vendors/me/discounts`), and integer paise discount calculation helper returning both `originalPricePaise` and `discountedPricePaise`. |
| **FR-VEN-06** | Availability calendar with capacity per package per date/slot; atomic decrement; concurrency protection | `MODIFY` | Upgraded from binary vendor date-blocking to `availability_capacity` (`package_id`, `date`, `slot`, `total_units`, `held_units`, `booked_units`) with atomic check/update guards and CHECK constraints (`total_units - held_units - booked_units >= 0`). Preserved legacy `/vendors/:id/availability/block` endpoints for backward compatibility. Added 50-parallel-request concurrency test (`FR-VEN-06`). |
| **FR-VEN-07** | Package with zero remaining capacity on requested date omitted; vendor with no matching available package absent from results | `BUILD` | Enforced in `/availability/check` and `/search/vendors` when `startDate`/`endDate` and `quantity` are queried. |
| **FR-VEN-08** | Search results show only matching services/packages & prices; vendor profile shows all services | `BUILD` | Implemented in `GET /search/vendors`, `GET /search/vendors/:id`, and `GET /search/vendors/:id/matching-packages`, plus customer discovery UI. |
| **FR-VEN-09** | Optional refundable security deposit per package within CONFIG cap (`MAX_SECURITY_DEPOSIT_PAISE`) | `BUILD` | Added `security_deposit_paise` validated against dynamic `CONFIG` parameter `MAX_SECURITY_DEPOSIT_PAISE`. |
| **FR-VEN-10** | Immutable booking price, discount, tax, and terms snapshot at confirmation | `BUILD` | Added `POST /internal/packages/:packageId/price-snapshot` and enhanced `/internal/vendors/:vendorId/validate` to compute and return an immutable JSON snapshot (`basePricePaise`, `discountPaise`, `gstRatePercent`, `taxAmountPaise`, `securityDepositPaise`, `totalPayablePaise`, `termsVersion`, `snapshotAt`) unaffected by subsequent package edits. |
| **FR-VEN-11** | GST rate and HSN/SAC code per package; configurable inclusive/exclusive tax presentation | `BUILD` | Added `gst_rate_bps` / `gst_rate_percent`, `hsn_sac_code`, and `tax_inclusive` fields on packages with integer paise tax calculation. |

### 2.3 Search (`FR-SRCH-*`)

| Requirement ID | Summary | Status | Audit Findings & Implementation Action |
| :--- | :--- | :--- | :--- |
| **FR-SRCH-01** | Search by vendor name (partial, case-insensitive) | `MODIFY` | Implemented `pg_trgm` (`ILIKE` + trigram index) partial case-insensitive search on `business_name`. |
| **FR-SRCH-02** | Filter by date or date range | `BUILD` | Filters packages and vendors with sufficient remaining capacity across every date in `[startDate, endDate]`. |
| **FR-SRCH-03** | Filters: category, rating, availability, brand, price range, discount available, location & radius within vendor's service area | `BUILD` | Implemented multi-factor search filter including Haversine/PostGIS distance calculation and vendor `service_radius_km` eligibility check. |
| **FR-SRCH-04** | Results show service, price, and discount for matching packages only; sort by relevance, rating, price, distance | `BUILD` | Implemented matching package extraction and sorting (`relevance`, `rating`, `price_asc`, `price_desc`, `distance`) with pagination. |
| **FR-SRCH-05** | Empty results offer a "Notify me" action (links to `FR-NOT-02`) | `BUILD` | Implemented `POST /notify-requests`, `GET /notify-requests`, `DELETE /notify-requests/:id` and UI "Notify Me" modal/action on empty search or unavailable package. |
| **FR-SRCH-06** | First page of results returns in < 2s p95 at 10,000 vendors | `BUILD` | Added SQL indexes (`pg_trgm`, PostGIS/lat-lng, category, rating, price, capacity) and measurable search benchmark test. |

### 2.4 Integration Points Across Phases 4–7 (`PLAN`, `BKG`, `WAL`, `COM`, `REV`, `ADM`, `NOT`)

| Requirement ID | Summary | Status | Audit Findings & Implementation Action |
| :--- | :--- | :--- | :--- |
| **FR-PLAN-02 / 03** | Event planner checklist item matching & coverage summary integration | `BUILD` | Added `/planner/match-item` and `/internal/planner/match` endpoint in `vendor-service` so event checklist items can query matching available packages/vendors and flag uncovered items. |
| **FR-BKG-01 / 02 / 04** | Soft-hold, release, and book capacity on booking state transitions | `MODIFY` | Upgraded `/internal/availability/hold`, `/internal/availability/release`, and `/internal/availability/book` to support atomic package capacity tracking with idempotency by `bookingId`, while retaining backward compatibility with vendor-level date calls from `event-booking-service`. |
| **FR-COM-01** | No contact details (phone, email, Aadhaar, bank) exposed in customer/public APIs | `BUILD` | Added strict response serializer and PII redaction filter on all public/customer vendor endpoints. |
| **FR-WAL-01..04** | Vendor wallet balance, append-only ledger, 150%/100% alerts, 48h grace period & search visibility | `BUILD` | Built vendor wallet integration (`/wallet/me`, `/wallet/me/ledger`, `/wallet/me/topup`, `/wallet/me/alerts`) and search visibility enforcement (`APPROVED` + wallet >= `MINIMUM_WALLET_BALANCE_PAISE` or within 48h grace period). |
| **FR-REV-03** | Vendor can view reviews and post one public reply per review (cannot edit/delete reviews) | `BUILD` | Added vendor review reply endpoint & integration in vendor portal. |
| **FR-ADM-01..04** | Admin sub-roles (`superAdmin`, `verifier`, `contentModerator`, `financeAdmin`, `supportAgent`), immutable `audit_logs`, dynamic `configs` table with history, vendor enforcement ladder (`WARNING`, `SUSPENSION`, `TERMINATION`) | `BUILD` | Implemented RBAC middleware, `configs` & `config_history` tables with all SRS §2.3 defaults, `audit_logs` table, and `/admin/configs`, `/admin/audit-logs`, `/admin/vendors/:id/enforcement`, `/admin/moderation/queue` endpoints. |
| **FR-NOT-02** | Notify-me when capacity opens (capped at 3/day, expires after event date, states availability is not reserved) | `BUILD` | Implemented `notify_requests` table and capacity-opened matcher that generates notifications with mandatory non-reservation disclaimer and <=3/day cap. |
| **DEMO-DATA** | 500 unique fictional demo vendors (`is_demo=true`), 60+ service categories, isolated from live search by default, idempotent seeding | `MODIFY` | Rebuilt `src/scripts/generateDemoData.js` with deterministic seeded IDs (`vnd_demo_0001`..`vnd_demo_0500`), realistic Indian cities/coordinates, packages, add-ons, discounts, and capacity rows, strictly marked `is_demo=true` and `kyc_status='DRAFT'`/`verified=false`, isolated from live production vendor search unless explicitly queried in demo preview mode. |
| **EXT-PROVIDERS** | Live DigiLocker OAuth, NSDL PAN, Penny-Drop Bank, S3 Presigned Object Storage, Google Maps Geocoding | `BLOCKED` (Live Credentials) / `BUILD` (Adapter) | No live production API keys are present in the environment. Implemented clean provider interfaces with explicit configuration checks and clearly labelled development/sandbox adapters (`providerMode: 'sandbox_adapter'`). Never fabricates live verification in production mode. |
