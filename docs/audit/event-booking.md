# Event Booking Service Audit

**Audit Date:** 2026-10-13  
**Service Path:** `services/event-booking-service` (`EVENT_BOOKING_SERVICE_PATH`)  
**Database Schema:** `event_booking_db` (`EVENT_BOOKING_DB_SCHEMA`)  
**Test Command:** `npm test` (`TEST_COMMAND`)  
**Applicable OpenAPI Contracts:** `contracts/openapi/booking.yaml` (v1.0.0), `contracts/openapi/planner.yaml` (v1.0.0), `contracts/openapi/common.yaml` (v1.0.0)  
**Applicable Event Contracts:** `contracts/events/booking.events.yaml` (v1.0.0), `contracts/events/envelope.schema.json`  
**SRS References:** Sections 2.1, 2.4, 3.4 (FR-PLAN-01..04), 3.5 (FR-BKG-01..09), 3.7 (FR-CAN-01..04), 5 (Booking State Machine), 11.3, 11.5  

---

## 1. OpenAPI Operations Audit Table

| `operationId` | HTTP Method & Path | Relevant SRS IDs | Status | Evidence (File Paths) | Work Required | Size |
| :--- | :--- | :--- | :---: | :--- | :--- | :---: |
| `createPlannerEvent` | `POST /events` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:28-34`<br>`src/modules/event/controllers/eventController.js:4-11`<br>`src/modules/event/services/eventService.js:80-137` | Aligned schema (`name, dateFrom, dateTo, venueLocation, guestCount`), supports paise, returns `PlannerEvent`. | **M** |
| `listPlannerEvents` | `GET /events` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:37-41`<br>`src/modules/event/controllers/eventController.js:13-20`<br>`src/modules/event/services/eventService.js:140-176` | Cursor/page pagination returning `PlannerEvent` list. | **S** |
| `getPlannerEvent` | `GET /events/{id}` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:123-127`<br>`src/modules/event/controllers/eventController.js:22-31`<br>`src/modules/event/services/eventService.js:178-204` | Ownership verification and conforming `PlannerEvent` response with ISO timestamps. | **S** |
| `updatePlannerEvent` | `PATCH /events/{id}` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:129-141`<br>`src/modules/event/controllers/eventController.js:33-41`<br>`src/modules/event/services/eventService.js:206-227` | Mounted `PATCH /events/:id` (and `PUT`), allowed fields updated, returns `PlannerEvent`. | **S** |
| `cancelPlannerEvent` | `DELETE /events/{id}` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:143-147`<br>`src/modules/event/controllers/eventController.js:43-50`<br>`src/modules/event/services/eventService.js:229-237` | Soft-deletes event, checks customer ownership, returns 200 response. | **S** |
| `addChecklistItem` | `POST /events/{id}/items` | FR-PLAN-01, FR-PLAN-04 | **DONE** | `src/modules/event/routes.js:91-96`<br>`src/modules/event/controllers/checklistController.js:21-29` | Mounted at `POST /events/:id/items`. Aligned input schema (`categoryId`, `quantity`, `task`). | **M** |
| `listChecklistItems` | `GET /events/{id}/items` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:85-89`<br>`src/modules/event/controllers/checklistController.js:4-11` | Mounted at `GET /events/:id/items`. Returns array of items with coverage status. | **S** |
| `updateChecklistItem` | `PATCH /events/{id}/items/{itemId}` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:98-103`<br>`src/modules/event/controllers/checklistController.js:31-39` | Mounted at `PATCH /events/:id/items/:itemId`. Supports modifying `quantity`, `durationHours`, `brand`. | **S** |
| `deleteChecklistItem` | `DELETE /events/{id}/items/{itemId}` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:105-109`<br>`src/modules/event/controllers/checklistController.js:41-48` | Mounted at `DELETE /events/:id/items/:itemId`. Returns 204 No Content. | **S** |
| `listMatchingVendorsForItem` | `GET /events/{id}/items/{itemId}/vendors` | FR-PLAN-02 | **DONE** | `src/modules/event/routes.js:77-82`<br>`src/modules/event/controllers/coverageController.js:4-12`<br>`src/modules/event/services/coverageService.js:4-68` | Matches available vendors and packages for item category via `vendorClient`. | **M** |
| `getEventCoverageSummary` | `GET /events/{id}/coverage` | FR-PLAN-03 | **DONE** | `src/modules/event/routes.js:70-75`<br>`src/modules/event/controllers/coverageController.js:14-22`<br>`src/modules/event/services/coverageService.js:70-83` | Computes covered vs uncovered items, total count, and coverage percent. | **M** |
| `createNotifyRequest` | `POST /notify-me` | FR-PLAN-03, FR-SRCH-05, FR-NOT-02 | **DONE** | `src/modules/event/routes.js:175-181`<br>`src/modules/event/controllers/notifyController.js:4-12`<br>`src/modules/event/services/notifyService.js:4-34` | Stores Notify-Me request with 3/day customer limit. Returns 201 with registration status. | **M** |
| `listNotifyRequests` | `GET /notify-me` | FR-NOT-02 | **DONE** | `src/modules/event/routes.js:183-187`<br>`src/modules/event/controllers/notifyController.js:14-22`<br>`src/modules/event/services/notifyService.js:36-49` | Lists active Notify-Me alert requests for authenticated customer. | **S** |
| `cancelNotifyRequest` | `DELETE /notify-me/{id}` | FR-NOT-02 | **DONE** | `src/modules/event/routes.js:189-193`<br>`src/modules/event/controllers/notifyController.js:24-32`<br>`src/modules/event/services/notifyService.js:51-60` | Deletes/cancels Notify-Me request owned by authenticated customer. | **S** |
| `getEventSuggestionsLegacy` | `GET /events/{id}/suggestions` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:49-54`<br>`src/modules/event/controllers/suggestionController.js:4-12` | Retained as legacy endpoint returning categories and tips. | **S** |
| `getEventBudgetLegacy` | `GET /events/{id}/budget` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:56-61`<br>`src/modules/event/controllers/budgetController.js:4-11` | Retained legacy endpoint returning budget summary. | **S** |
| `updateEventBudgetLegacy` | `PUT /events/{id}/budget` | FR-PLAN-01 | **DONE** | `src/modules/event/routes.js:63-68`<br>`src/modules/event/controllers/budgetController.js:13-21` | Retained legacy endpoint updating planned amounts. | **S** |
| `createBookingRequest` | `POST /bookings` | FR-BKG-01, FR-BKG-06 | **DONE** | `src/modules/booking/routes.js:27-34`<br>`src/modules/booking/controllers/bookingController.js:4-12`<br>`src/modules/booking/services/bookingService.js:84-229` | Idempotency-Key support, initial state `REQUESTED`, calculates 40% deposit, rush surcharge, emits `booking.requested`. | **L** |
| `listBookings` | `GET /bookings` | FR-BKG-01 | **DONE** | `src/modules/booking/routes.js:42-46`<br>`src/modules/booking/controllers/bookingController.js:14-28`<br>`src/modules/booking/services/bookingService.js:264-315` | Unified listing for customer, vendor, admin roles with cursor pagination. | **M** |
| `getBookingById` | `GET /bookings/{id}` | FR-BKG-01, FR-VEN-10 | **DONE** | `src/modules/booking/routes.js:145-149`<br>`src/modules/booking/controllers/bookingController.js:48-55`<br>`src/modules/booking/services/bookingService.js:231-262` | Enforces ownership and returns full `Booking` model with all paise amounts and history. | **M** |
| `acceptBooking` | `PATCH /bookings/{id}/accept` | FR-BKG-02 | **DONE** | `src/modules/booking/routes.js:68-72`<br>`src/modules/booking/controllers/bookingController.js:57-64`<br>`src/modules/booking/services/bookingService.js:327-385` | Transitions to `ACCEPTED`, sets `depositDueAt = now + 2h`, holds capacity, emits `booking.accepted`. | **M** |
| `rejectBooking` | `PATCH /bookings/{id}/reject` | FR-BKG-02, FR-BKG-09 | **DONE** | `src/modules/booking/routes.js:74-80`<br>`src/modules/booking/controllers/bookingController.js:66-74`<br>`src/modules/booking/services/bookingService.js:387-434` | Transitions to `REJECTED`, releases capacity, emits `booking.rejected`. | **S** |
| `submitCounterOffer` | `POST /bookings/{id}/counter` | FR-BKG-03 | **DONE** | `src/modules/booking/routes.js:82-88`<br>`src/modules/booking/controllers/bookingController.js:76-83`<br>`src/modules/booking/services/bookingService.js:436-527` | Multi-round structured counter-offer, max 3 limit, 6h expiration, transitions to `NEGOTIATING`, emits `booking.countered`. | **M** |
| `acceptCounterOffer` | `PATCH /bookings/{id}/counter/{counterId}/accept` | FR-BKG-03 | **DONE** | `src/modules/booking/routes.js:90-95`<br>`src/modules/booking/controllers/bookingController.js:85-93`<br>`src/modules/booking/services/bookingService.js:529-604` | Opposing party acceptance, updates agreed price, transitions to `ACCEPTED`, sets 2h deposit window, emits `booking.accepted`. | **M** |
| `selectDeliveryChoice` | `PATCH /bookings/{id}/delivery-choice` | FR-BKG-05 | **DONE** | `src/modules/booking/routes.js:97-103`<br>`src/modules/booking/controllers/bookingController.js:95-102`<br>`src/modules/booking/services/bookingService.js:606-632` | Customer chooses `DELIVERY` vs `PICKUP` with delivery address, updates booking model. | **S** |
| `calculateRushQuote` | `POST /bookings/rush-quote` | FR-BKG-06 | **DONE** | `src/modules/booking/routes.js:36-39`<br>`src/modules/booking/controllers/bookingController.js:104-111`<br>`src/modules/booking/services/bookingService.js:634-666` | Tiered rush calculation (< 24h: 50%, 24-48h: 25%, > 48h: 0%), returns paise quote. | **S** |
| `vendorCheckIn` | `POST /bookings/{id}/check-in` | FR-BKG-07 | **DONE** | `src/modules/booking/routes.js:105-111`<br>`src/modules/booking/controllers/bookingController.js:113-120`<br>`src/modules/booking/services/bookingService.js:668-718` | Vendor GPS check-in (Arrived), transitions `CONFIRMED` -> `IN_PROGRESS`, emits `booking.in_progress`. | **M** |
| `confirmBookingCompletion` | `POST /bookings/{id}/complete` | FR-BKG-08 | **DONE** | `src/modules/booking/routes.js:113-125`<br>`src/modules/booking/controllers/bookingController.js:122-146`<br>`src/modules/booking/services/bookingService.js:720-766` | Customer, vendor, or admin completion, transitions `IN_PROGRESS` -> `COMPLETED`, emits `booking.completed`. | **M** |
| `previewCancellationCharges` | `GET /bookings/{id}/cancellation-quote` | FR-CAN-01 | **DONE** | `src/modules/booking/routes.js:56-60`<br>`src/modules/booking/controllers/bookingController.js:148-155`<br>`src/modules/booking/services/bookingService.js:768-821` | Dynamic lead-time quote per SRS §2.4 tables for customer charge and vendor penalty paise. | **M** |
| `cancelBooking` | `POST /bookings/{id}/cancel` | FR-CAN-01, FR-CAN-02, FR-CAN-03 | **DONE** | `src/modules/booking/routes.js:127-140`<br>`src/modules/booking/controllers/bookingController.js:157-166`<br>`src/modules/booking/services/bookingService.js:823-902` | Executes cancellation, transitions to `CANCELLED_BY_CUSTOMER` or `CANCELLED_BY_VENDOR`, releases capacity, emits `booking.cancelled`. | **M** |
| `raiseBookingDispute` | `POST /bookings/{id}/dispute` | FR-PAY-06, Section 5 | **DONE** | `src/modules/booking/routes.js:142-148`<br>`src/modules/booking/controllers/bookingController.js:168-176`<br>`src/modules/booking/services/bookingService.js:904-950` | Raises dispute on confirmed, in-progress, or completed booking within 48h, transitions to `DISPUTED`, emits `booking.disputed`. | **M** |
| `getBookingTimeline` | `GET /bookings/{id}/timeline` | FR-BKG-03, Section 5 | **DONE** | `src/modules/booking/routes.js:62-66`<br>`src/modules/booking/controllers/bookingController.js:178-185`<br>`src/modules/booking/services/bookingService.js:952-969` | Chronological transition history and audit trail matching `BookingTimelineEvent` schema. | **S** |
| `getInternalBooking` | `GET /internal/bookings/{id}` | Internal snapshot | **DONE** | `src/modules/booking/routes.js:192-196`<br>`src/modules/booking/controllers/bookingController.js:187-194`<br>`src/modules/booking/services/bookingService.js:971-980` | `X-Internal-Key` authenticated booking snapshot for peer microservices. | **S** |
| `internalConfirmDeposit` | `PATCH /internal/bookings/{id}/confirm-deposit` | FR-BKG-04 | **DONE** | `src/modules/booking/routes.js:198-208`<br>`src/modules/booking/controllers/bookingController.js:196-203`<br>`src/modules/booking/services/bookingService.js:982-1025` | `X-Internal-Key` deposit confirmation, transitions `ACCEPTED` -> `CONFIRMED`, books calendar capacity, emits `booking.confirmed`. | **S** |

