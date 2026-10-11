# BookMe — Authentication Service (`auth-service`)

Microservice owned by **Person A** for the **BookMe** Multi-Vendor Event Services Platform.

This microservice provides identity registration, secure authentication, JWT token issuance, refresh token rotation, user profile management, and internal user verification for cross-service communication.

---

## 1. Specifications

- **Service Port:** `3001` (Docker internal port: `3000`)
- **Database:** PostgreSQL (`auth_db` on isolated host port `5433`)
- **Authentication Scheme:** JSON Web Tokens (JWT) with standard Bearer authorization header
- **Access Token Expiry:** 900 seconds (15 minutes) as per contracts and SRS
- **Refresh Token Lifecycle:** 7 days, tracked in database with instant revocation upon logout
- **Inter-service Security:** `X-Internal-Key` shared secret header for `/internal/**` routes
- **Resilience:** Automatic in-memory mock fallback when local PostgreSQL is not active, allowing zero-friction native development and testing.

---

## 2. Environment Variables

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `3001` | HTTP port where service listens |
| `DATABASE_URL` | `postgres://user:password@localhost:5433/auth_db` | PostgreSQL connection string |
| `JWT_SECRET` | `bookme_dev_shared_jwt_secret_2026_supersecure_key` | Secret key used to sign and verify access tokens |
| `INTERNAL_API_KEY` | `dev-internal-key-123` | Secret shared key required for service-to-service internal lookups |
| `NODE_ENV` | `development` | Environment mode (`development`, `test`, `production`) |

---

## 3. How to Run Locally

### Option A: Native Node.js (Windows / Mac / Linux)
```powershell
cd services/auth-service
npm install
npm start
```
*Note: If PostgreSQL is not running locally, the service automatically engages resilient in-memory mode so all endpoints can be called and tested immediately.*

### Option B: Docker Compose
From the repository root:
```powershell
docker compose up --build auth-service auth-db
```
- Health Check: `http://localhost:3001/health`

---

## 4. How to Run Automated Tests

The service includes an exhaustive Supertest and Jest suite covering all contract rules, validation schemas, token lifecycles, and security checks:

```powershell
cd services/auth-service
npm test
```
*Result: 18 unit and integration tests passing.*

---

## 5. Token Structure & Cross-Service Consumption

All BookMe microservices adhere to the agreed JWT contract in `contracts/auth-service.md`:

### JWT Payload
```json
{
  "sub": "usr_abc123",
  "role": "customer",
  "iat": 1735200000,
  "exp": 1735200900
}
```

### Consumption by Other Services
1. **Direct Verification:** Other services (`event-booking-service`, `vendor-service`, `payment-feedback-service`) verify the JWT locally using the shared `JWT_SECRET` without querying the auth database directly.
2. **Gateway Forwarding:** In production, the API Gateway verifies the JWT and forwards identity via `X-User-Id` and `X-User-Role` headers.
3. **Internal Lookup:** When another service requires user profile attributes (e.g., customer name on a booking, vendor owner name), it calls:
   `GET http://localhost:3001/api/internal/users/:id` with header `X-Internal-Key: dev-internal-key-123`.

---

## 6. API Endpoints

### 6.1 Register User
- **Endpoint:** `POST /api/auth/register`
- **Body:**
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "password123",
    "role": "customer"
  }
  ```
- **Allowed Roles in V1:** `"customer"` or `"vendor"`. (Admin registration is rejected with HTTP 400).
- **Response (201 Created):**
  ```json
  {
    "id": "usr_k9x1z_3ab",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "customer",
    "createdAt": "2026-10-11T12:00:00.000Z"
  }
  ```

### 6.2 Login
- **Endpoint:** `POST /api/auth/login`
- **Body:**
  ```json
  {
    "email": "jane@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "4a7f9b8c...",
    "expiresIn": 900,
    "user": {
      "id": "usr_k9x1z_3ab",
      "name": "Jane Doe",
      "role": "customer"
    }
  }
  ```

### 6.3 Refresh Access Token
- **Endpoint:** `POST /api/auth/refresh`
- **Body:**
  ```json
  {
    "refreshToken": "4a7f9b8c..."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "accessToken": "eyJhbGciOi...",
    "expiresIn": 900
  }
  ```

### 6.4 Logout
- **Endpoint:** `POST /api/auth/logout`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body (Optional):** `{ "refreshToken": "4a7f9b8c..." }`
- **Response:** `204 No Content` (Revokes all refresh tokens).

### 6.5 Get Current Profile
- **Endpoint:** `GET /api/auth/me`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response (200 OK):** Full user profile without password hash.

### 6.6 Update Profile Name
- **Endpoint:** `PATCH /api/auth/me`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Body:** `{ "name": "Jane D. Doe" }`
- **Response (200 OK):** Updated user profile.

### 6.7 Internal User Lookup
- **Endpoint:** `GET /api/internal/users/:id`
- **Headers:** `X-Internal-Key: dev-internal-key-123`
- **Response (200 OK):** `{ "id": "usr_...", "name": "...", "email": "...", "role": "..." }`
