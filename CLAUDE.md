# CLAUDE.md — PayFlow Demo (Docker version)

Banking demo application: real-time interbank payment processing with live fraud detection.
Spring Boot 3.5 + React + RabbitMQ + Redis + PostgreSQL + Prometheus/Grafana.
GitHub: https://github.com/zahooruk2022/payflow-demo

**Cloud Foundry version:** `../payflow-demo-cf/` — same codebase, single `cf push`.

---

## Commands

```bash
# Start infrastructure (Postgres, RabbitMQ, Redis, Prometheus, Grafana)
docker compose up -d

# Start backend (http://localhost:8080)
cd backend && mvn spring-boot:run

# Start frontend dev server (http://localhost:5173)
cd frontend && npm install && npm run dev

# Build backend jar
cd backend && mvn clean package -DskipTests

# Run backend tests
cd backend && mvn test
```

**Monitoring URLs (when Docker stack is running):**
- RabbitMQ management UI: http://localhost:15672 (guest/guest)
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin) — PayFlow dashboard auto-provisioned

---

## Architecture

```
Browser (React + Tailwind :5173)
  │  POST /api/payments
  ▼
Spring Boot REST API (:8080)
  │  async publish
  ▼
RabbitMQ (payflow.exchange → payment.queue / payment.dlq)
  │  @RabbitListener
  ▼
PaymentConsumer → FraudDetectionService (Redis sliding window)
  │  WebSocket broadcast
  ▼
/topic/transactions · /topic/fraud-alerts · /topic/stats
  │
  ▼
Browser (live updates, no page refresh)
```

---

## Key files

| File | Purpose |
|---|---|
| `backend/src/main/resources/application.yml` | All config — datasource, RabbitMQ, Redis, fraud thresholds |
| `backend/src/main/resources/data.sql` | Seed: 6 fictional bank accounts loaded on every startup |
| `backend/src/main/java/.../service/FraudDetectionService.java` | Redis sliding-window fraud rules |
| `backend/src/main/java/.../service/PaymentMetricsService.java` | Micrometer counters + timers for Prometheus |
| `frontend/src/components/Dashboard.jsx` | Main dashboard — 5-row layout with all widgets |
| `frontend/src/hooks/useWebSocket.js` | STOMP/SockJS WebSocket subscription |
| `frontend/vite.config.js` | Dev proxy (`/api`, `/actuator`, `/ws` → :8080) |
| `monitoring/grafana/provisioning/dashboards/payflow.json` | Auto-provisioned 12-panel Grafana dashboard |
| `docker-compose.yml` | Postgres + RabbitMQ + Redis + Prometheus + Grafana |
| `architecture.html` | Interactive clickable architecture diagram |

---

## Important notes

- **Fictional banks only** — seed data uses made-up names (Albion, Meridian, Crestfield, Harrington, Caledonian, Vantage). Do not introduce real bank names.
- **DDL auto: create-drop** — database schema and seed data are recreated on every backend restart.
- **WebSocket shape vs REST shape** — REST returns nested JPA entities (`txn.senderAccount.name`); WebSocket broadcasts flat DTOs (`txn.senderName`). Frontend uses `txn.senderName ?? txn.senderAccount?.name` fallback pattern.
- **Prometheus scrape** — backend must be running for Prometheus to scrape `/actuator/prometheus`. Grafana shows "No data" if the backend isn't up.
