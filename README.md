<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=200&section=header&text=⚡%20Flash%20Sale%20System&fontSize=48&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=High-concurrency%20backend%20for%20time-limited%20sale%20events&descAlignY=60&descSize=18" width="100%" />

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)
[![JWT](https://img.shields.io/badge/JWT-Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io)

<br/>

> ⚡ A backend system that handles **thousands of concurrent requests** during flash sale events — **without overselling**, **without data loss**, and with **real-time feedback**.

<br/>

[🚀 Quick Start](#️-installation--setup) &nbsp;·&nbsp; [📐 Architecture](#-system-architecture) &nbsp;·&nbsp; [✨ Features](#-features) &nbsp;·&nbsp; [📡 API Reference](#-api-reference) &nbsp;·&nbsp; [💻 Source Code](https://github.com/VoThanhHa28/flashsale-project.git)

<br/>

</div>

---

## 📖 Table of Contents

- [What is This?](#-what-is-this)
- [Core Challenges](#-core-challenges--how-we-solved-them)
- [Features](#-features)
- [Demo](#-demo)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [API Reference](#-api-reference)
- [Installation & Setup](#️-installation--setup)
- [Future Improvements](#-future-improvements)
- [Team](#-team)

---

## 🎯 What is This?

Flash sale events create **extreme traffic bursts** — thousands of users racing to buy the same product at the exact same second. Traditional CRUD systems break under this pressure.

This system is engineered to handle it:

<div align="center">

| Challenge | How We Handle It |
|:---|:---|
| 🏎 Thousands of concurrent buy requests | **Redis** atomic Lua-script deducts stock in one operation |
| 💸 Overselling risk | Stock reserved **before** any order is created |
| 🐌 Slow order creation blocking response | **RabbitMQ** async pipeline — respond instantly, persist later |
| 📡 Users need live feedback | **Socket.IO** broadcasts sale open/close and stock changes |
| 🔐 Secure admin operations | **JWT + RBAC** separates shopper from admin capabilities |

</div>

---

## 🔥 Core Challenges & How We Solved Them

<details>
<summary><b>⚡ Race Condition & Overselling</b></summary>

**Problem:** Thousands of users decrement the same stock counter simultaneously → inconsistent state → overselling.

**Solution:** Redis Lua script executes read + check + decrement atomically in a single operation. No two requests can interleave.

```lua
local stock = redis.call('get', KEYS[1])
if tonumber(stock) >= tonumber(ARGV[1]) then
    redis.call('decrby', KEYS[1], ARGV[1])
    return 1
else return 0 end
```
</details>

<details>
<summary><b>🐢 Non-blocking Order Processing</b></summary>

**Problem:** Saving an order to MongoDB during peak traffic adds latency and failure risk to the main request cycle.

**Solution:** RabbitMQ async queue. The HTTP request returns `200 OK` immediately after inventory is reserved. A worker process handles the actual database write.
</details>

<details>
<summary><b>🔁 API Consistency Across Team</b></summary>

**Problem:** Multiple contributors produce inconsistent response shapes, breaking frontend and test pipelines.

**Solution:** Shared `SuccessResponse` / `AppError` response utilities + Joi validation middleware enforced on every route.
</details>

<details>
<summary><b>🗂 Data Retention & User Lifecycle</b></summary>

**Problem:** Hard-deleting users loses order/transaction history — violates audit and legal requirements.

**Solution:** Soft delete strategy (`is_deleted: Boolean`) for User. Enforced at every query boundary (repository, auth service, middleware) — never only at the delete endpoint.
</details>

---

## ✨ Features

<div align="center">

| Module | Features |
|:---:|:---|
| 🔐 **Auth** | Register · Login · JWT access tokens · Refresh · RBAC |
| 👤 **User Profile** | View/Update profile · Change password · Avatar |
| 📦 **Inventory** | Flash sale time-window · Atomic Redis reservation |
| 🛒 **Orders** | Place order · Async RabbitMQ pipeline · Worker persistence |
| 📜 **Order History** | Paginated list · Detail with ownership enforcement |
| 📡 **Real-time** | Sale start/end socket events · Live stock updates |
| 🛡 **Admin** | List users · Ban user · MongoDB/Redis health check |
| 🗂 **Data Safety** | Soft delete · Query-level filtering · No hard deletes |
| 🧪 **Load Testing** | Bulk seed API · K6 scripts for stress test |

</div>

---

## 🎬 Demo

<div align="center">

**🔐 Auth Flow — Register → Login → Protected API**

![Login Flow Demo](./docs/demo-login.gif)

<br/>

**📜 Order History + 🛡 Admin Management**

![Admin & Order Demo](./docs/demo-admin-order.gif)

</div>

---

## 🧠 System Architecture

<div align="center">

![Architecture Diagram](./docs/architecture.png)

</div>

### Request Lifecycle

```
Incoming HTTP Request
        │
        ├── 🛣  Route             → URL mapping, middleware chain
        ├── 🔑  Auth Middleware   → JWT verify, RBAC role check
        ├── ✅  Joi Validation    → body / params / query schema
        ├── 🎛  Controller        → orchestrate, no business logic
        ├── ⚙️  Service           → business rules, domain decisions
        ├── 🗄  Repository        → DB queries, is_deleted filters
        └── 📦  Response/Error   → consistent JSend shape
```

### Flash Sale Order Flow

```
POST /v1/api/order  (User places order)
        │
        ├── ① verifyToken + validate request
        │
        ├── ② Redis: atomic Lua script
        │       stock >= quantity?
        │       ├── YES → decrement & continue
        │       └── NO  → 400 Out of Stock
        │
        ├── ③ Push payload → RabbitMQ queue
        │
        └── ④ HTTP 200 OK (instant response)
                        │
                        ▼
            ┌─── Order Worker (background) ───┐
            │  ① Consume from queue           │
            │  ② Save Order to MongoDB        │
            │  ③ Socket.IO broadcast          │
            └─────────────────────────────────┘
```

### Infrastructure Overview

```
┌─────────────────────────────────────────────────────┐
│                   Client / Browser                   │
│              (FE React + Socket.IO client)           │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────────────┐
│              Express.js Application                  │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐ │
│  │  Auth/User  │ │   Product    │ │    Order     │ │
│  │   Routes    │ │   Routes     │ │   Routes     │ │
│  └──────┬──────┘ └──────┬───────┘ └──────┬───────┘ │
│         └───────────────┼────────────────┘          │
│                         ▼                            │
│  ┌──────────┐  ┌────────────────┐  ┌─────────────┐ │
│  │  Redis   │  │    MongoDB     │  │  RabbitMQ   │ │
│  │ (stock)  │  │  (data store)  │  │  (queue)    │ │
│  └──────────┘  └────────────────┘  └──────┬──────┘ │
└─────────────────────────────────────────── │ ───────┘
                                             │
                              ┌──────────────▼──────┐
                              │    Order Worker      │
                              │  (background proc)   │
                              └──────────────────────┘
```

---

## 📁 Project Structure

```
flashsale-project/
├── app.js                        # Express app setup, DB connect
├── bin/www                       # HTTP server entry point
├── docker-compose.yml            # MongoDB + Redis + RabbitMQ
└── src/
    ├── config/
    │   ├── db.js                 # MongoDB connection
    │   ├── redis.js              # Redis client
    │   ├── rabbitmq.js           # RabbitMQ connection
    │   └── socket.js             # Socket.IO setup
    │
    ├── constants/                # Centralized string constants
    ├── core/
    │   ├── success.response.js   # OK, CREATED response classes
    │   └── error.response.js     # AppError, NotFoundError, etc.
    │
    ├── middlewares/
    │   ├── auth.js               # JWT verify, attach req.user
    │   ├── rbac.js               # Role-based access control
    │   ├── validate.middleware.js # Joi request validation
    │   └── error.middleware.js   # Global error handler
    │
    ├── models/
    │   ├── user.model.js         # User schema (soft delete)
    │   ├── product.model.js      # Product schema
    │   └── order.model.js        # Order schema
    │
    ├── repositories/             # Data access layer
    │   ├── user.repo.js
    │   ├── product.repo.js
    │   └── order.repo.js
    │
    ├── services/                 # Business logic
    │   ├── auth.service.js
    │   ├── user.service.js
    │   ├── order.service.js      # Inventory + order processing
    │   ├── admin.service.js
    │   └── seed.service.js
    │
    ├── controllers/              # Request orchestration
    ├── validation/               # Joi schemas
    ├── routes/                   # Express routers
    │   └── index.js              # Root router
    │
    ├── workers/
    │   └── order.worker.js       # RabbitMQ consumer
    │
    └── tests/
        └── k6/                   # Load test scripts
```

---

## 🛠 Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Runtime** | Node.js 22+ | Server-side JavaScript |
| **Framework** | Express.js 4.x | HTTP routing & middleware |
| **Database** | MongoDB + Mongoose | Persistent data store |
| **Cache/Inventory** | Redis | Atomic stock reservation, caching |
| **Message Queue** | RabbitMQ | Async order processing |
| **Real-time** | Socket.IO | Live sale & stock events |
| **Auth** | JWT + bcrypt | Stateless auth, password hashing |
| **Validation** | Joi | Request schema validation |
| **Container** | Docker + Compose | Local infra orchestration |
| **Load Testing** | K6 | Stress testing & benchmarking |

</div>

---

## 📡 API Reference

<details open>
<summary><b>🔐 Auth — /v1/api/auth</b></summary>

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Create new account | Public |
| `POST` | `/auth/login` | Login, receive JWT | Public |
| `GET` | `/auth/me` | Get current user info | JWT |

</details>

<details>
<summary><b>👤 User — /v1/api/users</b></summary>

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/users/me` | View own profile | JWT |
| `PUT` | `/users/me` | Update name / address / avatar | JWT |
| `POST` | `/users/change-password` | Change password (requires old) | JWT |

</details>

<details>
<summary><b>🛒 Orders — /v1/api/order</b></summary>

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/order` | Place order (flash sale) | JWT |
| `GET` | `/order/me` | My order list (pagination) | JWT |
| `GET` | `/order/me/:id` | My order detail | JWT |

</details>

<details>
<summary><b>🛡 Admin — /v1/api/admin</b></summary>

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/admin/users` | List all users (paginated) | SHOP_ADMIN |
| `PATCH` | `/admin/users/:id/ban` | Ban a user | SHOP_ADMIN |
| `GET` | `/admin/health` | MongoDB + Redis status | SHOP_ADMIN |
| `POST` | `/admin/flash-sale/activate` | Activate flash sale | SHOP_ADMIN |
| `POST` | `/admin/flash-sale/hot-activate` | Instantly activate sale | SHOP_ADMIN |

</details>

<details>
<summary><b>📦 Products — /v1/api/products</b></summary>

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/products` | Search & list products | Public |
| `GET` | `/products/:id` | Get product detail | Public |
| `POST` | `/products` | Create product | JWT |
| `PUT` | `/products/:id` | Update product | JWT |
| `DELETE` | `/products/:id` | Soft delete product | JWT |

</details>

<details>
<summary><b>🧪 Seed — /v1/api/seed (dev only)</b></summary>

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/seed/users` | Generate bulk users for load testing |
| `DELETE` | `/seed/users` | Clean up test users |

</details>

---

## ⚙️ Installation & Setup

### Prerequisites

- Node.js v20+ LTS
- Docker & Docker Desktop (running)

### Step 1 — Clone

```bash
git clone https://github.com/VoThanhHa28/flashsale-project.git
cd flashsale-project/flashsale-project
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure environment

```bash
cp .env.example .env   # or create .env manually
```

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/flashsale_db
JWT_SECRET=your-super-secret-key
REDIS_URI=redis://localhost:6379
RABBITMQ_URI=amqp://localhost:5672
```

### Step 4 — Start infrastructure

```bash
docker compose up -d
```

| Service | URL | Credentials |
|---|---|---|
| MongoDB | `localhost:27017` | — |
| Redis | `localhost:6379` | — |
| RabbitMQ Dashboard | [http://localhost:15672](http://localhost:15672) | `guest / guest` |

### Step 5 — Run server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start

# Run order worker (separate terminal)
npm run worker
```

✅ Server running at `http://localhost:3000`

---

## 🔮 Future Improvements

- [ ] Extend soft delete policy to `Order` and `Product` models
- [ ] Structured observability: distributed tracing, metrics dashboards, queue anomaly alerts
- [ ] OAuth2 / social login (Google, GitHub)
- [ ] Admin audit logs and role management
- [ ] Rate limiting per user during flash sale window
- [ ] Horizontal scaling support with Redis Pub/Sub + Socket.IO adapter

---

## 🤝 Team

<div align="center">

| Member | Role | Module |
|:---:|:---|:---|
| 👑 Leader / M1 | System Architect | Infrastructure, Docker, CI/CD orchestration |
| ⚙️ M2 | Backend Engineer | Order worker, RabbitMQ consumer, K6 load testing |
| 📦 M3 | Backend Engineer | Product module, flash sale activation |
| 🔐 M4 | Backend Engineer | Auth, User profile, Admin APIs, soft delete |
| 🎨 M5 | Frontend Engineer | React UI, user flows, Socket.IO client |

</div>

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer&animation=fadeIn" width="100%" />

**Source Code:** [github.com/VoThanhHa28/flashsale-project](https://github.com/VoThanhHa28/flashsale-project.git)

*Built with ❤️ for high-concurrency systems*

</div>
