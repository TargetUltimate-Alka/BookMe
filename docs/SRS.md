# BookMe – Software Requirements Specification

Version 1.0 · Status: Draft for implementation · Revenue model: per-lead fee only (no booking commission)

## 1. Introduction

### 1.1 Purpose

BookMe is a marketplace app that connects customers with event-service vendors (DJ, photography, catering, tent and decor, etc.). This SRS defines the requirements for fine-tuning the existing BookMe codebase. It is written for an AI coding agent (Antigravity) and for human reviewers.

### 1.2 Instructions for the implementing agent

- Audit the existing codebase first. For every requirement ID, record Keep / Modify / Build new. Do not rewrite modules that already work.
- Implement in the phases in Section 9. Each requirement has an ID and testable acceptance criteria (AC). Name tests after the requirement ID.
- Values marked CONFIG live in an admin-editable settings table, never hard-coded.
- Money is stored as integer paise. All timestamps are UTC, displayed in IST.
- When something is ambiguous, choose the safer option and record it in DECISIONS.md.

### 1.3 Definitions

- **Lead**: a billable vendor-customer call (FR-COM-04).
- **Package**: a vendor-defined bundle of service items at a price.
- **Deposit**: 40% of the agreed booking value. **Balance**: the remaining 60%.
- **Soft hold**: temporary reservation of package capacity while a request is pending.
- **Escrow**: customer funds held by the licensed payment gateway until the service is completed.
- **Lead credits (wallet)**: prepaid vendor balance used only to pay lead fees.

## 2. Overall Description

### 2.1 User roles

- **Customer**: searches, plans events, books, pays, reviews.
- **Vendor**: lists packages, manages availability, accepts bookings, pays lead fees.
- **Admin sub-roles**: Super Admin, Verifier, Support Agent, Finance Admin, Content Moderator (permissions in FR-ADM-01).

### 2.2 Constraints and assumptions

- No phone numbers, emails or other contact details are ever shown between customer and vendor.
- All customer money flows through a licensed payment gateway with marketplace or escrow support. BookMe does not hold customer funds itself.
- The vendor wallet is prepaid service credit for lead fees, not a stored-value wallet (see Section 7).
- Platforms: Android first, plus web admin panel, then iOS.

### 2.3 Business parameters (all CONFIG)

| Parameter | Default |
| --- | --- |
| Qualifying call | Connected, both parties on line, 30 seconds or more |
| Lead fee | ₹25 + GST per qualified lead (category override allowed) |
| Lead de-duplication | One billable lead per customer-vendor pair per 7 days |
| Customer billable-lead cap | 10 per day |
| Initial vendor top-up | ₹1,000 |
| Minimum wallet balance | ₹500 |
| Wallet alert thresholds | 150% of minimum (₹750) and 100% (₹500) |
| Low-balance grace period | 48 hours |
| Vendor response window | 12 hours (2 hours if event starts within 24 hours) |
| Counter-offers | Max 3 per booking, each valid 6 hours |
| Deposit | 40%, payable within 2 hours of vendor acceptance |
| Balance | 60%, due 48 hours before event start; if acceptance happens within 48 hours of the event, 100% is due at once |
| Free customer cancellation | Within 12 hours of confirmation, only if event is more than 7 days away |
| Vendor payout | 24 hours after completion if no dispute is open |
| Review window | 14 days after completion |
| Payment gateway fee | Shown to the customer as a separate line item |

### 2.4 Cancellation charges

Customer cancels (charge as % of booking value, capped at amount paid, remainder refunded):

| Time before event start | Customer charge |
| --- | --- |
| Free-cancel window (see 2.3) | 0% |
| More than 14 days | 0% |
| 7 to 14 days | 10% |
| 3 to 7 days | 25% |
| 1 to 3 days | 50% |
| Under 24 hours | 100% |

Vendor cancels (penalty as % of booking value, deducted from vendor wallet):

| Time before event start | Vendor penalty |
| --- | --- |
| More than 14 days | 20% |
| 7 to 14 days | 30% |
| 3 to 7 days | 50% |
| Under 3 days or no-show | 100% |

The customer always receives a full refund. 50% of any vendor penalty is credited to the customer as booking credit; the rest is retained by the platform.

## 3. Functional Requirements

### 3.1 Onboarding and verification (ONB)

