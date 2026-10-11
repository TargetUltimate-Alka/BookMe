# BookMe — Payment & Feedback Service (`payment-feedback-service`)

**Owner:** Person D  
**Default Port:** `3004` (Docker maps `3004:3000`)  
**Base Path:** `/api/payments`, `/api/payouts`, `/api/reviews`, `/api/complaints`

---

## 1. Overview & Architecture

The `payment-feedback-service` handles all financial transactions, multi-method payment authentication (2FA/3DS/OTP & UPI), vendor payouts, customer reviews with live vendor rating synchronization, and customer dispute complaints for the BookMe platform.

Following the **BookMe Repo Maintenance Guide**, this service is organized into three strictly decoupled modules:
- **`modules/payment/`**: Payment initiation, 2-factor authentication/3DS challenge verification, gateway webhooks, and vendor payouts.
- **`modules/review/`**: Customer ratings & reviews with automated aggregate rating recalculation and syncing with `vendor-service`.
- **`modules/complaint/`**: Customer dispute resolutions and complaints management.
- **`shared/`**: Database pool with resilient in-memory fallback, RabbitMQ publisher with mock fallback, JWT verification, and SRS §11 error handling.

---

## 2. Customer Payment Authentication Flow

When a customer pays for an accepted booking:
1. **Initiate Payment (`POST /api/payments`)**:
   - Customer submits `{ bookingId, amount, method, paymentDetails }`.
   - Supports **Card**, **UPI**, and **Net Banking**.
   - Creates transaction record in `pending` status.
   - Issues a cryptographic/simulated **2FA / 3D Secure Authentication Challenge** (`testOtp: 123456`).
2. **Authorize & Authenticate (`POST /api/payments/:id/authenticate`)**:
   - Customer submits `{ otp }` or confirms 2FA approval.
   - Service verifies authentication credentials against the challenge.
   - Status transitions from `pending` -> `success`.
   - Generates official receipt identifier (`REC-...`).
3. **Inter-Service Synchronization**:
   - Synchronously notifies `event-booking-service` via `PATCH /internal/bookings/:id/confirm` with shared secret `X-Internal-Key`.
   - Publishes `payment.completed` event to RabbitMQ topic exchange `bookme.events`.
   - The booking automatically transitions to `CONFIRMED` and the vendor calendar locks the date.

---

## 3. API Endpoints

### Payments
- `POST /api/payments` — Initiate a payment intent
- `POST /api/payments/:id/authenticate` — Verify 2FA / 3DS OTP
- `POST /api/payments/:id/verify` — Alias for authenticate
- `POST /api/payments/:id/webhook` — Gateway callback simulation
- `GET /api/payments/:id` — Fetch full payment object
- `GET /api/payments/booking/:bookingId` — Fetch payments for a booking

### Payouts
- `POST /api/payouts` — Admin/vendor trigger payout for completed booking
- `GET /api/payouts/:vendorId` — List payouts for vendor

### Reviews
- `POST /api/reviews` — Submit review for completed booking (syncs rating to `vendor-service`)
- `GET /api/reviews?vendorId=:vendorId` — Fetch vendor reviews

### Complaints
- `POST /api/complaints` — File a customer dispute
- `GET /api/complaints?status=open` — List open complaints
- `GET /api/complaints/:id` — Get dispute details
- `PATCH /api/complaints/:id/status` — Resolve complaint

---

## 4. Running Locally

### Standalone
```bash
cd services/payment-feedback-service
npm install
npm test
npm start
```

### With Docker Compose
```bash
docker compose up payment-feedback-service
```
