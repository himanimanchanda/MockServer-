# 🚀 Mock Server Platform

> Enterprise-grade API mocking platform with dynamic routing, audit trails, Redis caching, and a beautiful React dashboard.
> Built with **Spring Boot 3** + **PostgreSQL** + **Redis** + **React/Vite** — fully Dockerized.

---

## 📋 Table of Contents

- [Architecture](#architecture)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development](#local-development)
- [API Reference](#api-reference)
- [Postman / cURL Testing](#postman--curl-testing)
- [Features](#features)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │
│  React/Vite  │     │ Spring Boot  │     │   Database   │
│  (port 3000) │     │  (port 8080) │     │  (port 5432) │
└──────────────┘     └──────┬───────┘     └──────────────┘
                            │
                     ┌──────▼───────┐
                     │    Redis     │
                     │    Cache     │
                     │  (port 6379) │
                     └──────────────┘
```

| Component | Tech | Purpose |
|-----------|------|---------|
| Backend | Spring Boot 3, Java 17 | REST API, mock engine, audit |
| Frontend | React 18, Vite, Tailwind CSS | Dashboard UI |
| Database | PostgreSQL 15 | Persistent storage |
| Cache | Redis 7 | Mock routing cache |
| Proxy | Nginx | Frontend static + API reverse proxy |

---

## 🐳 Quick Start (Docker)

```bash
# 1. Clone and navigate
cd mock-server-platform8\ \(1\)/

# 2. Build and start everything
docker compose up --build -d

# 3. Wait for backend health (takes ~30-45 seconds on first boot)
docker compose logs -f backend

# 4. Access the application
#    Frontend:  http://localhost:3000  (or http://localhost:80)
#    Backend:   http://localhost:8080
#    Health:    http://localhost:8080/actuator/health
```

### What Happens on First Boot
- PostgreSQL schema auto-created via Hibernate DDL
- **5 demo projects** seeded (Ecommerce, Payments, Telecom, Healthcare, Fintech)
- **30 mock endpoints** created across DEV/QA/PROD environments
- **50 request logs** pre-populated
- **30 audit trail entries** generated
- Redis cache warmed on first request

### Stop & Cleanup
```bash
docker compose down           # stop
docker compose down -v        # stop + delete database volumes
```

---

## 💻 Local Development

### Prerequisites
- Java 17+
- Node.js 18+
- PostgreSQL 15 (or Docker for just the DB)
- Redis 7 (or Docker)

### Backend
```bash
cd mock-server-backend
./mvnw spring-boot:run
# Runs on http://localhost:8080
```

### Frontend
```bash
cd mock-server-frontend
npm install
npm run dev
# Runs on http://localhost:5173 with auto-proxy to backend
```

> **Note:** The Vite dev server auto-proxies all API requests (`/api/*`, `/projects`, `/routes`, etc.) to `http://localhost:8080`. No CORS issues, no env vars needed.

### Run Tests
```bash
cd mock-server-backend
./mvnw test
# Uses H2 in-memory DB — no PostgreSQL/Redis needed
```

---

## 📡 API Reference

### Management APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/mocks` | List all mocks |
| `POST` | `/api/mocks` | Create a mock |
| `PUT` | `/api/mocks/{id}` | Update a mock |
| `DELETE` | `/api/mocks/{id}` | Soft-delete a mock |
| `GET` | `/api/mocks/search?query=` | Search mocks |
| `GET` | `/api/mocks/trash` | List deleted mocks |
| `POST` | `/api/mocks/{id}/recover` | Recover deleted mock |
| `POST` | `/api/mocks/import` | Bulk import mocks |
| `GET` | `/projects` | List projects |
| `POST` | `/projects` | Create project |
| `DELETE` | `/api/projects/{id}` | Delete project + its mocks |
| `GET` | `/api/logs?limit=200` | Request logs |
| `GET` | `/api/audit-logs?page=0&size=20` | Audit trail (paginated) |
| `POST` | `/auth/register` | Register user |
| `POST` | `/auth/login` | Login (get JWT) |
| `GET` | `/actuator/health` | Health check |

### Mock Engine (Catch-All)
Any request to a path that matches a registered mock endpoint will return the mocked response:
```
GET  /demo/health              → 200 {"ok":true,"service":"mock-server"}
GET  /demo/products/42         → 200 {"id":"42","name":"Premium Widget",...}
POST /demo/payments            → 201 {"transactionId":"...","status":"PENDING"}
```

---

## 🧪 Postman / cURL Testing

**Auth is DISABLED by default** — all endpoints work without any token.

### Health Check
```bash
curl http://localhost:8080/actuator/health
```

### List Projects
```bash
curl http://localhost:8080/projects
```

### List All Mocks
```bash
curl http://localhost:8080/api/mocks
```

### Create a Mock
```bash
curl -X POST http://localhost:8080/api/mocks \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<UUID from /projects>",
    "endpoint": "/test/hello",
    "method": "GET",
    "responseBody": "{\"message\":\"Hello World!\"}",
    "statusCode": 200
  }'
```

### Hit the Mock (Test It)
```bash
curl http://localhost:8080/test/hello
# Response: {"message":"Hello World!"}
```

### Dynamic Path Params
```bash
curl http://localhost:8080/demo/products/42
# Response: {"id":"42","name":"Premium Widget","price":99.99,...}

curl http://localhost:8080/demo/projects/abc/users/u1/orders/o9
# Response: {"projectId":"abc","userId":"u1","orderId":"o9",...}
```

### Create a Project
```bash
curl -X POST http://localhost:8080/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My New Project"}'
```

### View Logs
```bash
curl "http://localhost:8080/api/logs?limit=50"
```

### View Audit Trail
```bash
curl "http://localhost:8080/api/audit-logs?page=0&size=20"
```

### Environment-Specific Mocks
```bash
# Hit the QA version of /demo/health
curl -H "X-Environment: QA" http://localhost:8080/demo/health
# Response: {"ok":true,"service":"mock-server","env":"QA"}

# Hit the PROD version
curl -H "X-Environment: PROD" http://localhost:8080/demo/health
# Response: {"ok":true,"service":"mock-server","env":"PROD","region":"us-east-1"}
```

### Error Response Demos
```bash
curl http://localhost:8080/demo/not-found       # 404
curl -X POST http://localhost:8080/demo/validate # 400 with field errors
curl http://localhost:8080/demo/server-error     # 500 with traceId
curl http://localhost:8080/demo/redirect         # 302 redirect
```

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Dynamic Routing** | Path params like `/users/{id}` auto-extracted and injected into responses |
| **Nested Routes** | Multi-segment dynamic paths: `/projects/{p}/users/{u}/orders/{o}` |
| **Dynamic Templates** | Use `{uuid}`, `{now}`, `{randomInt}`, `{randomName}` in response bodies |
| **Environment Isolation** | DEV / QA / PROD — same endpoint, different responses per env |
| **Redis Cache** | All mock routing backed by Redis for sub-ms lookups |
| **Audit Trail** | Every CREATE / UPDATE / DELETE / RECOVER tracked with timestamp + actor |
| **Request Logging** | Every mock hit logged (async, non-blocking) with request/response details |
| **Soft Delete + Recover** | Deleted mocks go to trash and can be restored |
| **Pagination** | Frontend mock list paginates at 10 per page; audit trail server-side paged |
| **Postman Import/Export** | Import Postman collections; export mocks as Postman collection JSON |
| **Delay Simulation** | Configurable response delay (delayMs) for latency testing |
| **Custom Headers** | Set request match headers, query params, and response headers per mock |
| **Theme Toggle** | Light / Dark mode in the UI |
| **CRUD via API** | Full REST API for programmatic mock management |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/mockserver` | PostgreSQL JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `mock_user` | DB username |
| `SPRING_DATASOURCE_PASSWORD` | `mock_password` | DB password |
| `SPRING_REDIS_HOST` | `localhost` | Redis host |
| `SPRING_REDIS_PORT` | `6379` | Redis port |
| `MOCKSERVER_AUTH_ENABLED` | `false` | Enable/disable JWT auth |
| `MOCKSERVER_DEMO_SEED` | `true` | Seed demo data on empty DB |
| `MOCKSERVER_JWT_SECRET` | (built-in) | JWT signing secret |
| `SERVER_SERVLET_CONTEXT_PATH` | (empty) | Optional API prefix like `/api/v1` |
| `VITE_API_BASE_URL` | (empty) | Frontend API base URL (empty = relative/proxied) |

---

## 🔧 Troubleshooting

### Backend won't start
```bash
# Check logs
docker compose logs backend

# Common fix: wait for PostgreSQL
docker compose restart backend
```

### Frontend shows blank page
```bash
# Check nginx logs
docker compose logs frontend

# Verify backend is healthy
curl http://localhost:8080/actuator/health
```

### 403 Forbidden in Postman
- Ensure `MOCKSERVER_AUTH_ENABLED=false` (default)
- Do NOT send `Authorization` header unless you have a valid JWT
- Remove any custom headers like `ldev: true`

### Mock not matching
- Check the endpoint path matches exactly (including leading `/`)
- Check the HTTP method matches
- Check the environment header: `X-Environment: DEV` (default is DEV)
- Check logs: `GET /api/logs?limit=10` — look for `matched: false`

### Redis connection error
```bash
# Verify Redis is running
docker compose ps redis
redis-cli ping  # should return PONG
```

---

## 📄 License

Internal / Proprietary — Built for enterprise deployment.