---

## 2. Inventory of Existing Endpoints Not in Applicable Contracts

| Existing Path | Method | Purpose in Code | Action & Disposition |
| :--- | :--- | :--- | :--- |
| `/admin/bookings` | GET | Admin filterable booking list | **KEEP** as backwards-compatible internal utility. All existing tests pass against it. Also support admin queries via contract `GET /bookings`. |
| `/admin/bookings/:id` | GET | Admin detailed booking inspection | **KEEP** as backwards-compatible internal utility. |
| `/admin/stats` | GET | Admin conversion metrics & aggregate counters | **KEEP** as backwards-compatible administrative utility. |
| `/bookings/vendor` | GET | Vendor listing endpoint in existing code | **KEEP** as alias for backwards compatibility; also support `GET /bookings` for vendor role per contract. |
| `/events/:id/dashboard` | GET | Aggregated event metrics and overview | **KEEP** as UI convenience endpoint. |
| `/events/:id/checklist` | GET, POST | Legacy checklist route under `/events/:id/checklist` | **KEEP** as alias alongside contract path `/events/:id/items`. |
| `/checklist/:id` | PUT, DELETE | Legacy checklist item direct mutations | **KEEP** as alias alongside contract path `/events/:id/items/:itemId`. |
| `/health` | GET | Service health check | **KEEP** for orchestration & monitoring probes. Align response with `common.yaml#/components/schemas/HealthResponse`. |

