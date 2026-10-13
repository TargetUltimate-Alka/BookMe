# BookMe

AI-powered multi-vendor event service booking platform.

## Structure
- `frontend/` - React app, one feature folder per owner
- `services/` - 5 independent Node/Express microservices (auth, vendor, event-booking, payment-feedback, admin)
- `contracts/` - API contracts, agreed before implementation
- `docs/` - team playbook, SRS, and repo maintenance guide

See `docs/BookMe_Repo_Maintenance_Guide.md` for ownership, conventions, and workflow.

## Run locally

### Option A: 1-Click Launch (Recommended for Windows)
Double-click `run-all.bat` or in PowerShell run:
```powershell
.\run-all.ps1
```
This automatically launches all 4 microservices and the Vite frontend in dedicated terminal windows.

### Option B: Run Services Manually (Separate Terminals)
Open a terminal for each service:
1. **Auth Service** (Port 3001):
   ```powershell
   cd services/auth-service
   npm start
   ```
2. **Vendor Service** (Port 3002):
   ```powershell
   cd services/vendor-service
   npm start
   ```
3. **Event Booking Service** (Port 4003):
   ```powershell
   cd services/event-booking-service
   npm start
   ```
4. **Payment & Feedback Service** (Port 3004):
   ```powershell
   cd services/payment-feedback-service
   npm start
   ```
5. **Admin Service** (Port 3005):
   ```powershell
   cd services/admin-service
   npm start
   ```
6. **Frontend UI** (Port 5173):
   ```powershell
   cd frontend
   npm run dev
   ```

*Note: All microservices include automatic in-memory mock fallbacks, so they will boot and communicate even without local PostgreSQL or RabbitMQ instances running.*

### Option C: Docker Compose (If Docker Desktop is installed)
```bash
docker compose up --build
```


## Conventions
- Branch naming: `feature/<service>-<module>-<short-desc>`
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- No direct pushes to `main` - branch, PR, 1 review, merge
- PRs that change an API shape must reference the contract doc