- **FR-ONB-01** Customer registers with phone OTP and sets login credentials. *AC:* account is active only after OTP success; 5 failed OTPs lock the account for 15 minutes.
- **FR-ONB-02** Vendor registers with phone OTP, passport-size photo, service categories, service location (map pin and address) and service areas or radius. *AC:* a vendor cannot submit for review with any field missing.
- **FR-ONB-03** Vendor KYC through DigiLocker, plus PAN and bank account (penny-drop verified) for payouts. *AC:* the raw Aadhaar number is never stored; only the DigiLocker reference, name, masked last 4 digits, consent record and verification timestamp.
- **FR-ONB-04** Vendor e-signs the vendor agreement (rules, misuse, penalties, wallet minimum). *AC:* agreement version, timestamp and IP are stored; the vendor cannot go live without a signature on the current version.
- **FR-ONB-05** Customer accepts the damage-liability terms before the first booking. *AC:* booking is blocked until accepted; acceptance is logged.
- **FR-ONB-06** Verifier approves or rejects vendors with a mandatory reason. Statuses: DRAFT, SUBMITTED, UNDER\_REVIEW, APPROVED, REJECTED, SUSPENDED. *AC:* only APPROVED vendors with wallet at or above the minimum appear in search.

### 3.2 Vendor listing and availability (VEN)

- **FR-VEN-01** Vendor profile shows name, description, location, categories, media, ratings and all packages.
- **FR-VEN-02** Media rules: images JPG/PNG/WEBP up to 5 MB; videos MP4, 5 to 10 seconds (validated server-side), up to 20 MB. A package needs at least 3 photos and 1 video to be published. *AC:* uploads go to a moderation queue; exact-duplicate files already used by another vendor are rejected (hash check).
- **FR-VEN-03** Packages with tiers: name, category, tier (Basic, Standard, Premium), base price, pricing unit (per day, per hour, per plate, flat), inclusions list, guest range, duration, overtime rate, brand attributes. *Example:* ₹10,000 for 4 DJs with equipment; ₹50,000 for 10 DJs per day.
- **FR-VEN-04** Add-ons (extra hour, extra equipment, generator, delivery by distance slab), each with its own price.
- **FR-VEN-05** Discounts: percent or flat, scoped to package or vendor, with start/end dates, minimum order and optional code. *AC:* the discounted price and the original price are both displayed.
- **FR-VEN-06** Availability calendar with capacity per package per date (and optional time slots). *AC:* each confirmed booking decrements capacity atomically; two simultaneous requests for the last unit cannot both succeed.
- **FR-VEN-07** A package with zero remaining capacity on the requested date is not shown for that date. *AC:* a vendor with no matching available package is absent from results.
- **FR-VEN-08** From search results, the customer sees only the matching services and prices, and can open the vendor profile to see all other services.
- **FR-VEN-09** Optional refundable security deposit per package (CONFIG cap) for damage-prone items.
- **FR-VEN-10** At confirmation the booking stores a snapshot of price, discounts, tax and terms. *AC:* later vendor edits do not change existing bookings.
- **FR-VEN-11** Taxes: GST rate and HSN/SAC code per package; price shown inclusive or exclusive as configured.

### 3.3 Search (SRCH)

