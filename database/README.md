# BookMe Database Schema & Migrations

This folder contains the complete, consolidated PostgreSQL database schema for the BookMe multi-vendor event booking platform.

## 📁 Files
- **`schema.sql`**: Consolidated PostgreSQL DDL for all 5 microservices (`auth_db`, `vendor_db`, `event_booking_db`, `payment_feedback_db`, `admin_db`).
- **`BookMe_Complete_Database_Schema.sql`**: Full production-ready backup script with comments, indexes, and constraints.

## 🚀 How to Execute

### Option 1: Run via PostgreSQL CLI (psql)
```bash
psql -U postgres -d postgres -f database/schema.sql
```

### Option 2: Run via Docker Compose
All 5 isolated PostgreSQL containers are pre-configured in `docker-compose.yml`:
```bash
docker compose up -d
```

### Option 3: Resilient In-Memory Mode
If local PostgreSQL is offline, all BookMe microservices automatically fallback to `inMemoryStore.js` with zero server crashes.
