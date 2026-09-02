# HealthWatch — URL Health & Observability Platform

A full-stack, production-aware web platform that empowers software engineering teams to monitor URL availability, track response latencies, observe historical trends, and trigger alerts when outages occur.

Built with **Node.js, Express, Prisma ORM, PostgreSQL, React, Vite, Tailwind CSS, Recharts, node-cron, Nodemailer, and Pino**.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Technology Stack & Rationale](#technology-stack--rationale)
4. [Architecture Overview](#architecture-overview)
5. [Database Design & Relationships](#database-design--relationships)
6. [Core Engineering Flows](#core-engineering-flows)
   - [Monitoring & Health Check Flow](#monitoring--health-check-flow)
   - [Concurrent Checking Engine (`Promise.allSettled`)](#concurrent-checking-engine-promiseallsettled)
   - [Scheduled Monitoring (`node-cron`)](#scheduled-monitoring-node-cron)
   - [Email Alerts (UP → DOWN Transition)](#email-alerts-up--down-transition)
   - [Uptime SLA Calculation](#uptime-sla-calculation)
   - [Structured JSON Logging & Correlation IDs](#structured-json-logging--correlation-ids)
   - [API Rate Limiting](#api-rate-limiting)
   - [Security & SSRF Defense](#security--ssrf-defense)
7. [Local Setup Instructions](#local-setup-instructions)
8. [API Documentation](#api-documentation)
9. [Automated Testing](#automated-testing)
10. [CI/CD Pipeline (GitHub Actions)](#cicd-pipeline-github-actions)
11. [Design Decisions & Intentional Tradeoffs](#design-decisions--intentional-tradeoffs)
12. [Healthcare & Infrastructure Relevance](#healthcare--infrastructure-relevance)
13. [AI Usage Transparency](#ai-usage-transparency)
14. [Interview Defense & Q&A](#interview-defense--qa)

---

## 1. Project Overview

Modern digital services depend on tens or hundreds of external HTTP/HTTPS endpoints—payment gateways, third-party APIs, authentication providers, and internal microservices. When an endpoint experiences degradation or goes down, immediate visibility is essential to prevent user-facing disruptions.

**HealthWatch** is a lightweight, self-contained observability tool that:
- Periodically checks endpoints with sub-second accuracy.
- Visualizes latency curves and uptime statistics over time.
- Sends instant notifications when an endpoint transitions from **UP** to **DOWN**.
- Protects the hosting server from malicious requests via Server-Side Request Forgery (SSRF) filters and rate limiters.
- Avoids unnecessary operational overhead by running as a cohesive, single-service backend without separate queue brokers or external caching servers.

---

## 2. Key Features

- **Secure Authentication**: User signup and login powered by `bcrypt` (10 salt rounds) and stateless `JSON Web Tokens` (JWT).
- **Multi-Tenant User Isolation**: Users can only view, monitor, check, or delete URLs that belong to their own account.
- **Concurrent URL Health Checks**: Non-blocking ping engine using `Promise.allSettled()`. One hanging or unreachable URL never delays or blocks others.
- **Configurable Scheduling**: Automatic periodic checks (1, 2, 5, 10, 15, 30, 60 minutes) scheduled via `node-cron`.
- **Manual "Check Now"**: Immediate on-demand health check with live latency calculation.
- **Bulk JSON Import**: Import dozens of endpoints via `.json` file upload or direct text paste with syntax and SSRF verification.
- **State Transition Email Alerts**: Alerts are sent on **UP → DOWN** transition to eliminate notification spam, with automatic recovery emails on **DOWN → UP**.
- **Observability & Analytics**:
  - Check-based uptime calculation: `(successful checks / total checks) * 100`.
  - Average latency in milliseconds.
  - Interactive Recharts response-time area charts.
  - Visual UP/DOWN chronological status strip.
- **Live Dashboard Polling**: Real-time updates every 12 seconds with pause/resume toggle, completely avoiding WebSocket complexity.
- **Defensive Security & SSRF Protection**: Strict validation preventing requests to `localhost`, `127.0.0.1`, private RFC1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and AWS/GCP cloud metadata IP (`169.254.169.254`).
- **Structured JSON Logging**: Pino logger with ISO timestamps, correlation IDs (`x-correlation-id`), log levels (`info`, `warn`, `error`), and sensitive field redaction.
- **Automated CI/CD**: GitHub Actions workflow running tests and production builds on every push and pull request.

---

## 3. Technology Stack & Rationale

| Layer | Technology | Why Selected |
|---|---|---|
| **Frontend** | React 18 + Vite | Fast HMR, component-driven UI, zero build bloat, rapid rendering. |
| **Styling** | Tailwind CSS | Utility-first styling for a clean, consistent, developer-tool dark theme. |
| **Routing** | React Router v6 | Client-side routing with route guards for authenticated views. |
| **Data Viz** | Recharts | Composable SVG-based chart library built specifically for React. |
| **HTTP Client** | Axios | Automatic JSON serialization and centralized interceptors for JWT injection and 401 handling. |
| **Backend** | Node.js + Express | Lightweight, event-driven I/O model well-suited for high-concurrency network polling. |
| **Database** | PostgreSQL | Robust relational database ensuring ACID guarantees, foreign key integrity, and indexed timestamp queries. |
| **ORM** | Prisma ORM | Type-safe schema definition, automated migrations, and intuitive query API. |
| **Scheduler** | node-cron | Pure in-process cron scheduling; avoids running an external scheduler daemon. |
| **Authentication** | JWT + bcrypt | Industry standard stateless token auth and irreversible password hashing. |
| **Logging** | Pino | High-performance, low-overhead structured JSON logger. |
| **Email** | Nodemailer | Standard, zero-dependency SMTP email client. |
| **Rate Limiting** | express-rate-limit | In-memory IP rate limiting to prevent brute-force attacks and abuse. |
| **CI/CD** | GitHub Actions | Native GitHub integration for automated verification and regression prevention. |

---

## 4. Architecture Overview

The system operates as a unified client-server architecture:

```
                            +--------------------------+
                            |       User Browser       |
                            |   React 18 + Vite (SPA)  |
                            +--------------------------+
                                       |
                   HTTP Requests / REST API (with Bearer JWT)
                   + 12s Polling for Real-Time Telemetry
                                       v
                            +--------------------------+
                            |     Express API Server   |
                            |                          |
                            |  [Helmet / CORS / Limit] |
                            |  [Request Logger / UUID] |
                            |  [Auth Middleware (JWT)] |
                            +--------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
          [Controller & Services]                  [node-cron Engine]
                   |                                       |
                   |                              Trigger checks every min
                   v                                       |
        +-----------------------+                          v
        |  Health Check Engine  |<-------------------------+
        |  (Promise.allSettled) |
        +-----------------------+
            |               |
   SSRF Verified      State Changed (UP -> DOWN)?
   HTTP/HTTPS Ping          |
            |               v
            |       [Nodemailer Alert]
            v
        +-----------------------+
        |      Prisma ORM       |
        +-----------------------+
                   |
                   v
        +-----------------------+
        |   PostgreSQL Database |
        |  (Users, URLs, Checks)|
        +-----------------------+
```

---

## 5. Database Design & Relationships

The relational schema is defined in `backend/prisma/schema.prisma` using three core entities:

```
+--------------------------------+
|             User               |
+--------------------------------+
| id            String (PK, UUID)|
| email         String (Unique)  |
| passwordHash  String           |
| createdAt     DateTime         |
| updatedAt     DateTime         |
+--------------------------------+
               | 1
               |
               | has many
               v *
+--------------------------------+
|          MonitoredURL          |
+--------------------------------+
| id            String (PK, UUID)|
| userId        String (FK)      | ----> [Index: userId]
| name          String           |
| url           String           |
| checkInterval Int (default: 5) |
| isActive      Boolean (true)   |
| alertEnabled  Boolean (true)   |
| createdAt     DateTime         |
| updatedAt     DateTime         |
+--------------------------------+
               | 1
               |
               | has many
               v *
+--------------------------------+
|          CheckResult           |
+--------------------------------+
| id            String (PK, UUID)|
| urlId         String (FK)      | ----> [Index: urlId]
| status        String (UP/DOWN) |
| statusCode    Int?             |
| responseTime  Int (ms)         |
| errorMessage  String?          |
| checkedAt     DateTime         | ----> [Index: checkedAt]
+--------------------------------+       [Composite: urlId, checkedAt]
```

### Cascade Rules & Indexing
- **Cascade Deletions**: Deleting a `User` cascades to all `MonitoredURL`s. Deleting a `MonitoredURL` cascades to all related `CheckResult` entries.
- **Indexes**:
  - `monitored_urls(userId)`: Fast retrieval of all URLs belonging to a user.
  - `check_results(urlId)`: Fast aggregation of check history per URL.
  - `check_results(checkedAt)`: Efficient chronological sorting for dashboards and charts.
  - `check_results(urlId, checkedAt)`: Composite index optimizing subqueries that retrieve the latest check result for each monitored endpoint.

---

## 6. Core Engineering Flows

### Monitoring & Health Check Flow
For every check:
1. **SSRF Guard**: Verify destination protocol is HTTP/HTTPS and hostname does not point to internal, loopback, or cloud metadata IP ranges.
2. **Timer Start**: Record high-precision timestamp using `performance.now()`.
3. **HTTP Dispatch**: Issue `fetch()` with custom User-Agent and an `AbortController` timeout (default 8,000ms).
4. **Latency Measurement**: Calculate `responseTime = Math.round(performance.now() - startTime)`.
5. **Status Classification**:
   - Status code `200–299` → **`UP`** (status code recorded, `errorMessage: null`).
   - Status code `>= 300` → **`DOWN`** (status code recorded, `errorMessage: HTTP status ${code}`).
   - Network / DNS failure (`ENOTFOUND`) → **`DOWN`** (code `null`, error recorded).
   - Connection refused (`ECONNREFUSED`) → **`DOWN`** (code `null`, error recorded).
   - Timeout (`AbortError`) → **`DOWN`** (code `null`, `errorMessage: Request timed out after 8000ms`).
6. **Result Persistence**: Write new `CheckResult` row to PostgreSQL.
7. **Alert Evaluation**: Compare current status against previous check.

### Concurrent Checking Engine (`Promise.allSettled`)
Rather than checking URLs sequentially in a loop:
```javascript
// A single failed/slow check will NEVER block other checks
const checkPromises = urlRecords.map(urlRecord => executeCheckForUrl(urlRecord));
const settledResults = await Promise.allSettled(checkPromises);
```
- Using `Promise.allSettled()` ensures that even if URL #1 takes 8 seconds and times out, URLs #2 and #3 resolve immediately without delay or unhandled rejections.

### Scheduled Monitoring (`node-cron`)
- Runs every minute (`* * * * *`).
- Queries all active URLs (`isActive: true`).
- Evaluates which URLs are due for execution:
  `elapsedMs = now - lastCheckTimestamp; if (elapsedMs >= checkIntervalMs) -> check`
- Executes due URLs in a single concurrent batch.
- Includes a re-entrancy lock (`isJobRunning`) to prevent overlapping executions if a previous batch is still finishing.

### Email Alerts (UP → DOWN Transition)
To prevent inbox flooding:
1. When a check returns **`DOWN`**, the engine inspects the previous check for that URL.
2. If `previousStatus === 'UP'` and `currentStatus === 'DOWN'`, an alert email is sent via Nodemailer.
3. If the URL remains **`DOWN`** on subsequent checks, **no additional alert is sent**.
4. When the URL returns to **`UP`**, a **Recovery Notification** is triggered.
5. If email credentials are not configured in `.env`, the alert is logged cleanly without throwing exceptions.

### Uptime SLA Calculation
Check-based availability formula:
$$\text{Uptime Percentage} = \left(\frac{\text{Successful Checks (UP)}}{\text{Total Checks}}\right) \times 100$$
- If an endpoint has 0 checks recorded yet, uptime is reported as `100%`.
- If 95 out of 100 checks are UP, uptime is `95.0%`.

### Structured JSON Logging & Correlation IDs
Every incoming HTTP request is assigned a unique `x-correlation-id` (UUID v4) via middleware:
```json
{
  "level": "info",
  "event": "health_check_completed",
  "correlationId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "urlId": "b1d44c80-60b6-4f40-8430-c3d31b01a14a",
  "urlName": "Payment Gateway",
  "status": "UP",
  "statusCode": 200,
  "responseTime": 134,
  "timestamp": "2026-09-02T18:00:00.123Z"
}
```
Sensitive data (passwords, JWT secrets, authorization headers) is automatically redacted.

### API Rate Limiting
- **Authentication Endpoints** (`/api/auth/*`): Restricted to **15 attempts per 15 minutes** per IP to prevent brute-force credential stuffing.
- **General API Endpoints** (`/api/*`): Restricted to **100 requests per 15 minutes** per IP to prevent resource exhaustion.
- Exceeded limits return HTTP `429 Too Many Requests` with a descriptive message.

### Security & SSRF Defense
Because users can register arbitrary URLs, the platform includes explicit Server-Side Request Forgery (SSRF) protection:
- Enforces strict protocol validation: only `http:` and `https:` are permitted (`file://`, `gopher://`, `ftp://` are rejected).
- Blocks hostnames resolving to `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, `.local`, or `.internal`.
- Inspects IPv4 literals and blocks:
  - Loopback (`127.0.0.0/8`)
  - RFC 1918 Private Ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  - Cloud Metadata / Link-Local (`169.254.0.0/16`, specifically AWS/GCP `169.254.169.254`)
- Additional standard security layers: `Helmet` for secure HTTP headers, `CORS` restricted origins, and `bcrypt` 10-round salted password hashes.

---

## 7. Local Setup Instructions

### Prerequisites
- **Node.js**: v18 or higher (v20+ recommended).
- **PostgreSQL**: Local or hosted database instance.

### 1. Clone the Repository
```bash
git clone <repository-url>
cd healthcare
```

### 2. Configure PostgreSQL
If PostgreSQL is not running locally on macOS:
```bash
brew install postgresql@16
brew services start postgresql@16
createdb healthwatch
```

### 3. Setup Backend Environment
```bash
cd backend
cp .env.example .env
```
Ensure `backend/.env` points to your PostgreSQL instance:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/healthwatch?schema=public"
JWT_SECRET="your-super-secret-key-replace-in-production-min-32-chars"
PORT=5000
```

### 4. Install Dependencies & Run Migrations
```bash
# In backend/
npm install
npx prisma generate
npx prisma db push
```

### 5. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### 6. Start the Development Servers
In Terminal 1 (Backend):
```bash
cd backend
npm run dev
# Backend runs at http://localhost:5000
```

In Terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# Frontend runs at http://localhost:5173
```

Visit `http://localhost:5173` in your browser to access the dashboard.

---

## 8. API Documentation

All protected endpoints require an `Authorization: Bearer <jwt_token>` header.

### Authentication

#### `POST /api/auth/signup`
Register a new user account.
```json
// Request
{
  "email": "developer@example.com",
  "password": "Password123!"
}

// Response (201 Created)
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "user": {
      "id": "c1f7b0a2-...",
      "email": "developer@example.com",
      "createdAt": "2026-09-02T18:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
}
```

#### `POST /api/auth/login`
Authenticate and receive a JWT.
```json
// Request
{
  "email": "developer@example.com",
  "password": "Password123!"
}

// Response (200 OK)
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "c1f7b0a2-...",
      "email": "developer@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5..."
  }
}
```

---

### URL Management

#### `GET /api/urls`
List all monitored URLs owned by the authenticated user with current status and metrics.
```json
// Response (200 OK)
{
  "success": true,
  "data": [
    {
      "id": "b1d44c80-...",
      "name": "Google",
      "url": "https://www.google.com",
      "checkInterval": 5,
      "isActive": true,
      "alertEnabled": true,
      "currentStatus": "UP",
      "statusCode": 200,
      "responseTime": 112,
      "uptimePercentage": 100,
      "avgResponseTime": 115,
      "totalChecks": 12,
      "failureCount": 0,
      "lastCheckedAt": "2026-09-02T18:05:00.000Z"
    }
  ]
}
```

#### `POST /api/urls`
Add a new URL to monitor. Automatically triggers an immediate initial check.
```json
// Request
{
  "name": "GitHub Status",
  "url": "https://www.githubstatus.com",
  "checkInterval": 5,
  "alertEnabled": true
}
```

#### `GET /api/urls/:id`
Retrieve detailed telemetry, metrics, and recent checks for a specific URL.

#### `DELETE /api/urls/:id`
Remove a monitored URL and cascade-delete its check history.

#### `POST /api/urls/:id/check`
Trigger an immediate manual health check.
```json
// Response (200 OK)
{
  "success": true,
  "message": "Health check completed",
  "data": {
    "status": "UP",
    "statusCode": 200,
    "responseTime": 142,
    "errorMessage": null,
    "checkedAt": "2026-09-02T18:10:00.000Z"
  }
}
```

#### `GET /api/urls/:id/history?limit=50`
Retrieve chronological check history logs for charts and tabular logs.

#### `POST /api/urls/import`
Import multiple URLs from a JSON array. Accepts either objects or plain string URLs.
```json
// Request
[
  { "name": "Google", "url": "https://www.google.com" },
  { "name": "GitHub", "url": "https://www.github.com" }
]

// Response (200 OK)
{
  "success": true,
  "message": "Import completed: 2 added, 0 failed",
  "data": {
    "importedCount": 2,
    "failedCount": 0,
    "createdUrls": [...],
    "errors": []
  }
}
```

#### `GET /api/dashboard/stats`
Retrieve aggregated dashboard metrics (Total URLs, UP, DOWN, Uptime %, Avg Latency, Failures).

---

## 9. Automated Testing

The backend includes a comprehensive Jest test suite covering security, authentication, math logic, and HTTP endpoints.

Run the test suite:
```bash
cd backend
npm test
```

### Test Coverage Summary
- `ssrf.test.js`: Validates private IPv4 subnets, localhost, 127.0.0.1, 169.254.169.254 cloud metadata, invalid protocols (`file://`, `ftp://`), and verifies legitimate public URLs pass.
- `uptime.test.js`: Verifies the check-based uptime formula `(successful / total) * 100`, handling 0 checks, 100% uptime, 0% uptime, and 95% ratio.
- `healthCheck.test.js`: Verifies 200-299 marked as `UP`, 404/500 marked as `DOWN`, timeout (`AbortError`) handling, and DNS failure (`ENOTFOUND`) handling.
- `auth.test.js`: Verifies email format validation, bcrypt password hashing salt rounds, JWT signing, and signature verification.
- `api.test.js`: Verifies `/api/health`, 401 unauthenticated route rejection, correlation ID generation, and 404 handler.

---

## 10. CI/CD Pipeline (GitHub Actions)

Located at `.github/workflows/ci.yml`.

Every `push` and `pull_request` to `main` automatically triggers:
1. **Node.js Setup**: Prepares Node 20 environment with npm caching.
2. **Backend Quality Stage**:
   - `npm ci`
   - `npx prisma generate`
   - `npm test` (Runs automated test suite)
3. **Frontend Build Stage**:
   - `npm ci`
   - `npm run build` (Ensures zero compilation or JSX syntax errors)

---

## 11. Design Decisions & Intentional Tradeoffs

To meet the 48-hour deadline and ensure the system remains easy to run, understand, and explain in an interview, several technologies were **intentionally omitted**:

| Technology | Why It Was NOT Used | How It Was Handled Instead |
|---|---|---|
| **Docker** | Adds container virtualization overhead, slow image builds, and port-forwarding issues during rapid evaluation. | Pure native Node.js and PostgreSQL commands that run directly in any standard dev environment. |
| **Redis** | Introducing an in-memory key-value server introduces an extra external dependency and operational failure point. | In-memory `express-rate-limit` and database queries backed by PostgreSQL composite indexes. |
| **BullMQ / Kafka** | Heavyweight distributed message queues add operational complexity and require Redis or cluster managers. | Asynchronous concurrency with native `Promise.allSettled()` and scheduled batch processing via `node-cron`. |
| **WebSockets (Socket.IO)** | WebSockets require connection heartbeat management, sticky sessions, reconnect logic, and complex state synchronization. | Clean **10–15s client-side polling** via custom `usePolling` hook. This provides fresh data with zero connection leakage. |
| **Microservices** | Splitting into separate worker/API services introduces network hops, cross-service serialization, and orchestration hurdles. | **Cohesive modular monolith** where the cron scheduler, health check service, and REST API live together in one clean process. |

> **Interview Talking Point**:
> *"If this platform scaled to 500,000 URLs, we would naturally decouple the monitoring engine into distributed worker pods consuming from a Redis/RabbitMQ queue with Redis caching for rate limits. But for our current scale of hundreds of URLs, native `Promise.allSettled()` with `node-cron` achieves high concurrency with zero external infrastructure overhead."*

---

## 12. Healthcare & Infrastructure Relevance

This application is **not** a clinical or patient monitoring system.

Instead, it demonstrates the critical **reliability, uptime, and observability concepts** upon which modern healthcare platforms (such as Labstack and telemedicine providers) depend:
- Healthcare organizations integrate with disparate external services: diagnostic laboratory APIs, electronic health record (EHR) exchanges, pharmacy ordering gateways, and doctor scheduling APIs.
- If a diagnostic laboratory API goes down or experiences latency spikes, patient test orders fail silently unless real-time health telemetry detects the outage.
- This platform demonstrates how to build resilient monitoring services that detect endpoint outages, measure latency SLAs, prevent cascading network failures through timeouts, and alert site-reliability engineers immediately.

---

## 13. AI Usage Transparency

In accordance with professional engineering standards:
- AI tools were utilized during development for rapid scaffolding, test case generation, boilerplate reduction, and documentation structuring.
- Every architectural decision, database model, SSRF policy, concurrency strategy, and error-handling pattern was reviewed, verified, and understood by the developer.

---

## 14. Interview Defense & Q&A

Here are direct questions interviewers may ask about this project, along with simple answers based **strictly on the technologies actually used**:

#### Q1: Why did you use `Promise.allSettled()` instead of `Promise.all()` for concurrent checks?
**Answer**: `Promise.all()` rejects immediately if any single promise fails ("fail-fast"). If one monitored URL had a DNS failure or timed out, `Promise.all()` would abort the entire batch and drop results for the other healthy URLs. `Promise.allSettled()` waits for all requests to finish regardless of success or failure, allowing us to record results for every URL independently.

#### Q2: How did you measure URL response time accurately?
**Answer**: We record the start time using Node's `performance.now()`, issue the HTTP `fetch()` request, and calculate the delta `Math.round(performance.now() - startTime)` once the response headers arrive. This measures network roundtrip time in milliseconds.

#### Q3: How do you prevent notification spam when an endpoint stays down?
**Answer**: Our health check service compares the current check result against the immediately preceding check for that URL. We only send a downtime email when the state transitions from `UP` to `DOWN`. If subsequent checks remain `DOWN`, no duplicate emails are sent until the endpoint recovers (`DOWN` to `UP`).

#### Q4: What is SSRF and how does your application prevent it?
**Answer**: Server-Side Request Forgery (SSRF) occurs when an attacker inputs an internal address (like `http://localhost:5000` or `http://169.254.169.254`) causing the server to fetch sensitive internal data or cloud instance metadata. We prevent this by inspecting every submitted URL before making an HTTP call: we require `http:` or `https:`, block loopback addresses (`127.0.0.1`, `localhost`), block private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and block the cloud metadata IP (`169.254.169.254`).

#### Q5: Why did you choose client-side polling instead of WebSockets?
**Answer**: WebSockets add significant architectural complexity: connection heartbeat pings, memory leaks from open sockets, proxy buffering issues, and reconnect state machines. A clean 10–12 second polling interval with a custom React hook gives users near-real-time visibility with standard cacheable HTTP `GET` requests, perfectly satisfying the requirement without over-engineering.

#### Q6: How do you ensure users cannot view or delete other users' URLs?
**Answer**: Every URL query in Prisma explicitly scopes by `userId: req.user.id` (extracted securely from the validated JWT). Even if a malicious user guesses another user's URL UUID, the database query `findFirst({ where: { id: urlId, userId } })` returns `null` and the API responds with a `404 Not Found`.
