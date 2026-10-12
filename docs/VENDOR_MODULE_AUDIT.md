# Audit Report: BookMe Vendor Module

## 1. Existing Repository Overview
- **Structure**: Modular monolith using Node.js/Express (services) and React/Vite (frontend).
- **Core Technologies**: PostgreSQL (raw SQL via `pg`), JWT authentication (`auth-service`), RabbitMQ for events.
- **Vendor-related Code**: Located in `services/vendor-service/` and `frontend/src/features/vendor/`.
- **Database**: PostgreSQL is configured. Tables (`vendors`, `services`, `packages`, `availability`) and seed data are managed in `services/vendor-service/src/shared/initDb.js`.

## 2. Requirement Assessment
- **Implemented**: Basic CRUD for vendor, services, packages, and availability. Database schema exists.
- **Partially Implemented**: Seed data for basic vendors/services/packages/availability exists.
- **Missing/Needs Enhancement**:
    - **Scalability**: Data model needs enhancement to handle "one vendor hosting multiple service types" efficiently. Current `services` table might be insufficient if complex service variety is required.
    - **Demo Generation**: Need a mechanism for generating 500 demo vendors and 60 service types without conflict/duplication.
    - **Onboarding/Management**: Need concrete implementation of real vendor onboarding (registration, profile editing), enhanced package management (beyond simple CRUD), advanced availability calendar, and improved customer search.

## 3. Data Model Design Proposal
- **`vendors`**: Needs to stay as is, or be enhanced with `status` (active/pending/demo/...) to distinguish between Demo and Real.
- **`services`**: Currently tied 1:N to `vendors`. Recommend introducing a `service_categories` table to properly model "multiple service types" hosted by a single vendor.
- **`packages`**: Currently supports linking services via `service_ids` (array). This is acceptable but might need indexing or a mapping table (`package_services`) for complex queries.

## 4. Implementation Plan
1. **Phase 1: Environment & Tooling** - Setup scripts for demo data generation (using tools like `faker.js`). Ensure strict separation of demo vs. real records in DB/Queries.
2. **Phase 2: Vendor Module Enhancement** - Update database schema (or enhance current tables) to handle complex vendor profiles and diverse service offerings.
3. **Phase 3: Onboarding & Management** - Build UI/API for real vendor registration, profile editing, and package management.
4. **Phase 4: Availability & Search** - Implement advanced availability calendar logic and optimized customer search across vendor services/packages.

## 5. Blockers & Requirements
- **Blockers**: None immediately, but requires careful handling of schema migration to avoid breaking existing service/package logic.
- **Credentials**: None explicitly required unless using external validation APIs for vendor onboarding (e.g., identity verification services).

## Traceability Document (Initial)
| Requirement | Status | Implementation Plan |
| :--- | :--- | :--- |
| Demo Data Generation | Pending | Create seed script (500 vendors, 60 service types) |
| Real Vendor Onboarding | Pending | UI/API for registration & profile |
| Enhanced Service/Package | Partially Implemented | Refine schema/queries |
| Availability Management | Partially Implemented | Refine UI/Calendar component |
| Customer Search | Pending | Build search API |
