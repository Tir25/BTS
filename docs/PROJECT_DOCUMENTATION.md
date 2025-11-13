# University Bus Tracking System – Comprehensive Documentation

_Last updated: 2025-11-13_

---

## 1. Purpose & Audience

This document replaces the legacy ad-hoc reports and provides a single, canonical reference for everyone who designs, builds, deploys, or operates the University Bus Tracking System (UBTS). It is written for:

- **Product & project stakeholders** who need an end-to-end understanding of capabilities and constraints.
- **Backend & frontend engineers** who extend features, integrate with external systems, or debug production incidents.
- **DevOps & SRE teams** responsible for environment provisioning, observability, and incident response.
- **Support & field operations** who monitor live tracking accuracy and respond to driver/student issues.

How to use this guide:

- Sections 2–4 give a high-level overview suitable for onboarding.
- Sections 5–9 deep dive into backend, database, frontend, and real-time architecture.
- Sections 10–12 cover operations, security, observability, and quality practices.
- Section 13 captures the most common troubleshooting scenarios and FAQs.

---

## 2. Quick Facts

- **Domain:** University shuttle tracking for students, drivers, and administrators.
- **Core Stack:** React 18 + Vite frontend, Express + Socket.IO backend, Supabase (PostgreSQL + authentication), Redis caching, Tailwind CSS, MapLibre GL.
- **Primary Realtime Flow:** Drivers publish authenticated location updates → backend persists to PostGIS + broadcasts via WebSocket → students receive updates in <1s on map views.
- **Infrastructure Targets:** Local development (Node + Vite), Docker Compose stack, Render (backend), Vercel (frontend), optional Kubernetes manifests.
- **Key Repositories:** `backend/`, `frontend/`, `shared/`, `deploy/`, `infrastructure/`, `services/`.

---

## 3. System Overview

- **Driver Experience**
  - Secure Supabase-backed login (`POST /auth/driver/login`).
  - Driver dashboard publishes GPS or IP-derived coordinates via WebSocket `driver:locationUpdate` events or REST fallback (`POST /locations/update`).
  - Dashboard shows assignment, shift details, route stops, and tracking counters.

- **Student Experience**
  - Student login (`POST /auth/student/login`) unlocks personalized features; anonymous access can still view active buses and routes.
  - Student map consumes WebSocket `bus:locationUpdate` broadcasts and REST endpoints (`GET /locations/current`, `GET /student/route-status`) for redundant polling.

- **Administrator Experience**
  - JWT-authenticated admin endpoints manage buses, drivers, assignments, routes, shifts, storage assets, monitoring, and analytics (`/admin/*`, `/assignments-optimized/*`).
  - Admin dashboards receive WebSocket broadcasts and REST health metrics for operational visibility.

- **Data & Realtime Flow**
  1. Driver publishes location update.
  2. Backend validates, saves to `live_locations` (current) and `locations` (history) tables.
  3. WebSocket server emits confirmation to driver (`driver:locationConfirmed`) and broadcasts to students (`bus:locationUpdate`, `route:stopReached`).
  4. React Query & Zustand stores update UI; offline cache ensures graceful degradation.

---

## 4. Architecture Overview

### 4.1 Component Map

- **Client (frontend/)**
  - Vite + React SPA with routes for drivers, students, admins, and marketing pages.
  - Uses Zustand for local state, React Query for data fetching, and custom WebSocket managers for realtime.
  - Tailwind CSS, Framer Motion, and component library in `components/common`.

- **Backend (backend/)**
  - Express server (`src/server/index.ts`) with modular routers, controllers, and services.
  - Socket.IO (real-time), Redis caching, Postgres/PostGIS + Supabase for data persistence and auth.
  - Rich middleware stack for security, logging, performance, rate limiting, and monitoring.

- **Shared Utilities (shared/)**
  - Cross-surface React components, logger utilities, and type definitions consumed by both frontend and backend when bundled.

