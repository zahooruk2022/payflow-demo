# PayFlow — Real-Time Interbank Payment Processing

A banking demo application simulating real-time interbank payments with live fraud detection across six major UK banks. Built for sales demonstrations to financial institutions.

> **Cloud Foundry version:** [github.com/zahooruk2022/payflow-demo-cf](https://github.com/zahooruk2022/payflow-demo-cf) — same architecture, single `cf push`, services auto-wired from VCAP_SERVICES.  
> **Interactive architecture diagram:** open `architecture.html` in a browser.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Logical Flow](#logical-flow)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Prerequisites](#prerequisites)
7. [Running the Application](#running-the-application)
8. [Features](#features)
9. [Fraud Detection Rules](#fraud-detection-rules)
10. [API Reference](#api-reference)
11. [Monitoring (Grafana + Prometheus)](#monitoring)
12. [Configuration](#configuration)
13. [Demo Script](#demo-script)
14. [Cloud Foundry version](#cloud-foundry-version)

> **Interactive architecture diagram:** open `architecture.html` in a browser for a clickable component reference.

---

## Overview

PayFlow simulates a UK interbank payment network. Payments submitted through the UI travel through a RabbitMQ queue, are scored against Redis-backed fraud rules, and the result is broadcast live to all connected browsers via WebSocket — with no page refresh required.

Six real UK banks are pre-loaded. Balances update in real time as payments settle. Fraud alerts appear instantly on a dedicated tab with a badge counter.

**Why this resonates with bank audiences:**
- Every technology in the stack earns its place — nothing gratuitous
- The architecture is visible in real time — bankers can watch data move
- Fraud detection is a universal pain point in payments
- The payment lifecycle mirrors real rails (Faster Payments, CHAPS, SWIFT GPI)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser (React + Tailwind)                                          │
│                                                                      │
│  ┌─────────────┐   POST /api/payments    ┌──────────────────────┐   │
│  │ PaymentForm │ ──────────────────────▶ │  Spring Boot REST    │   │
│  └─────────────┘                         │  :8080               │   │
│                                          └──────────┬───────────┘   │
│  ┌─────────────────────────────────┐               │               │
│  │  Dashboard  │  Live Feed        │               │ WebSocket      │
│  │  Fraud Alerts│ Account Balances │ ◀─────────────┘ /topic/*      │
│  └─────────────────────────────────┘                               │
└──────────────────────────────────────────────────────────────────────┘
                              │ REST + WebSocket
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Spring Boot 3.5 / Java 21                                           │
│                                                                      │
│  ┌────────────────┐                                                  │
│  │ PaymentController│  POST /api/payments                            │
│  └───────┬────────┘                                                  │
│          │ save PENDING + broadcast                                   │
│          ▼                                                            │
│  ┌────────────────┐     ┌──────────────────────────────────────┐    │
│  │ PaymentService │────▶│           RabbitMQ                   │    │
│  └────────────────┘     │  Exchange: payflow.exchange           │    │
│                          │  Queue:    payment.queue             │    │
│  WebSocket broadcast     │  DLQ:      payment.dlq               │    │
│  /topic/transactions     └─────────────────┬────────────────────┘   │
│  /topic/fraud-alerts                        │                        │
│  /topic/stats                               ▼                        │
│                          ┌──────────────────────────────────────┐   │
│                          │  PaymentConsumer (@RabbitListener)    │   │
│                          └─────────────────┬────────────────────┘   │
│                                            │ process                 │
│                                            ▼                        │
│                          ┌──────────────────────────────────────┐   │
│                          │  FraudDetectionService               │   │
│                          │  ┌────────────────────────────────┐  │   │
│                          │  │  Redis — sliding window counter │  │   │
│                          │  │  Key: rapid:<accountId>         │  │   │
│                          │  │  TTL: 60 seconds                │  │   │
│                          │  └────────────────────────────────┘  │   │
│                          └─────────────────┬────────────────────┘   │
│                                            │                         │
│                          ┌─────────────────▼────────────────────┐   │
│                          │  PostgreSQL                           │   │
│                          │  accounts · transactions · fraud_alerts│  │
│                          └──────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Logical Flow

### Payment Submission to Settlement

```
User submits payment
        │
        ▼
POST /api/payments
        │
        ▼
Transaction saved ──── Status: PENDING
        │
        ├──▶ WebSocket broadcast → /topic/transactions  (UI updates instantly)
        │
        ▼
Published to RabbitMQ payment.queue
        │
        ▼
PaymentConsumer picks up message
        │
        ▼
Transaction updated ── Status: PROCESSING
        │
        ├──▶ WebSocket broadcast → UI shows "PROCESSING"
        │
        ▼
FraudDetectionService evaluates rules
        │
        ├── Rule 1: Amount > £50,000?      +60 risk
        ├── Rule 2: 3+ txns in 60s?        +70 risk  (Redis counter)
        └── Rule 3: Round number > £5,000? +20 risk
        │
        ▼
Risk score ≥ 60?
        │
     YES │                              NO │
        ▼                                 ▼
 Status: FLAGGED                  Status: COMPLETED
 FraudAlert saved                 Balances updated
 Broadcast /topic/fraud-alerts    Broadcast /topic/transactions
 Badge counter increments         Chart updates
        │                                 │
        └───────────┬─────────────────────┘
                    ▼
         Broadcast /topic/stats
         (KPI cards refresh on all screens)
```

### WebSocket Connection Lifecycle

```
Browser opens                   Spring Boot
    │                               │
    ├──── SockJS handshake ────────▶│
    │◀─── STOMP CONNECTED ──────────┤
    │                               │
    ├── SUBSCRIBE /topic/transactions▶
    ├── SUBSCRIBE /topic/fraud-alerts▶
    └── SUBSCRIBE /topic/stats ────▶│
                                    │
                    Payment submitted│
                                    ├──▶ /topic/transactions  (PENDING)
                                    ├──▶ /topic/transactions  (PROCESSING)
                                    ├──▶ /topic/transactions  (COMPLETED/FLAGGED)
                                    ├──▶ /topic/fraud-alerts  (if flagged)
                                    └──▶ /topic/stats
```

### Fraud Detection — Redis Sliding Window

```
Payment arrives from Barclays Bank
        │
        ▼
INCR rapid:acc-001          ← atomic Redis increment
        │
        ├── First increment? SET EXPIRE 60s
        │
        └── Count ≥ 3?
                │
             YES │ → +70 risk score → likely FLAGGED
              NO │ → rule passes, check other rules
```

---

## Tech Stack

| Layer | Technology | Version | Role |
|---|---|---|---|
| Backend | Spring Boot | 3.5.0 | REST API, WebSocket broker, message consumer |
| Language | Java | 21 | Backend runtime (LTS) |
| Database | PostgreSQL | 16 | Durable storage — accounts, transactions, fraud alerts |
| Message Broker | RabbitMQ | 3.13 | Async payment queue with dead-letter support |
| Cache / Counters | Redis | 7.2 | Fraud sliding-window counters, idempotency |
| Frontend | React | 18 | Single-page application |
| Styling | Tailwind CSS | 3 | Dark / light banking UI with class-based theming |
| Charts | Recharts | 2 | Area, donut, bar charts — live data |
| Real-time | STOMP over SockJS | — | WebSocket push from Spring to browser |
| Metrics | Micrometer + Prometheus | — | Custom payment counters, p50/p95/p99 timers |
| Dashboards | Grafana | 10.4 | Auto-provisioned 12-panel operations dashboard |
| Build (backend) | Maven | 3.x | Dependency management, packaging |
| Build (frontend) | Vite | 5 | Dev server, HMR, ESM bundler |

---

## Project Structure

```
payflow-demo/
├── docker-compose.yml              # Postgres, RabbitMQ, Redis, Prometheus, Grafana
├── architecture.html               # Interactive clickable architecture diagram
│
├── monitoring/
│   ├── prometheus.yml              # Scrape config — host.docker.internal:8080
│   └── grafana/
│       └── provisioning/
│           ├── datasources/
│           │   └── prometheus.yml  # Auto-provisions Prometheus datasource
│           └── dashboards/
│               ├── dashboard.yml   # Provider pointing to payflow.json
│               └── payflow.json    # 12-panel Grafana dashboard definition
│
├── backend/
│   ├── pom.xml                     # Spring Boot 3.5, Java 21
│   └── src/main/
│       ├── java/com/demo/payflow/
│       │   ├── PayFlowApplication.java
│       │   ├── config/
│       │   │   ├── RabbitMQConfig.java     # Exchange, queues, DLQ, bindings
│       │   │   ├── RedisConfig.java        # JSON-serialising RedisTemplate
│       │   │   ├── WebSocketConfig.java    # STOMP /ws endpoint, /topic broker
│       │   │   └── CorsConfig.java         # Allow localhost:5173 in dev
│       │   ├── model/
│       │   │   ├── Account.java            # UK bank account entity
│       │   │   ├── Transaction.java        # Payment record entity
│       │   │   ├── TransactionStatus.java  # PENDING|PROCESSING|COMPLETED|FAILED|FLAGGED
│       │   │   └── FraudAlert.java         # Fraud event entity
│       │   ├── repository/
│       │   │   ├── AccountRepository.java
│       │   │   ├── TransactionRepository.java  # sumCompletedAmount, countByStatus
│       │   │   └── FraudAlertRepository.java
│       │   ├── dto/
│       │   │   ├── PaymentRequest.java     # Validated inbound payload (Bean Validation)
│       │   │   ├── TransactionEvent.java   # WebSocket broadcast record
│       │   │   └── DashboardStats.java     # Aggregated KPI record
│       │   ├── service/
│       │   │   ├── PaymentService.java     # Orchestrates full payment lifecycle
│       │   │   ├── FraudDetectionService.java  # Rule engine + Redis counters
│       │   │   ├── PaymentMetricsService.java  # Micrometer counters + timer
│       │   │   └── AccountService.java
│       │   ├── messaging/
│       │   │   ├── PaymentProducer.java    # Publishes transaction ID to exchange
│       │   │   └── PaymentConsumer.java    # @RabbitListener on payment.queue
│       │   └── controller/
│       │       ├── PaymentController.java  # POST /api/payments, GET /api/payments
│       │       ├── AccountController.java  # GET /api/accounts
│       │       └── DashboardController.java # GET /api/dashboard/stats|alerts
│       └── resources/
│           ├── application.yml             # All configuration
│           └── data.sql                    # Seed: 6 UK bank accounts
│
└── frontend/
    ├── package.json
    ├── vite.config.js              # Proxy /api + /actuator + /ws to :8080
    ├── tailwind.config.js          # darkMode: 'class', custom animations
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx                 # Tab routing, theme toggle, WebSocket wiring
        ├── index.css               # CSS variables for light/dark, Tailwind base
        ├── api/client.js           # All REST calls (accounts, payments, stats, alerts)
        ├── hooks/useWebSocket.js   # STOMP/SockJS, subscribes to 3 topics
        └── components/
            ├── Dashboard.jsx       # Full dashboard: ticker + 6 stat rows + 3 chart rows
            ├── StatCard.jsx        # Reusable KPI card, 5 colour variants, dark/light
            ├── LiveTicker.jsx      # CSS scrolling banner — last 20 transactions
            ├── LiveChart.jsx       # Recharts AreaChart, 15-min rolling window
            ├── FraudBreakdown.jsx  # Recharts donut — transaction status distribution
            ├── TopBanksTable.jsx   # Top 6 banks by volume, fraud badges
            ├── RiskScoreChart.jsx  # Recharts bar — 5 risk buckets (Clean → Critical)
            ├── SystemStatus.jsx    # Polls /actuator/health — UP/DOWN per service
            ├── AccountBalances.jsx # Live balance list with progress bars
            ├── TransactionFeed.jsx # Filterable real-time transaction list
            ├── PaymentForm.jsx     # Submit payments, GBP quick amounts
            └── FraudAlerts.jsx     # Alert cards with risk meters
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Java (JDK) | 21 | `brew install temurin@21` |
| Maven | 3.x | `brew install maven` |
| Node.js + npm | 20 LTS+ | `nvm install --lts` |
| Container runtime | — | Rancher Desktop or Podman |

**Node.js via nvm (if not already installed):**
```bash
brew install nvm
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"' >> ~/.zshrc
source ~/.zshrc
nvm install --lts
```

---

## Running the Application

### Step 1 — Start infrastructure

**Rancher Desktop (dockerd / Moby mode):**
```bash
cd payflow-demo
docker compose up -d
```

**Rancher Desktop (containerd mode):**
```bash
nerdctl compose up -d
```

**Podman:**
```bash
podman compose up -d
```

Verify all services are healthy before continuing:
```bash
docker compose ps    # all should show "healthy" or "running"
```

| Service | Port | Purpose |
|---|---|---|
| PostgreSQL | 5432 | Application database |
| RabbitMQ AMQP | 5672 | Message broker |
| RabbitMQ Management UI | 15672 | Queue visualisation (demo use) |
| Redis | 6379 | Fraud rate-limit counters |
| Prometheus | 9090 | Metrics scraper |
| Grafana | 3000 | Operations dashboard |

RabbitMQ management console: http://localhost:15672 — credentials: `payflow` / `payflow123`

Grafana: http://localhost:3000 — credentials: `admin` / `payflow123`  
The PayFlow dashboard is auto-provisioned — it appears on the home screen immediately. It will show live data once the backend is running.

---

### Step 2 — Start the backend

```bash
cd payflow-demo/backend
mvn spring-boot:run
```

On first run, Spring Boot will:
1. Create the PostgreSQL schema via Hibernate DDL
2. Seed 6 UK bank accounts via `data.sql`
3. Declare the RabbitMQ exchange, `payment.queue`, and `payment.dlq`

The backend starts on **http://localhost:8080**

Watch for this line in the output:
```
Started PayFlowApplication in X.XXX seconds
```

---

### Step 3 — Start the frontend

```bash
cd payflow-demo/frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:5173**

> Vite proxies `/api` and `/ws` to `:8080` — no CORS configuration needed in development.

Open **http://localhost:5173** in Chrome or Firefox.

The green **Live** indicator in the top right confirms the WebSocket connection is active.

---

### Stopping the application

```bash
# Stop backend: Ctrl+C in the backend terminal
# Stop frontend: Ctrl+C in the frontend terminal

# Stop infrastructure:
docker compose down         # Rancher Desktop (Moby)
nerdctl compose down        # Rancher Desktop (containerd)
podman compose down         # Podman
```

> Note: `docker compose down` preserves the PostgreSQL volume. Add `-v` to wipe data: `docker compose down -v`

---

## Features

### Dashboard
Real-time overview of the payment network — designed to look busy and data-rich.

- **Live ticker** — scrolling banner of the last 20 transactions (sender → receiver, amount, status)
- **6 KPI cards** — Total Transactions, Settled Volume (GBP), Fraud Flags, Success Rate, Avg Transaction, In-Flight
- **Live area chart** — transaction completions and flags in 1-minute buckets over a rolling 15-minute window
- **Status breakdown donut** — Recharts PieChart showing COMPLETED / FLAGGED / PENDING distribution
- **System health panel** — polls Spring Actuator every 15s, shows UP/DOWN for PostgreSQL, RabbitMQ, Redis, API
- **Top Banks table** — 6 banks ranked by sent volume, with fraud flag badges and proportional bars
- **Risk score histogram** — transactions bucketed into Clean / Low / Medium / High / Critical bands
- **Account balances** — all 6 UK banks with live balance bars and a refresh button
- **Recent transactions table** — last 8 payments with status badges, risk score bar, and timestamp

### Send Payment
Submit interbank transfers and watch them process live.

- Dropdown selectors showing bank name and current balance
- Amount field with quick-select buttons: £10K, £25K, £50K, £75K
- **Fraud test button** — pre-fills £60,000 to guarantee a HIGH_AMOUNT flag
- Inline success/error feedback after submission
- Description field for narrative

### Live Feed
Full transaction history with real-time updates.

- Filter by status: ALL / PENDING / PROCESSING / COMPLETED / FLAGGED
- Vertical risk bar per row (green → amber → red)
- Animated pulse indicator on PROCESSING rows
- FLAGGED rows highlighted with a red background tint

### Fraud Alerts
Dedicated tab for flagged transactions.

- Badge counter on the nav tab increments on new alerts (resets when tab is opened)
- Alert cards showing type, rule description, banks involved, amount, and risk meter
- Three alert types: HIGH\_AMOUNT, RAPID\_SUCCESSION, SUSPICIOUS\_PATTERN

### Dark / Light Mode
Toggle between dark and light themes using the Sun/Moon button in the header. Preference is persisted to `localStorage`.

---

## Fraud Detection Rules

Scores are additive. Any transaction reaching **60 or above** is flagged.

| Rule | Trigger | Risk Score Added | Technology |
|---|---|---|---|
| **High Amount** | Transfer > £50,000 | +60 | In-memory rule |
| **Rapid Succession** | 3+ payments from same account within 60 seconds | +70 | Redis `INCR` + `EXPIRE` |
| **Round Number** | Exact whole-pound amount > £5,000 | +20 | In-memory rule |

**Maximum score:** 100

**Redis key pattern:** `rapid:<accountId>`
Each increment auto-expires after 60 seconds — the counter resets naturally with no cleanup job needed.

**To trigger fraud during a demo:**

| What to do | Rule triggered | Score |
|---|---|---|
| Submit any amount > £50,000 | HIGH_AMOUNT | 60 → FLAGGED |
| Submit £60,000 (fraud test button) | HIGH_AMOUNT | 60 → FLAGGED |
| Submit 3+ payments quickly from same bank | RAPID_SUCCESSION | 70 → FLAGGED |
| Submit exactly £10,000 or £100,000 | SUSPICIOUS_PATTERN | 20 (may stack) |

---

## API Reference

### Accounts

```
GET  /api/accounts          List all UK bank accounts
GET  /api/accounts/{id}     Get a single account
```

**Account response:**
```json
{
  "id": "acc-001",
  "name": "Barclays Bank PLC",
  "accountNumber": "20-32-06 10234567",
  "bankCode": "BARCGB22",
  "currency": "GBP",
  "balance": 4985000.00,
  "createdAt": "2026-06-17T10:00:00"
}
```

### Payments

```
POST /api/payments           Submit a new payment (returns immediately, processed async)
GET  /api/payments?limit=50  List recent transactions (default 50)
```

**POST /api/payments — request:**
```json
{
  "senderAccountId": "acc-001",
  "receiverAccountId": "acc-002",
  "amount": 60000.00,
  "currency": "GBP",
  "description": "Interbank settlement — Q2 FY26"
}
```

**Response:** The created Transaction with status `PENDING`. Processing happens asynchronously via RabbitMQ — watch `/topic/transactions` for status updates.

### Dashboard

```
GET  /api/dashboard/stats          Aggregated KPIs
GET  /api/dashboard/alerts?limit=20  Recent fraud alerts
```

**Stats response:**
```json
{
  "totalTransactions": 42,
  "completedTransactions": 35,
  "pendingTransactions": 2,
  "flaggedTransactions": 5,
  "totalVolume": 1250000.00,
  "fraudRate": 11.9,
  "successRate": 83.33
}
```

### WebSocket Topics

Connect via STOMP over SockJS at `ws://localhost:8080/ws`

| Topic | Payload | When fired |
|---|---|---|
| `/topic/transactions` | TransactionEvent | Every status change |
| `/topic/fraud-alerts` | TransactionEvent | Transaction flagged |
| `/topic/stats` | DashboardStats | After each completed/flagged payment |

---

## Monitoring

PayFlow ships with a full Prometheus + Grafana observability stack, provisioned automatically via Docker Compose.

### Starting the monitoring stack

```bash
docker compose up -d    # starts Prometheus and Grafana alongside the other services
```

Open **http://localhost:3000** — credentials: `admin` / `payflow123`

The PayFlow dashboard is auto-provisioned and appears on the Grafana home screen. It begins populating as soon as the backend starts receiving traffic.

### Grafana dashboard panels

| Panel | Type | Metric |
|---|---|---|
| Total Submitted | Stat | `payflow_payments_submitted_total` |
| Total Completed | Stat | `payflow_payments_completed_total` |
| Total Flagged | Stat | `payflow_payments_flagged_total` |
| Total Failed | Stat | `payflow_payments_failed_total` |
| Settled Volume (GBP) | Stat | `payflow_payment_volume_gbp_total` |
| Fraud Rate | Gauge | flagged / submitted |
| Payment Rate | Timeseries | rate of submitted payments |
| JVM Memory | Timeseries | `jvm_memory_used_bytes` |
| HTTP Request Rate | Timeseries | `http_server_requests_seconds_count` |
| Processing Time p50/p95/p99 | Timeseries | `payflow_payment_processing_seconds` |
| CPU Usage | Timeseries | `process_cpu_usage` |

### Custom Prometheus metrics

Exposed at `http://localhost:8080/actuator/prometheus`:

| Metric | Type | Description |
|---|---|---|
| `payflow_payments_submitted_total` | Counter | Every POST /api/payments |
| `payflow_payments_completed_total` | Counter | Payments that cleared fraud and settled |
| `payflow_payments_flagged_total` | Counter | Payments quarantined by fraud rules |
| `payflow_payments_failed_total` | Counter | Processing errors |
| `payflow_payment_volume_gbp_total` | Counter | Cumulative GBP value of settled payments |
| `payflow_payment_processing_seconds` | Timer | End-to-end time from queue pickup to final status |

### Prometheus scrape config

Prometheus scrapes the Spring Boot backend every 5 seconds. The `host.docker.internal` hostname allows the Prometheus container to reach the backend running on the host machine.

```yaml
# monitoring/prometheus.yml
scrape_configs:
  - job_name: payflow
    scrape_interval: 5s
    static_configs:
      - targets: ['host.docker.internal:8080']
    metrics_path: /actuator/prometheus
```

---

## Configuration

All backend configuration is in `backend/src/main/resources/application.yml`.

### Key settings

| Setting | Default | Effect |
|---|---|---|
| `spring.jpa.hibernate.ddl-auto` | `create-drop` | Schema recreated on restart. Change to `update` to persist data. |
| `payflow.fraud.high-amount-threshold` | `50000` | GBP threshold for HIGH_AMOUNT rule |
| `payflow.fraud.rapid-succession-window-seconds` | `60` | Redis TTL window for succession check |
| `payflow.fraud.rapid-succession-count` | `3` | Number of payments to trigger flag |
| `payflow.fraud.round-number-threshold` | `5000` | Minimum for round-number rule |
| `payflow.fraud.high-risk-threshold` | `60` | Score at which transaction is FLAGGED |

### Seed data

Six UK bank accounts are created on every startup:

| Bank | Sort Code / Account | SWIFT/BIC | Opening Balance |
|---|---|---|---|
| Barclays Bank PLC | 20-32-06 10234567 | BARCGB22 | £5,000,000 |
| HSBC UK Bank PLC | 40-47-84 20345678 | MIDLGB22 | £3,500,000 |
| Lloyds Bank PLC | 30-91-56 30456789 | LOYDGB2L | £2,750,000 |
| NatWest Group PLC | 60-70-80 40567890 | NWBKGB2L | £4,200,000 |
| Santander UK PLC | 09-01-28 50678901 | ABBYGB2L | £1,800,000 |
| Standard Chartered Bank | 15-80-00 60789012 | SCBLGB2L | £6,100,000 |

Balances reset to these values each time the backend restarts (due to `ddl-auto: create-drop`).

---

## Demo Script

A suggested walkthrough for a **10-minute bank demo**.

### Setup (before the meeting)
- Start infrastructure: `docker compose up -d`
- Start backend: `cd backend && mvn spring-boot:run`
- Start frontend: `cd frontend && npm run dev`
- Open http://localhost:5173 in Chrome — confirm the **Live** indicator is green
- Open http://localhost:15672 in a second tab — RabbitMQ management UI

---

### 1. Dashboard overview (2 minutes)

Open the **Dashboard** tab.

> *"This is a real-time view of our interbank payment network. The four cards give us a live snapshot — total payments, settled volume in GBP, fraud flags raised, and our success rate. Everything you see here updates automatically the moment a payment changes state."*

Point out:
- The live connection indicator (top right)
- The account balances panel — six major UK clearing banks
- The empty chart (it fills as payments flow)

---

### 2. Submit a clean payment (2 minutes)

Click **Send Payment**.

- Select **Barclays Bank PLC** as sender
- Select **HSBC UK Bank PLC** as receiver
- Enter **£15,000**
- Click **Send Payment**

Immediately switch to the **Dashboard** tab.

> *"Watch the recent transactions table — the payment appears instantly as PENDING, then moves to PROCESSING, then COMPLETED. The chart has just recorded its first tick. The Barclays and HSBC balances have updated."*

Then switch to **Live Feed**.

> *"Here we can see the full transaction trail. Notice the risk bar on the left — green means this payment scored zero on our fraud model."*

---

### 3. Trigger fraud detection (3 minutes)

Click **Send Payment**.

- Click the red **£60K ⚠ fraud test** button
- Click **Send Payment**

Switch to **Live Feed**.

> *"This time you'll see it go PENDING, then PROCESSING, then — FLAGGED. The payment was above our £50,000 threshold and scored 60 out of 100 on our risk model. It's been quarantined."*

Click **Fraud Alerts**.

> *"The alert card shows exactly why it was flagged — the rule that triggered, the risk score, the banks involved, and the amount. Nothing is vague."*

Point out the risk meter on the alert card.

---

### 4. Demonstrate rapid succession (2 minutes)

Click **Send Payment** and submit **three payments quickly** from the same sender (any amount).

> *"Now watch what happens when we see multiple transfers from the same institution within 60 seconds. This is our rapid succession rule — backed by a Redis sliding window counter. Three payments in under a minute is a behavioural flag."*

Show the RAPID_SUCCESSION alert in the **Fraud Alerts** tab.

---

### 5. Show the infrastructure (1 minute)

Switch to the RabbitMQ tab (http://localhost:15672).

> *"Behind every payment is a message queue. Each submission publishes to this exchange. The consumer picks it up, runs the fraud model, and updates the database. The dead-letter queue catches anything that fails processing — nothing is lost."*

Point out:
- The `payflow.exchange` exchange
- The `payment.queue` with message rate graph
- The `payment.dlq` dead-letter queue

---

### 6. Dark / Light mode

Click the **Sun/Moon icon** in the top-right header.

> *"The UI supports both dark and light modes — whichever fits your screen setup or brand guidelines. The preference is saved between sessions."*

---

### Close

> *"Every component here — PostgreSQL for durable storage, RabbitMQ for reliable async processing, Redis for real-time fraud counters, and WebSocket for live push to the UI — is production-grade open source running on the JVM. This is exactly how a modern payment rail is built."*

---

## Cloud Foundry version

A Cloud Foundry edition of PayFlow is available at **[github.com/zahooruk2022/payflow-demo-cf](https://github.com/zahooruk2022/payflow-demo-cf)**.

Same application, same architecture, same fraud detection — adapted for deployment on Tanzu Application Service (TAS) or any Cloud Foundry foundation.

| | This repo (Docker) | CF version |
|---|---|---|
| **Deploy** | `docker compose up` + `mvn spring-boot:run` + `npm run dev` | `./build.sh && cf push` |
| **Services** | Local Docker containers | CF managed service instances |
| **Frontend** | Vite dev server :5173 (separate) | Embedded in Spring Boot jar |
| **Service config** | Explicit in `application.yml` | Auto-wired from `VCAP_SERVICES` via `java-cfenv-boot` |
| **Scaling** | Manual | `cf scale payflow-demo -i N` |
| **Monitoring** | Grafana + Prometheus (docker compose) | TAS Apps Manager / external Prometheus |

### Key changes in the CF version

- **`java-cfenv-boot`** added to `pom.xml` — reads `VCAP_SERVICES` and configures PostgreSQL, RabbitMQ, and Redis connection factories automatically on startup
- **`server.port: ${PORT:8080}`** in `application.yml` — CF assigns the container port dynamically
- **`useWebSocket.js`** uses `window.location.origin + '/ws'` instead of hardcoded `localhost:8080` — works on any CF route
- **`vite.config.js`** sets `build.outDir` to `../backend/src/main/resources/static` — the React app is bundled into the Spring Boot jar, so a single `cf push` deploys everything

> **CF repo:** https://github.com/zahooruk2022/payflow-demo-cf
