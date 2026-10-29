# Goviya Plus — AI Smart Farm Records & Crop Advisory Platform

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://www.docker.com/)

**Goviya Plus** is a privacy-first, bilingual smart farm recording and agricultural extension advisory platform engineered specifically for Sri Lankan agriculture. It empowers farmers to maintain immutable crop cycle journals, safely share field records with certified extension officers, and receive AI-grounded visit briefings—all under strict data governance rules.

---

## Architecture & Technology Stack

- **Frontend:** Next.js 14 App Router, TypeScript, Tailwind CSS, Zustand, Lucide React, and multi-language support (English, Sinhala, Tamil).
- **Backend API:** Node.js 20, Express, TypeScript, Zod validation, Argon2 password hashing.
- **Database:** PostgreSQL 16 with raw parameterized SQL (`node-pg`) and immutable append-only audit journals.
- **Containerization:** Multi-stage Dockerfiles and Docker Compose orchestration with automated healthchecks.

---

## Port Allocation

| Service | Port | Local URL | Description |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | `3000` | [http://localhost:3000](http://localhost:3000) | Next.js responsive web application |
| **Backend API** | `5000` | [http://localhost:5000/api](http://localhost:5000/api) | Express REST API |
| **API Documentation** | `5000` | [http://localhost:5000/api/docs](http://localhost:5000/api/docs) | Swagger UI / OpenAPI specification |
| **PostgreSQL DB** | `5432` | `localhost:5432` | PostgreSQL 16 database |

---

## Quick Start with Docker Compose

Ensure Docker and Docker Compose are installed and running.

### 1. Build and Start All Services
```bash
# Clean up any existing containers or volumes
docker compose down -v

# Build and start database, backend, and frontend containers in detached mode
docker compose up --build -d
```

### 2. Seed Demo Data (Optional)
Migrations run automatically on startup. To seed demo accounts and sample data:
```bash
docker compose exec backend npm run seed
```
The seed is **idempotent** — it can be re-run safely without duplicating data.

### 3. Verify Service Health
```bash
docker compose ps
```
All three services (`goviya_postgres`, `goviya_backend`, and `goviya_frontend`) will transition to `healthy`:
```text
NAME                IMAGE                  COMMAND                  SERVICE    STATUS
goviya_backend      ai-smart-farm-backend  "node dist/server.js"    backend    Up (healthy)
goviya_frontend     ai-smart-farm-frontend "node server.js"         frontend   Up (healthy)
goviya_postgres     postgres:16-alpine     "docker-entrypoint.s…"   db         Up (healthy)
```

### 4. Stop All Services
```bash
# Stop containers and preserve database volume
docker compose down

# Stop containers and delete database volume for a clean state
docker compose down -v
```

---

## Seeded Demo Accounts

The database comes pre-seeded with authenticated accounts representing each role in the system.

**Default Password for all accounts:** `DemoUser@2026!`

| Role | Name | Email | Status / Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | Nalaka Admin | `admin@goviya.lk` | Full administration of user accounts and audit metadata. Cannot view private farm records. |
| **Officer** | Aruna Wickramasinghe | `aruna.officer@goviya.lk` | Certified officer (Paddy & Grain Legumes). Has active share access to demo plots. |
| **Officer** | Chathuri Jayasuriya | `chathuri.officer@goviya.lk` | Certified officer (Horticulture & Organic Farming). Has expired share test records. |
| **Officer** | Kavinda Senanayake | `kavinda.officer@goviya.lk` | Pending officer verification queue in admin portal. Cannot receive shares until verified. |
| **Farmer** | Sunil Bandara | `sunil.farmer@goviya.lk` | Primary demo farmer with 2 plots (Maha Ela Paddy, Kandy Valley), active crop cycles, and photo logs. |
| **Farmer** | Anula Kumari | `anula.farmer@goviya.lk` | Secondary demo farmer with high-value vegetable plots in Nuwara Eliya. |

---

## Local Development (Manual Setup)

If running outside Docker:

### Prerequisites
- Node.js 20+
- PostgreSQL 16 running on `localhost:5432` with user `goviya_user`, password `goviya_password`, database `goviya_plus_db`

### 1. Environment Configuration
Copy `.env.example` to `.env` in both root and backend:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run build
npm run migrate:dev    # or: npm run migrate (requires prior build)
npm run seed:dev       # or: npm run seed (requires prior build)
npm run dev
```
The backend API starts on `http://localhost:5000/api`.

### 3. Frontend Setup
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
The frontend starts on `http://localhost:3000`.

---

## Non-Negotiable Security Boundaries

1. **Admin Privacy Boundary (AGENTS.md Rule 2):**
   - Administrators can NEVER access farm records, activity logs, input applications, harvests, or crop photos.
   - Admin access is strictly limited to user accounts, officer credential verification, and security audit metadata.
2. **GPS Privacy & Field Obfuscation (AGENTS.md Rule 4):**
   - Exact GPS coordinates are encrypted using AES-256-GCM.
   - Exact coordinates are only ever displayed to the plot owner (`farmer`).
   - Agricultural Extension Officers receive blurred, district-level location metadata only.
   - Exact coordinates are never placed in URLs, query strings, or server logs.
3. **Responsible AI Guardrails (AGENTS.md Rule 5):**
   - AI outputs are strictly informational summaries and visit briefing question prompts.
   - The platform strictly forbids autonomous agronomic decisions, pesticide/fertilizer dosages, or disease prescriptions.
   - All observations are grounded in verified source record IDs, with a deterministic rule-based fallback if the AI service is unavailable.
4. **Cookie Authentication & CSRF Protection:**
   - Secure `httpOnly` JWT session cookies (`accessToken`, `refreshToken`).
   - Double-submit CSRF cookie pattern (`csrfToken`) paired with mandatory `X-CSRF-Token` headers on mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
