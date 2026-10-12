# API Contract — event-booking-service

> **Notice (v1.0.0 Contracts):** This contract has been formalized and superseded by the OpenAPI 3.1 specifications at [`contracts/openapi/planner.yaml`](./openapi/planner.yaml) and [`contracts/openapi/booking.yaml`](./openapi/booking.yaml), and AsyncAPI 3.0 events at [`contracts/events/booking.events.yaml`](./events/booking.events.yaml). Refer to [`contracts/README.md`](./README.md) and [`contracts/traceability.md`](./traceability.md).

Owner: TargetUltimate-Alka (Person C)  
Service Port: `4003`  
Base Path: Mounted directly under `/events`, `/bookings`, `/checklist`, `/admin`, `/internal` in this service. When accessed via API Gateway, the gateway adds the `/api` prefix (e.g. `/api/events`, `/api/bookings`).

---

## Authentication & Identity Contract
Identity is forwarded by the API Gateway in HTTP headers. Handlers must never read user identity from the request body.

- `X-User-Id`: Identifier of the authenticated user (e.g. `usr_123` or UUID).
- `X-User-Role`: One of `customer`, `vendor`, `admin`.
- `X-Internal-Key`: Secret shared key required for all `/internal/**` service-to-service endpoints.
- `X-Request-Id`: Unique request tracing ID generated or forwarded by the gateway.

In standalone local development mode (`DEV_AUTH_BYPASS=true`), headers can be sent directly by the caller.

---

