# BookMe — Event-Booking Service

Microservice owned by **TargetUltimate-Alka (Person C)** for the **BookMe** Multi-Vendor Event Services Platform.

This microservice manages events, budgets, milestone checklists, AI planning suggestions, booking requests, vendor contract lifecycles, and event-driven updates.

---

## 1. Service Specification

- **Service Port:** `4003`
- **Database:** PostgreSQL (`event_booking_db` on isolated host port `5435`)
- **Queue / Broker:** RabbitMQ (`bookme.events` topic exchange, queue `event-booking.q`)
- **Architecture:** Layered (`routes` $\rightarrow$ `controllers` $\rightarrow$ `services` $\rightarrow$ `repository`)
- **Authentication:** Gateway identity header extraction (`X-User-Id`, `X-User-Role`, `X-Request-Id`) with `DEV_AUTH_BYPASS` in development.

---

## 2. Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `4003` | HTTP port where service listens |
| `DATABASE_URL` | `postgres://user:password@localhost:5435/event_booking_db` | PostgreSQL connection string |
| `INTERNAL_API_KEY` | `dev-internal-key-123` | Secret shared key required for `/internal/**` routes |
| `RABBITMQ_URL` | `amqp://guest:guest@localhost:5672` | AMQP broker connection URL |
| `VENDOR_SERVICE_URL` | `http://localhost:3002` | Upstream vendor microservice address |
| `VENDOR_CLIENT_MODE` | `mock` | `real` (live Axios calls) or `mock` (deterministic test stubs) |
| `DEV_AUTH_BYPASS` | `true` | When true in development, accepts identity headers directly |
| `NODE_ENV` | `development` | `development`, `test`, or `production` |

---

## 3. How to Run Locally

### Option A: Without Docker (Native Node.js)
```powershell
cd services/event-booking-service
npm install
npm start
```
*Note: If PostgreSQL or RabbitMQ are not running locally, the service automatically engages resilient in-memory mock fallbacks so you can test all endpoints immediately.*

### Option B: With Docker Compose
From the repository root:
```powershell
docker compose up --build event-booking-service event-booking-db
```
- Health Check: `http://localhost:4003/health`

---

## 4. Database Seeding

To populate demo customers, events, budget allocations, checklists, and bookings across **every** lifecycle status (`PENDING`, `ACCEPTED`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `REJECTED`):

```powershell
npm run seed
# Or directly:
node scripts/seed.js
```

---

## 5. How to Run Automated Tests

The service includes comprehensive unit and integration test suites (Supertest, Jest, state machine transitions, AJV input schemas):

```powershell
npm test
```
*Result: 6 test suites, 56 unit & integration tests passing.*

---

## 6. Simulating Asynchronous RabbitMQ Events

To simulate payment events dispatched by `payment-feedback-service`:

### Payment Completed (Transitions ACCEPTED $\rightarrow$ CONFIRMED)
```powershell
node scripts/publish-test-event.js --type=payment.completed --bookingId=<BOOKING_ID> --amount=120000
```

### Payment Failed
```powershell
node scripts/publish-test-event.js --type=payment.failed --bookingId=<BOOKING_ID>
```

### Payment Refunded
```powershell
node scripts/publish-test-event.js --type=payment.refunded --bookingId=<BOOKING_ID>
```

---

## 7. Complete Curl Examples for All Endpoints

### 7.1 Health Check (Public)
```bash
curl http://localhost:4003/health
```

---

### 7.2 Event Module

#### Create Event (Customer)
```bash
curl -X POST http://localhost:4003/events \
  -H "Content-Type: application/json" \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer" \
  -d '{
    "name": "Aarav & Maya Wedding",
    "event_type": "Wedding",
    "event_date": "2026-12-15",
    "budget": 500000,
    "guest_count": 200,
    "city": "Ahmedabad"
  }'
```

#### List Events (Customer)
```bash
curl http://localhost:4003/events?status=PLANNING&page=1&limit=10 \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer"
```

#### Get Single Event
```bash
curl http://localhost:4003/events/<EVENT_ID> \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer"
```

#### Update Event
```bash
curl -X PUT http://localhost:4003/events/<EVENT_ID> \
  -H "Content-Type: application/json" \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer" \
  -d '{ "guest_count": 250, "city": "Gandhinagar" }'
```

