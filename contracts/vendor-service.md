# API Contract — vendor-service

Owner: Person B

Agree on this BEFORE writing implementation code.

Base path: `/api/vendors`

---

### POST /vendors
Create a vendor profile. Called right after a user registers with
`role: "vendor"` in auth-service (frontend calls both in sequence, or
auth-service's register response includes the new `userId` the frontend
passes here).

- Request:
  ```json
  {
    "userId": "usr_123",
    "businessName": "Sunset Catering",
    "category": "catering",
    "description": "...",
    "location": "Ahmedabad, India"
  }
  ```
- Response (201):
  ```json
  {
    "id": "vnd_456",
    "userId": "usr_123",
    "businessName": "Sunset Catering",
    "category": "catering",
    "verified": true,
    "rating": null,
    "createdAt": "2026-08-26T10:00:00Z"
  }
  ```
- Errors: 400, 409 (vendor profile already exists for this userId)

> **V1 note:** vendors are auto-verified on creation (`verified: true` by
> default). No verification workflow in V1 — this comes back as an
> admin-only `POST /vendors/:id/verify` endpoint when admin-service lands
> in V2.

### GET /vendors/:id
- Response (200): full vendor object (same shape as POST response, plus `description`, `location`)
- Errors: 404

### GET /vendors
Search/list, used by customers browsing.
- Query params: `?category=catering&location=Ahmedabad&verified=true&page=1`
- Response (200):
  ```json
  {
    "items": [ { "id": "vnd_456", "businessName": "Sunset Catering", "category": "catering", "rating": 4.5, "verified": true } ],
    "page": 1,
    "totalPages": 3
  }
  ```

### PATCH /vendors/:id
- Request: any subset of `{ businessName, description, location, category }`
- Response (200): updated vendor object
- Errors: 401 (not the owner), 404

### PATCH /internal/vendors/:id/rating
Internal only — called by payment-feedback-service after a new review to
keep the vendor's displayed rating in sync.
- Request:
```json
  { "rating": 4.6 }
```
- Response (200): `{ "id": "vnd_456", "rating": 4.6 }`
  
### PATCH /vendors/:id/packages/:packageId
- Request: any subset of `{ name, serviceIds, price }`
- Response (200): updated package object
- Errors: 401 (not the owner), 404

### DELETE /vendors/:id/packages/:packageId
- Response (204)
- Errors: 401, 404
---

### POST /vendors/:id/services
Add a bookable service/offering under this vendor.
- Request:
  ```json
  { "title": "Wedding buffet (100 pax)", "description": "...", "basePrice": 45000 }
  ```
- Response (201):
  ```json
  { "id": "svc_789", "vendorId": "vnd_456", "title": "Wedding buffet (100 pax)", "basePrice": 45000 }
  ```

### GET /vendors/:id/services
- Response (200): `[ { "id": "svc_789", "title": "...", "basePrice": 45000 } ]`

### PATCH /vendors/:id/services/:serviceId
- Request: any subset of `{ title, description, basePrice }`
- Response (200): updated service object

### DELETE /vendors/:id/services/:serviceId
- Response (204)

### DELETE /vendors/:id/availability/block/:blockId
- Response (204)
- Errors: 401 (not the owner), 404

---

### POST /vendors/:id/packages
Bundles of services at a package price (optional grouping on top of services).
- Request:
  ```json
  { "name": "Gold Wedding Package", "serviceIds": ["svc_789"], "price": 120000 }
  ```
- Response (201): package object with `id`

### GET /vendors/:id/packages
- Response (200): `[ { "id": "pkg_111", "name": "Gold Wedding Package", "price": 120000 } ]`

  ### PATCH /vendors/:id/packages/:packageId
- Request: any subset of `{ name, serviceIds, price }`
- Response (200): updated package object
- Errors: 401 (not the owner), 404

### DELETE /vendors/:id/packages/:packageId
- Response (204)
- Errors: 401 (not the owner), 404

---

### GET /vendors/:id/availability
Used by event-booking-service before confirming a booking.
- Query params: `?date=2026-12-05`
- Response (200):
  ```json
  { "date": "2026-12-05", "available": true, "blockedSlots": [] }
  ```

### POST /vendors/:id/availability/block
Vendor blocks out a date (already booked elsewhere, holiday, etc.).
- Request:
  ```json
  { "date": "2026-12-05", "reason": "already booked" }
  ```
- Response (201): `{ "id": "blk_222", "date": "2026-12-05", "reason": "already booked" }`

---

## Internal endpoint for other services

### GET /internal/vendors/:id/summary
Lightweight, no-auth-required (internal network only) lookup used by
event-booking-service and payment-feedback-service so they don't need to
duplicate vendor data.
- Response (200):
  ```json
  { "id": "vnd_456", "businessName": "Sunset Catering", "verified": true }
  ```
