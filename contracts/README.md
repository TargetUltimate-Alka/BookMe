# BookMe API & Event Contracts

Welcome to the central API and event contracts repository for **BookMe**, a microservices marketplace connecting customers with event-service vendors (DJs, photography, catering, tent & decor, etc.).

---

## 1. Governance & Ownership

To allow parallel service development by two engineers, domain ownership is partitioned as follows:

| Owner | Sub-domains Covered | Corresponding Microservices |
|---|---|---|
| **Developer A (`x-owner: "A"`)** | `identity`, `vendor`, `catalog`, `availability`, `search`, `planner`, `booking` | `auth-service`, `vendor-service`, `event-booking-service` (planner & booking state machine) |
| **Developer B (`x-owner: "B"`)** | `payment`, `wallet`, `communication`, `review`, `support`, `admin`, `notification` | `payment-feedback-service` (escrow, payouts, append-only ledger, chat/VoIP, tickets, admin, notifications) |

---

## 2. Global Conventions

1. **Specification Standards:**
   - REST APIs: **OpenAPI 3.1**, base path `/v1`, Content-Type `application/json`.
   - Asynchronous Events: **AsyncAPI 3.0** with JSON Schema payloads.
2. **Monetary Units:**
   - All financial amounts MUST be stored and transmitted as **integer paise** (1 INR = 100 paise).
   - Field names MUST end with `Paise` (e.g. `basePricePaise`, `depositAmountPaise`, `walletBalancePaise`, `leadFeePaise`).
3. **Timestamps & Dates:**
   - All timestamps MUST be ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
   - Dates without time components MUST be `YYYY-MM-DD`.
4. **Authentication & RBAC:**
   - HTTP Bearer JWT authentication on all protected endpoints.
   - Every operation explicitly specifies allowed roles via the `x-roles` extension:
     - `anonymous`: Public access.
     - `customer`: Authenticated customer.
     - `vendor`: Authenticated vendor.
     - `admin`: Super admin or specialized sub-roles: `superAdmin`, `verifier`, `supportAgent`, `financeAdmin`, `contentModerator`.
     - `internal`: Microservice-to-microservice calls authenticated via internal network / `X-Internal-Key`.
5. **Standard Error Envelope:**
   All error responses return:
   ```json
   {
     "code": "CAPACITY_UNAVAILABLE",
     "message": "Selected package has zero remaining units for this date",
     "details": [
       { "field": "packageId", "issue": "No capacity remaining" }
     ],
     "traceId": "req_01J9X4Y..."
   }
   ```
6. **Cursor-based Pagination:**
   All list endpoints accept `limit` and `cursor` query parameters and return `nextCursor` and `hasMore`.
7. **Idempotency:**
   All mutating POST endpoints creating bookings, payments, refunds, wallet transactions, or payouts require an `Idempotency-Key` header.
8. **PII Masking (FR-COM-01):**
   No customer or vendor phone numbers or email addresses are ever exposed to the other party in any response.

---

## 3. How to Propose Contract Changes

1. Open a pull request targeting `/contracts`.
2. Do not modify existing fields in a breaking way; append new optional fields or add new endpoints.
3. Every operation MUST maintain:
   - `operationId`
   - `summary`
   - `tags`
   - `x-requirement-ids` (mapped to `FR-*` IDs in `docs/SRS.md`)
   - `x-owner` ("A" or "B")
   - `x-change` (`new`, `modified`, or `deprecated`)
4. Run validation before committing:
   ```bash
   npm run contracts:lint
   ```
5. Update `CHANGELOG.md` with semantic versioning.

---

## 4. Mocking with Prism

You can run local mock servers for independent frontend or service testing:
```bash
npx @stoplight/prism-cli mock openapi/booking.yaml -p 4010
```
