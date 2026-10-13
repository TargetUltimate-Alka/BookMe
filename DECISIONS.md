# BookMe – Architectural & Contract Decisions

> See [`docs/DECISIONS.md`](./docs/DECISIONS.md) for the primary living document. This root copy is maintained in sync per SRS instructions.

**Status:** Living Document  
**Date:** October 13, 2026  
**Source of Truth:** [docs/SRS.md](./docs/SRS.md)

---

## Summary of Active Decisions
- **ADR-001**: Developer Ownership & Domain Division (`vendor-service` + `frontend/src/features/vendor` owned by Person B / Developer A contract domain).
- **ADR-002**: Modular Contract Architecture (OpenAPI 3.1 & AsyncAPI 3.0 in `contracts/`).
- **ADR-003**: Monetary Fields & Currency stored and computed as integer paise (`BIGINT`), with legacy INR fields exposed for V1 backward compatibility.
- **ADR-004**: Timestamps stored in UTC (`TIMESTAMPTZ`), formatted in IST (`Asia/Kolkata`) in UI.
- **ADR-005**: Idempotency & Replay Protection on mutating endpoints and capacity holds.
- **ADR-006**: Strict PII Masking & Privacy (`FR-COM-01`) — no phone, email, raw Aadhaar, PAN, or bank account numbers exposed in customer/public APIs.
- **ADR-007**: React Native mobile baseline + React/Vite web portal & admin panel.
- **ADR-008**: Licensed payment gateway escrow split model.
- **ADR-009**: DigiLocker KYC compliance — raw Aadhaar never stored; only reference, masked last 4 digits, verified name, and consent timestamp stored.
- **ADR-010**: Lead qualification (>=30s connected, customer-initiated, OTP-verified, 7-day deduplication, 10/day cap).
- **ADR-011**: Booking state machine transitions & timers.
- **ADR-012**: Backward-compatible schema evolution, reversible SQL migrations, and resilient in-memory fallback when PostgreSQL is offline.
- **ADR-013**: Regulated service categories flagged with `is_regulated` and compliance requirements.
- **ADR-014**: PostGIS & Haversine spherical distance + `pg_trgm` partial name search.
- **ADR-015**: External provider adapter boundary (`sandbox_adapter` in dev/test, strict configuration enforcement in production).
- **ADR-016**: Package publish eligibility (min 3 photos + 1 video, SHA-256 duplicate hash rejection across vendors, moderation queue).
- **ADR-017**: Atomic capacity reservation (`total_units - held_units - booked_units >= quantity`) and 50-parallel-request concurrency verification.
- **ADR-018**: Strict isolation and labelling of 500 synthetic demo vendors (`is_demo = true`, idempotent deterministic seeding).
