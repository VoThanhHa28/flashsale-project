<div align="center">

# ⚡ Flash Sale System

### High-concurrency backend platform for flash sale events

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Queue-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com)
[![Docker](https://img.shields.io/badge/Docker-Container-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)

> A backend system built to handle high-concurrency flash sale events with **atomic inventory reservation**, **async order processing**, and **real-time updates**.

[📖 API Docs](#api) · [🚀 Quick Start](#installation--setup) · [💻 Source Code](https://github.com/VoThanhHa28/flashsale-project.git)

</div>

---

## 📌 Project Overview

| | |
|---|---|
| **Goal** | Handle flash-sale traffic spikes where thousands of users compete for limited inventory simultaneously |
| **Core Problem** | Overselling, race conditions, non-blocking order flow, team-wide API consistency |
| **Target Users** | Shoppers, shop admins, and engineers running load tests / operations |

---

## 🔥 Problem & Motivation

Traditional e-commerce systems fail under flash sale conditions because:

- **Inventory updates** are non-atomic → overselling under concurrent load
- **Synchronous order creation** increases latency and error rate at peak time
- **Lack of admin controls** (user moderation, health checks) makes operations risky
- **Inconsistent API shapes** from multiple contributors slow down FE integration

---

## ✨ Features

| Area | Feature |
|---|---|
| **Inventory** | Atomic stock reservation using Redis Lua script — no overselling |
| **Orders** | RabbitMQ async pipeline decouples request handling from persistence |
| **Real-time** | Socket.IO events for sale start and stock updates |
| **Auth** | JWT authentication with role-based access control (`USER`, `SHOP_ADMIN`) |
| **User Profile** | Register/login, `/users/me`, change-password, avatar update |
| **Order History** | User-scoped order listing with pagination & ownership enforcement |
| **Admin** | User listing (paginated), user ban, system health check (MongoDB/Redis) |
| **Data Safety** | Soft delete for User (`is_deleted`) with query-level filtering |

---

## 🎬 Demo

> Suggested: 1–2 focused GIFs stored in `docs/`

**Login Flow + JWT**

![Login Demo](./docs/demo-login.gif)

**Order History + Admin Management**

![Admin Demo](./docs/demo-admin-order.gif)

---

## 🧠 Architecture / System Design

![Architecture Diagram](./docs/architecture.png)

**Layered Clean Architecture:**

```
Request
  └── Route          → URL mapping + middleware chain
  └── Validation     → Joi schema contracts (body / params / query)
  └── Controller     → Orchestration only (no business logic)
  └── Service        → Business rules and domain logic
  └── Repository     → Data access layer (all DB queries here)
  └── Response/Error → Shared utilities for consistent API shape
```

---

## 🛠 Tech Stack

**Backend**
- Node.js 22+, Express.js 4.x
- MongoDB + Mongoose (ODM)
- Redis (atomic inventory, caching)
- RabbitMQ (async order queue)
- Socket.IO (real-time events)

**Security & Validation**
- JWT (access token auth)
- bcrypt (password hashing)
- Joi (request validation schemas)

**DevOps & Testing**
- Docker / Docker Compose
- Postman (API testing)
- K6 (load testing)
- Git (branch-based workflow)

---

## 👨‍💻 My Contributions — Member 4: Auth & User

> Responsible for the full Auth & User backend module, Admin APIs, and data lifecycle policy.

- **JWT + RBAC**: Implemented authentication and role-based authorization (`USER`, `SHOP_ADMIN`); secured all admin endpoints.
- **User Profile APIs**: `GET/PUT /users/me`, `POST /users/change-password`, avatar support — with Joi validation and bcrypt security.
- **Order History**: `GET /order/me` (pagination), `GET /order/me/:id` (ownership check) for logged-in users.
- **Admin APIs**: `GET /admin/users` (paginated, no password), `PATCH /admin/users/:id/ban`, `GET /admin/health` (MongoDB/Redis status).
- **Soft Delete**: Added `is_deleted` to User model and enforced filtering at every read/auth boundary (repo, service, middleware).
- **Seed API**: `POST /v1/api/seed/users` — bulk user creation for K6 load testing.
- **API Contract**: Maintained consistent response/error patterns across all Auth & User flows.

---

## 🚧 Challenges & Solutions

| Challenge | Solution |
|---|---|
| Race conditions on stock updates under burst traffic | Redis atomic Lua-script reservation + async RabbitMQ order flow |
| API shape inconsistency across contributors | Shared `SuccessResponse` / `ErrorResponse` classes + Joi middleware |
| Deleted users re-authenticating or appearing in admin lists | Enforced `is_deleted: false` filter at repo, auth service, and middleware boundaries — not only at delete time |
| Merge conflicts and code regression in team delivery | Additive-only code strategy: new files/routes/methods, no overwriting existing logic |

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v20+ LTS
- Docker & Docker Desktop

### 1. Clone repository
```bash
git clone https://github.com/VoThanhHa28/flashsale-project.git
cd flashsale-project/flashsale-project
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
```

Update `.env`:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/flashsale_db
JWT_SECRET=your-super-secret-key
REDIS_URI=redis://localhost:6379
RABBITMQ_URI=amqp://localhost:5672
```

### 4. Start infrastructure
```bash
docker compose up -d
```

Verify RabbitMQ: [http://localhost:15672](http://localhost:15672) — `guest / guest`

### 5. Run dev server
```bash
npm run dev
# Server running at http://localhost:3000
```

---

## 📚 Lessons Learned

- Flash sale correctness depends on **atomic operations** at the inventory layer — not application-level locking.
- **Clean Architecture** significantly reduces merge conflicts and regressions in team projects.
- Soft delete must be enforced at **query boundaries**, not just at the deletion endpoint.
- Standardized response/error shapes lower integration friction between backend, frontend, and load testing tools.

---

## 🔮 Future Improvements

- [ ] Extend soft delete to `Order` and `Product` models for full data retention compliance.
- [ ] Add structured observability: metrics, distributed tracing, and alerts for queue/stock anomalies.
- [ ] Richer admin tooling: audit logs, export endpoints, role management.
- [ ] OAuth2 / social login support for scalable auth.

---

## 🤝 Team

| Role | Responsibility |
|---|---|
| Leader / M1 | System design, infrastructure, orchestration |
| M2 | Worker, queue processing, K6 load testing |
| M3 | Product module, flash sale activation |
| **M4 (me)** | **Auth, User, Admin APIs, soft delete** |
| M5 | Frontend UI, user flows |

---

<div align="center">

**Source Code:** [github.com/VoThanhHa28/flashsale-project](https://github.com/VoThanhHa28/flashsale-project.git)

</div>
