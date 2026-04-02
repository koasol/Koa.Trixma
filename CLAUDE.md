# Koa.Trixma — Agent Context

## What is this project?

Koa.Trixma is an IoT data management platform. Physical devices (units) self-register, report sensor measurements, and a web dashboard visualizes the data. Users own systems, which group units.

## Architecture Overview

```
Koa.Trixma.Back/   — ASP.NET Core 6 REST API (Clean Architecture)
Koa.Trixma.Front/  — React 19 + TypeScript SPA
infrastructure/    — Pulumi IaC for GCP deployment (inside Front/)
```

### Backend — Clean Architecture (4 layers)

| Layer | Project | Responsibility |
|-------|---------|----------------|
| Domain | `Koa.Trixma.Back.Domain` | Entities only (System, Unit, Measurement, User) |
| Data | `Koa.Trixma.Back.Data` | EF Core DbContext, repositories, migrations |
| Application | `Koa.Trixma.Back.Application` | Business logic services, MQTT client |
| API | `Koa.Trixma.Back.Api` | Controllers, middleware, DI setup |

Dependencies flow inward: Api → Application → Data → Domain.

### Frontend — React SPA

Single `src/trixma.ts` API client handles all backend calls. Firebase token is injected per request. Routes are defined in `App.tsx`.

## Tech Stack

**Backend:**
- .NET 6, ASP.NET Core, EF Core 6
- PostgreSQL + TimescaleDB (time-series hypertable on `Measurements`)
- Firebase/Google JWT authentication
- MQTT (MQTTnet 4) for device communication
- Hot Chocolate 13 (GraphQL — partially set up)
- Serilog logging

**Frontend:**
- React 19, TypeScript, Vite
- Material-UI v7 (light/dark theme)
- Firebase SDK 12 (Google Sign-In only)
- Recharts (measurement visualization)
- React Router v7

**Infrastructure:**
- Docker (multi-stage, nginx for frontend)
- Pulumi + GCP Cloud Run
- PostgreSQL at `192.168.68.99:5433` (local/dev)

## Domain Model

```
User
  └── System (1..*)
        └── Unit (1..*)            ← physical IoT device
              └── Measurement (*) ← time-series data points
```

- `Measurement` uses a TimescaleDB hypertable, composite PK on `(Id, Timestamp)`
- `Unit` has `MacAddress`, `IpAddress`, `nfcId` — devices self-register via anonymous endpoint
- `System.OwnedBy` = `User.Id` — ownership enforces access control

## Key Files

**Backend:**
- `Koa.Trixma.Back.Api/Program.cs` — DI, middleware, auth setup
- `Koa.Trixma.Back.Api/Controllers/UnitsController.cs` — device registration + measurements
- `Koa.Trixma.Back.Data/Context/TrixmaDbContext.cs` — EF Core context
- `Koa.Trixma.Back.Data/Migrations/` — DB schema history

**Frontend:**
- `src/App.tsx` — routing, auth state, theme
- `src/trixma.ts` — all API calls + TypeScript interfaces
- `src/assets/firebase.ts` — Firebase init
- `.env` — environment variables (VITE_ prefix)

## API Endpoints

All endpoints require `Authorization: Bearer <firebase-token>` except:

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/systems` | required | List user's systems |
| POST | `/systems` | required | Create system |
| GET/PUT/DELETE | `/systems/{id}` | required | Manage system |
| GET | `/systems/{id}/units` | required | Units in system |
| GET | `/systems/{id}/measurements` | required | System measurements |
| GET | `/units` | required | List user's units |
| POST/GET/PUT/DELETE | `/units/{id}` | required | Manage unit |
| POST | `/units/register` | **anonymous** | Device self-registration |
| POST | `/units/measurements/report` | **anonymous** | Measurement ingestion |
| GET | `/units/{id}/measurements` | required | Unit measurements (date range) |

## Authentication Flow

1. Firebase Google OAuth in frontend
2. Frontend injects `Bearer <id_token>` into every API request
3. Backend validates JWT against Google's public key
4. `UserSynchronizationMiddleware` syncs Firebase user to DB on first request
5. Controllers extract user identity from JWT claims

## Running Locally

**Backend:**
```bash
cd Koa.Trixma.Back/Koa.Trixma.Back.Api
dotnet run
# Swagger UI: https://localhost:8080/swagger
```

**Frontend:**
```bash
cd Koa.Trixma.Front
npm install
npm run dev
# Dev server: http://localhost:5173
```

**Dependencies required locally:**
- PostgreSQL + TimescaleDB at `192.168.68.99:5433` (or update `appsettings.json`)
- MQTT broker at `ws://192.168.68.99:8083/mqtt` (or update config)
- Firebase project credentials in `.env`

## Conventions

- **Access control**: Always scope queries to the authenticated user. Use `OwnedBy` checks in System/Unit repositories.
- **Anonymous endpoints**: Only device registration and measurement reporting are public. Keep it that way unless explicitly designed otherwise.
- **Measurements**: Always store via `MeasurementService`. Never write raw SQL to the hypertable.
- **Repository pattern**: Do not use `DbContext` directly in controllers or services — always go through repositories.
- **Frontend API calls**: All backend calls go through `trixma.ts`. Do not call `fetch`/`axios` directly in components.
- **Theme**: Dark/light mode is persisted in `localStorage` via `App.tsx`. Use MUI `sx` prop or `theme` — no raw CSS files for component styles.

## Spec & Decision Records

- `docs/spec.md` — current feature status and planned work
- `docs/adr/` — architectural decisions with rationale
