# API Contract — auth-service

Owner: Person A

Agree on this BEFORE writing implementation code. This is a draft to review as a
group — change anything, but once agreed, treat it as frozen unless you go
through the "shared contract change" process in the playbook.

Base path: `/api/auth`

---

### POST /register
Create a new user. `role` determines whether a matching vendor profile needs
to be created later via vendor-service (auth-service does NOT create it).
> **Security note (V1):** `POST /register` only accepts `role: "customer"`
> or `"vendor"`. Admin is out of scope for V1 — no admin login, no admin
> role, no admin service. Endpoints marked "Admin-only" elsewhere in the
> contracts are unprotected/unused in V1 and will be gated once
> admin-service is added in V2.

- Request:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "plaintext-sent-over-https",
    "role": "customer" // "customer" | "vendor" | "admin"
  }
  ```
- Response (201):
  ```json
  {
    "id": "usr_123",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "customer",
    "createdAt": "2026-08-26T10:00:00Z"
  }
  ```
- Errors: 400 (validation), 409 (email already registered)

### POST /login
- Request:
  ```json
  { "email": "jane@example.com", "password": "..." }
  ```
- Response (200):
  ```json
  {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 900,
    "user": { "id": "usr_123", "name": "Jane Doe", "role": "customer" }
  }
  ```
- Errors: 401 (bad credentials)

### POST /refresh
- Request:
  ```json
  { "refreshToken": "eyJ..." }
  ```
- Response (200):
  ```json
  { "accessToken": "eyJ...", "expiresIn": 900 }
  ```
- Errors: 401 (expired/invalid refresh token)

### POST /logout
- Request: (Bearer token in `Authorization` header, empty body)
- Response (204): no content

### GET /me
- Request: (Bearer token in `Authorization` header)
- Response (200):
  ```json
  {
    "id": "usr_123",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "customer",
    "createdAt": "2026-08-26T10:00:00Z"
  }
  ```
- Errors: 401

### PATCH /me
- Request:
  ```json
  { "name": "Jane D. Doe" }
  ```
- Response (200): updated user object (same shape as GET /me)
- Errors: 401, 400

---

## Contract for OTHER services to consume

Other services never touch the auth DB directly. They verify identity by
validating the JWT locally (shared `JWT_SECRET` from `.env`) and trust the
`sub` (user id) and `role` claims inside it. If a service needs more user
info than the JWT carries (e.g. `name`, `email`), it should call:

### GET /internal/users/:id
- Response (200):
  ```json
  { "id": "usr_123", "name": "Jane Doe", "email": "jane@example.com", "role": "vendor" }
  ```
- Used by: vendor-service (to show owner name), event-booking-service (to show
  customer name on a booking), payment-feedback-service (to attach reviewer name)

## JWT payload shape (all services must agree on this)
```json
{
  "sub": "usr_123",
  "role": "customer",
  "iat": 1735200000,
  "exp": 1735200900
}
```
