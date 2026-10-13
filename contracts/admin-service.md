# API Contract — `admin-service`

**Service:** `admin-service`  
**Owner:** Platform Ops / Admin  
**Port:** `3005` (Docker: `3005:3000`)  
**Base Path:** `/admin`, `/api/admin`, `/v1/admin`  
**Specification:** OpenAPI 3.1 (`contracts/openapi/admin.yaml`)  
**Requirements:** FR-ADM-01..04, SRS §2.1, §2.3, §3.12  

---

## 1. Endpoints

### 1.1 List Admin Users
- **Method & Path:** `GET /admin/users`
- **Roles:** `superAdmin`
- **Query Params:** `role` (optional), `limit` (default 50), `cursor`
- **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "usr_superadmin_01",
        "name": "Super Administrator",
        "email": "admin@bookme.com",
        "roles": ["superAdmin"],
        "status": "ACTIVE"
      }
    ],
    "meta": { "total": 5, "nextCursor": null }
  }
  ```

### 1.2 Update User Roles
- **Method & Path:** `PATCH /admin/users/:id/roles`
- **Roles:** `superAdmin`
- **Request Body:**
  ```json
  {
    "roles": ["supportAgent", "contentModerator"]
  }
  ```
- **Response (200 OK):** Updated user object with revised roles array.

### 1.3 Query Immutable Audit Trail
- **Method & Path:** `GET /admin/audit-logs`
- **Roles:** `superAdmin`, `supportAgent`, `financeAdmin`, `verifier`
- **Query Params:** `entity`, `actorId`, `limit`, `cursor`
- **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "aud_17392819_abc",
        "actorId": "usr_superadmin_01",
        "action": "CONFIG_UPDATE",
        "entity": "Config",
        "entityId": "LEAD_FEE_PAISE",
        "beforeState": { "value": "2500" },
        "afterState": { "value": "3000", "changeReason": "Festive season revised lead fee." },
        "timestamp": "2026-10-13T14:41:00.000Z"
      }
    ],
    "meta": { "total": 1, "nextCursor": null }
  }
  ```

### 1.4 Dynamic Config Editor
- **Method & Path:** `GET /admin/configs`
- **Roles:** `superAdmin`, `financeAdmin`
- **Response (200 OK):** Array of all 20+ SRS §2.3 parameter objects with defaults and descriptions.

- **Method & Path:** `PATCH /admin/configs/:key`
- **Roles:** `superAdmin`
- **Request Body:**
  ```json
  {
    "value": "3000",
    "changeReason": "Revised festival season lead pricing."
  }
  ```
- **Response (200 OK):** Updated config object. Writes to `admin_config_history` and `admin_audit_logs`.

- **Method & Path:** `GET /admin/configs/:key/history`
- **Roles:** `superAdmin`
- **Response (200 OK):** Array of historical changes for the requested configuration parameter.

### 1.5 Vendor Enforcement Ladder
- **Method & Path:** `POST /admin/vendors/:id/enforcement`
- **Roles:** `superAdmin`, `supportAgent`
- **Request Body:**
  ```json
  {
    "action": "WARNING",
    "reason": "Off-platform contact sharing attempt.",
    "caseNotes": "First offense warning issued per clause 7."
  }
  ```
- **Allowed Actions:** `WARNING`, `SUSPENSION`, `TERMINATION`
- **Response (200 OK):** Enforcement record with timestamp.

### 1.6 Unified Moderation Queue
- **Method & Path:** `GET /admin/moderation/queue`
- **Roles:** `contentModerator`, `superAdmin`, `verifier`
- **Query Params:** `type` (`MEDIA` | `REVIEW`), `limit`, `cursor`
- **Response (200 OK):** Items pending moderation.

- **Method & Path:** `POST /admin/moderation/:id/action`
- **Roles:** `contentModerator`, `superAdmin`
- **Request Body:**
  ```json
  {
    "decision": "APPROVED",
    "reason": "Verified meets platform content policy."
  }
  ```
