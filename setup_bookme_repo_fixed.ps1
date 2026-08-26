$ErrorActionPreference = "Stop"

Write-Host "Creating BookMe repo structure..." -ForegroundColor Cyan

# ---------------------------------------------------------------------------
# 1. Folders
# ---------------------------------------------------------------------------
$folders = @(
    "frontend/src/features/auth",
    "frontend/src/features/vendor",
    "frontend/src/features/events-booking",
    "frontend/src/features/payments-reviews",

    "services/auth-service/src/routes",
    "services/auth-service/src/controllers",
    "services/auth-service/src/models",
    "services/auth-service/src/repository",

    "services/vendor-service/src/modules/vendor/routes",
    "services/vendor-service/src/modules/vendor/controllers",
    "services/vendor-service/src/modules/vendor/repository",
    "services/vendor-service/src/modules/availability/routes",
    "services/vendor-service/src/modules/availability/controllers",
    "services/vendor-service/src/modules/availability/repository",
    "services/vendor-service/src/shared",

    "services/event-booking-service/src/modules/event",
    "services/event-booking-service/src/modules/booking",
    "services/event-booking-service/src/shared",

    "services/payment-feedback-service/src/modules/payment",
    "services/payment-feedback-service/src/modules/review",
    "services/payment-feedback-service/src/modules/complaint",
    "services/payment-feedback-service/src/shared",

    "contracts",
    "docs",
    ".github"
)

foreach ($f in $folders) {
    New-Item -ItemType Directory -Force -Path $f | Out-Null
}

# Git does not track empty folders - drop a .gitkeep in every leaf folder
# so the structure shows up on GitHub immediately for everyone.
foreach ($f in $folders) {
    $leaf = Join-Path $f ".gitkeep"
    if (-not (Test-Path $leaf)) {
        New-Item -ItemType File -Force -Path $leaf | Out-Null
    }
}

# ---------------------------------------------------------------------------
# 2. Per-service placeholder files (package.json, Dockerfile, .env.example)
# ---------------------------------------------------------------------------
$services = @{
    "auth-service"              = "Person A"
    "vendor-service"            = "Person B"
    "event-booking-service"     = "Person C"
    "payment-feedback-service"  = "Person D"
}

foreach ($svc in $services.Keys) {
    $owner = $services[$svc]
    $base  = "services/$svc"

    $pkgJson = @'
{
  "name": "__SVC__",
  "version": "1.0.0",
  "description": "BookMe __SVC__ - owned by __OWNER__",
  "main": "src/index.js",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "test": "echo \"no tests yet\" && exit 0"
  },
  "dependencies": {
    "express": "^4.19.2",
    "pg": "^8.11.5",
    "dotenv": "^16.4.5"
  }
}
'@
    $pkgJson = $pkgJson.Replace("__SVC__", $svc).Replace("__OWNER__", $owner)
    Set-Content -Path "$base/package.json" -Value $pkgJson -Encoding UTF8

    $dockerfile = @'
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
'@
    Set-Content -Path "$base/Dockerfile" -Value $dockerfile -Encoding UTF8

    $envExample = @'
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/__SVC___db
JWT_SECRET=change_me
'@
    $envExample = $envExample.Replace("__SVC__", $svc)
    Set-Content -Path "$base/.env.example" -Value $envExample -Encoding UTF8
}

# ---------------------------------------------------------------------------
# 3. Contract placeholders
# ---------------------------------------------------------------------------
foreach ($svc in $services.Keys) {
    $owner = $services[$svc]
    $contract = @'
# API Contract - __SVC__

Owner: __OWNER__

Agree on this BEFORE writing implementation code. For every endpoint:
method, path, request body, response JSON, status codes.

## Endpoints

### POST /example
- Request:
  ```json
  {}
  ```
- Response (200):
  ```json
  {}
  ```
'@
    $contract = $contract.Replace("__SVC__", $svc).Replace("__OWNER__", $owner)
    Set-Content -Path "contracts/$svc.md" -Value $contract -Encoding UTF8
}

# ---------------------------------------------------------------------------
# 4. docker-compose.yml (placeholder skeleton, fill in as services get built)
# ---------------------------------------------------------------------------
$dockerCompose = @'
version: "3.9"

services:
  auth-service:
    build: ./services/auth-service
    ports:
      - "3001:3000"
    env_file: ./services/auth-service/.env.example
    depends_on:
      - auth-db

  auth-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: auth_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5433:5432"

  vendor-service:
    build: ./services/vendor-service
    ports:
      - "3002:3000"
    env_file: ./services/vendor-service/.env.example
    depends_on:
      - vendor-db

  vendor-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vendor_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5434:5432"

  event-booking-service:
    build: ./services/event-booking-service
    ports:
      - "3003:3000"
    env_file: ./services/event-booking-service/.env.example
    depends_on:
      - event-booking-db

  event-booking-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: event_booking_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5435:5432"

  payment-feedback-service:
    build: ./services/payment-feedback-service
    ports:
      - "3004:3000"
    env_file: ./services/payment-feedback-service/.env.example
    depends_on:
      - payment-feedback-db

  payment-feedback-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: payment_feedback_db
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5436:5432"
'@
Set-Content -Path "docker-compose.yml" -Value $dockerCompose -Encoding UTF8

# ---------------------------------------------------------------------------
# 5. .github/CODEOWNERS
# ---------------------------------------------------------------------------
$codeowners = @'
/services/auth-service/                                 @personA
/services/vendor-service/src/modules/vendor/             @personB
/services/vendor-service/src/modules/availability/       @personB
/services/event-booking-service/src/modules/event/       @personC
/services/event-booking-service/src/modules/booking/     @personC
/services/payment-feedback-service/src/modules/payment/    @personD
/services/payment-feedback-service/src/modules/review/     @personD
/services/payment-feedback-service/src/modules/complaint/  @personD
/frontend/src/features/auth/                             @personA
/frontend/src/features/vendor/                           @personB
/frontend/src/features/events-booking/                   @personC
/frontend/src/features/payments-reviews/                 @personD
/contracts/                                               @personA @personB @personC @personD
/docker-compose.yml                                       @personA @personB @personC @personD
'@
Set-Content -Path ".github/CODEOWNERS" -Value $codeowners -Encoding UTF8

# ---------------------------------------------------------------------------
# 6. README.md
# ---------------------------------------------------------------------------
$readme = @'
# BookMe

AI-powered multi-vendor event service booking platform.

## Structure
- `frontend/` - React app, one feature folder per owner
- `services/` - 4 independent Node/Express services, one per owner
- `contracts/` - API contracts, agreed before implementation
- `docs/` - team playbook and repo maintenance guide

See `docs/BookMe_Repo_Maintenance_Guide.md` for ownership, conventions, and workflow.

## Run locally
```
docker compose up
```

## Conventions
- Branch naming: `feature/<service>-<module>-<short-desc>`
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- No direct pushes to `main` - branch, PR, 1 review, merge
- PRs that change an API shape must reference the contract doc
'@
Set-Content -Path "README.md" -Value $readme -Encoding UTF8

Write-Host "Done. Folder structure, placeholder files, contracts, docker-compose.yml, CODEOWNERS and README.md created." -ForegroundColor Green
Write-Host "Next: git add . ; git commit -m 'chore: scaffold repo structure' ; git push" -ForegroundColor Yellow