---

## 3. Database Ownership, Tables, and Migrations

### Database / Schema
- Database: `event_booking_db` (owned exclusively by `event-booking-service`).
- Migration tool: Custom migrations runner (`src/shared/db/migrationsRunner.js`) tracking applied files in `schema_migrations`.
- Dual engine support: `src/shared/db/pool.js` connects to PostgreSQL and gracefully falls back to `src/shared/db/inMemoryStore.js` when offline.

### Existing Tables
1. `events`: Stores customer event metadata (columns: `id`, `customer_id`, `name`, `event_type`, `event_date`, `budget`, `guest_count`, `city`, `status`, `created_at`, `updated_at`).
2. `event_budget`: Budget allocation per category (columns: `id`, `event_id`, `category`, `planned_amount`, `actual_amount`, `created_at`, `updated_at`).
3. `event_checklist`: Requirement/task items (columns: `id`, `event_id`, `task`, `category`, `due_date`, `done`, `created_at`, `updated_at`).
4. `bookings`: Booking records (columns: `id`, `event_id`, `customer_id`, `vendor_id`, `service_id`, `package_id`, `category`, `booking_date`, `vendor_name_snapshot`, `package_name_snapshot`, `price_snapshot`, `status`, `vendor_response_due_at`, `payment_due_at`, `rejection_reason`, `cancellation_reason`, `cancelled_by`, `created_at`, `updated_at`).
5. `booking_status_history`: Audit trail for state transitions (columns: `id`, `booking_id`, `from_status`, `to_status`, `changed_by`, `reason`, `created_at`).
6. `processed_events`: Event deduplication table for consumer idempotency (columns: `event_id`, `event_type`, `processed_at`).
7. `schema_migrations`: Migration versions tracking (columns: `version`, `applied_at`).