## Standard Error Response (SRS §11)
All error responses adhere to the standard JSON structure:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      { "field": "event_date", "issue": "Must be today or in the future" }
    ],
    "timestamp": "2026-10-11T12:00:00.000Z",
    "requestId": "req-12345"
  }
}
```

Standard Error Codes:
- `400 Bad Request`: `VALIDATION_ERROR`, `INVALID_REQUEST`
- `401 Unauthorized`: `UNAUTHORIZED`, `MISSING_AUTH`
- `403 Forbidden`: `FORBIDDEN`, `OWNERSHIP_VIOLATION`
- `404 Not Found`: `NOT_FOUND`
- `409 Conflict`: `INVALID_STATE_TRANSITION`, `VENDOR_UNAVAILABLE`, `ALREADY_BOOKED`
- `429 Too Many Requests`: `RATE_LIMIT_EXCEEDED`
- `500 Internal Server Error`: `INTERNAL_SERVER_ERROR`
- `502 Bad Gateway`: `UPSTREAM_SERVICE_ERROR`

---

## 1. Events Module

### `POST /events`
Creates a new event. Automatically generates default `event_budget` split categories and `event_checklist` tasks in a single database transaction.

- **Role:** `customer`
- **Headers:** `X-User-Id`, `X-User-Role: customer`
- **Request Body:**
  ```json
  {
    "name": "Aarav & Maya Wedding",
    "event_type": "Wedding",
    "event_date": "2026-12-15",
    "budget": 500000.00,
    "guest_count": 200,
    "city": "Ahmedabad"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "id": "c1f1c8a6-8096-4a57-8984-b040e698ea12",
    "customer_id": "usr_123",
    "name": "Aarav & Maya Wedding",
    "event_type": "Wedding",
    "event_date": "2026-12-15",
    "budget": 500000.00,
    "guest_count": 200,
    "city": "Ahmedabad",
    "status": "PLANNING",
    "created_at": "2026-10-11T12:00:00.000Z",
    "updated_at": "2026-10-11T12:00:00.000Z",
    "budget_items": [
      { "category": "Venue & Catering", "planned_amount": 250000.00, "actual_amount": 0.00 },
      { "category": "Photography & Video", "planned_amount": 75000.00, "actual_amount": 0.00 },
      { "category": "Decoration & Floral", "planned_amount": 75000.00, "actual_amount": 0.00 },
      { "category": "Music & Entertainment", "planned_amount": 50000.00, "actual_amount": 0.00 },
      { "category": "Makeup & Styling", "planned_amount": 25000.00, "actual_amount": 0.00 },
      { "category": "Miscellaneous", "planned_amount": 25000.00, "actual_amount": 0.00 }
    ],
    "checklist_count": 8
  }
  ```

---

### `GET /events`
Lists events owned by the logged-in customer. Supports filtering by status and pagination.

- **Role:** `customer`
- **Query Params:** `?status=PLANNING&page=1&limit=10`
- **Response (200 OK):**
  ```json
  {
    "data": [
      {
        "id": "c1f1c8a6-8096-4a57-8984-b040e698ea12",
        "name": "Aarav & Maya Wedding",
        "event_type": "Wedding",
        "event_date": "2026-12-15",
        "budget": 500000.00,
        "guest_count": 200,
        "city": "Ahmedabad",
        "status": "PLANNING",
        "days_left": 65,
        "created_at": "2026-10-11T12:00:00.000Z"
      }
    ],
    "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
  }
  ```

---

### `GET /events/:id`
Retrieves single event details. Only accessible by the event owner or admin.

- **Response (200 OK):** Full event object.
- **Errors:** 403 Forbidden, 404 Not Found.

---

### `PUT /events/:id`
Updates an event (name, date, budget, guest count, city).

- **Role:** `customer` (owner)
- **Request Body:** Partial or full `{ name, event_date, budget, guest_count, city }`
- **Response (200 OK):** Updated event object.

---

### `DELETE /events/:id`
Soft-cancels an event. Updates `status` to `CANCELLED`. Also cascades cancellation to any non-completed bookings.

- **Role:** `customer` (owner) or `admin`
- **Response (200 OK):** `{ "message": "Event cancelled successfully", "status": "CANCELLED" }`

---

### `GET /events/:id/suggestions`
Provides recommended vendor categories and suggested budget allocation breakdown based on the event's type, guest count, and total budget.

- **Response (200 OK):**
  ```json
  {
    "event_type": "Wedding",
    "suggested_categories": [
      { "category": "Venue & Catering", "percentage": 50, "suggested_amount": 250000.00 },
      { "category": "Photography & Video", "percentage": 15, "suggested_amount": 75000.00 },
      { "category": "Decoration & Floral", "percentage": 15, "suggested_amount": 75000.00 }
    ],
    "vendor_tips": [
      "Book venue at least 6 months in advance for peak wedding seasons.",
      "Lock catering tasting slots early."
    ]
  }
  ```

---

### `GET /events/:id/budget`
Returns planned vs actual budget comparison per category.

- **Response (200 OK):**
  ```json
  {
    "totalBudget": 500000.00,
    "plannedTotal": 500000.00,
    "actualTotal": 120000.00,
    "remaining": 380000.00,
    "overBudget": false,
    "categories": [
      {
        "id": "bgt_001",
        "category": "Venue & Catering",
        "planned_amount": 250000.00,
        "actual_amount": 120000.00,
        "remaining": 130000.00
      }
    ]
  }
  ```

---

### `PUT /events/:id/budget`
Updates planned category amounts.

- **Request Body:**
  ```json
  {
    "categories": [
      { "category": "Venue & Catering", "planned_amount": 260000.00 },
      { "category": "Photography & Video", "planned_amount": 70000.00 }
    ]
  }
  ```
- **Response (200 OK):** Returns updated budget object with warning field `plannedExceedsBudget: boolean`.

---

### `GET /events/:id/checklist`
Lists checklist tasks for an event with status and due dates.

- **Response (200 OK):**
  ```json
  [
    {
      "id": "chk_001",
      "event_id": "c1f1c8a6-8096-4a57-8984-b040e698ea12",
      "task": "Finalize venue contract",
      "category": "Venue & Catering",
      "due_date": "2026-11-01",
      "done": false,
      "is_overdue": false
    }
  ]
  ```

---

### `POST /events/:id/checklist`
Adds a custom checklist task.

- **Request Body:** `{ "task": "Send invitations", "category": "General", "due_date": "2026-11-15" }`
- **Response (201 Created):** Created checklist item.

---

### `PUT /checklist/:id`
Updates a checklist task (e.g. toggle `done`, change `task` or `due_date`).

- **Request Body:** `{ "done": true }`
- **Response (200 OK):** Updated checklist item.

---

### `DELETE /checklist/:id`
Deletes a checklist task.

- **Response (204 No Content)**

---

### `GET /events/:id/dashboard`
Aggregated overview of the entire event: general stats, budget summary, checklist progress, and bookings enriched with live vendor display names.

- **Response (200 OK):**
  ```json
  {
    "event": {
      "id": "c1f1c8a6-8096-4a57-8984-b040e698ea12",
      "name": "Aarav & Maya Wedding",
      "event_type": "Wedding",
      "event_date": "2026-12-15",
      "days_left": 65,
      "status": "PLANNING"
    },
    "progress": {
      "percentage": 33.3,
      "confirmed_categories": 2,
      "total_budget_categories": 6
    },
    "budget": {
      "total": 500000.00,
      "planned": 500000.00,
      "actual": 165000.00,
      "remaining": 335000.00,
      "overBudget": false
    },
    "checklist": {
      "total": 12,
      "completed": 5,
      "pending": 7,
      "overdue": 1
    },
    "bookings": [
      {
        "id": "bkg_001",
        "vendor_id": "vnd_123",
        "vendor_name": "Grand Palace Banquet",
        "category": "Venue & Catering",
        "amount": 120000.00,
        "status": "CONFIRMED",
        "booking_date": "2026-12-15"
      }
    ]
  }
  ```

---

## 2. Bookings Module

### `POST /bookings`
Creates a booking request from customer to vendor for a given event, service, and package.
Validates:
1. Event belongs to caller, not cancelled or completed.
2. `vendorClient.validate(vendorId, serviceId, packageId)` verifies vendor is VERIFIED/ACTIVE and package valid.
3. `vendorClient.checkAvailability(vendorId, date)` ensures date is available (returns 409 if unavailable).
4. Inserts row in `PENDING` status with price and name snapshots, setting `vendor_response_due_at = now + 48h`.
5. Inserts history record and publishes `booking.created` asynchronous event.

- **Role:** `customer`
- **Request Body:**
  ```json
  {
    "event_id": "c1f1c8a6-8096-4a57-8984-b040e698ea12",
    "vendor_id": "vnd_456",
    "service_id": "svc_789",
    "package_id": "pkg_111",
    "category": "Catering"
  }
  ```
- **Response (201 Created):** Full booking record in `PENDING` state.

---

### `GET /bookings`
Lists bookings created by the logged-in customer. Supports filtering by `event_id` and `status`.

- **Role:** `customer`
- **Query Params:** `?event_id=...&status=CONFIRMED&page=1&limit=10`
- **Response (200 OK):** Paginated array of bookings.

---

### `GET /bookings/vendor`
Lists booking requests directed to the logged-in vendor. Looks up the vendor ID associated with the user's `X-User-Id`.

- **Role:** `vendor`
- **Query Params:** `?status=PENDING&page=1&limit=10`
- **Response (200 OK):** Array of booking requests with customer details. Customer phone is obfuscated unless status is `CONFIRMED` or `COMPLETED`.

---

### `GET /bookings/:id`
Retrieves complete booking details including status history and payment due countdown.

- **Role:** `customer` (owner), `vendor` (assigned), or `admin`.
- **Response (200 OK):**
  ```json
  {
    "id": "bkg_001",
    "event_id": "c1f1c8a6-8096-4a57-8984-b040e698ea12",
    "customer_id": "usr_123",
    "vendor_id": "vnd_456",
    "service_id": "svc_789",
    "package_id": "pkg_111",
    "category": "Catering",
    "booking_date": "2026-12-15",
    "vendor_name_snapshot": "Sunset Catering",
    "package_name_snapshot": "Gold Buffet",
    "price_snapshot": 120000.00,
    "status": "ACCEPTED",
    "vendor_response_due_at": "2026-10-13T12:00:00.000Z",
    "payment_due_at": "2026-10-12T12:00:00.000Z",
    "history": [
      { "from_status": null, "to_status": "PENDING", "changed_by": "usr_123", "created_at": "..." },
      { "from_status": "PENDING", "to_status": "ACCEPTED", "changed_by": "vnd_456", "created_at": "..." }
    ]
  }
  ```

---

### `PATCH /bookings/:id/accept`
Vendor accepts a pending booking.
- Calls `vendorClient.hold(vendorId, date, bookingId)` to lock calendar date. If vendor calendar returns 409, responds with 409 Conflict.
- Sets `payment_due_at = now + 24h`.
- Transitions status `PENDING -> ACCEPTED`.
- Publishes `booking.accepted`.

- **Role:** `vendor`
- **Response (200 OK):** Updated booking object.

---

### `PATCH /bookings/:id/reject`
Vendor rejects a pending booking with a mandatory reason.
- Transitions `PENDING -> REJECTED`.
- Publishes `booking.rejected`.

- **Role:** `vendor`
- **Request Body:** `{ "reason": "Fully booked for private event" }`
- **Response (200 OK):** Updated booking object.

---

### `PATCH /bookings/:id/cancel`
Cancels an existing booking. Can be called by the owning customer, assigned vendor, or admin.
- Validates allowed transition (`PENDING`, `ACCEPTED`, or `CONFIRMED` -> `CANCELLED`).
- Calls `vendorClient.release(vendorId, date, bookingId)` if previously held/confirmed.
- Publishes `booking.cancelled` with `{ bookingId, amount, bookingDate, cancelledBy, previousStatus }` for payment-feedback-service to process refunds.

- **Role:** `customer` (own), `vendor` (own), or `admin`
- **Request Body:** `{ "reason": "Change of plans" }`
- **Response (200 OK):** Updated booking object with cancellation metadata.

---

### `PATCH /bookings/:id/complete`
Vendor marks a confirmed booking as completed after the event date has occurred (`today >= booking_date`).
- Transitions `CONFIRMED -> COMPLETED`.
- Publishes `booking.completed`.

- **Role:** `vendor`
- **Response (200 OK):** Updated booking object.

---

### `GET /internal/bookings/:id`
Internal service-to-service endpoint for payment-feedback-service or vendor-service.
- **Headers:** `X-Internal-Key`
- **Response (200 OK):** Snapshot of booking `{ id, event_id, customer_id, vendor_id, amount, status, date }`.

---

### `GET /admin/bookings`
Admin overview of all bookings across the platform with filtering, pagination, and sorting.

- **Role:** `admin`
- **Query Params:** `?status=&vendorId=&customerId=&page=1&limit=20`
- **Response (200 OK):** Paginated bookings list with customer & vendor metadata.

---

### `GET /admin/bookings/:id`
Admin view of booking details including complete transition audit history.

- **Role:** `admin`
- **Response (200 OK):** Detailed booking record.

---

### `GET /admin/stats`
Platform booking metrics and conversion statistics.

- **Role:** `admin`
- **Response (200 OK):**
  ```json
  {
    "total_bookings": 150,
    "by_status": {
      "PENDING": 12,
      "ACCEPTED": 8,
      "CONFIRMED": 95,
      "COMPLETED": 25,
      "CANCELLED": 7,
      "REJECTED": 3
    },
    "total_gross_volume": 14500000.00
  }
  ```

---

## 3. Asynchronous Events Contract (RabbitMQ)

- **Exchange:** `bookme.events` (topic)
- **Queue for this service:** `event-booking.q`

### Published Events:
- `booking.created` → `{ bookingId, eventId, customerId, vendorId, amount, date }`
- `booking.accepted` → `{ bookingId, paymentDueAt, amount }`
- `booking.rejected` → `{ bookingId, reason }`
- `booking.confirmed` → `{ bookingId, eventId, vendorId, amount, category }`
- `booking.cancelled` → `{ bookingId, amount, bookingDate, cancelledBy, previousStatus, reason }`
- `booking.completed` → `{ bookingId, eventId, vendorId }`

### Consumed Events:
- `payment.completed` → Transitions `ACCEPTED -> CONFIRMED`, calls `vendorClient.book(...)`, increments `event_budget.actual_amount` for the category, publishes `booking.confirmed`. (Idempotent via `processed_events`).
- `payment.failed` → Logs failure, leaves window open until `payment_due_at` expiry job triggers.
- `payment.refunded` → Confirms refund completion, records in status history.