#### Cancel Event (Soft Cancellation)
```bash
curl -X DELETE http://localhost:4003/events/<EVENT_ID> \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer"
```

#### Get AI / Template Suggestions
```bash
curl http://localhost:4003/events/<EVENT_ID>/suggestions \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer"
```

#### Get Event Budget Breakdown
```bash
curl http://localhost:4003/events/<EVENT_ID>/budget \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer"
```

#### Update Planned Budget Allocations
```bash
curl -X PUT http://localhost:4003/events/<EVENT_ID>/budget \
  -H "Content-Type: application/json" \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer" \
  -d '{
    "categories": [
      { "category": "Venue & Catering", "planned_amount": 260000 },
      { "category": "Photography & Video", "planned_amount": 70000 }
    ]
  }'
```

#### Get Event Checklist
```bash
curl http://localhost:4003/events/<EVENT_ID>/checklist \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer"
```

#### Add Custom Checklist Task
```bash
curl -X POST http://localhost:4003/events/<EVENT_ID>/checklist \
  -H "Content-Type: application/json" \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer" \
  -d '{
    "task": "Order invitation cards",
    "category": "General",
    "due_date": "2026-11-01"
  }'
```

#### Toggle Checklist Task
```bash
curl -X PUT http://localhost:4003/checklist/<CHECKLIST_ID> \
  -H "Content-Type: application/json" \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer" \
  -d '{ "done": true }'
```

#### Delete Checklist Task
```bash
curl -X DELETE http://localhost:4003/checklist/<CHECKLIST_ID> \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer"
```

#### Aggregated Event Dashboard
```bash
curl http://localhost:4003/events/<EVENT_ID>/dashboard \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer"
```

---

### 7.3 Booking Module

#### Create Booking Request (Customer)
```bash
curl -X POST http://localhost:4003/bookings \
  -H "Content-Type: application/json" \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer" \
  -d '{
    "event_id": "<EVENT_ID>",
    "vendor_id": "vnd_456",
    "service_id": "svc_789",
    "package_id": "pkg_111",
    "category": "Catering"
  }'
```

#### List Customer Bookings
```bash
curl http://localhost:4003/bookings?status=CONFIRMED \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer"
```

#### List Vendor Incoming Requests (Vendor)
```bash
curl http://localhost:4003/bookings/vendor?status=PENDING \
  -H "X-User-Id: vnd_456" \
  -H "X-User-Role: vendor"
```

#### Get Booking Details
```bash
curl http://localhost:4003/bookings/<BOOKING_ID> \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer"
```

#### Accept Booking (Vendor)
```bash
curl -X PATCH http://localhost:4003/bookings/<BOOKING_ID>/accept \
  -H "X-User-Id: vnd_456" \
  -H "X-User-Role: vendor"
```

#### Reject Booking (Vendor)
```bash
curl -X PATCH http://localhost:4003/bookings/<BOOKING_ID>/reject \
  -H "Content-Type: application/json" \
  -H "X-User-Id: vnd_456" \
  -H "X-User-Role: vendor" \
  -d '{ "reason": "Fully booked on this date" }'
```

#### Cancel Booking (Customer / Vendor / Admin)
```bash
curl -X PATCH http://localhost:4003/bookings/<BOOKING_ID>/cancel \
  -H "Content-Type: application/json" \
  -H "X-User-Id: usr_123" \
  -H "X-User-Role: customer" \
  -d '{ "reason": "Change of schedule" }'
```

#### Complete Booking (Vendor, on or after event date)
```bash
curl -X PATCH http://localhost:4003/bookings/<BOOKING_ID>/complete \
  -H "X-User-Id: vnd_456" \
  -H "X-User-Role: vendor"
```

---

### 7.4 Admin & Internal Endpoints

#### Admin List All Bookings
```bash
curl http://localhost:4003/admin/bookings?status=CONFIRMED \
  -H "X-User-Id: admin_1" \
  -H "X-User-Role: admin"
```

#### Admin Platform Stats
```bash
curl http://localhost:4003/admin/stats \
  -H "X-User-Id: admin_1" \
  -H "X-User-Role: admin"
```

#### Internal Service-to-Service Booking Snapshot
```bash
curl http://localhost:4003/internal/bookings/<BOOKING_ID> \
  -H "X-Internal-Key: dev-internal-key-123"
```
