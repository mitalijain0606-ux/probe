# Probe — URL Health & Observability Platform

A full-stack system for monitoring the uptime, latency, and health of any HTTP(S) endpoint, with concurrent scheduled checks, a real-time dashboard, and structured observability throughout.

Built as a Round 2 internship assignment.

---

## 1. Problem Statement

Teams that depend on external APIs, internal services, or third-party integrations usually find out something is broken when a user complains, not before. "Is this endpoint up right now, and has it been reliable this week?" is a question most small teams answer by pinging things manually or waiting for an incident.

Probe answers that question continuously: it checks a list of URLs on a schedule, records every result, and gives you uptime percentages, latency trends, and failure history without needing to build any of that yourself.

## 2. Why This Problem Matters

Reliability visibility is a prerequisite for fast incident response, not a nice-to-have. If you don't know a dependency degraded 40 minutes ago, you can't explain why your own product looked slow to your users 40 minutes ago. The earlier a failure is detected, the smaller the blast radius.

See [Section 27](#27-healthcare-relevance) for how this generalizes to healthcare-adjacent platforms specifically.

## 3. Features

- Email/password authentication with hashed passwords and JWT sessions
- Per-user URL ownership — you only ever see and control your own monitored URLs
- Role-based access: an `ADMIN` role can view platform-wide stats and every user's monitored URLs through dedicated admin-only endpoints and a dashboard page
- Add URLs individually or upload a JSON array in bulk
- Manual "Check now" trigger and automatic checks every 5 minutes (configurable)
- Concurrent health checking with a bounded worker pool (never sequential, never unbounded)
- UP/DOWN classification (`2xx` = UP, everything else = DOWN), with distinct error types for timeouts, DNS failures, connection refusals, TLS errors, and blocked targets
- SSRF-hardened checker: resolves DNS and validates the actual IP before connecting, blocking loopback, private, link-local, and cloud metadata ranges
- Full check history per URL with 1h / 24h / 7d / 30d range filters
- Response-time and status-history charts
- Live dashboard updates over WebSockets when a check completes — no manual refresh, plus a "Live · updated Xs ago" indicator so it's visible at a glance
- Email alerts when a URL crosses a configurable consecutive-failure threshold (fires once per outage, not on every failed check)
- Structured JSON logs with request IDs, log levels, and in-memory metrics (avg response time, failure rate)
- Docker Compose stack: Postgres, API, frontend

## 4. Architecture

```
                    ┌──────────────────────┐
                    │   React Frontend       │
                    │   (Vite + TS)           │
                    └──────────┬─────────────┘
                               │
                     REST API + WebSocket
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Node.js API           │
                    │   Express                │
                    │                           │
                    │  ┌─────────────────────┐ │
                    │  │  In-process job queue │ │
                    │  │  + 5-min scheduler    │ │
                    │  └──────────┬──────────┘ │
                    └─────────────┼─────────────┘
                                  │
                    ┌─────────────┼──────────────┐
                    │             │              │
                    ▼             ▼              ▼
              PostgreSQL      Pino Logger    Health Check Engine
                Prisma                       (SSRF-guarded fetch)
                                                   │
                                                   ▼
                                             External URLs
```

The API is a **single Node.js process**. It never performs a health check inline inside an HTTP request handler — an endpoint like `POST /api/urls/:id/check` only validates input and pushes a job onto an in-process queue, returning `202 Accepted` immediately. A bounded worker pool inside that same process (governed by `MAX_CONCURRENT_CHECKS`) drains the queue, runs the check, writes to Postgres, and pushes the result to the browser over Socket.IO — all without blocking the event loop that's serving other requests, since every step is `async`/non-blocking I/O.

### 5. Architecture Diagram

The diagram above is the authoritative one. In short:

**Manual check:** Frontend → API (enqueue, returns 202 immediately) → in-process queue → bounded worker pool → Health Check Engine → Postgres → Socket.IO → Frontend

**Scheduled check:** an interval timer fires every `MONITOR_INTERVAL` seconds (default 300) → sweep job enqueues one check per active URL onto the same queue, respecting `MAX_CONCURRENT_CHECKS` → same path as above from the worker pool onward.

The queue and worker pool live inside the same Node.js process as the API — there's no separate service to install or keep running. See [Section 23](#23-design-decisions) for why this is bounded and non-blocking without one.

## 6. Tech Stack

**Frontend:** React 18, Vite, TypeScript (strict), Tailwind CSS, Radix primitives (shadcn/ui pattern), React Router, TanStack Query, React Hook Form + Zod, Recharts, Socket.IO client, Sonner (toasts), Lucide icons.

**Backend:** Node.js, TypeScript (strict), Express, Zod validation, Pino structured logging, Helmet, CORS, express-rate-limit, JWT (jsonwebtoken), Argon2id for password hashing.

**Database:** PostgreSQL via Prisma ORM.

**Background processing:** an in-process job queue (bounded worker pool) plus a `setInterval`-based recurring scheduler, both running inside the same API process — no external broker.

**Real-time:** Socket.IO over WebSocket (falls back to polling transport automatically if a proxy blocks upgrades).

**Email:** Nodemailer, used for consecutive-failure down alerts. Gracefully no-ops with a log line if SMTP isn't configured, so local dev never requires a mail server.

**Testing:** Vitest, Supertest.

**DevOps:** Docker, Docker Compose, GitHub Actions CI (typecheck, lint, test, build for both apps).

## 7. Folder Structure

```
/
├── backend/
│   └── src/
│       ├── config/          # env validation, constants, cookies
│       ├── database/        # prisma client
│       ├── logger/          # pino logger, in-memory metrics
│       ├── middleware/      # auth (incl. requireAdmin), error handling, request context, validation
│       ├── modules/
│       │   ├── auth/        # controller / service / repository / routes / schemas
│       │   ├── urls/        # includes the admin "list all URLs" endpoint
│       │   ├── monitoring/  # health check engine, concurrency pool, error classifier
│       │   └── reports/     # dashboard aggregation, admin platform overview
│       ├── jobs/            # in-process job queue, monitor runner, scheduled sweep
│       ├── websocket/       # socket.io server + in-process event publisher
│       ├── utils/           # SSRF guard, AppError, async handler, serializers, mailer
│       ├── app.ts
│       └── server.ts
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
├── frontend/
│   └── src/
│       ├── components/ui/   # shadcn-style primitives
│       ├── features/        # auth, urls, monitoring, dashboard, admin (feature-sliced)
│       ├── hooks/
│       ├── services/        # axios API clients
│       ├── layouts/
│       ├── pages/           # includes admin-page.tsx (admin-only route)
│       └── types/
├── docker-compose.yml
├── .env.example
└── .github/workflows/ci.yml
```

## 8. Database Schema

Four tables, deliberately minimal — no table exists that isn't earning its place.

- **`users`** — id, name, email (unique), passwordHash, role (`USER`/`ADMIN`), timestamps.
- **`monitored_urls`** — id, userId (FK, cascade delete), url, label, isActive, intervalSec, timestamps. Unique on `(userId, url)` so the same user can't add a duplicate. Indexed on `(userId, isActive)` for the dashboard list, and `(isActive, id)` for the scheduler sweep.
- **`check_results`** — one row per health check: status, statusCode, responseTimeMs, errorType, errorMessage, attempts, checkedAt. Indexed on `(urlId, checkedAt DESC)` for history queries, and on `checkedAt` alone for retention cleanup.
- **`url_stats`** — a derived, continuously-updated aggregate (one row per URL): totalChecks, successfulChecks, failedChecks, totalResponseTime, responseSamples, last-check snapshot, consecutiveFails. This is what makes the dashboard and URL list O(1) per URL instead of scanning potentially millions of `check_results` rows on every page load.

`url_stats` is updated in the same Prisma transaction as the `check_results` insert, so it can never drift from the underlying history.

## 9. API Documentation

All responses follow `{ success: boolean, data? , error? }`. All `/api/urls/*` and `/api/dashboard/*` routes require `Authorization: Bearer <token>` (or the `uho_token` cookie set on login).

**Auth**
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account, returns user + JWT |
| POST | `/api/auth/login` | Authenticate, returns user + JWT |
| POST | `/api/auth/logout` | Clears the auth cookie |
| GET | `/api/auth/me` | Current user profile |

**URLs**
| Method | Path | Description |
|---|---|---|
| GET | `/api/urls` | List the caller's monitored URLs with live stats |
| POST | `/api/urls` | Add one URL (`{ url, label? }`) |
| POST | `/api/urls/bulk` | Bulk add (`{ urls: string[] }`), skips duplicates/invalid entries and reports both |
| GET | `/api/urls/:id` | Detail + aggregate stats for one URL |
| DELETE | `/api/urls/:id` | Remove a URL and its history (cascade) |
| POST | `/api/urls/:id/check` | Enqueue a manual check, returns `202 { jobId }` |
| GET | `/api/urls/:id/history?range=1h\|24h\|7d\|30d` | Raw check history for the range |
| GET | `/api/urls/admin/all` | Every user's monitored URLs, each with owner name/email (**admin only**) |

**Dashboard**
| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | totalUrls, up, down, uptimePct, failures, averageResponseTimeMs |
| GET | `/api/dashboard/metrics` | In-memory request/job metrics (**admin only**) |
| GET | `/api/dashboard/admin/overview` | Platform-wide totals across every user: totalUsers, totalUrls, up, down, uptimePct, failures, averageResponseTimeMs (**admin only**) |

Every URL-scoped route re-checks `userId` ownership at the repository layer (`WHERE id = ? AND userId = ?`), so changing an `:id` in the request never leaks another user's data — verified in [`tests/urls.integration.test.ts`](backend/tests/urls.integration.test.ts). Admin-only routes are additionally gated by a `requireAdmin` middleware that checks the authenticated user's `role`; see [Section 18](#18-role-based-access--email-alerts).

## 10. Monitoring Flow

1. A URL is added → `POST /api/urls` validates it, runs it through the SSRF guard's syntactic check, and stores it with an empty `url_stats` row.
2. **Manual check:** `POST /api/urls/:id/check` looks up the URL, pushes a job onto the in-process queue (`jobs/job-queue.ts`), and returns `202` with a job ID immediately — the HTTP handler never awaits the actual network call.
3. **Scheduled check:** a `setInterval` timer fires every `MONITOR_INTERVAL` seconds (default 300), pulling every active URL and enqueueing one job per URL onto the same queue.
4. A bounded worker pool inside the queue (`jobs/monitor-runner.ts`) drains pending jobs, running at most `MAX_CONCURRENT_CHECKS` at once. Each job runs the health check engine, writes a `check_results` row and updates `url_stats` in one transaction, then calls the WebSocket publisher directly (same process, no external broker needed) and — if this is the Nth consecutive failure — sends a down-alert email.
5. The Socket.IO server relays that event to the owning user's room — the dashboard updates without a refresh.

## 11. Concurrency Approach

Bounded concurrency, governed by `MAX_CONCURRENT_CHECKS`, applied at two points that both reuse the same mechanism:

1. **Job queue drain** (`backend/src/jobs/job-queue.ts`) — the queue tracks an `inFlight` set and only pulls a new job off the pending list while `inFlight.size < maxConcurrent`, so at most that many checks run at once regardless of how many jobs are queued.
2. **Scheduled sweep enqueue** (`backend/src/modules/monitoring/service/concurrency-pool.ts`) — a small reusable worker-pool helper used anywhere the codebase needs "process N items, K at a time" (also covered directly by its own test suite).

Neither uses `Promise.all` over the full list. `Promise.all` across hundreds of URLs would open that many outbound connections at once, which makes latency numbers meaningless (everything queues behind the same event loop/network stack) and risks exhausting file descriptors. A fixed-size pool bounds resource usage independent of how many URLs exist. One task throwing inside the pool never stops the others — each task is wrapped individually and its error is caught and logged per-item (covered by `tests/concurrency-pool.test.ts`), so a single bad URL never blocks the queue.

## 12. Job Queue Architecture

- **Queue:** an in-process array-backed queue (`jobs/job-queue.ts`) holds both manual and scheduled check jobs. It is not persisted — a process restart drops any jobs that were queued but not yet started, which is an accepted tradeoff for a single-instance deployment (see [Section 24](#24-tradeoffs)).
- **Enqueue path:** `POST /api/urls/:id/check` and the scheduler's sweep are the only two places that call `enqueueJob(...)`. Neither ever calls `checkUrl(...)` directly — the HTTP handler and the scheduler are both decoupled from the actual network request.
- **Drain path:** `jobs/monitor-runner.ts` registers the single handler that processes a job (`registerJobHandler`), and is the only code path in the entire backend that calls `checkUrl(...)`.
- Job failures are caught and logged per-job (`queue.job_failed` event) — a single bad URL can never crash the process or block other jobs, since each job's handler is wrapped in its own `.catch()` and the health check engine itself never throws past its own boundary (see Section 14).

## 13. Scheduling

`startMonitoring()` (`jobs/monitor-runner.ts`) runs one sweep immediately on boot, then registers a `setInterval` at `MONITOR_INTERVAL * 1000` ms (default 5 minutes) that re-runs it. Only URLs with `isActive: true` are swept. Because there's exactly one scheduler running inside the single API process (not N replicas each with their own timer), there's no duplicate-scheduling concern to solve for at this scale — see [Section 25](#25-scalability-considerations) for what changes if the API is ever run as multiple replicas.

## 14. Health Check Engine

`backend/src/modules/monitoring/service/health-check.service.ts` is a standalone, reusable function (`checkUrl`) with no framework dependency — it can be unit tested and reused outside Express entirely.

Steps: SSRF-validate the target → start a timer → `fetch()` with an `AbortController` timeout → drain (and cap) the response body → classify 2xx as UP, everything else as DOWN → on network-level failure, classify the error (`error-classifier.ts` maps Node/undici error codes to `TIMEOUT` / `DNS_FAILURE` / `CONNECTION_REFUSED` / `SSL_ERROR` / `NETWORK_ERROR` / `UNKNOWN`) → retry with exponential backoff for transient error types only, up to `CHECK_MAX_ATTEMPTS` → always return a structured result object, never throw.

That last point is deliberate and tested (`tests/error-classifier.test.ts`): whatever goes wrong — a garbage hostname, a hung socket, a self-signed cert — the function resolves with `{ status: 'DOWN', errorType, errorMessage }` rather than rejecting, so one bad URL can never take down a batch of checks.

## 15. Observability

Pino structured JSON logs throughout, with three concerns kept consistent everywhere:

- **Request logs** (`middleware/request-context.middleware.ts`): method, route, statusCode, durationMs, requestId, tagged onto every log line for that request via `AsyncLocalStorage`.
- **Monitoring/job logs** (`jobs/monitor-runner.ts`): jobId, urlId, status, responseTimeMs, errorType, triggeredBy (`manual` | `schedule`).
- **Error logs** (`middleware/error.middleware.ts`): centralized — every thrown `AppError` or unexpected exception passes through one handler that logs at `warn` (4xx) or `error` (5xx) and returns a safe, uniform JSON error shape.

Log levels used: `info` (lifecycle events, completed requests, completed checks), `warn` (validation failures, retryable check failures, auth failures), `error` (unhandled exceptions, job failures, connection errors). Pino's `redact` option strips `password`, `passwordHash`, `token`, and `authorization`/`cookie` headers from every log line, so secrets cannot leak even if a log statement accidentally includes a full object.

`GET /api/dashboard/metrics` (admin-only) exposes an in-memory counter/histogram snapshot — request counts by status code, health-check outcomes by error type, and average/max response times — built with a small dependency-free metrics module (`logger/metrics.ts`) rather than pulling in a full Prometheus client for a project this size.

## 16. Security

- Passwords hashed with **Argon2id** (not bcrypt) — memory-hard, current OWASP recommendation.
- JWT signed with a required 32+ character secret (enforced by the Zod env schema at boot — the app refuses to start with a weak or missing secret).
- Every URL-scoped query is filtered by `userId` at the repository layer, not just checked in the controller.
- Helmet sets standard security headers; CORS is locked to `FRONTEND_URL`; global and auth-specific rate limits via `express-rate-limit`.
- All request bodies are validated with Zod before touching a service — malformed input never reaches business logic.
- The JWT secret, password hashes, and full tokens are never returned in any API response or written to a log line.

## 17. SSRF Protection

Treating user-submitted URLs as untrusted input is the single most important security property of a URL-monitoring tool, since the entire point of the product is "make outbound HTTP requests to whatever the user gives us."

`backend/src/utils/url-guard.ts` implements defense in depth:

1. **Protocol allowlist** — only `http:` / `https:`.
2. **Hostname denylist** — `localhost` and its variants, `.internal`, cloud metadata hostnames.
3. **DNS resolution + IP validation** — the hostname is resolved via `dns.lookup(..., { all: true })`, and **every** returned address is checked against blocked IPv4/IPv6 ranges (loopback, RFC1918 private ranges, link-local/169.254.0.0/16 which covers the AWS/GCP/Azure metadata endpoint, CGNAT, multicast, IPv6 unique-local and link-local, and IPv4-mapped IPv6). This is the step that actually matters: a hostname like `evil.example.com` that resolves to `127.0.0.1` is caught here even though the hostname itself looks harmless — string matching on the hostname alone would miss this entirely.
4. The check runs again implicitly on every retry, since `fetch()` itself is only ever called against the pre-validated `URL` object, not re-resolved mid-flight in a way that bypasses the guard.

`ALLOW_PRIVATE_TARGETS=true` exists purely as a local-development escape hatch (so you can monitor `http://localhost:3001` while developing) and defaults to `false`.

## 18. Role-Based Access & Email Alerts

**Role-based access:** every user has a `role` of `USER` (default) or `ADMIN` on the `users` table. A `requireAdmin` middleware, layered after `requireAuth`, protects two endpoints:

- `GET /api/dashboard/admin/overview` — platform-wide stats (total users, total URLs, global up/down/uptime/failures/average response time) aggregated across every account in one query.
- `GET /api/urls/admin/all` — every monitored URL from every user, each annotated with its owner's name and email.

The frontend mirrors this: an "Admin" link only renders in the nav when `user.role === 'ADMIN'`, and an `AdminRoute` guard redirects a non-admin who navigates to `/admin` directly back to `/dashboard` — but the real enforcement is server-side; the frontend check is a UX convenience, not the security boundary.

**Email alerts:** `jobs/monitor-runner.ts` tracks `consecutiveFails` per URL (already incremented atomically alongside every check result in `check-result.repository.ts`). The moment that counter reaches `ALERT_FAILURE_THRESHOLD` (default 3) it fires exactly once — not on every subsequent failed check — via `utils/mailer.ts`, a thin Nodemailer wrapper. If `SMTP_HOST`/`SMTP_PORT` aren't set, the mailer logs that it would have sent an alert and returns cleanly rather than throwing, so local development never requires a real mail server.

## 19. Local Setup

Prerequisites: Node.js 20+, PostgreSQL 16 (or use Docker for it — see Section 20).

```bash
git clone <repo-url> probe && cd probe
cp .env.example backend/.env      # then edit DATABASE_URL / JWT_SECRET
cp frontend/.env.example frontend/.env

cd backend
npm install
npx prisma migrate deploy         # applies the schema
npm run seed                      # optional: demo user + 3 sample URLs
npm run dev                       # API on :4000, including the job queue and scheduler

# in a second terminal
cd frontend
npm install
npm run dev                       # UI on :5173
```

Seeded demo login: `demo@urlwatch.dev` / `Password123`.

To try admin-only views, promote a user's role to `ADMIN` directly in Postgres (`UPDATE users SET role = 'ADMIN' WHERE email = '...'`), then log out and back in — the JWT bakes in the role at login time, so a stale session won't reflect the change until you re-authenticate.

## 20. Docker Setup

```bash
cp .env.example .env              # edit JWT_SECRET at minimum
docker compose up --build
```

This starts Postgres, the API (which runs `prisma migrate deploy` on boot), and the frontend (served by nginx, reverse-proxying `/api` and `/socket.io` to the backend). Frontend: `http://localhost:5173`. API health check: `http://localhost:4000/health`.

## 21. Environment Variables

See [`.env.example`](.env.example) (root, for Docker Compose) and [`backend/.env.example`](backend/.env.example) (full list for local dev). Key ones:

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | — (required) |
| `JWT_SECRET` | Signing secret, 32+ chars | — (required) |
| `MAX_CONCURRENT_CHECKS` | In-process worker pool size | `10` |
| `MONITOR_INTERVAL` | Scheduled sweep interval, seconds | `300` |
| `REQUEST_TIMEOUT` | Per-check timeout, ms | `10000` |
| `ALLOW_PRIVATE_TARGETS` | Disable SSRF guard (dev only) | `false` |
| `ALERT_FAILURE_THRESHOLD` | Consecutive failures before a down-alert email fires | `3` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `ALERT_FROM_EMAIL` | Outbound mail config for down alerts — alerts log-and-skip if unset | — (optional) |

## 22. Testing

```bash
cd backend && npm test
```

34 tests across 6 files: SSRF guard (IP-range blocking, protocol/hostname rejection), error classification (every error type from the spec — DNS, timeout, connection refused, SSL, unknown), the bounded concurrency pool (never exceeds the limit, isolates per-task failures, preserves order), uptime math, and two Supertest suites hitting the real Express app with a mocked Prisma layer covering registration, login (including wrong-password rejection), protected-route enforcement, duplicate-URL rejection, cross-user access denial, and manual-check enqueueing.

Frontend: `cd frontend && npm run typecheck && npm run lint && npm run build` (component-level tests were judged lower-value than backend correctness tests for the time available; see Section 26).

## 23. Design Decisions

- **The API never runs a health check inline inside a request handler.** No route handler's call chain reaches `checkUrl(...)` directly — every check goes through `enqueueJob(...)` and is processed by a bounded background pool, so a slow or hanging check only occupies one slot in that pool instead of blocking the request that triggered it.
- **`url_stats` as a derived table** rather than computing uptime with `COUNT(*)` over `check_results` on every dashboard load. At scale (thousands of checks per URL), that aggregate would get slower every day; an incrementally-updated summary row stays O(1).
- **A single uptime formula** (`utils/serialize.ts#uptimePercentage`) imported everywhere it's needed, rather than reimplementing `successful/total*100` in the dashboard service and the URL-detail service separately — the spec explicitly calls out formula drift as a failure mode to avoid.
- **shadcn/ui pattern over a component library.** Radix primitives + Tailwind gives full control over the visual language (the spec explicitly penalizes "generic student-project UI") without the bundle weight of a full design-system package.
- **Admin authorization enforced at the middleware layer, not scattered per-controller.** `requireAdmin` is a single reusable Express middleware applied to specific routes, so "which endpoints are admin-only" is answerable by reading the route files, not by auditing every controller for an inline role check.

## 24. Tradeoffs

- **An in-process job queue rather than an external broker.** For a single-instance deployment, the properties that matter — checks never block requests, concurrency is bounded, one bad URL can't take down others — don't require a separate broker to achieve. The cost: the queue is in-memory, so a process restart drops any job that was queued but not yet started (it's picked up again on the next 5-minute sweep or a manual re-trigger — nothing is silently lost forever, just delayed), and this design does not scale horizontally as-is (see Section 25).
- **WebSockets over polling** — chosen because the spec listed it first and the win (a dashboard that updates itself, no manual refresh) is worth the small added complexity of a Socket.IO auth handshake. The tradeoff: if a viewer's WebSocket connection drops silently, they won't see updates until reconnect — mitigated by TanStack Query's `refetchInterval: 30000` as a safety-net polling layer underneath the socket, so the UI never fully depends on the socket staying connected.
- **A plain `setInterval` scheduler over a cron library** — at one scheduler instance inside one process, a library like `node-cron` would add a dependency without solving a problem `setInterval` doesn't already handle correctly here. This stops being sufficient the moment the API runs as multiple replicas (see Section 25).
- **In-memory metrics module instead of Prometheus/OpenTelemetry** — appropriately scoped for a single-instance assignment submission. A production deployment behind a load balancer would need these metrics centralized in a real metrics backend, since each process currently only knows its own counters.
- **No refresh-token rotation** — a single long-lived JWT (7 days) was chosen over an access/refresh pair to keep the auth surface reviewable in the time available. Documented here rather than hidden: a production system handling more sensitive data should add refresh rotation and revocation.

## 25. Scalability Considerations

- **The current job queue and scheduler are single-instance by design.** Running the API as N replicas today would mean N independent in-memory queues and N independent 5-minute timers, each sweeping the same active-URL list — duplicate checks, not corruption, but wasted work. Moving to multiple replicas would mean introducing a shared queue (e.g. a Postgres-backed job table) so exactly one replica claims each job.
- `check_results` is the table that grows unbounded; it's indexed for the query patterns that matter (`urlId, checkedAt DESC` for history, `checkedAt` alone for retention) and `HISTORY_RETENTION_DAYS` + `checkResultRepository.purgeOlderThan` exist for a future cleanup cron so the table doesn't grow forever.
- The dashboard summary query and the admin platform-overview query are both single aggregate SQL queries (`reports/repository/report.repository.ts`) rather than N+1 queries per URL, so they stay fast as the URL count grows.
- The API is otherwise stateless (JWT-based auth, no server-side session store), so authentication itself is already safe to run behind a load balancer with multiple replicas without sticky sessions — the job queue and scheduler are the one piece that currently assumes a single instance.

## 26. Future Improvements

- Refresh-token rotation and session revocation list.
- A shared, persisted job queue (e.g. a Postgres-backed job table) if this ever needs to run as multiple API replicas — see Section 25.
- Retention job wired into the scheduler (the repository function exists; it isn't scheduled yet).
- Frontend component/interaction tests (React Testing Library) alongside the backend test suite.
- Per-URL custom check intervals surfaced in the UI (the `intervalSec` column already exists on `monitored_urls`; only the scheduler currently treats all URLs uniformly at the global interval).
- Uptime SLA target configuration (e.g. "alert if uptime drops below 99.9% over 30 days") on top of the uptime percentage that's already tracked.

## 27. Healthcare Relevance

Probe itself is intentionally domain-agnostic — it monitors HTTP endpoints, not patients. The relevance is architectural: healthcare technology platforms typically depend on a wide mesh of external and internal APIs — insurance eligibility checks, lab result feeds, e-prescribing networks, identity verification, payment processors. When one of those integrations degrades or goes down, the downstream clinical or administrative workflow that depends on it is affected, often silently, until a person notices something isn't working.

The pattern this project demonstrates — continuous concurrent health checking, structured failure classification, historical latency tracking, and real-time alerting surface (including proactive email alerts on sustained failure) — is the same pattern that gives an engineering team the reliability visibility needed to detect a degraded integration before it becomes a support ticket, and to have response-time history on hand when diagnosing why. This is offered as contextual relevance for why the underlying engineering skills transfer, not as a claim about any specific internal system.

## 28. AI Usage

AI assistance (Claude, via Claude Code) was used throughout this project's development for:

- **Architecture brainstorming** — working through the bounded in-process job queue design, deciding where to put the SSRF guard in the request lifecycle, and how to keep the uptime formula in exactly one place.
- **Implementation assistance** — writing out the module boundaries (controller/service/repository) consistently across five backend modules, and the corresponding React feature-slice structure on the frontend.
- **Debugging** — diagnosing a Zod env-schema failure where empty-string environment variables (from a `.env` file with unset optional keys) failed `coerce.number()`/`min(1)` validation, and fixing it with a shared `optionalString()` preprocessor.
- **Edge-case identification** — enumerating the specific IPv4/IPv6 ranges an SSRF guard needs to block (including the commonly-missed IPv4-mapped IPv6 and cloud metadata link-local range), and the specific Node/undici error codes that map to each error classification.
- **Documentation** — this README.

All architectural decisions, tradeoffs, and the final code were reviewed and are understood by the author; AI did not autonomously design the system or validate its own output without review — typecheck, lint, and the full test suite were run and their actual output (not a description of expected output) is what's reported in Section 22.
