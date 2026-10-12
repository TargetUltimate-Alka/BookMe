# Contracts Changelog

All notable changes to the BookMe API and Event Contracts will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.0.0] - 2026-10-13

### Added
- Standardized OpenAPI 3.1 definitions partitioned into 14 domains + 1 shared model file:
  - `common.yaml`: Standard error envelopes, integer paise currency schemas, cursor pagination, RBAC definitions.
  - `identity.yaml`: Phone OTP authentication, user registration, token management, agreements acceptance.
  - `vendor.yaml`: Vendor onboarding, DigiLocker OAuth references, PAN & bank verification, agreement e-sign, verification workflow.
  - `catalog.yaml`: Category tree, packages with tiers (Basic, Standard, Premium), unit pricing, add-ons, discounts, pre-signed media upload with duplicate hash check.
  - `availability.yaml`: Package-level capacity counting (totalUnits, heldUnits, bookedUnits), atomic decrements, bulk slot configuration.
  - `search.yaml`: PostGIS radius search, multi-factor filtering (price paise, ratings, brands, discounts), matching packages extraction.
  - `planner.yaml`: Event checklist requirements, matching vendor recommendations, coverage summary, and Notify-Me alerts.
  - `booking.yaml`: 9-state booking state machine with atomic soft holds, structured counter-offers (max 3), rush surcharges, vendor GPS check-in, cancellation charge ladders, disputes.
  - `payment.yaml`: Gateway escrow orders (Deposit 40% & Balance 60%), signature-verified webhooks, refunds, damage claims within 48h, payouts.
  - `wallet.yaml`: Prepaid vendor wallet with immutable append-only ledger, low-balance alerts (150% and 100%), lead dispute resolution.
  - `communication.yaml`: In-app messaging with regex PII filters & strikes, short-lived VoIP tokens, call duration calculation, lead qualification.
  - `review.yaml`: 14-day post-completion review window, 1-5 ratings, photo attachments, vendor public reply, content moderation.
  - `support.yaml`: FAQ bot with automatic ticket escalation, ticket SLAs (4h first response, 30m urgent, 48h resolution), callback requests.
  - `admin.yaml`: Super Admin user & role management, immutable audit trail querying, dynamic CONFIG parameters editor, vendor enforcement ladder.
  - `notification.yaml`: FCM device token registration, notification preferences, in-app notification inbox.
- Standardized AsyncAPI 3.0 event schemas under `events/`:
  - `envelope.schema.json`: Standard CloudEvents-style message envelope.
  - 9 domain event contracts mapped to RabbitMQ topic exchange `bookme.events` and specific queues (`booking.deadlines`, `payments.webhooks`, `leads.billing`, `notifications`, `notifyme.matching`, `media.moderation`).
- `traceability.md`: Complete matrix mapping every `FR-*` requirement ID in `docs/SRS.md` to contract operations and events.