- **Infrastructure / DevOps**
  - `deploy/docker-compose.yml` for local full-stack simulations (Postgres, Redis, backend, frontend, nginx, Prometheus, Grafana).
  - `docker-compose.microservices.yml` for service-isolated deployments.
  - `infrastructure/` holds Kubernetes manifests, load-balancer configs, monitoring templates.
  - `render.yaml`, `frontend/vercel.json`, and environment templates orchestrate hosted deployments.

### 4.2 Runtime Data Flow

```
Driver App (Web/Mobile) ── WebSocket/HTTPS ──► Express API ──► PostgreSQL/PostGIS
                                   │                             │
                                   └───────────────► Socket.IO Broadcasts ──► Student App
                                                                 │
                                                      Redis cache & monitoring services
```

### 4.3 Deployment Topologies

- **Local Developer Mode:** `npm run dev` at repo root starts proxy scripts to run backend on port 3001 and frontend on port 5173.
- **Full-stack Docker:** `docker-compose -f deploy/docker-compose.yml up` provisions Postgres, Redis, backend, frontend, nginx, Prometheus, Grafana for realistic integration testing.
- **Managed Hosting:** Render (backend) + Supabase (database/auth) + Vercel (frontend). WebSocket configuration supports Render and custom domains via `backend/src/config/environment.ts`.
- **Optional Kubernetes:** Sample manifests in `infrastructure/k8s/` for multi-node clusters with external Nginx ingress and monitoring sidecars.

---

## 5. Backend Service (Express + Socket.IO)

### 5.1 Key Technologies

- Node.js 18+, TypeScript 5, Express 4, Socket.IO 4.
- Supabase JS SDK for multi-role authentication (driver, student, legacy).
- Redis 7 for caching (configurable TTL per router).
- Postgres / PostGIS for spatial data and historical archives.
- Joi / express-validator for payload validation, Helmet + custom security middleware.

### 5.2 Directory Structure (selected)

- `src/server/` – bootstrap (`index.ts`), Express app (`app.ts`), HTTP + WebSocket server wiring (`socket.ts`), graceful shutdown, monitoring.
- `src/config/` – environment loading, database pools, Supabase client factories, server config.
- `src/middleware/` – auth, security, rate limiting, caching, performance monitors, correlation IDs.
- `src/routes/` – feature routers (auth, admin, buses, routes, locations, tracking, students, storage, monitoring, SSE).
- `src/controllers/` – domain controllers (`BusController`, `RouteController`, `AnalyticsController`, etc.).
- `src/services/` – domain services (assignments, tracking, location, storage, monitoring, Redis, DB facades).
- `src/websocket/` – Socket.IO handlers per client type, connection manager, event constants, server initialization.

### 5.3 Boot Sequence

1. `server/index.ts` creates Express app via `createApp()`, registers routers (`registerRoutes()`), installs monitoring/error middleware, and instantiates HTTP + Socket.IO servers.
2. `initializeServices()` runs environment validations, database migrations (`MigrationRunner`), Redis connections, and monitoring loops.
3. `initializeSocketServer()` attaches driver/student/admin handlers, starts WebSocket health probes, and sets up memory monitoring.

### 5.4 Configuration & Environment Variables

`backend/env.template` enumerates required keys. Highlights:

