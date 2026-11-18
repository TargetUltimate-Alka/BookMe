# BookMe – System Architecture & Technical Design Specification

> **Platform:** BookMe – Distributed Multi-Vendor Event Service Booking Platform  
> **Document Type:** System Architecture Document (SAD) / Technical Design Document (TDD)  
> **Status:** Approved / Active Standard  
> **Architecture Pattern:** Distributed Microservices & Event-Driven Architecture (EDA)  
> **Compliance & Standards:** OpenAPI 3.1, AsyncAPI 3.0, India DPDP Act (2023), UIDAI Guidelines  

---

## Table of Contents
1. [Executive Summary & Problem Domain](#1-executive-summary--problem-domain)
2. [Architectural Principles & Design Philosophy](#2-architectural-principles--design-philosophy)
3. [System Architecture Overview (C4 Container Diagram)](#3-system-architecture-overview-c4-container-diagram)
4. [Microservices Decomposition & Domain Boundaries](#4-microservices-decomposition--domain-boundaries)
5. [Data Architecture & Database-per-Service Model](#5-data-architecture--database-per-service-model)
6. [Asynchronous Messaging & Event Bus (RabbitMQ)](#6-asynchronous-messaging--event-bus-rabbitmq)
7. [High-Concurrency & Atomic Capacity Engine](#7-high-concurrency--atomic-capacity-engine)
8. [Financial Precision & Indian Statutory Engine](#8-financial-precision--indian-statutory-engine)
9. [Security, Privacy & DPDP Compliance Architecture](#9-security-privacy--dpdp-compliance-architecture)
10. [Geospatial & Search Subsystem](#10-geospatial--search-subsystem)
11. [Frontend Modular Architecture](#11-frontend-modular-architecture)
12. [Deployment Topology & DevOps](#12-deployment-topology--devops)

---

## 1. Executive Summary & Problem Domain

The Indian event planning, wedding, and corporate summit industry suffers from acute market fragmentation, hidden commissions, unverified vendor credentials, and double-booking during peak wedding dates (*muhurats*). Customers face fragmented coordination over chat and spreadsheets with zero financial escrow protection. Conversely, independent vendors lack unified operating systems to manage team capacity, standardized service packages, and statutory GST invoicing.

**BookMe** is an enterprise-grade, fault-tolerant, microservice-based marketplace that bridges this gap:
- **Contract-First Engineering:** Strict OpenAPI 3.1 HTTP REST and AsyncAPI 3.0 event definitions prevent inter-team interface breakage.
- **Atomic Concurrency Engine:** Eliminates double-booking through single-statement conditional SQL updates and database constraints under 50+ parallel checkout requests.
- **Integer Paise Financial Standard:** All accounting is tracked strictly in 64-bit integer paise (`BIGINT`), preventing floating-point rounding errors.
- **DPDP Act & UIDAI Compliance:** Zero raw Aadhaar storage, payload interception filters, AES-256-GCM encryption at rest, and HMAC-SHA-256 blind indexing.
- **Escrow Split Payments:** Automated two-phase payments (40% advance deposit / 60% completion balance) with delayed vendor settlement.

---

## 2. Architectural Principles & Design Philosophy

```
+----------------------------------------------------------------------------------------+
|                                Core Architectural Tenets                               |
+--------------------------+----------------------------+--------------------------------+
|  Database-per-Service    |   Eventual Consistency     |    Zero Raw Aadhaar / DPDP     |
|  Strict schema isolation |   RabbitMQ + Outbox Relay  |    Payload regex filter, AES   |
+--------------------------+----------------------------+--------------------------------+
|  64-Bit Integer Paise    |   Single-Statement Atomic  |    Dual-Mode Runtime Resiliency|
|  BIGINT (no float error) |   Overbooking prevention   |    DB & in-memory fallbacks    |
+--------------------------+----------------------------+--------------------------------+
```

1. **Microservices & Loose Coupling:** Each service owns its domain logic and dedicated PostgreSQL database. Services never cross-read or mutate foreign databases directly.
2. **Dual-Mode Runtime Resiliency:** All microservices incorporate automatic in-memory mock fallbacks, enabling seamless boots, local testing, and offline developer onboarding without active PostgreSQL or RabbitMQ daemons running.
3. **Transactional Outbox Pattern:** Guarantees reliable publishing of domain events to RabbitMQ by storing outbound events in the service database within the same database transaction as the state change.
4. **Defense in Depth:** Zero-trust payload validation via Zod schemas, role-based access control (RBAC), and sanitization against PII leakage and injection attacks.

---

## 3. System Architecture Overview (C4 Container Diagram)

```mermaid
flowchart TD
    subgraph Clients["Client Presentation Tier"]
        Web["Web Portal (React 18 + Vite)\nPort: 5173\nFeatures: Customer Discovery, Vendor OS, Admin Console"]
        Mobile["Future Mobile Client (React Native)\nPush Notifications, VoIP In-App Calling"]
    end

    subgraph Ingress["API Gateway & Service Mesh Layer"]
        Gateway["Reverse Proxy / HTTP Router\nCORS, Rate Limiting, Route Dispatching"]
    end

    subgraph Services["Microservices Tier (Node.js & Express)"]
        AuthSvc["auth-service\nPort: 3001\nAuth, OTP, JWT Rotation, RBAC"]
        VendorSvc["vendor-service\nPort: 3002\nOnboarding, 60 Categories, Packages, Slots, KYC"]
        BookingSvc["event-booking-service\nPort: 4003\n12-State Booking Machine, Negotiation, Surcharges"]
        PaymentSvc["payment-feedback-service\nPort: 3004\nEscrow Split, Webhooks, Wallet Ledger, Reviews"]
        AdminSvc["admin-service\nPort: 3005\nVerification Queues, Audit Logs, Violation Ladder"]
    end

    subgraph MessageBroker["Asynchronous Message Bus (AMQP 0-9-1)"]
        RabbitMQ["RabbitMQ Message Broker\nExchanges: booking.deadlines, payments.webhooks,\nleads.billing, notifications, notifyme.matching"]
    end

    subgraph DataTier["Dedicated Database Tier (PostgreSQL 16)"]
        AuthDB[("auth_db\nPort: 5433")]
        VendorDB[("vendor_db\nPort: 5434")]
        BookingDB[("event_booking_db\nPort: 5435")]
        PaymentDB[("payment_feedback_db\nPort: 5436")]
        AdminDB[("admin_db\nPort: 5437")]
    end

    subgraph ExternalServices["External Providers & Gateways"]
        DigiLocker["DigiLocker / Aadhaar API\nOAuth Consent & Masked Reference"]
        PaymentGateway["Payment Gateway (Razorpay/Stripe)\nMarketplace Split Escrow Webhooks"]
        SMSProvider["DLT-Registered SMS Provider\nTransactional OTPs"]
        FCM["Firebase Cloud Messaging\nRealtime Push Notifications"]
        CloudStorage["S3 / Cloud Object Storage\nCDN Pre-signed Portfolio Media"]
    end

    Clients --> Gateway
    Gateway --> AuthSvc
    Gateway --> VendorSvc
    Gateway --> BookingSvc
    Gateway --> PaymentSvc
    Gateway --> AdminSvc

    AuthSvc --> AuthDB
    VendorSvc --> VendorDB
    BookingSvc --> BookingDB
    PaymentSvc --> PaymentDB
    AdminSvc --> AdminDB

    AuthSvc -.-> RabbitMQ
    VendorSvc -.-> RabbitMQ
    BookingSvc -.-> RabbitMQ
    PaymentSvc -.-> RabbitMQ
    AdminSvc -.-> RabbitMQ

    VendorSvc --> DigiLocker
    VendorSvc --> CloudStorage
    PaymentSvc --> PaymentGateway
    AuthSvc --> SMSProvider
    Services -.-> FCM
```

---

## 4. Microservices Decomposition & Domain Boundaries

| Service Name | Port | Database Port | Primary Domain Responsibilities | Contract Specifications |
| :--- | :---: | :---: | :--- | :--- |
| **`auth-service`** | `3001` | `5433` (`auth_db`) | User onboarding, dual-identifier auth (Phone OTP / Email Password), JWT token family rotation, RBAC enforcement (`CUSTOMER`, `VENDOR`, `ADMIN`), terms liability. | `contracts/openapi/auth-service.yaml`<br>`contracts/auth-service.md` |
| **`vendor-service`** | `3002` | `5434` (`vendor_db`) | Vendor profile onboarding, 60-category ontology, Tiered packages (Paise), Atomic slot capacity engine, Portfolio media deduplication (SHA-256), Radius search. | `contracts/openapi/vendor-service.yaml`<br>`contracts/vendor-service.md` |
| **`event-booking-service`** | `4003` | `5435` (`event_booking_db`) | 12-state booking lifecycle engine, Multi-round counter-offer negotiation, Checklist requirements matching, Cancellation surcharge calculation. | `contracts/openapi/event-booking-service.yaml`<br>`contracts/event-booking-service.md` |
| **`payment-feedback-service`** | `3004` | `5436` (`payment_feedback_db`) | Two-phase escrow splits (40% advance / 60% balance), Webhook idempotency, Double-blind review scoring, Append-only wallet ledger, Dispute resolution. | `contracts/openapi/payment-feedback-service.yaml`<br>`contracts/payment-feedback-service.md` |
| **`admin-service`** | `3005` | `5437` (`admin_db`) | Verifier review queues, Vendor KYC moderation, 3-step violation enforcement ladder, System config registry, Immutable audit logging. | `contracts/openapi/admin-service.yaml`<br>`contracts/admin-service.md` |

### Detailed Service Interactions

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Web/App)
    actor Vendor as Vendor (Vendor OS)
    participant BookingSvc as event-booking-service (:4003)
    participant VendorSvc as vendor-service (:3002)
    participant PaymentSvc as payment-feedback-service (:3004)
    participant RabbitMQ as RabbitMQ Bus
    participant Gateway as Payment Gateway

    Customer->>BookingSvc: POST /api/bookings (Create Request)
    BookingSvc->>VendorSvc: POST /internal/availability/hold (Atomic Hold Capacity)
    alt Slot Available
        VendorSvc-->>BookingSvc: HTTP 200 OK (Capacity Held, Expiry: 15 min)
        BookingSvc-->>Customer: HTTP 201 Created (Status: REQUESTED)
    else Slot Sold Out
        VendorSvc-->>BookingSvc: HTTP 409 Conflict (CAPACITY_EXHAUSTED)
        BookingSvc-->>Customer: HTTP 409 Conflict (Slot Not Available)
    end

    Vendor->>BookingSvc: POST /api/bookings/:id/accept
    BookingSvc->>RabbitMQ: Publish booking.accepted (2-hr Deposit Window)
    BookingSvc-->>Customer: Notification: Vendor Accepted (Pay Deposit)

    Customer->>PaymentSvc: POST /api/payments/checkout (40% Deposit)
    PaymentSvc->>Gateway: Create Order (Split Escrow)
    Gateway-->>Customer: Render Checkout UI
    Customer->>Gateway: Authorize Payment
    Gateway->>PaymentSvc: Webhook: payment.captured
    PaymentSvc->>RabbitMQ: Publish payment.deposit_received
    RabbitMQ->>BookingSvc: Consume payment.deposit_received
    BookingSvc->>BookingSvc: Transition Status to CONFIRMED
    BookingSvc->>VendorSvc: POST /internal/availability/confirm (Convert Hold to Booked)
    VendorSvc-->>BookingSvc: HTTP 200 OK (Slot Confirmed)
```

---

## 5. Data Architecture & Database-per-Service Model

Each microservice isolates its transactional boundaries within its own PostgreSQL database schema to maintain autonomy and scalability.

```
PostgreSQL Cluster / Instances:
|-- auth_db (:5433)
|   |-- users
|   |-- refresh_token_families
|   `-- user_sessions
|
|-- vendor_db (:5434)
|   |-- vendors
|   |-- vendor_categories (60 categories across 8 domains)
|   |-- vendor_packages (Basic, Standard, Premium in Paise)
|   |-- package_add_ons
|   |-- availability_capacity (Slot units, held_units, booked_units)
|   |-- vendor_media (SHA-256 deduplicated portfolio assets)
|   |-- vendor_agreements (E-sign records, SHA-256 legal hash)
|   `-- vendor_status_history
|
|-- event_booking_db (:5435)
|   |-- bookings (12-state machine, immutable price snapshots)
|   |-- booking_negotiations (Counter-offer rounds)
|   |-- booking_items
|   `-- booking_status_audit
|
|-- payment_feedback_db (:5436)
|   |-- escrow_payments (40/60 split states, gateway references)
|   |-- vendor_wallet_ledger (Append-only, balance_after)
|   |-- vendor_payouts
|   |-- reviews (Double-blind verification)
|   `-- disputes
|
`-- admin_db (:5437)
    |-- verifier_actions
    |-- violation_records (3-step enforcement ladder)
    |-- dynamic_system_configs
    `-- immutable_audit_logs
```

---

## 6. Asynchronous Messaging & Event Bus (RabbitMQ)

To guarantee eventual consistency across microservices without synchronous blocking, BookMe uses RabbitMQ (AMQP 0-9-1) adhering to the CloudEvents 1.0 JSON specification.

### Queue & Exchange Topology

| Exchange / Queue Name | Routing Key | Purpose | Reliability Mechanism |
| :--- | :--- | :--- | :--- |
| `booking.deadlines` | `booking.deadline.*` | Enforces SLA timers (12h vendor response, 2h deposit window, free cancellation window, 24h auto-complete). | Delayed Message Plugin / TTL + Dead-Letter Exchange |
| `payments.webhooks` | `payment.webhook.*` | Ingestion of gateway payment confirmation and dispute webhooks. | Signature verification, raw payload persistence, Idempotency-Key guard |
| `leads.billing` | `leads.call_ended` | Processes completed VoIP/chat calls (>=30s connected) and debits vendor lead balance. | Deduplication window (7 days), daily cap (10/day) |
| `notifications` | `notification.send` | Dispatches multi-channel alerts (SMS, FCM Push, Transactional Email). | Exponential backoff retry with per-channel DLQs |
| `notifyme.matching` | `capacity.opened` | Matches newly cancelled or freed slots against customer waiting lists (`NotifyRequest`). | Rate-limited batch processing |
| `media.moderation` | `media.uploaded` | Performs asynchronous content moderation on vendor portfolio uploads. | SHA-256 deduplication and moderation queue |
| `*.dlq` | `*.dlq` | Catches unprocessable messages exceeding max retry limit (5 retries). | Manual alert & dead-letter inspection dashboard |

### Transactional Outbox Pattern

To eliminate the "dual-write" failure problem (where a database row is saved but the RabbitMQ message fails to dispatch):
1. State changes and outbox records are committed in a single atomic SQL transaction.
2. An asynchronous Outbox Relay worker continuously polls the outbox table and publishes events to RabbitMQ.
3. Once the broker acknowledges receipt (`ACK`), the outbox record is marked as `PROCESSED`.
4. Overdue Sweeper: A background cron worker runs every 60 seconds to detect and process any timed-out tasks directly against database timestamps (`expires_at`), ensuring system progress even if a broker message is dropped.

---

## 7. High-Concurrency & Atomic Capacity Engine

### The Problem
During auspicious wedding dates (*muhurats*), hundreds of customers may attempt to book the final available slot of a top-tier vendor simultaneously. Standard "Read-then-Write" architectures suffer from race conditions, causing catastrophic double-booking.

### The Solution: Database-Level Atomic Reservation
BookMe implements an atomic capacity reservation engine executing single-statement SQL queries with strict mathematical constraints:

```sql
-- Atomic Slot Reservation (Single Statement)
UPDATE availability_capacity
SET 
    held_units = held_units + $requested_qty,
    updated_at = NOW()
WHERE 
    package_id = $package_id
    AND date = $target_date
    AND slot = $target_slot
    AND (total_units - held_units - booked_units) >= $requested_qty
RETURNING *;
```

Coupled with a database-level integrity check:
```sql
ALTER TABLE availability_capacity 
ADD CONSTRAINT chk_capacity_integrity 
CHECK ((held_units + booked_units) <= total_units);
```

### Concurrency Stress Test Verification
In automated test suites (`tests/srsVendorModule.test.js`), firing **50 parallel asynchronous hold requests** against a slot with `3 units available` yields:
- **Exactly 3 successful reservations** (`HTTP 200 OK`).
- **47 immediate safe rejections** (`HTTP 409 Conflict - CAPACITY_EXHAUSTED`).
- **Zero overbooking** and zero database deadlocks.

```mermaid
flowchart TD
    Reqs["50 Concurrent Checkout Requests (Parallel)"] --> Lock{"Atomic SQL Execution\n(total_units - held - booked >= qty)"}
    Lock -- "Units Available (1st to 3rd)" --> Success["HTTP 200 OK\nCapacity Held (15-min TTL)\nheld_units++"]
    Lock -- "Condition Fails (4th to 50th)" --> Reject["HTTP 409 Conflict\nCAPACITY_EXHAUSTED\nZero Mutation"]
    Success --> Payment{"Deposit Paid in 2 Hours?"}
    Payment -- Yes --> Booked["Convert Held -> Booked\nbooked_units++, held_units--"]
    Payment -- No / Expired --> Release["Auto-Release Sweeper\nheld_units--"]
```

---

## 8. Financial Precision & Indian Statutory Engine

### 1. 64-Bit Integer Paise Standard (ADR-003)
Floating-point arithmetic in standard IEEE-754 numbers generates rounding anomalies (e.g., `0.1 + 0.2 = 0.30000000000000004`). In financial systems handling multi-lakh event bookings, these create statutory audit failures.
- **Rule:** Every price, discount, tax, deposit, and balance is calculated and stored in **integer paise** (1 INR = 100 paise) as PostgreSQL `BIGINT`.
- Public/legacy APIs present converted float INR strictly as read-only view decorators.

### 2. Indian GST & HSN/SAC Accounting
All package items and add-ons are mapped to statutory Indian GST slabs:
- Standard slabs: 5%, 12%, 18% (computed using integer basis points: `500 bps`, `1200 bps`, `1800 bps`).
- Itemized breakdowns for intra-state (CGST + SGST) and inter-state (IGST) invoices with validated SAC codes.

### 3. Immutable Price Snapshotting
When a booking request is initiated, the system serializes a complete JSON snapshot of all price terms, add-on rates, GST percentages, and cancellation policies into `pricing_snapshot`. Even if a vendor later increases their public package prices, existing bookings and dispute settlements remain bound to the frozen snapshot.

### 4. Escrow Split Payment Lifecycle
```mermaid
stateDiagram-v2
    [*] --> PendingDeposit: Booking Accepted by Vendor
    PendingDeposit --> EscrowHold40: Customer Pays 40% Advance Deposit
    PendingDeposit --> Cancelled: 2-Hour Timer Expires
    EscrowHold40 --> EscrowHold100: Customer Pays 60% Balance (Pre-Event)
    EscrowHold100 --> ServiceExecution: Event Commences
    ServiceExecution --> Completed: Both Parties Acknowledge Completion
    Completed --> SettlementHolding24h: 24-Hour Dispute Window
    SettlementHolding24h --> VendorPayoutReleased: Escrow Released to Vendor Wallet / Bank
    VendorPayoutReleased --> [*]
```

---

## 9. Security, Privacy & DPDP Compliance Architecture

BookMe adheres strictly to the **Digital Personal Data Protection (DPDP) Act 2023** and UIDAI regulatory mandates.

```mermaid
flowchart LR
    Incoming["Incoming HTTP Request Payload"] --> Filter{"containsRawAadhaar()\nRegex: ^[2-9][0-9]{11}$"}
    Filter -- "Raw Aadhaar Detected" --> Abort["HTTP 400 RAW_AADHAAR_FORBIDDEN\nImmediate Rejection & Log"]
    Filter -- "Clean Payload" --> DigiLockerAdapter["DigiLocker OAuth Adapter\nExtract Masked Ref: XXXX-XXXX-1234"]
    DigiLockerAdapter --> Crypto["AES-256-GCM Encryption\n(PAN, Bank Account, Penny-drop)"]
    Crypto --> BlindIndex["HMAC-SHA-256 Blind Index\nO(1) Search without Decryption"]
    BlindIndex --> DB[(vendor_db Encrypted Storage)]
```

### 1. Zero Raw Aadhaar Guarantee (FR-ONB-03)
- Storing 12-digit Aadhaar numbers is strictly forbidden.
- The `containsRawAadhaar` security middleware inspects all request headers, query parameters, and JSON request bodies using Regex (`^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$`). Any payload matching raw Aadhaar format is immediately aborted with `HTTP 400 RAW_AADHAAR_FORBIDDEN` before reaching database or business logic layers.
- Identity verification is conducted solely via DigiLocker OAuth consent redirects, storing only:
  - Masked Aadhaar representation: `XXXX-XXXX-1234`
  - DigiLocker provider reference token
  - Verified legal name and consent timestamp

### 2. Cryptographic Storage & Blind Indexing
- **Authenticated Encryption at Rest:** Sensitive KYC data (PAN, bank accounts, IFSC tokens) are encrypted with AES-256-GCM generating `iv:authTag:ciphertext`.
- **HMAC-SHA-256 Blind Indexing:** Encrypted fields cannot be queried with standard SQL `WHERE` clauses. BookMe derives a deterministic HMAC-SHA-256 blind hash using an isolated secret key. Fast $O(1)$ lookups for duplicate phone/PAN are performed against the blind index without decrypting tables.

### 3. PII Masking & Off-Platform Leakage Prevention (FR-COM-01)
- Customer-facing catalog and discovery APIs pass through `redactVendorForPublic` serialization.
- All direct vendor phone numbers, email addresses, exact residential addresses, and raw bank details are stripped, routing all preliminary negotiations through BookMe's in-app communication channels.

---

## 10. Geospatial & Search Subsystem

1. **PostGIS & Spherical Haversine Fallback (ADR-014):**
   - Stores vendor base service locations as PostGIS `GEOMETRY(Point, 4326)`.
   - Radius searches execute spatial queries:
     ```sql
     SELECT * FROM vendors
     WHERE ST_DWithin(location_geog, ST_MakePoint($lon, $lat)::geography, $radius_meters);
     ```
   - In-memory mock engine calculates distance using the spherical Haversine formula:
     $$\Delta\sigma = 2 \arcsin \left( \sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos\phi_1 \cos\phi_2 \sin^2\left(\frac{\Delta\lambda}{2}\right)} \right)$$
     $$d = R \cdot \Delta\sigma$$

2. **Fuzzy Trigram Text Search (`pg_trgm`):**
   - High-performance, typo-tolerant search across 60 vendor categories, package names, and vendor brand titles using PostgreSQL trigram similarity indexes (`similarity(name, $query) > 0.3`).

---

## 11. Frontend Modular Architecture

The frontend is built with **React 18 and Vite**, architected into domain feature modules matching backend service boundaries:

```
frontend/src/
|-- features/
|   |-- auth/               # Login, Register, OTP verification, Token storage
|   |-- marketplace/        # Customer search, Category taxonomy (60 categories), Filters
|   |-- events-booking/     # Booking wizard, Negotiation UI, Surcharge calculator
|   |-- payments-reviews/   # Escrow checkout, Wallet balance, Double-blind review cards
|   `-- vendor/             # Vendor OS (Owned by Person B - Nandini)
|       |-- Dashboard.jsx   # Metrics, Leads, Revenue (Paise -> INR)
|       |-- Calendar.jsx    # Atomic slot capacity visualizer, Muhurat manager
|       |-- Packages.jsx    # Tiered package editor (Basic/Standard/Premium), GST slabs
|       |-- Gallery.jsx     # SHA-256 media uploader, Tagging, Regulated badge
|       `-- Discovery.jsx   # Public profile preview with PII redaction
|-- assets/                 # Icons, Logos, Styling
|-- App.jsx                 # Route dispatcher & feature navigation bar
`-- main.jsx                # DOM bootstrapping
```

---

## 12. Deployment Topology & DevOps

### Local Development Orchestration
- **PowerShell / Batch Runners:** `run-all.ps1` and `run-all.bat` spin up all microservices and the Vite frontend simultaneously in dedicated, labeled terminal windows.
- **Docker Compose (`docker-compose.yml`):** Multi-container specification provisioning 5 microservices alongside 5 isolated PostgreSQL 16 databases.

### Environment Variable Matrix (Key Settings)

| Variable | Target Services | Description |
| :--- | :--- | :--- |
| `PORT` | All Services | Service listener port (3001, 3002, 4003, 3004, 3005) |
| `DATABASE_URL` | All Services | PostgreSQL connection URI (`postgres://user:password@host:port/db`) |
| `RABBITMQ_URL` | All Services | AMQP connection string (`amqp://guest:guest@localhost:5672`) |
| `INTERNAL_API_KEY` | All Services | Secret key for internal service-to-service REST authorization |
| `JWT_SECRET` | `auth-service`, `vendor-service` | Signing secret for access and refresh tokens |
| `ENCRYPTION_KEY` | `vendor-service`, `payment-feedback-service` | 32-byte hexadecimal key for AES-256-GCM encryption at rest |
| `HMAC_BLIND_INDEX_KEY` | `vendor-service` | Dedicated secret key for deterministic blind indexing |

---

*Document maintained under version control in the BookMe repository. For implementation details and architectural decision records, consult [docs/DECISIONS.md](file:///c:/AI%20Coding%20Challenge%20Platform/BookMe/docs/DECISIONS.md) and [docs/SRS.md](file:///c:/AI%20Coding%20Challenge%20Platform/BookMe/docs/SRS.md).*
