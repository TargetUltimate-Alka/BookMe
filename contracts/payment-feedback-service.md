# API Contract — payment-feedback-service

Owner: Person D

Agree on this BEFORE writing implementation code.

Base path: `/api/payments`, `/api/payouts`, `/api/reviews`, `/api/complaints`

---

## Payments

### POST /payments
Initiate a payment for a booking. For a class project, this can call a
sandbox gateway (Razorpay/Stripe test mode) or just simulate success —
agree as a group which.
- Request:
  ```json
  { "bookingId": "bkg_555", "amount": 120000, "method": "card" }
  ```
- Response (201):
  ```json
  {
    "id": "pay_001",
    "bookingId": "bkg_555",
    "amount": 120000,
    "status": "pending",
    "gatewayRef": "sandbox_txn_abc"
  }
  ```

### GET /payments/:id
- Response (200): full payment object
- Errors: 404

### POST /payments/:id/webhook
Called by the payment gateway (or your simulated one) to confirm success/failure.
- Request:
  ```json
  { "status": "success", "gatewayRef": "sandbox_txn_abc" }
  ```
- Response (200): `{ "id": "pay_001", "status": "success" }`
- Note: on success, this service should notify event-booking-service via
  `PATCH /bookings/:id/status { "status": "confirmed" }` so the booking
  reflects payment. Decide as a group whether that call is synchronous here
  or the frontend does it as a separate step — synchronous is simpler for MVP.

---

## Payouts

### POST /payouts
Admin/vendor triggers a payout for a completed booking.
- Request:
  ```json
  { "vendorId": "vnd_456", "bookingId": "bkg_555", "amount": 108000 }
  ```
  (amount is typically post-commission; commission % can be hardcoded for MVP)
- Response (201):
  ```json
  { "id": "pyt_001", "vendorId": "vnd_456", "amount": 108000, "status": "processed" }
  ```

### GET /payouts/:vendorId
- Response (200): `[ { "id": "pyt_001", "amount": 108000, "status": "processed", "date": "2026-12-06" } ]`

---

## Reviews

### POST /reviews
- Request:
  ```json
  { "bookingId": "bkg_555", "vendorId": "vnd_456", "rating": 5, "comment": "Great food!" }
  ```
  (reviewerId comes from JWT)
- Response (201):
  ```json
  { "id": "rev_001", "vendorId": "vnd_456", "rating": 5, "comment": "Great food!", "createdAt": "2026-08-26T10:00:00Z" }
  ```
- Errors: 409 (already reviewed this booking), 400 (booking not completed yet)

### GET /reviews?vendorId=vnd_456
- Response (200): `[ { "id": "rev_001", "rating": 5, "comment": "Great food!" } ]`

Note: vendor-service's `rating` field (shown on vendor profiles) needs to be
kept in sync from here. Simplest MVP approach: this service recalculates the
average on each new review and calls
`PATCH /internal/vendors/:id/rating { "rating": 4.6 }` on vendor-service.

---

## Complaints

### POST /complaints
- Request:
  ```json
  { "bookingId": "bkg_555", "subject": "Late delivery", "description": "..." }
  ```
- Response (201): `{ "id": "cmp_001", "status": "open", "subject": "Late delivery" }`

### GET /complaints/:id
- Response (200): full complaint object

### PATCH /complaints/:id/status
Admin-only.
- Request: `{ "status": "resolved" }`
- Response (200): updated complaint
