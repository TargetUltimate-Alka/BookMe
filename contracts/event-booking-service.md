# API Contract — event-booking-service

Owner: Person C

Agree on this BEFORE writing implementation code.

Base path: `/api/events` and `/api/bookings`

---

## Events

### POST /events
- Request:
  ```json
  {
    "name": "Priya's Wedding",
    "date": "2026-12-05",
    "budget": 500000,
    "guestCount": 150
  }
  ```
  (customerId comes from the JWT, not the body)
- Response (201):
  ```json
  {
    "id": "evt_001",
    "customerId": "usr_123",
    "name": "Priya's Wedding",
    "date": "2026-12-05",
    "budget": 500000,
    "guestCount": 150,
    "createdAt": "2026-08-26T10:00:00Z"
  }
  ```

### GET /events
List the logged-in customer's events.
- Response (200): `[ { "id": "evt_001", "name": "Priya's Wedding", "date": "2026-12-05" } ]`

### GET /events/:id
- Response (200): full event object
- Errors: 401 (not the owner), 404

  ### DELETE /events/:id/checklist/:itemId
- Response (204)
- Errors: 401 (not the event owner), 404

### PATCH /events/:id
- Request: any subset of `{ name, date, budget, guestCount }`
- Response (200): updated event

### GET /events/:id/dashboard
Aggregate view: spend so far vs budget, booking statuses, checklist progress.
- Response (200):
  ```json
  {
    "eventId": "evt_001",
    "budget": 500000,
    "totalBooked": 165000,
    "bookings": [ { "id": "bkg_555", "vendorName": "Sunset Catering", "status": "confirmed", "amount": 120000 } ],
    "checklist": { "total": 10, "done": 4 }
  }
  ```

### POST /events/:id/checklist
- Request: `{ "task": "Book photographer" }`
- Response (201): `{ "id": "chk_1", "task": "Book photographer", "done": false }`

### PATCH /events/:id/checklist/:itemId
- Request: `{ "done": true }`
- Response (200): updated checklist item

---
## vendor service (added later )

### GET /vendors/:vendorId/bookings
Used by the vendor dashboard to show incoming booking requests, so a vendor
can accept/reject them.
- Query params: `?status=pending`
- Response (200):
```json
  [ { "id": "bkg_555", "eventId": "evt_001", "customerName": "Jane Doe", "date": "2026-12-05", "status": "pending", "amount": 120000 } ]
```
- Errors: 401 (not the vendor owner)
## Bookings

A booking links one event to one vendor package/service. This service stores
only IDs + a denormalized snapshot (vendor name, price) — see the "snapshot"
note below for why.

> **Note on availability locking:** when a booking moves to `confirmed` via
> `PATCH /bookings/:id/status`, this service automatically calls
> `POST /vendors/:id/availability/block` on vendor-service so the date gets
> locked. The vendor does not need to block it manually. (Team: confirm
> this is the agreed flow — the alternative is the vendor blocking
> manually, which is more error-prone for a demo.)

### POST /bookings
- Request:
  ```json
  {
    "eventId": "evt_001",
    "vendorId": "vnd_456",
    "packageId": "pkg_111",
    "date": "2026-12-05"
  }
  ```
- Response (201):
  ```json
  {
    "id": "bkg_555",
    "eventId": "evt_001",
    "vendorId": "vnd_456",
    "vendorNameSnapshot": "Sunset Catering",
    "packageId": "pkg_111",
    "priceSnapshot": 120000,
    "status": "pending",
    "date": "2026-12-05"
  }
  ```
- Errors: 409 (vendor not available on that date — checked via vendor-service's
  `GET /vendors/:id/availability` at booking time), 404 (event/vendor/package not found)

### GET /bookings/:id
- Response (200): full booking object
- Errors: 404

### GET /events/:id/bookings
- Response (200): `[ { "id": "bkg_555", "vendorNameSnapshot": "Sunset Catering", "status": "confirmed" } ]`

### PATCH /bookings/:id/status
Drives the booking lifecycle: `pending → confirmed → completed`, or `→ cancelled`.
- Request: `{ "status": "confirmed" }`
- Response (200): updated booking
- Errors: 400 (invalid transition, e.g. completed → pending), 404

---

## Note on cross-service data (read this before building)

This service does **not** join against vendor-service's or auth-service's
database — each service owns its own DB, no shared tables. Two options were
considered for how a booking "knows" vendor name/price:

1. **Snapshot at booking time (what this contract uses):** copy
   `vendorName` + `price` into the booking row when it's created. Fast reads,
   works if vendor-service is down, but goes stale if the vendor changes
   their price later (which is usually *correct* behavior for a booking —
   you don't want a past order's price silently changing).
2. **Live lookup on every read:** booking service calls
   `GET /internal/vendors/:id/summary` every time a booking is displayed.
   Always fresh, but couples booking-service's uptime to vendor-service's,
   and is slower under load.

Snapshot is the safer default for a class project — much less to debug when
services are flaky in a live demo.