- **FR-SRCH-01** Search by vendor name (partial, case-insensitive).
- **FR-SRCH-02** Filter by date or date range (for example 2 Oct to 4 Oct).
- **FR-SRCH-03** Filters: category, rating, availability, brand, price range, discount available, location (event venue and radius within the vendor's service area).
- **FR-SRCH-04** Results show service, price and discount for matching packages only. Sort by relevance, rating, price, distance.
- **FR-SRCH-05** Empty results offer a Notify me action (links to FR-NOT-02).
- **FR-SRCH-06** *AC:* first page of results returns in under 2 seconds for the 95th percentile at 10,000 vendors.

### 3.4 Event planner (PLAN)

- **FR-PLAN-01** Customer creates an event: date or range, venue location, guest count, and a checklist of items (category, quantity, duration, optional brand).
- **FR-PLAN-02** For each item the system lists matching available packages and vendors.
- **FR-PLAN-03** A coverage summary shows which items are covered and which are not. *AC:* an item with no available vendor is flagged Not covered with a Notify me option.
- **FR-PLAN-04** Each checklist item becomes its own booking with its own vendor, deposit and 12-hour window, grouped under the event. *AC:* if one vendor rejects, only that item returns to Not covered and the customer is notified.

### 3.5 Booking (BKG)

- **FR-BKG-01** Customer submits a request for a package, date, quantity and add-ons. *AC:* state becomes REQUESTED and capacity is soft-held.
- **FR-BKG-02** The vendor accepts, rejects or counters within the response window. *AC:* on no response the request moves to EXPIRED, the hold is released, and the customer is notified and offered alternatives.
- **FR-BKG-03** Negotiation uses structured counter-offers in chat (max 3). *AC:* every price change is stored with who proposed it and when; the final agreed price is what the deposit uses.
- **FR-BKG-04** After acceptance the customer pays the deposit within 2 hours. *AC:* on payment the state becomes CONFIRMED; otherwise the hold is released and the state becomes EXPIRED.
- **FR-BKG-05** Delivery or self-pickup is chosen by the customer until the balance due date; the delivery fee is added to the balance.
- **FR-BKG-06** Urgent requests (event within a CONFIG threshold, default 48 hours) add a rush surcharge percentage (CONFIG, default 15%), shown before the customer commits.
- **FR-BKG-07** On event day the vendor taps Arrived (with location). *AC:* if there is no check-in 30 minutes after start, the customer and support are alerted; at 2 hours the booking becomes NO\_SHOW.
- **FR-BKG-08** The customer confirms completion, or the booking auto-completes 24 hours after the end time if no dispute is open.
- **FR-BKG-09** If stock is limited and the vendor cannot fulfil, the vendor rejects; the customer may also cancel under the free-cancel rule in Section 2.3.

### 3.6 Payments (PAY)

- **FR-PAY-01** All customer payments use a licensed gateway with marketplace or escrow features. No customer funds are held in BookMe's own accounts.
- **FR-PAY-02** Deposit (40%) and balance (60%) follow Section 2.3. *AC:* if the balance is unpaid at its due time, the customer is reminded at 24 hours and 6 hours before; after the due time the vendor may cancel with no penalty and the deposit is treated as a customer cancellation.
- **FR-PAY-03** Payout to the vendor 24 hours after COMPLETED, if no dispute is open.
- **FR-PAY-04** Refunds go to the original payment source per Section 2.4. *AC:* every refund has a ledger entry and a reason code.
- **FR-PAY-05** The gateway fee appears as a separate line item for the customer. The platform issues a GST invoice to the vendor for lead fees; the vendor remains responsible for service invoices.
- **FR-PAY-06** Damage claims: the vendor files a claim with evidence within 48 hours of completion; the customer may respond; a Support Agent decides; any security deposit is applied accordingly.

### 3.7 Cancellation (CAN)

- **FR-CAN-01** Customer cancellation applies the customer table in Section 2.4. The charge is shown before the customer confirms.
- **FR-CAN-02** Vendor cancellation applies the vendor table in Section 2.4; the penalty is deducted from the wallet. *AC:* if the wallet is insufficient, the shortfall is recorded as a vendor debt, the vendor is hidden from search until cleared, and the customer is notified immediately with alternative vendors suggested.
- **FR-CAN-03** Force majeure (illness, weather, government order) can be claimed with evidence; a Support Agent may waive charges. *AC:* the decision and reason are audit-logged.
- **FR-CAN-04** NO\_SHOW applies the vendor 100% penalty and full customer refund (FR-BKG-07).

### 3.8 Communication and lead billing (COM)

- **FR-COM-01** Customer and vendor communicate only through in-app chat and in-app VoIP. *AC:* no contact detail appears in any API response or screen.
- **FR-COM-02** Chat filters block phone numbers, emails, UPI IDs and links to external messaging apps (pattern match including spaced digits and number words). *AC:* the first attempt shows a warning; the third attempt in 30 days flags the account for admin review.
- **FR-COM-03** Voice calls and chat messages are rate-limited per user to prevent flooding.
- **FR-COM-04** A call is a qualified lead when: the call connects, both parties are on the line for 30 seconds or more, the customer initiated it, and the customer is OTP-verified. A chat is never billed. *AC:* the lead fee is deducted once per customer-vendor pair per 7 days.
- **FR-COM-05** Anti-spam rules: a customer is limited to 10 billable leads per day; the system flags patterns such as repeated short calls across many vendors, multiple accounts on one device, or calls started just past 30 seconds and ended immediately. Flagged leads are held and not billed until reviewed.
- **FR-COM-06** Vendors can dispute a lead within 48 hours with a reason. *AC:* an upheld dispute refunds the fee automatically and counts against the customer's trust score; three upheld disputes restrict the customer's calling.
- **FR-COM-07** Evidence: customers and vendors can attach images, videos and audio (up to 100 MB each, CONFIG) to a dispute or ticket. Evidence is kept for 12 months after the case closes, or 90 days with no case.
- **FR-COM-08** Call recording is off by default. If enabled, both parties must consent at the start of each call; recordings are kept 90 days unless a case is open.

### 3.9 Wallet (WAL)

- **FR-WAL-01** The vendor wallet is topped up via the gateway. The ledger is append-only, with no edits or deletes. *AC:* the balance always equals the sum of ledger entries.
- **FR-WAL-02** Each qualified lead creates a debit entry linked to the call ID.
- **FR-WAL-03** Alerts at 150% and 100% of the minimum, via push, SMS and email, including an estimated days-left figure based on the last 14 days of use. *AC:* alert sent once per threshold crossing.
- **FR-WAL-04** Below the minimum the vendor gets a 48-hour grace period, then is hidden from new searches. Existing confirmed bookings are always honoured. *AC:* topping up restores visibility within 1 minute.
- **FR-WAL-05** Wallet balance is prepaid credit usable only for lead fees and penalties; refund of unused balance only on account closure, after dues are cleared (subject to advisor confirmation, Section 7).

### 3.10 Reviews (REV)

- **FR-REV-01** A review is allowed only for a COMPLETED booking, once per booking, only after the service end time and within 14 days. Rating 1 to 5, text, up to 5 images.
- **FR-REV-02** The review form must not open before the booking is COMPLETED (strict rule). *AC:* the API rejects early submissions.
- **FR-REV-03** Vendors cannot edit or delete reviews. A vendor may post one public reply per review.
- **FR-REV-04** Anyone can report a review. A Content Moderator can remove abusive or fake reviews with a mandatory reason. *AC:* every removal writes an audit entry with moderator, time, reason and original text.

### 3.11 Support (SUP)

- **FR-SUP-01** The bot answers FAQs, booking status, refund status and cancellation charges, and can create a ticket. It never changes bookings or money.
- **FR-SUP-02** Escalation to a ticket occurs after 2 failed bot attempts, on dispute keywords, or when the user asks for a human.
- **FR-SUP-03** Ticket SLAs: first human response in 4 hours (30 minutes if the event is within 24 hours); resolution in 48 hours. Breaches alert the Super Admin.
- **FR-SUP-04** Users can request a callback; no admin phone number is displayed.
- **FR-SUP-05** Tickets are linked to bookings and keep full history. Both customers and vendors can raise tickets.

### 3.12 Admin (ADM)

- **FR-ADM-01** Role permissions:
  - Verifier: vendor KYC review.
  - Support Agent: tickets, disputes, damage claims, force majeure.
  - Finance Admin: refunds, payouts, wallet corrections, lead disputes.
  - Content Moderator: media and review moderation.
  - Super Admin: everything, plus configuration and role management.
- **FR-ADM-02** All admin actions write to an immutable audit log (who, what, when, before and after).
- **FR-ADM-03** A configuration screen edits every CONFIG value, with change history.
- **FR-ADM-04** Vendor enforcement ladder: warning, suspension, termination. Legal actions are recorded as case notes linked to the vendor agreement.

### 3.13 Notifications (NOT)

- **FR-NOT-01** Channels: push, SMS, email, with user preferences. Critical events (booking, payment, cancellation, no-show) cannot be disabled.
- **FR-NOT-02** Notify me: if a checklist item or searched package is unavailable, the customer is notified when capacity opens (vendor adds capacity, a booking is cancelled, or a new matching vendor joins). *AC:* the notice states that availability is not reserved; notifications expire after the event date and are capped at 3 per item per day.
- **FR-NOT-03** Events notified include request received, accepted, rejected, countered, expired, payment due and received, check-in, completion, refund and review reminder.

## 4. Data Model (key entities)

- **User**: id, role, phone (encrypted), email, password hash, status.
- **VendorProfile**: user\_id, business name, location (lat/long), service\_radius, kyc\_status, digilocker\_ref, aadhaar\_masked, pan\_ref, bank\_ref, agreement\_version, response\_score.
- **Category**: id, name, parent\_id.
- **Package**: id, vendor\_id, category\_id, tier, name, base\_price, unit, inclusions (JSON), guest\_min, guest\_max, duration, overtime\_rate, security\_deposit, gst\_rate, hsn\_sac, status.
- **PackageAddon**: id, package\_id, name, price, pricing\_basis.
- **Discount**: id, scope, scope\_id, type, value, start, end, min\_order, code.
- **AvailabilityCapacity**: package\_id, date, slot, total\_units, held\_units, booked\_units.
- **Event**: id, customer\_id, date\_from, date\_to, venue\_location, guests.
- **EventItem**: id, event\_id, category\_id, quantity, duration, brand, coverage\_status.
- **Booking**: id, event\_item\_id (nullable), customer\_id, vendor\_id, package\_id, state, quantity, price\_snapshot (JSON), agreed\_amount, deposit\_amount, balance\_amount, delivery\_mode, rush\_surcharge, timestamps.
- **CounterOffer**: id, booking\_id, proposer, amount, status, expires\_at.
- **Payment**: id, booking\_id, type (deposit, balance, refund, payout), amount, gateway\_ref, status.
- **WalletLedger**: id, vendor\_id, type (topup, lead\_fee, penalty, refund), amount, ref\_id, balance\_after, created\_at.
- **CallSession**: id, customer\_id, vendor\_id, start, connected\_seconds, billable, lead\_status.
- **Message**: id, booking\_id or thread\_id, sender\_id, body, filter\_flag.
- **Review**: id, booking\_id (unique), rating, text, media, status, vendor\_reply.
- **Ticket**: id, raiser\_id, booking\_id, priority, status, sla\_due, assignee.
- **NotifyRequest**: id, customer\_id, event\_item\_id or package\_id, date, status, expires\_at.
- **AuditLog**: id, actor\_id, action, entity, before, after, created\_at.
- **Config**: key, value, updated\_by, updated\_at.

## 5. Booking State Machine

| From | Trigger | To | Guard / effect |
| --- | --- | --- | --- |
| (none) | Customer requests | REQUESTED | Capacity soft-held |
| REQUESTED | Vendor accepts | ACCEPTED | Start 2-hour deposit timer |
| REQUESTED | Vendor counters | NEGOTIATING | Max 3 counters |
| NEGOTIATING | Either accepts counter | ACCEPTED | Price updated |
| REQUESTED / NEGOTIATING | Vendor rejects | REJECTED | Hold released |
| REQUESTED / NEGOTIATING | Response window ends | EXPIRED | Hold released, notify |
| ACCEPTED | Deposit paid | CONFIRMED | Capacity booked |
| ACCEPTED | Deposit timer ends | EXPIRED | Hold released |
| CONFIRMED | Customer cancels | CANCELLED\_BY\_CUSTOMER | Charge per 2.4 |
| CONFIRMED | Vendor cancels | CANCELLED\_BY\_VENDOR | Penalty per 2.4, full refund |
| CONFIRMED | Event start time | IN\_PROGRESS | Requires balance paid |
| CONFIRMED | Balance unpaid at due time | CANCELLED\_BY\_CUSTOMER | Treated as customer cancellation |
| IN\_PROGRESS | No check-in 2 hours after start | NO\_SHOW | 100% vendor penalty, full refund |
| IN\_PROGRESS | Customer confirms or 24h after end | COMPLETED | Payout scheduled |
| IN\_PROGRESS / COMPLETED | Dispute raised | DISPUTED | Payout paused |
| DISPUTED | Support decision | COMPLETED / CANCELLED\_BY\_VENDOR / CANCELLED\_BY\_CUSTOMER | Per ruling |
| COMPLETED | 14-day review window | REVIEWABLE then CLOSED | Review allowed |

## 6. Non-Functional Requirements

- **Platforms**: Android first, web admin panel, iOS later.
- **Languages**: English, Hindi, Gujarati (all user-facing strings externalised).
- **Performance**: search under 2 seconds (p95); API median under 400 ms; calls connect in under 5 seconds.
- **Low bandwidth**: compressed images, video thumbnails, offline-tolerant booking drafts.
- **Security**: TLS everywhere; encryption at rest for personal data; role-based access control; rate limiting; OWASP Top 10 checks; no card data stored.
- **Reliability**: 99.5% monthly uptime; daily backups; payment webhooks idempotent.
- **Observability**: structured logs, alerting on failed payments, webhook errors and SLA breaches.
- **Privacy**: consent logging, data retention per Section 4 and FR-COM-07/08, right to erasure subject to legal holds.

## 7. Compliance (confirm with a legal or compliance advisor before build)

- Adhar and PAN card varifiation (hashed data can be saved in db )
- Vendor wallet and escrow: confirm the structure against RBI rules on prepaid instruments and payment aggregators; prefer the gateway's licensed marketplace or escrow product.
- GST: platform GST invoice for lead fees; confirm any e-commerce operator tax-collection duty.
- Terms: enforceability of the customer damage clause and vendor penalties.
- Recording and evidence retention policies.

## 8. Out of Scope for v1

- Booking commission (not used).
- Vendor subscriptions or paid promotion.
- Withdrawal of wallet credit except on account closure.
- Automated AI verification of photos (manual moderation first).
- Multi-currency and international vendors.

## 9. Delivery Phases

1. **Phase 0 – Audit**: map the existing code to this SRS, produce the Keep / Modify / Build list and DECISIONS.md.
2. **Phase 1 – Foundation**: roles and permissions, config table, audit log, onboarding and KYC, vendor agreement.
3. **Phase 2 – Listings**: packages, add-ons, discounts, media, availability capacity.
4. **Phase 3 – Search and booking**: search filters, booking state machine, negotiation, payments, cancellation.
5. **Phase 4 – Communication and wallet**: in-app chat and calls, lead billing, anti-spam, wallet, alerts.
6. **Phase 5 – Trust and support**: reviews, bot, tickets, disputes, admin tooling.
7. **Phase 6 – Planner**: event checklist, coverage summary, notify-me.
8. **Phase 7 – Hardening**: performance, security review, localisation, load tests.

## 10. Open Items to Confirm

- Choice of payment gateway and VoIP provider.
- Who bears the gateway fee (default: customer, shown as a line item).
- Final lead fee, wallet minimum and cancellation percentages after a pilot.
- Advisor sign-off on Section 7.

## 11. Technical Architecture and Integrations

### 11.1 Technology stack

- **Frontend**: React with Vite (TypeScript recommended).
- **Backend**: Node.js with Express (TypeScript recommended).
- **Message queue**: RabbitMQ.
- **Database**: PostgreSQL.
- **Decision needed, mobile app**: Section 6 says Android first, but React with Vite produces a web app. Choose one: (a) React Native for a true Android and iOS app, reusing React skills; (b) Capacitor wrapping the existing Vite app; or (c) a PWA. Option (a) is recommended because in-app calling and push notifications are most reliable with native SDKs. Record the choice in DECISIONS.md before Phase 1.
- Keep new dependencies to a minimum. Do not replace the existing framework, ORM or folder structure; extend them.

### 11.2 Architecture style

A modular monolith: one Express API organised into modules that match Section 3 (onboarding, listings, search, booking, payments, communication, wallet, reviews, support, admin, notifications), plus separate worker processes that consume RabbitMQ queues. Modules talk through service interfaces and events, not by reading each other's tables, so any module can be split out later.

### 11.3 RabbitMQ usage

| Queue / exchange | Purpose | Requirements |
| --- | --- | --- |
| booking.deadlines | Vendor response window (12h/2h), deposit timer (2h), balance reminders, free-cancel window end, auto-complete (24h), review window (14d) | Delayed delivery |
| payments.webhooks | Gateway webhook events | Verify signature, store raw event, then enqueue; idempotent consumer |
| leads.billing | Call-ended events that may create a billable lead | Computes connected seconds, applies FR-COM-04 and FR-COM-05, debits wallet |
| notifications | Push, SMS and email sends | Retries with backoff, per-channel workers |
| notifyme.matching | Capacity-opened events matched against NotifyRequest rows | Rate-limited per FR-NOT-02 |
| media.moderation | New uploads awaiting checks | Updates the moderation queue |
| \*.dlq | Dead-letter queue for each queue above | Alert when depth is above zero |

Rules for every queue:

- Durable queues, persistent messages, manual acknowledgement, bounded retries with a dead-letter queue.
- Idempotent consumers: every message carries an idempotency key and handlers check it before acting.
- **Transactional outbox**: write the event to an outbox table in the same Postgres transaction as the state change, and a relay publishes it to RabbitMQ. This prevents a booking from changing without its event being sent.
- **Deadlines**: the source of truth is the timestamp column in Postgres (for example expires\_at), not the message. RabbitMQ delays use per-delay queues with TTL and dead-lettering, or the delayed-message plugin. A sweeper job runs every minute and handles anything overdue, so a lost message can never leave a booking stuck.

### 11.4 PostgreSQL guidelines

- Store money as BIGINT paise. Store timestamps as timestamptz.
- **Capacity**: update held and booked units in one atomic statement with a guard (total\_units minus held\_units minus booked\_units must be at least the requested quantity), plus a CHECK constraint so counts can never go negative. *AC:* a concurrency test with 50 parallel requests for the last unit confirms exactly one succeeds.
- **Wallet ledger**: append-only; revoke UPDATE and DELETE on the table for the application role; lock the vendor wallet row when debiting; keep balance\_after on each row.
- **Uniqueness**: one review per booking; one billable lead per customer-vendor pair per window; one payment per gateway reference.
- **Search**: PostGIS for radius and distance queries; pg\_trgm for vendor-name search; indexes on category, rating, price and date filters.
- **Sensitive fields**: phone numbers and KYC references encrypted (pgcrypto or application-level encryption).
- **Migrations**: versioned and reversible, using the migration tool already in the project.

### 11.5 Integration flows

- **Payments (licensed gateway with marketplace splits)**: create order, customer pays, webhook confirms, booking becomes CONFIRMED. Vendor share is transferred with settlement on hold and released 24 hours after COMPLETED; refunds and reversals follow Section 2.4. Verify every webhook signature and ignore duplicate events. Use the gateway's standard escrow-style mode, not a mode that settles straight to the platform account.
- **In-app calling**: the backend issues short-lived call tokens only to users who share an active conversation or booking. Provider webhooks and client join/leave events are both recorded; the server, not the app, computes connected seconds and publishes the call-ended event.
- **DigiLocker / KYC**: OAuth redirect flow with consent screen; the callback stores only the reference, name, masked last 4 digits and timestamp. Use a KYC aggregator until direct requester approval is granted.
- **OTP and SMS**: through a provider with DLT-registered sender ID and templates.
- **Push**: Firebase Cloud Messaging.
- **Maps**: geocoding and distance through a maps provider; cache results.
- **Media**: clients upload directly to object storage with pre-signed URLs after type and size checks; the backend then enqueues moderation.

### 11.6 Security implementation

- Short-lived access tokens with refresh tokens; role-based access control middleware on every route.
- Request validation on every endpoint (for example zod); helmet; CORS allow-list.
- Rate limiting on OTP, login, search, chat and call endpoints.
- Secrets only in environment variables or a secrets manager; never committed to the repository.
- Webhook endpoints accept only signed requests from the provider.

### 11.7 Environment configuration (names only)

DATABASE\_URL, RABBITMQ\_URL, JWT\_SECRET, PAYMENT\_KEY\_ID, PAYMENT\_KEY\_SECRET, PAYMENT\_WEBHOOK\_SECRET, VOIP\_APP\_ID, VOIP\_APP\_SECRET, DIGILOCKER\_CLIENT\_ID, DIGILOCKER\_CLIENT\_SECRET, SMS\_API\_KEY, SMS\_DLT\_SENDER\_ID, FCM\_SERVICE\_ACCOUNT, MAPS\_API\_KEY, STORAGE\_BUCKET, STORAGE\_ACCESS\_KEY.

### 11.8 Delivery and testing requirements

- Provide a docker-compose file that starts PostgreSQL and RabbitMQ locally for development and tests.
- Unit tests for the booking state machine (every row in Section 5), cancellation charge calculation, and lead qualification.
- Integration tests for payment webhooks (including duplicates and out-of-order events), capacity concurrency, and wallet debits.
- Each test name includes its requirement ID.
- A health-check endpoint reports the status of PostgreSQL and RabbitMQ.