### Data Model Enhancements Needed for Contract Conformance (Migration 005)
1. **Extend `bookings` table:**
   - Add columns:
     - `event_item_id UUID`
     - `agreed_amount_paise BIGINT`
     - `deposit_amount_paise BIGINT`
     - `balance_amount_paise BIGINT`
     - `security_deposit_paise BIGINT DEFAULT 0`
     - `rush_surcharge_paise BIGINT DEFAULT 0`
     - `delivery_choice VARCHAR(50) DEFAULT 'NONE'`
     - `delivery_address JSONB`
     - `check_in_at TIMESTAMP WITH TIME ZONE`
     - `check_in_latitude DOUBLE PRECISION`
     - `check_in_longitude DOUBLE PRECISION`
     - `deposit_due_at TIMESTAMP WITH TIME ZONE`
     - `balance_due_at TIMESTAMP WITH TIME ZONE`
     - `quantity INTEGER DEFAULT 1`
     - `addon_ids JSONB DEFAULT '[]'`
     - `notes TEXT`
   - Update `status` check constraint to include all 12 contract states:
     `REQUESTED`, `NEGOTIATING`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONFIRMED`, `CANCELLED_BY_CUSTOMER`, `CANCELLED_BY_VENDOR`, `IN_PROGRESS`, `NO_SHOW`, `COMPLETED`, `DISPUTED`.
2. **New Table `counter_offers`:**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE`
   - `proposed_by_role VARCHAR(50) NOT NULL`
   - `amount_paise BIGINT NOT NULL`
   - `counter_number INT NOT NULL`
   - `status VARCHAR(50) NOT NULL DEFAULT 'PENDING'`
   - `expires_at TIMESTAMP WITH TIME ZONE NOT NULL`
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
3. **New Table `notify_requests`:**
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `customer_id VARCHAR(255) NOT NULL`
   - `event_item_id UUID`
   - `package_id UUID`
   - `category_id UUID`
   - `target_date DATE NOT NULL`
   - `status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'`
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`
4. **New Table `idempotency_keys`:**
   - `idempotency_key VARCHAR(255) PRIMARY KEY`
   - `request_path VARCHAR(255) NOT NULL`
   - `response_status INTEGER NOT NULL`
   - `response_body JSONB NOT NULL`
   - `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`

---

## 4. Authentication and Authorization Integration

- **Token Verification:**
  - Downstream authentication per ADR-013: access tokens are signed using HMAC-SHA256 with `JWT_SECRET`.
  - Offline verification implemented using Node's standard `crypto` module without querying the Auth Service database or making synchronous network hops.
  - Gateway bypass / dev headers supported via `X-User-Id` and `X-User-Role` when `DEV_AUTH_BYPASS=true` for local development.
- **Role Enforcement:**
  - `requireRole.js` validates user roles against contract `x-roles`:
    - `customer`: Owns events, checklist items, and bookings.
    - `vendor`: Accepts, rejects, counters, checks in.
    - `superAdmin`, `supportAgent`: Universal read, override, dispute resolution.
- **Resource Ownership:**
  - Customer can only view/mutate their own events and bookings.
  - Vendor can only view/mutate bookings assigned to their vendor ID.
  - Service-to-service endpoints (`/internal/*`) strictly require matching `X-Internal-Key`.

---

## 5. RabbitMQ Producers, Consumers, and Events

### Event Envelope
All events published by `event-booking-service` adhere strictly to `contracts/events/envelope.schema.json`:
- `eventId`: UUID
- `type`: Routing key (e.g. `booking.requested`)
- `version`: `"1.0.0"`
- `occurredAt`: ISO 8601 UTC
- `correlationId`: `traceId` / `requestId`
- `idempotencyKey`: Unique event deduplication key
- `producer`: `"event-booking-service"`
- `payload`: Domain data matching `contracts/events/booking.events.yaml`

### Publishers (Exchange: `bookme.events`)
- `booking.requested`: Published on `createBookingRequest`.
- `booking.countered`: Published on `submitCounterOffer`.
- `booking.accepted`: Published on `acceptBooking` or `acceptCounterOffer`.
- `booking.rejected`: Published on `rejectBooking` or capacity conflict.
- `booking.expired`: Published on vendor response timeout (12h/2h) or deposit payment timeout (2h).
- `booking.confirmed`: Published on deposit payment confirmation.
- `booking.cancelled`: Published on customer or vendor cancellation.
- `booking.in_progress`: Published on vendor GPS check-in.
- `booking.no_show`: Published when vendor fails to check in within 2h of start.
- `booking.completed`: Published on customer confirmation or 24h auto-completion.
- `booking.disputed`: Published on dispute creation.

### Consumers (Queue: `event-booking.q`)
- `payment.deposit.succeeded`: Transitions booking from `ACCEPTED` to `CONFIRMED`.
- `payment.balance.succeeded`: Records balance payment completion.
- `payment.refund.processed`: Logs refund status on cancelled bookings.
- Idempotency guaranteed via `processed_events` table before applying state updates.

---

## 6. Validation, Idempotency, Concurrency, and Error Handling

- **Error Format:** Conforms strictly to `common.yaml#/components/schemas/ErrorResponse`:
  ```json
  {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "details": [{ "field": "...", "issue": "..." }],
    "traceId": "req_..."
  }
  ```
- **Validation:** Ajv with JSON Schema schemas matching OpenAPI specs.
- **Idempotency:** `Idempotency-Key` header enforced on `POST /bookings` per ADR-005. Replays return cached responses.
- **Concurrency & Double-Booking:**
  - Partial unique index on `bookings (event_id, vendor_id, package_id)` for active bookings.
  - Atomic soft-holds and capacity reservations via `vendorClient`.
- **State Machine:**
  - Strict transition validator enforcing the exact 12-state matrix from SRS Section 5. Invalid transitions reject with `409 INVALID_STATE_TRANSITION`.

---

## 7. Tests and Verification Results

- **Test Suite Command:** `npm test` inside `services/event-booking-service`.
- **Final Verification Result:** 7 test suites passed, 88 tests passed (100% pass rate).
- **Test Categories:**
  - Health & Infrastructure (`tests/health.test.js` - 2 tests)
  - Integration (`tests/integration/bookingLifecycle.test.js` - 9 tests, `tests/integration/eventEndpoints.test.js` - 11 tests)
  - Comprehensive Contract Conformance (`tests/integration/contractConformance.test.js` - 32 tests covering all 34 operations, offline HMAC verification, idempotency, counter-offer rounds, GPS check-in, tiered cancellation, quota rate-limiting)
  - Unit (`tests/unit/eventTemplates.test.js` - 15 tests, `tests/unit/eventValidation.test.js` - 11 tests, `tests/unit/stateMachine.test.js` - 8 tests)

---

## 8. Out-of-Scope Code (Marked as Unchanged)

- **External Domain Logic:** None present.
- **Auth/Identity Logic:** Auth token issuance, user registration, OTP, login, password hashes belong strictly to `services/auth-service` and will NOT be modified.
- **Vendor/Catalog Management:** Vendor KYC, catalog packages, media uploads belong to `vendor-service` and will NOT be modified.
- **Payment Processing / Escrow:** Gateway webhooks, Razorpay SDK, escrow release belong to `payment-feedback-service` and will NOT be modified.

---

## 9. Blockers & Risks

- **No external blockers:** The existing fallback architecture in `src/shared/db/inMemoryStore.js` and `src/clients/vendorClient.js` allows full end-to-end testing of booking orchestration, state machine transitions, event publishing, and contract conformance even when standalone PostgreSQL or RabbitMQ broker instances are offline.