- `DATABASE_URL`, `DB_POOL_*` – Postgres / Supabase connection pooling.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` – legacy fallback.
- `DRIVER_SUPABASE_*`, `STUDENT_SUPABASE_*` – role-specific Supabase credentials (preferred).
- `REDIS_URL` for caching.
- `PORT`, `NODE_ENV`, `CORS_ORIGIN`, `ENABLE_RATE_LIMIT`, `LOG_LEVEL`, `ENABLE_DEBUG_LOGS`.
- WebSocket CORS origins derived from environment (local dev vs Render/Vercel).

`config/environment.ts` loads `.env.local`/`.env` (dev) or `.env.production` (prod up), validates required variables, and composes a strongly-typed configuration object used across the app.

### 5.5 Middleware Pipeline Highlights

- `requestId` – attaches request correlation IDs; reused by logger.
- `securityEnhanced` – wraps Helmet, file upload validation, CSP hooks.
- `corsEnhanced` – CORS allow-list supporting regex for dev tunnels.
- `auth` – Supabase JWT verification, role checks (`requireAdmin`, `requireAdminOrDriver`).
- `rateLimit` – configurable per router; strict on `/auth` in production.
- `redisCache` – typed TTL caching for heavy endpoints (e.g., `/buses`, `/routes`, `/locations`).
- `performance` and `monitoring` – collects event loop lag, memory stats, CPU metrics for `/monitoring/*` responses.
- `errorHandler` – centralized error formatting, logging, and final response shaping.

### 5.6 Domain Services & Controllers (Summary)

- **Authentication:** Driver/student login, session validation, assignment lookups (`src/routes/auth/*`). Utilizes role-specific Supabase admin & anon clients, updates `user_profiles.last_login`, ensures driver-route linkage.
- **Bus Data:** `GET /buses`, `/buses/viewport`, `/buses/clusters`, `/buses/:id` powering student map overlays. Uses `OptimizedLocationService` + `BusDatabaseService`.
- **Route Management:** CRUD & analytics on routes, assignments, ETAs via `RouteController`. Admin-only creation/update with PostGIS integration.
- **Locations:** Current locations, viewport filtering, historic queries (requires auth), and update endpoint for drivers. Persists to `live_locations` + `locations` within transactions.
- **Tracking:** Start/stop sessions, mark stops reached, fetch driver assignments with stops; WebSocket broadcasts to students.
- **Student Routes:** Public endpoints for route status, stops, active routes per shift.
- **Admin:** Comprehensive CRUD for buses, drivers, routes, route stops, shifts; analytics snapshots; diagnostics; driver verification checks.
- **Assignments:** Production and optimized endpoints with caching, performance comparisons, availability queries.
- **Storage:** Supabase Storage integration for images/documents; signed URLs; deletion/listing; admin-gated.
- **Monitoring:** REST access to health summaries, metrics, alerts, alert rules, dashboard aggregates, and performance stats.

### 5.7 REST API Surface (Key Endpoints)

| Category | Method & Path | Auth | Purpose |
| --- | --- | --- | --- |
| Health | `GET /health`, `/health/detailed`, `/health/ready`, `/health/live`, `/health/websocket`, `/health/pool`, `/health/metrics` | Public | Readiness/liveness and detailed diagnostics |
| Auth – Driver | `POST /auth/driver/login`, `GET /auth/driver/assignment`, `POST /auth/driver/validate` | Driver/Admin | Login, assignment lookup, session validation |
| Auth – Student | `POST /auth/student/login` | Public | Student login with Supabase |
| Buses | `GET /buses`, `/buses/viewport`, `/buses/clusters`, `/buses/:busId` | Public | Bus catalog, geo queries, metadata |
| Routes | `GET /routes`, `/routes/viewport`, `/routes/:routeId` | Public | Route GeoJSON data |
| Routes (admin) | `POST /routes`, `POST /routes/:routeId/assign-bus`, `POST /routes/:routeId/calculate-eta`, `POST /routes/:routeId/check-near-stop` | Admin | Manage & analyze routes |
| Locations | `GET /locations/current`, `/locations/viewport` | Public | Current location feed |
| Locations (secure) | `GET /locations/history/:busId`, `POST /locations/update` | Authenticated | Historical queries & driver updates |
| Tracking | `POST /tracking/start`, `/tracking/stop`, `/tracking/stop-reached`, `GET /tracking/assignment/:driverId?` | Driver/Admin | Manage tracking sessions & stop progress |
| Student | `GET /student/route-status`, `/student/route-stops`, `/student/active-routes`, `/student/routes-by-shift` | Public | Student-friendly route data |
| Admin – Buses | `GET/POST/PUT/DELETE /admin/buses`, `GET /admin/buses/:busId` | Admin | CRUD |
| Admin – Drivers | `GET/POST/PUT/DELETE /admin/drivers`, `GET /admin/drivers/:driverId/bus`, `POST /admin/drivers/cleanup` | Admin | Driver lifecycle |
| Admin – Routes | `GET/POST/PUT/DELETE /admin/routes` | Admin | Route lifecycle |
| Admin – Route Stops | `GET/POST/PUT/DELETE /admin/route-stops`, `POST /admin/route-stops/reorder` | Admin | Stop ordering & metadata |
| Admin – Shifts | `GET/POST/PUT/DELETE /admin/shifts` | Admin | Shift management |
| Admin – Analytics | `GET /admin/analytics`, `/admin/health`, `/admin/diagnostics`, `POST /admin/clear-all-data`, `GET /admin/verify-driver-system` | Admin | Operational dashboards |
| Assignments (optimized) | `GET /assignments-optimized/*`, `POST /assignments-optimized/cache/invalidate` | Admin | Single-query assignments, dashboards, resource availability |
| Storage | `POST /storage/upload/*`, `DELETE /storage/delete/:type/:id`, `GET /storage/info/:type/:id`, `/storage/list/:folder`, `/storage/signed-url/:type/:id` | Admin (some signed-url endpoints for auth’d users) | Asset pipeline |
| Monitoring | `GET /monitoring/health`, `/metrics`, `/metrics/history`, `/alerts`, `/alerts/all`, `/alerts/rules`, `/alerts/rules/:id`, `/alerts/:id/resolve`, `/dashboard`, `/performance` | Admin/Operators | Observability |

> For request/response schemas, inspect the corresponding controller/service files. All responses follow `{ success: boolean, data?, message?, error?, code?, timestamp? }`.

### 5.8 WebSocket Architecture

- **Socket Initialization:** `src/websocket/socketServer.ts` creates namespaces, registers driver/student/admin handlers, and wires authentication via `websocketAuth` middleware.
- **Rooms:** `students`, `driver:{driverId}`, `bus:{busId}` for targeted broadcasts.
- **Primary Events:**
  - Driver lifecycle: `driver:initialize`, `driver:initialized`, `driver:locationUpdate`, `driver:locationConfirmed`, `driver:locationRateLimited`, `driver:assignmentUpdate`.
  - Student lifecycle: `student:connect`, `student:connected`, `student:disconnected`.
  - Bus updates: `bus:locationUpdate`, `route:stopReached`.
  - Admin broadcast: `admin:broadcast`.
  - Health: `ping`, `pong`, `disconnect`, `error`.
- **Connection Manager:** `frontend/src/services/websocket/connectionManager.ts` handles retries, auth token refresh, health checks, and error diagnostics for each client type.
- **Health Monitoring:** `WebSocketHealthService` tracks active connections, error rates, and exposes metrics via `/health/websocket`.

### 5.9 Caching & Performance

- Redis-backed cache wrappers in `middleware/redisCache.ts` with TTL per domain (`buses` 10m, `routes` 30m, `locations` 60s).
- Database pooling (`pg.Pool`) with retry logic and health checks.
- `OptimizedAssignmentService` eliminates N+1 queries for admin dashboards.
- `OptimizedLocationService` centralizes spatial queries and ensures consistent formatting.
- `PerformanceGuard` and `PerformanceMonitor` utilities detect long-running handlers and log slow paths.

### 5.10 Logging & Monitoring

- Structured logger at `backend/src/utils/logger.ts` supports component tags, severity levels, and server-ready banners.
- Middleware attaches `requestId` for correlation.
- `MonitoringService` aggregates system metrics (heap usage, CPU, event loop lag) and maintains rolling history, alert rules, and active alerts.
- `/monitoring/performance` and `/monitoring/dashboard` deliver snapshot dashboards for operators.

### 5.11 Error Handling & Rate Limiting

- Global error handler formats responses and emits structured logs. Validation errors return 400 with specific `code`.
- Authentication errors differentiate between missing token, invalid token, inactive account, and insufficient role.
- Rate limiting is disabled in dev by default but can be toggled via `ENABLE_RATE_LIMIT` and `DISABLE_RATE_LIMIT`. Production auth routes default to 30 req/15 min.

---

## 6. Data Model & Persistence

### 6.1 Supabase Integration

- Supabase hosts Postgres + PostGIS + Auth.
- Role-specific service keys ensure driver and student clients operate with least privileges while backend uses service role for admin tasks.
- Supabase Storage buckets hold bus images, driver photos, route maps with signed URL support.

### 6.2 Core Tables (selected)

| Table | Purpose | Notable Columns |
| --- | --- | --- |
| `user_profiles` | Master directory for drivers, students, admins | `id`, `full_name`, `role`, `is_active`, `last_login`, `email_verified` |
| `buses` | Fleet inventory | `id`, `bus_number`, `driver_id`, `route_id`, `assignment_status`, `assigned_shift_id`, `is_active`, `bus_image_url` |
| `routes` | Route definitions with spatial data | `id`, `name`, `geom` (LineString), `stops` (Geometry), `origin/destination`, `bus_stops` JSON, ETA metadata |
| `route_stops` | Stop sequences per route | `id`, `route_id`, `stop_id`, `sequence`, `estimated_arrival_time`, `is_pickup_only`, notes |
| `bus_stops` | Stop catalog | `id`, `route_id`, `location` (Point), `stop_order`, `estimated_time_from_start` |
| `driver_bus_assignments` | Driver↔bus relationships | `driver_id`, `bus_id`, `route_id`, `is_active`, `assigned_at` |
| `live_locations` | Latest location per bus | `bus_id`, `driver_id`, `location` (Point), `speed_kmh`, `heading_degrees`, `recorded_at` |
| `locations` | Historical archive | same columns as live + `id`, stores time series for auditing |
| `shifts` | Shift metadata | `id`, `name`, `start_time`, `end_time` |
| `system_constants` | Configurable thresholds | `constant_name`, `constant_value` (JSONB) |

Spatial helpers and parsers live in `backend/src/utils/postgisHelpers.ts`.

### 6.3 Migrations & Database Utilities

- Migrations reside in `backend/src/migrations/` and are executed by `MigrationRunner` during service initialization.
- Migrations cover optimized indices, assignment fixes, PostGIS optimizations, and constraints.
- Database health checks: `/health/pool`, `testDatabaseConnection`, `checkDatabaseHealth`.
- `get_location_history` database function consolidates live + historical data; fallback queries handle errors gracefully.

### 6.4 Data Lifecycle & Retention

- `saveLocationUpdate` performs transactional upserts to keep live and historical tables in sync.
- `TrackingService` marks stops reached and calculates remaining stops; broadcasts updates.
- Admin cleanup endpoints remove inactive drivers/buses.
- Storage service updates DB rows after asset uploads/deletions to maintain referential integrity.

---

## 7. Frontend Application (React + Vite)

### 7.1 Key Technologies

- React 18, TypeScript, Vite, React Router, React Query, Zustand, Tailwind CSS, Framer Motion, Socket.IO Client, MapLibre GL, TanStack Query DevTools, Vitest/Test Library for testing.
- Service Worker management for production caching with guarded dev behavior.

### 7.2 Directory Structure (selected)

- `src/App.tsx` – top-level router, suspense wrappers, lazy loading, transition providers, auth listeners.
- `src/components/` – domain-specific views; `UnifiedDriverInterface`, `StudentMap`, `AdminDashboard`, auth forms, error boundaries, notification systems.
- `src/hooks/` – specialized hooks for driver tracking, map state, error handling, API consumption.
- `src/services/` – API service, WebSocket connection manager, location tracking manager, offline sync, resilience patterns (circuit breaker, exponential backoff), Supabase auth helpers.
- `src/stores/` – Zustand stores for auth, map filters, tracking counters.
- `src/context/` – Theme provider, driver auth context.
- `src/providers/QueryProvider.tsx` – React Query configuration (caching, retries, stale times).
- `src/config/` – environment detection, timeout constants.
- `src/assets/` & `public/` – static assets, service worker manifests.

### 7.3 Routing & Navigation

- `/` – Premium marketing homepage.
- `/legacy` – Legacy mode fallback.
- `/driver-login`, `/driver-dashboard`, `/driver-interface` – driver flows gated by `DriverAuthProvider`.
- `/student-login`, `/student-map` – student flows.
- `/admin-login`, `/admin-dashboard` – admin portal.
- Wildcard routes fallback to homepage.

### 7.4 State & Data Management

- **Auth:** `authService`, `studentAuthService`, and Zustand stores keep session state synchronized with Supabase and local storage.
- **React Query:** `useHealthCheck`, `useAssignments`, etc. manage data fetching, caching, retries, stale times.
- **WebSocket:** `UnifiedWebSocketService`, `ConnectionManager`, throttled location publishers, subscription manager per client type.
- **Offline Support:** `services/offline` provides IndexedDB storage and sync manager for queued updates.
- **Resilience:** Circuit breakers, exponential backoff, and request retry wrappers for unstable network conditions.

### 7.5 UI & Styling

- Tailwind CSS with gradient backgrounds, glassmorphism cards, responsive layout.
- Reusable components in `components/common` (buttons, cards, modal, forms).
- Framer Motion transitions integrated via `components/transitions`.
- Error handling UI across pages using `components/error/ErrorBoundary`.

### 7.6 Feature Surfaces

- **Driver Dashboard**
  - Assignment banner, shift info, GPS accuracy indicator, location counter, WebSocket status.
  - `useWebSocketLocationSync` orchestrates real-time updates; fallback to periodic `POST /locations/update`.
  - Route stops panel with `stopReached` actions hitting `/tracking/stop-reached`.

- **Student Map**
  - MapLibre map with clustering, route overlays, ETA info, active route filtering.
  - Subscribes to WebSocket bus updates; React Query fallback to `/locations/current`.
  - Displays tracking status via `/student/route-status`.

- **Admin Dashboard**
  - Fleet overview, driver management forms, assignments list, storage uploads, monitoring widgets.
  - Uses admin API endpoints and monitors WebSocket broadcasts for live updates.

### 7.7 Testing & Quality

- Scripts:
  - `npm run lint`, `npm run lint:fix`
  - `npm run format`, `npm run type-check`
  - `npm run test`, `npm run test:coverage`, `npm run test:ui`
  - Build variations for staging/production/docker/render/vercel.
- Playwright config available for E2E (additional setup required).
- ESLint + Prettier enforced; pre-commit hooks ensure validation before merge.

### 7.8 Deployment Builds

- Unified build script `scripts/unified-build.js` generates environment-specific bundles with profile flags.
- `vercel.json` config for Vercel hosting; `frontend/Dockerfile` for containerized deployments.

---

## 8. Realtime Workflows In Detail

1. **Driver Authentication & Initialization**
   - Driver logs in → receives JWT + assignment payload.
   - Frontend calls `connectionManager.setClientType('driver')` and connects to WebSocket with token in auth payload.
   - Backend verifies token, attaches driver to `driver:{id}` and `bus:{busId}` rooms, emits `driver:initialized`.

2. **Location Publishing**
   - Frontend throttles GPS updates (configurable via environment, typically 3s) and sends `driver:locationUpdate`.
   - Backend validates payload, persists to DB, emits `driver:locationConfirmed` and `bus:locationUpdate`.
   - Rate limit events (if triggered) emit `driver:locationRateLimited`.

3. **Student Subscription**
   - Student map subscribes as anonymous or authenticated client; joins `students` room.
   - Receives `bus:locationUpdate`, `route:stopReached`, and admin broadcasts; updates MapLibre markers.
   - Fallback polling via `/locations/current` keeps map in sync if WebSocket fails.

4. **Stop Progress**
   - Driver marks stop reached using `/tracking/stop-reached`; backend updates DB and emits `route:stopReached` to `students` and `bus:{busId}` rooms.
   - Student UI recalculates remaining stops and ETAs.

5. **Session Lifecycle & Recovery**
   - Connection manager handles heartbeat, auto-reconnect with exponential backoff, and health check pings.
   - If backend unreachable, UI surfaces actionable diagnostics (server down vs auth failure).

---

## 9. Deployment, Environments & Tooling

### 9.1 Local Development

1. Ensure Node.js 18+, npm 10+, and Supabase credentials (or Supabase local stack) are available.
2. Copy `backend/env.template` → `backend/.env.local` and populate keys.
3. Copy `frontend/env.template` → `frontend/.env.local`.
4. Install dependencies:
   ```
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```
5. Start both services: `npm run dev` (root script orchestrates backend on 3001, frontend on 5173).
6. Optional: run Postgres locally or rely on Supabase cloud; ensure `DATABASE_URL` is configured.

### 9.2 Docker Compose Stack

- `docker-compose -f deploy/docker-compose.yml up --build` spins up:
  - Postgres 15 (with initial schema).
  - Redis 7.
  - Backend (port 3001).
  - Frontend nginx serving built assets on port 5173 → port 80 via reverse proxy.
  - Prometheus on 9090 and Grafana on 3000 for metrics dashboards.
  - TLS-ready nginx (requires certs in `deploy/ssl`).

### 9.3 Hosted Environments

- **Render (backend):** `render.yaml` config defines environment variables and scaling.
- **Vercel (frontend):** `frontend/vercel.json` config; build command uses `npm run vercel-build`.
- **Supabase:** Primary managed Postgres + Auth; ensure RLS and storage policies align with backend assumptions.

### 9.4 Configuration Management

- Keep `.env.production` in secure secret managers (Render environment, Vercel project, GitHub Actions secrets).
- Rotate Supabase service role keys on schedule; update `backend/env.production`.
- `scripts/` directory contains validation and automation helpers (eslint monitors, dependency checkers, deployment validators, environment setup scripts).

### 9.5 CI/CD & Automation

- Pre-commit scripts (`npm run pre-commit`) enforce linting, formatting, type checks, and build.
- Additional automation (e.g., GitHub Actions) can call root scripts for build/test; adapt `scripts/validate-structure.js` and `scripts/validate-deployment-config.js` as pipeline steps.

---

## 10. Security Considerations

- **Authentication**
  - Supabase handles password auth; backend uses service role only on trusted server.
  - Drivers/students require active statuses; role mismatch prevented.
  - Session validation ensures driver route assignments exist before allowing tracking.

- **Authorization**
  - Admin routes gated by `requireAdmin`.
  - Driver-specific routes restrict access to `req.user.id`.
  - Student endpoints limited to publicly safe data; sensitive data hidden.

- **Transport Security**
  - Enforce HTTPS/WSS in production via nginx or platform providers.
  - WebSocket CORS allow-list restricts origins.

- **Rate Limiting & Abuse Protection**
  - Rate limit service optional but recommended in production.
  - WebSocket connection manager detects server overload and erroneous clients.

- **Data Validation**
  - Express validators and manual checks ensure location coordinates are valid, required fields present.
  - File uploads restricted to images/PDFs and size-limited.

- **Secrets Management**
  - Never commit `.env.*`; use environment-specific secret stores.
  - Supabase service role keys should be rotated and scoped.

---

## 11. Observability & Monitoring

- **Health Endpoints**
  - `/health` – simple indicator.
  - `/health/detailed` – includes DB, Redis, WebSocket, cache.
  - `/monitoring/health` – aggregated service status.

- **Metrics & Alerts**
  - `MonitoringService` records CPU, memory, event loop lag, request counts, cache hits.
  - Prometheus scrape targets configurable via `deploy/prometheus.yml`.
  - Grafana dashboards (manual setup) display fleet metrics, location update frequency, error rates.
  - Alert rules can be managed via `/monitoring/alerts/rules`.

- **Logging**
  - Structured logs with tags (`auth`, `tracking-routes`, etc.).
  - Consider forwarding logs to ELK/Datadog in production deployments.

- **WebSocket Health**
  - `/health/websocket` provides active connection counts and last heartbeat.
  - Connection manager emits console diagnostics for client-side triage.

---

## 12. Quality, Testing & Tooling

- **Backend**
  - `npm run lint`, `npm run format`, `npm run build`.
  - `npm run dev` (ts-node-dev) for hot reload.
  - Tests currently limited; add Jest/Vitest integration under `backend/src/test`.

- **Frontend**
  - `npm run lint`, `npm run type-check`, `npm run test` (Vitest + React Testing Library).
  - `npm run test:ui` opens Vitest UI dashboard.
  - `npm run analyze` performs bundle analysis.

- **Shared**
  - `shared/` contains reusable components; ensure `package.json` dependencies stay in sync.

- **Suggested Enhancements**
  - Expand automated test coverage (driver tracking, student map WebSocket mocks).
  - Integrate Playwright for end-to-end smoke tests.
  - Automate monitoring dashboards provisioning (Grafana JSON).

---

## 13. Troubleshooting & FAQ

| Symptom | Likely Cause | Resolution |
| --- | --- | --- |
| Driver cannot log in | Invalid credentials, inactive profile, missing bus assignment | Check Supabase `user_profiles` for driver, ensure `assigned_driver_profile_id` set on `buses`, review `/auth/driver/login` logs |
| Driver dashboard stuck on “Connecting…” | WebSocket server unreachable or token invalid | Verify backend running on configured URL, inspect console diagnostics (connection manager logs), confirm Supabase session valid |
| Student map shows no buses | No active tracking or WebSocket disconnected | Confirm driver started tracking (`tracking/start`), check `/locations/current` for data, ensure `route:stopReached` events firing |
| WebSocket connect_error referencing auth | Expired or missing JWT | Trigger `authService.refreshSession()` (handled automatically), ensure `Authorization` header present on driver endpoints |
| Location counter mismatch | Historical insert failure or race | Check backend logs for `saveLocationUpdate`, confirm Postgres reachable, ensure timestamps monotonic |
| Admin uploads fail | Storage credentials missing or invalid file type | Verify Supabase storage service role key, ensure file matches allowed mimetypes |
| Prometheus/Grafana unavailable | Containers down or ports blocked | For Docker stack, ensure `deploy/docker-compose.yml` includes monitoring services and ports 9090/3000 exposed |

General debugging tips:

- Enable verbose logging (`ENABLE_DEBUG_LOGS=true`) in non-production environments.
- Use `/monitoring/dashboard` for consolidated health snapshot.
- Inspect Redis cache status to understand stale data issues.
- Utilize `scripts/validate-structure.js` and `scripts/validate-deployment-config.js` before deploys.

---

## 14. Glossary

- **Assignment** – Relationship between driver, bus, route, and optional shift.
- **Live Location** – Latest known position of a bus, stored in `live_locations`.
- **Historical Location** – Archived positions stored in `locations` for auditing/analytics.
- **Shift** – Time window defining route availability; influences student filtering.
- **Stop Reached** – Event emitted when driver confirms arrival at stop; updates student map.
- **Supabase Admin Client** – Server-side service role used for privileged queries.
- **Socket Room** – Named channel grouping clients for targeted broadcasts.

---

## 15. Reference Files

- Backend entrypoint: `backend/src/server/index.ts`
- WebSocket handlers: `backend/src/websocket/`
- Environment config: `backend/src/config/environment.ts`, `frontend/src/config/environment.ts`
- Key services: `backend/src/services/`
- Frontend router: `frontend/src/App.tsx`
- WebSocket connection manager: `frontend/src/services/websocket/connectionManager.ts`
- Docker stack: `deploy/docker-compose.yml`
- Kubernetes manifests: `infrastructure/k8s/`
- Render deployment: `render.yaml`
- Vercel config: `frontend/vercel.json`
- Shared utilities: `shared/`

---

This documentation is authoritative. When extending the system:

1. Update relevant sections here to keep domain knowledge centralized.
2. Reference file paths and services explicitly when introducing new flows.
3. Prefer extending existing services/middleware over duplicating logic.

For questions or suggested improvements, coordinate with the platform leads and update this guide as part of the change.


