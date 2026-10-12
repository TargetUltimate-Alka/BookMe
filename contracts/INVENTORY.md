# BookMe – Existing Endpoints & Events Inventory

**Date:** October 13, 2026  
**Source of Truth:** [docs/SRS.md](file:///d:/Personal_details_alkaJha_26-05-2026/mca_3RD_Semester/web%20service%20materials/BookMe_team_project/BookMe/docs/SRS.md)  
**Purpose:** Audit of all existing HTTP endpoints, RabbitMQ queues, and asynchronous events across current microservices (`auth-service`, `vendor-service`, `event-booking-service`, `payment-feedback-service`) and legacy markdown contracts in `/contracts`.

---

## 1. Existing HTTP Endpoints Inventory

| Service | Method | Path | Purpose | Status | SRS Alignment & Differences |
|---|---|---|---|---|---|
| **auth-service** | POST | `/api/auth/register` (and `/auth/register`) | Register a new user | **differs** | Accepts email/password; SRS (FR-ONB-01) requires phone OTP registration with 5-attempt lockout, role separation, and damage-liability acceptance. |
| **auth-service** | POST | `/api/auth/login` (and `/auth/login`) | Authenticate user & issue JWT | **differs** | Uses email/password login; SRS FR-ONB-01 specifies phone/OTP credential flow. |
| **auth-service** | POST | `/api/auth/refresh` (and `/auth/refresh`) | Refresh expired access token | **matches SRS** | Issues new short-lived access token using refresh token (SRS §11.6). |
| **auth-service** | POST | `/api/auth/logout` (and `/auth/logout`) | Invalidate refresh token | **matches SRS** | Revokes session/refresh token. |
| **auth-service** | GET | `/api/auth/me` (and `/auth/me`) | Retrieve authenticated user profile | **matches SRS** | Returns user id, name, role, email/phone. |
| **auth-service** | PATCH | `/api/auth/me` (and `/auth/me`) | Update user profile details | **matches SRS** | Updates mutable user attributes. |
| **auth-service** | GET | `/api/internal/users/:id` (and `/internal/users/:id`) | Internal service-to-service user lookup | **matches SRS** | Internal helper for user metadata enrichment (secured by `X-Internal-Key`). |
| **auth-service** | GET | `/health`, `/api/auth/health` | Service health check | **matches SRS** | Health check per SRS §11.8. |
| **vendor-service** | POST | `/api/vendors` (and `/vendors`) | Create initial vendor profile | **differs** | Simple auto-verified profile creation (`verified: true`); SRS (FR-ONB-02..06) requires multi-step onboarding, draft status, KYC, photo, and agreement e-sign. |
| **vendor-service** | GET | `/api/vendors` (and `/vendors`) | Browse / search vendors | **differs** | Basic filter by category, location string, verified flag; SRS (FR-SRCH-01..04) requires PostGIS radius, date ranges, price range, brand, ratings, discounts, and matching packages. |
| **vendor-service** | GET | `/api/vendors/:id` (and `/vendors/:id`) | Get public/private vendor profile | **differs** | Returns basic record; SRS (FR-VEN-01) requires full packages, media showcase, rating breakdown, and inclusions. |
| **vendor-service** | PATCH | `/api/vendors/:id` (and `/vendors/:id`) | Update vendor details | **matches SRS** | Allows vendor to update business metadata. |
| **vendor-service** | POST | `/api/vendors/:id/services` | Create standalone bookable service | **unused / differs** | Legacy MVP model. SRS organizes offerings under Packages with Tiers (FR-VEN-03) and Add-ons (FR-VEN-04). Deprecate in favor of package catalog. |
| **vendor-service** | GET | `/api/vendors/:id/services` | List standalone vendor services | **unused / differs** | Legacy MVP model; superseded by package catalog endpoints. |
| **vendor-service** | PATCH | `/api/vendors/:id/services/:serviceId` | Update vendor service | **unused / differs** | Legacy MVP model; superseded by package catalog endpoints. |
| **vendor-service** | DELETE | `/api/vendors/:id/services/:serviceId` | Delete vendor service | **unused / differs** | Legacy MVP model; superseded by package catalog endpoints. |
| **vendor-service** | POST | `/api/vendors/:id/packages` | Create vendor package | **differs** | Simple package `{name, serviceIds, price}`; SRS (FR-VEN-03..11) requires Tiers, unit, inclusions JSON, guest range, overtime rate, security deposit, GST rate, HSN/SAC. |
| **vendor-service** | GET | `/api/vendors/:id/packages` | List packages for vendor | **differs** | Lacks tier breakdowns, add-ons, discounts, and tax configuration. |
| **vendor-service** | PATCH | `/api/vendors/:id/packages/:packageId` | Update vendor package | **differs** | Basic update; needs full schema matching SRS FR-VEN-03. |
| **vendor-service** | DELETE | `/api/vendors/:id/packages/:packageId` | Delete vendor package | **matches SRS** | Deletes/archives vendor package. |
| **vendor-service** | GET | `/api/vendors/:id/availability` | Check vendor availability / blocked dates | **differs** | Returns binary date availability/blocked slots; SRS (FR-VEN-06) requires capacity per package per date/slot with units (`totalUnits`, `heldUnits`, `bookedUnits`). |
| **vendor-service** | POST | `/api/vendors/:id/availability/block` | Vendor manually blocks date | **differs** | Simple date blocking; SRS requires package-level capacity management. |
| **vendor-service** | DELETE | `/api/vendors/:id/availability/block/:blockId` | Vendor unblocks date | **differs** | Simple date unblocking; SRS requires capacity update. |
| **vendor-service** | GET | `/internal/vendors/:id/summary` | Internal vendor summary | **matches SRS** | Lightweight vendor snapshot for inter-service lookups. |
| **vendor-service** | GET | `/internal/vendors/:vendorId/validate` | Internal package/service validation | **matches SRS** | Used by `event-booking-service` during booking creation. |
| **vendor-service** | GET | `/internal/availability/check` | Internal date availability check | **differs** | Checks binary date availability; must check package capacity. |
| **vendor-service** | POST | `/internal/availability/hold` | Internal hold date for booking | **differs** | Blocks date; SRS requires atomic capacity soft hold. |
| **vendor-service** | POST | `/internal/availability/book` | Internal confirm booked date | **differs** | Blocks date; SRS requires atomic booking unit increment. |
| **vendor-service** | POST | `/internal/availability/release` | Internal release held date | **matches SRS** | Releases soft-held units. |
| **vendor-service** | PATCH | `/internal/vendors/:id/rating` | Internal update vendor rating | **differs** | Synchronous rating push from review service; SRS §11.2 prefers asynchronous domain events. |
| **vendor-service** | GET | `/health`, `/api/vendors/health` | Service health check | **matches SRS** | Health check per SRS §11.8. |
| **event-booking-service** | POST | `/events` (and `/api/events`) | Create customer event | **differs** | Creates wedding event with default hardcoded budget items; SRS (FR-PLAN-01) requires date range, venue, guests, and checklist items. |
| **event-booking-service** | GET | `/events` (and `/api/events`) | List customer events | **matches SRS** | Returns events owned by customer. |
| **event-booking-service** | GET | `/events/:id` (and `/api/events/:id`) | Get event details | **matches SRS** | Returns event details. |
| **event-booking-service** | PUT | `/events/:id` (and `/api/events/:id`) | Update event details | **matches SRS** | Updates event metadata. |
| **event-booking-service** | DELETE | `/events/:id` (and `/api/events/:id`) | Cancel event | **matches SRS** | Soft-cancels event. |
| **event-booking-service** | GET | `/events/:id/dashboard` | Aggregated event overview | **differs** | Useful UI aggregation endpoint; differs in budget schema vs checklist coverage. |
| **event-booking-service** | GET | `/events/:id/suggestions` | Suggested categories and budget | **unused / differs** | Static suggestions; SRS focuses on checklist matching vendors (FR-PLAN-02). Deprecate/modify. |
| **event-booking-service** | GET | `/events/:id/budget` | Budget planned vs actual | **unused / differs** | Generic budget planner outside core SRS requirements. |
| **event-booking-service** | PUT | `/events/:id/budget` | Update planned budget amounts | **unused / differs** | Generic budget planner outside core SRS requirements. |
| **event-booking-service** | GET | `/events/:id/checklist` | List event checklist items | **matches SRS** | Lists tasks/items for event (FR-PLAN-01). |
| **event-booking-service** | POST | `/events/:id/checklist` | Add checklist item | **differs** | Free-form task string; SRS FR-PLAN-01 requires category, quantity, duration, brand, coverage status. |
| **event-booking-service** | PUT | `/checklist/:id` | Update checklist item | **matches SRS** | Updates checklist item. |
| **event-booking-service** | DELETE | `/checklist/:id` | Delete checklist item | **matches SRS** | Deletes checklist item. |
| **event-booking-service** | POST | `/bookings` (and `/api/bookings`) | Create booking request | **differs** | Creates `PENDING` booking; SRS (FR-BKG-01) uses `REQUESTED` state with atomic soft hold, paise currency, quantity, add-ons, and rush surcharge preview. |
| **event-booking-service** | GET | `/bookings` (and `/api/bookings`) | List customer bookings | **matches SRS** | Lists bookings for customer. |
| **event-booking-service** | GET | `/bookings/vendor` | List vendor incoming bookings | **matches SRS** | Lists bookings assigned to vendor. |
| **event-booking-service** | GET | `/bookings/:id` | Get single booking details | **matches SRS** | Retrieves booking, price snapshot, timestamps, state history. |
| **event-booking-service** | PATCH | `/bookings/:id/accept` | Vendor accepts booking | **matches SRS** | Transitions to `ACCEPTED`, starts 2-hr deposit timer (FR-BKG-02). |
| **event-booking-service** | PATCH | `/bookings/:id/reject` | Vendor rejects booking | **matches SRS** | Transitions to `REJECTED`, releases capacity hold (FR-BKG-02). |
| **event-booking-service** | PATCH | `/bookings/:id/cancel` | Cancel booking | **differs** | Generic cancel; SRS (FR-CAN-01..02) requires distinct customer vs vendor cancellation rules, charge calculations, preview, and penalty deduction. |
| **event-booking-service** | PATCH | `/bookings/:id/complete` | Complete booking | **differs** | Allows vendor to complete directly; SRS (FR-BKG-08) requires customer confirmation or 24-hr auto-completion post-event end. |
| **event-booking-service** | GET | `/internal/bookings/:id` | Internal get booking snapshot | **matches SRS** | Used by payment and review services. |
| **event-booking-service** | PATCH | `/internal/bookings/:id/confirm` | Internal confirm payment | **matches SRS** | Used on payment confirmation. |
| **event-booking-service** | GET | `/admin/bookings` | Admin overview of bookings | **matches SRS** | Filterable booking list for administrators. |
| **event-booking-service** | GET | `/admin/bookings/:id` | Admin booking details | **matches SRS** | Detailed booking audit for administrators. |
| **event-booking-service** | GET | `/admin/stats` | Admin platform metrics | **matches SRS** | Metrics and conversion stats. |
| **payment-feedback-service** | POST | `/api/payments` | Initiate payment | **differs** | Single flat payment; SRS (FR-PAY-02) requires Deposit order (40%) and Balance order (60%), fee line items, and paise amounts. |
| **payment-feedback-service** | POST | `/api/payments/:id/authenticate` / `/verify` | Sandbox OTP / 2FA verification | **differs** | Sandbox mock helper for testing payments locally; gateway webhooks handle live payments in SRS §11.5. |
| **payment-feedback-service** | POST | `/api/payments/:id/webhook` | Gateway webhook receiver | **differs** | Lacks gateway signature verification and asynchronous queue dispatch (`payments.webhooks`) mandated by SRS §11.3. |
| **payment-feedback-service** | GET | `/api/payments/:id` | Fetch single payment | **matches SRS** | Retrieves payment record. |
| **payment-feedback-service** | GET | `/api/payments/booking/:bookingId` | Fetch payments for booking | **matches SRS** | Retrieves payments by booking ID. |
| **payment-feedback-service** | POST | `/api/payouts` | Create vendor payout | **differs** | Manual payout trigger; SRS (FR-PAY-03) specifies automated escrow release 24 hours after completion if no dispute is open. |
| **payment-feedback-service** | GET | `/api/payouts/:vendorId` | List payouts for vendor | **matches SRS** | Lists payout history. |
| **payment-feedback-service** | POST | `/api/reviews` | Submit review | **differs** | Accepts `comment` and `rating` on completed bookings; SRS (FR-REV-01) requires 14-day window enforcement, 1-5 rating, text, and up to 5 images. |
| **payment-feedback-service** | GET | `/api/reviews` | List reviews for vendor | **matches SRS** | Lists reviews by vendor ID. |
| **payment-feedback-service** | POST | `/api/complaints` | File complaint | **differs** | Generic complaint; SRS specifies structured Damage Claims within 48h (FR-PAY-06) and Support Tickets (FR-SUP-01..05). |
| **payment-feedback-service** | GET | `/api/complaints` | List complaints | **differs** | Generic complaint listing; replace/supersede with support tickets and damage claims. |
| **payment-feedback-service** | GET | `/api/complaints/:id` | Get complaint details | **differs** | Replace/supersede with support tickets and damage claims. |
| **payment-feedback-service** | PATCH | `/api/complaints/:id/status` | Update complaint status | **differs** | Replace/supersede with support tickets and damage claims. |

---

## 2. Existing RabbitMQ Queues & Events Inventory

| Service / Component | Queue / Topic | Role | Event / Message | Status | SRS Alignment & Differences |
|---|---|---|---|---|---|
| **event-booking-service** | `event-booking.q` (exchange `bookme.events`) | Consumer | `payment.completed` | **differs** | Consumes flat payment event; SRS §11.3 uses `deposit.succeeded` and `balance.succeeded`. |
| **event-booking-service** | `event-booking.q` (exchange `bookme.events`) | Consumer | `payment.failed` | **differs** | Consumes failure; SRS routes deadline sweeps and alerts. |
| **event-booking-service** | `event-booking.q` (exchange `bookme.events`) | Consumer | `payment.refunded` | **differs** | Consumes refund; SRS specifies `refund.processed`. |
| **event-booking-service** | exchange `bookme.events` | Publisher | `booking.created` | **differs** | SRS event naming is `booking.requested` with soft hold semantics. |
| **event-booking-service** | exchange `bookme.events` | Publisher | `booking.accepted` | **matches SRS** | Emitted when vendor accepts booking. |
| **event-booking-service** | exchange `bookme.events` | Publisher | `booking.rejected` | **matches SRS** | Emitted when vendor rejects booking. |
| **event-booking-service** | exchange `bookme.events` | Publisher | `booking.confirmed` | **matches SRS** | Emitted when deposit payment is verified. |
| **event-booking-service** | exchange `bookme.events` | Publisher | `booking.cancelled` | **differs** | Emits flat cancellation; SRS requires `cancelledBy`, `hoursBeforeEvent`, charge breakdown. |
| **event-booking-service** | exchange `bookme.events` | Publisher | `booking.completed` | **matches SRS** | Emitted when booking completes. |
| **payment-feedback-service** | exchange `bookme.events` | Publisher | `payment.completed` | **differs** | SRS specifies `payment.deposit.succeeded` and `payment.balance.succeeded`. |
| **payment-feedback-service** | exchange `bookme.events` | Publisher | `payment.failed` | **differs** | Generic event; SRS specifies webhook signature and queue dispatch. |
| **(Missing in Code)** | `booking.deadlines` | Queue | Timed events (12h vendor response, 2h deposit, 48h balance, etc.) | **missing** | Mandated by SRS §11.3; not implemented in any service. |
| **(Missing in Code)** | `payments.webhooks` | Queue | Raw webhook events | **missing** | Mandated by SRS §11.3; currently processed directly in HTTP handler. |
| **(Missing in Code)** | `leads.billing` | Queue | Call-ended lead calculation & wallet debit | **missing** | Mandated by SRS §11.3 (FR-COM-04, FR-COM-05, FR-WAL-02). |
| **(Missing in Code)** | `notifications` | Queue | Multi-channel dispatch (push, SMS, email) | **missing** | Mandated by SRS §11.3 (FR-NOT-01). |
| **(Missing in Code)** | `notifyme.matching` | Queue | Capacity opened matching against NotifyRequest | **missing** | Mandated by SRS §11.3 (FR-NOT-02). |
| **(Missing in Code)** | `media.moderation` | Queue | Media upload moderation checks | **missing** | Mandated by SRS §11.3 (FR-VEN-02). |
| **(Missing in Code)** | `*.dlq` | Queue | Dead-letter queues | **missing** | Mandated by SRS §11.3. |

---

## 3. Analysis of Existing Contracts (`/contracts/*.md`)

1. **`contracts/auth-service.md`**:
   - Outlines `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /me`, `PATCH /me`, and `GET /internal/users/:id`.
   - Mentions that admin is out of scope for V1; however, **SRS §2.1 and FR-ADM-01 mandate Admin sub-roles** (Super Admin, Verifier, Support Agent, Finance Admin, Content Moderator). The contract must declare full RBAC.
   - Uses plain email registration instead of phone OTP registration (FR-ONB-01).
2. **`contracts/vendor-service.md`**:
   - Contains separate `/services` and `/packages` CRUD. In the SRS, packages with tiers (Basic, Standard, Premium) and add-ons are the unified primary offering.
   - Availability uses simple date blocking (`/availability/block`), whereas the SRS mandates capacity counting per package per date/slot (`AvailabilityCapacity`).
   - Lacks DigiLocker KYC, PAN verification, bank verification, agreement e-sign, security deposits, GST rates, and pre-signed media upload.
3. **`contracts/event-booking-service.md`**:
   - Contains event planning, suggestions, budget, checklist, and booking state transitions.
   - Booking transitions omit structured counter-offer negotiation (`NEGOTIATING` with max 3 counter-offers, FR-BKG-03), rush surcharge quote (FR-BKG-06), delivery choice (FR-BKG-05), Arrived check-in with GPS (FR-BKG-07), and disputes (`DISPUTED`, Section 5).
   - Money is represented in float rupees rather than integer paise.
4. **`contracts/payment-feedback-service.md`**:
   - Contains flat payments, basic payouts, reviews without images/replies, and generic complaints.
   - Completely missing vendor wallet & append-only ledger (FR-WAL-01..05), damage claims (FR-PAY-06), VoIP call billing & anti-spam (FR-COM-01..08), support bot & SLAs (FR-SUP-01..05), and notifications (FR-NOT-01..03).

---

## 4. Key Gaps to Bridge in the OpenAPI 3.1 & AsyncAPI 3.0 Contracts

1. **Global Standards**: All amounts in integer paise (`*Paise`), ISO 8601 UTC timestamps, cursor-based pagination (`limit`, `cursor`, `nextCursor`), standard error envelope (`{code, message, details, traceId}`), idempotency keys for mutations.
2. **Full Domain Coverage**: Define contracts for all 14 domains (`identity`, `vendor`, `catalog`, `availability`, `search`, `planner`, `booking`, `payment`, `wallet`, `communication`, `review`, `support`, `admin`, `notification`).
3. **Traceability**: Direct mapping from every `FR-*` requirement ID in the SRS to OpenAPI `operationId`s and AsyncAPI event schemas.
