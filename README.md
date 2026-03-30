<div align="center">

# ⚡ Flash Sale System

### High-concurrency backend platform for time-limited flash sale events

[![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongoosejs.com)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://socket.io)

> A backend system that handles thousands of concurrent requests during flash sale events — without overselling, without data loss, and with real-time feedback.

[🚀 Quick Start](#️-installation--setup) · [📐 Architecture](#-architecture--system-design) · [✨ Features](#-features) · [💻 Source Code](https://github.com/VoThanhHa28/flashsale-project.git)

</div>

---

## 📌 What is This?

Flash sale events create extreme traffic bursts — thousands of users trying to buy the same product at the same second.

This system is built to handle exactly that:

- ✅ **No overselling** — atomic Redis reservation ensures stock integrity
- ✅ **Non-blocking orders** — RabbitMQ async pipeline decouples purchase from persistence
- ✅ **Real-time feedback** — Socket.IO broadcasts sale start and stock updates
- ✅ **Role-based security** — JWT + RBAC for shopper/admin separation
- ✅ **Operational visibility** — admin health check, user moderation, and soft delete

---

## ✨ Features

| Module | What it does |
|---|---|
| 🔐 **Auth** | Register, login, JWT access tokens, RBAC (`USER` / `SHOP_ADMIN`) |
| 👤 **User Profile** | View/update profile, change password, avatar support |
| 📦 **Inventory** | Redis atomic Lua-script stock decrement — no race conditions |
| 🛒 **Orders** | Place order → RabbitMQ queue → Worker persists to MongoDB |
| 📜 **Order History** | Paginated list + detail per user with ownership enforcement |
| 📡 **Real-time** | Socket.IO events for sale window open/close and stock changes |
| 🛡 **Admin** | List users (paginated), ban user, system health check |
| 🗂 **Data Safety** | Soft delete for User — data preserved, never hard-deleted |
| 🧪 **Load Testing** | Seed API to generate 1000+ test users for K6 stress tests |

---

## 🎬 Demo

**Auth Flow (Register → Login → Access protected API)**

![Login Flow Demo](./docs/demo-login.gif)

**Order History + Admin Management**

![Admin & Order Demo](./docs/demo-admin-order.gif)

---

## 🧠 Architecture / System Design

![Architecture Diagram](./docs/architecture.png)

**Clean Architecture — every layer has one responsibility:**

```
Incoming Request
  │
  ├── Route            → maps URL to handler chain
  ├── Middleware        → auth (JWT), RBAC, request validation (Joi)
  ├── Controller        → orchestrates request/response, no business logic
  ├── Service           → business rules, domain decisions
  ├── Repository        → all DB access, enforces is_deleted filters
  └── Response/Error    → shared utilities for consistent JSend shape
```

**Infrastructure flow for Order:**

```
POST /order
  → verifyToken → validate
  → Redis: atomic stock deduct (Lua)
  → RabbitMQ: push order payload
  → HTTP 200 immediately (non-blocking)
         ↓
    Worker picks up
    → saves Order to MongoDB
    → Socket.IO: broadcasts stock update
```

---

## 🛠 Tech Stack

**Backend**

| Layer | Technology |
|---|---|
| Runtime | Node.js 22+ |
| Framework | Express.js 4.x |
| Database | MongoDB + Mongoose |
| Cache / Inventory | Redis |
| Queue | RabbitMQ |
| Real-time | Socket.IO |

**Security & Validation**

| Tool | Purpose |
|---|---|
| JWT | Stateless access token auth |
| bcrypt | Secure password hashing |
| Joi | Schema-based request validation |

**DevOps & Testing**

| Tool | Purpose |
|---|---|
| Docker + Compose | Local infrastructure setup |
| Postman | API development and testing |
| K6 | Load / stress testing |

---

## 🚧 Challenges & How We Solved Them

| Challenge | Solution |
|---|---|
| **Overselling under burst traffic** | Redis Lua-script atomic decrement — stock is reserved in a single operation before any order is created |
| **Order creation blocking response time** | RabbitMQ async pipeline — request returns immediately, worker handles persistence |
| **API inconsistency across team members** | Shared `SuccessResponse` / error classes + Joi middleware enforced on every route |
| **Preserving data for audit & compliance** | Soft delete strategy (`is_deleted`) — data never removed, filtered at query level across all layers |
| **Merge conflicts from parallel development** | Additive-only approach — new files, routes, methods; never overwriting existing logic |

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v20+ LTS
- Docker & Docker Desktop (running)

### 1 — Clone

```bash
git clone https://github.com/VoThanhHa28/flashsale-project.git
cd flashsale-project/flashsale-project
```

### 2 — Install dependencies

```bash
npm install
```

### 3 — Configure environment

Create `.env` at the project root:

```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/flashsale_db
JWT_SECRET=your-super-secret-key
REDIS_URI=redis://localhost:6379
RABBITMQ_URI=amqp://localhost:5672
```

### 4 — Start infrastructure (MongoDB, Redis, RabbitMQ)

```bash
docker compose up -d
```

> Verify RabbitMQ at [http://localhost:15672](http://localhost:15672) — login: `guest / guest`

### 5 — Run server

```bash
npm run dev
# → Server running at http://localhost:3000
```

---

## 📡 API Overview

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/v1/api/auth/register` | Create account | Public |
| POST | `/v1/api/auth/login` | Login, get JWT | Public |
| GET | `/v1/api/users/me` | Get own profile | JWT |
| PUT | `/v1/api/users/me` | Update profile / avatar | JWT |
| POST | `/v1/api/users/change-password` | Change password | JWT |
| POST | `/v1/api/order` | Place order (flash sale) | JWT |
| GET | `/v1/api/order/me` | My order history | JWT |
| GET | `/v1/api/order/me/:id` | My order detail | JWT |
| GET | `/v1/api/admin/users` | List all users | SHOP_ADMIN |
| PATCH | `/v1/api/admin/users/:id/ban` | Ban a user | SHOP_ADMIN |
| GET | `/v1/api/admin/health` | System health check | SHOP_ADMIN |
| POST | `/v1/api/seed/users` | Seed users for load test | Dev only |

---

## 🔮 Future Improvements

- [ ] Extend soft delete to `Order` and `Product` models
- [ ] Structured observability: metrics, tracing, queue anomaly alerts
- [ ] OAuth2 / social login support
- [ ] Admin audit log and export endpoints

---

## 🤝 Team

| Member | Module |
|---|---|
| Leader / M1 | System design, infrastructure, CI/CD |
| M2 | Order worker, RabbitMQ consumer, K6 load testing |
| M3 | Product module, flash sale activation, admin flash-sale routes |
| M4 | Auth, User, Admin User Management, soft delete |
| M5 | Frontend UI, user flows, real-time socket client |

---

<div align="center">

**Source Code:** [github.com/VoThanhHa28/flashsale-project](https://github.com/VoThanhHa28/flashsale-project.git)

</div>
