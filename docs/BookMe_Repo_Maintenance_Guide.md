# BookMe — Repo Structure & Maintenance Guide

This extends the Team Playbook's 4-service plan with the **module-level
separation** discussed earlier, so today's 4 services can become 6–8 later
without rewriting business logic. Follow this as-is; it's meant to be handed
to all 4 members on Day 0.

---

## 1. Ownership map

| # | Service | Contains | Owner |
|---|---------|----------|-------|
| 1 | `auth-service` | Login/register, JWT, roles, user profile | **Person A** |
| 2 | `vendor-service` | Vendor profile, verification, services, packages, **availability** | **Person B** |
| 3 | `event-booking-service` | Create event, dashboard, budget, checklist, booking lifecycle | **Person C** |
| 4 | `payment-feedback-service` | Payment, payout, **reviews**, **complaints** | **Person D** |

Same as the playbook — nothing changes here. What changes is *how each
person organizes the inside* of their service.

---

## 2. Repo skeleton

```
bookme/
├── frontend/                        # React app
│   └── src/features/
│       ├── auth/                    # Person A
│       ├── vendor/                  # Person B
│       ├── events-booking/          # Person C
│       └── payments-reviews/        # Person D
│
├── services/
│   ├── auth-service/                # Person A — flat, single domain
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── controllers/
│   │   │   ├── models/
│   │   │   └── repository/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── vendor-service/              # Person B — TWO internal modules
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── vendor/          # profile, verification, services, packages
│   │   │   │   │   ├── routes/
│   │   │   │   │   ├── controllers/
│   │   │   │   │   └── repository/  # only this touches the vendors/services/packages tables
│   │   │   │   └── availability/    # calendar, blocked/available dates
│   │   │   │       ├── routes/
│   │   │   │       ├── controllers/
│   │   │   │       └── repository/  # only this touches the availability table
│   │   │   └── shared/              # DB connection, middleware, error handlers
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   ├── event-booking-service/       # Person C — TWO internal modules
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── event/           # event, budget, checklist
│   │   │   │   └── booking/         # booking lifecycle, status transitions
│   │   │   └── shared/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── .env.example
│   │
│   └── payment-feedback-service/    # Person D — THREE internal modules
│       ├── src/
│       │   ├── modules/
│       │   │   ├── payment/         # payment, payout, transactions
│       │   │   ├── review/          # ratings, reviews
│       │   │   └── complaint/       # complaints, resolutions
│       │   └── shared/
│       ├── package.json
│       ├── Dockerfile
│       └── .env.example
│
├── contracts/                       # API specs — written BEFORE code
│   ├── auth-service.md
│   ├── vendor-service.md
│   ├── event-booking-service.md
│   └── payment-feedback-service.md
│
├── docs/
├── docker-compose.yml               # one placeholder container + DB per service
└── README.md
```

**The rule that makes future splitting painless:** every module gets its
own DB table(s), and only that module's `repository/` folder is allowed to
query those tables. If `booking` needs vendor-availability data, it calls
`availability`'s controller function directly (in-process) — it never writes
a SQL join across `bookings` and `availability`. That one discipline is the
entire difference between "split later = move a folder" and "split later =
rewrite the query layer."

---

## 3. Day 0 checklist (all 4 together, 1–2 hrs)

1. Create the GitHub repo (monorepo), add all 4 as collaborators.
2. Scaffold the folder tree above — empty folders are fine.
3. Write `docker-compose.yml` with one placeholder container + Postgres
   instance per service (even before code exists).
4. Each person drafts their service's API contract in `contracts/` —
   method, path, request body, response JSON, status codes. Group reviews
   and signs off together before anyone writes implementation code.
5. Set branch protection on `main`: no direct pushes, PRs required, ≥1
   approving review.
6. Add a `CODEOWNERS` file (below).
7. Build the frontend shell (routing, layout, auth context, shared UI
   components) together — this is the one piece that's genuinely shared.
8. Create a GitHub Project board: Backlog → To Do → In Progress → Review →
   Done. One card per feature, assigned to its owner.

### `.github/CODEOWNERS`

```
/services/auth-service/                          @personA
/services/vendor-service/modules/vendor/         @personB
/services/vendor-service/modules/availability/   @personB
/services/event-booking-service/modules/event/   @personC
/services/event-booking-service/modules/booking/ @personC
/services/payment-feedback-service/modules/payment/    @personD
/services/payment-feedback-service/modules/review/     @personD
/services/payment-feedback-service/modules/complaint/  @personD
/frontend/src/features/auth/                     @personA
/frontend/src/features/vendor/                   @personB
/frontend/src/features/events-booking/           @personC
/frontend/src/features/payments-reviews/         @personD
/contracts/                                       @personA @personB @personC @personD
/docker-compose.yml                               @personA @personB @personC @personD
```

Module-level CODEOWNERS (not just service-level) means even within Person
B's own service, a PR touching `availability/` vs `vendor/` is still
scoped correctly if you ever want a second reviewer on just that module.

---

## 4. Conventions (put in README, agree once, never revisit)

- **Branch naming:** `feature/<service>-<module>-<short-desc>`
  e.g. `feature/vendor-availability-calendar-crud`
- **Commit style:** Conventional Commits — `feat:`, `fix:`, `chore:`, `docs:`
- **PR rule:** if it changes an API shape, the PR must reference the
  contract doc; contract changes get a sign-off from the affected owner
  before implementation.
- **No cross-module DB access**, even within your own service (see §2).
- **Main stays runnable** — merge only working code; use feature branches
  for anything in progress.

---

## 5. Weekly rhythm

- 10–15 min standup every day or every other day (what you did / doing /
  blockers) — catches integration drift early.
- Once a week: `docker compose up` with everyone's latest `main` merged,
  click through the full flow end-to-end together.
- Tag milestones (`v0.1-mvp-auth-vendor`, etc.) for your submission/demo
  checkpoints.

---

## 6. When you actually split a module into its own service (V2/V3)

Because you kept module boundaries clean from day one, this becomes:

1. Move `modules/availability/` (or `review/`, `complaint/`) into a new
   `services/availability-service/` folder.
2. Point its DB connection at a new Postgres instance instead of the
   shared one.
3. Replace the in-process function calls from other modules with HTTP
   calls to the new service's API — same request/response shape as the
   internal call already had, so callers barely change.
4. Add it to `docker-compose.yml` and the API Gateway routing.
5. Update `contracts/` and `CODEOWNERS`.

No business logic gets rewritten — only how modules talk to each other.
