# Flash Sale System

High-concurrency backend platform for flash sale events with atomic stock reservation, asynchronous order processing, and role-based access control.

![Node.js](https://img.shields.io/badge/Node.js-22+-green?style=flat)
![Express](https://img.shields.io/badge/Express-4.x-blue?style=flat)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-4ea94b?style=flat)
![Redis](https://img.shields.io/badge/Redis-Cache-orange?style=flat)
![RabbitMQ](https://img.shields.io/badge/RabbitMQ-Queue-red?style=flat)

## Project Overview
- This project is designed for flash-sale traffic spikes where many users compete for limited inventory at the same time.
- Core goals are inventory consistency, non-blocking order flow, and predictable API behavior for frontend/load testing.
- Target users: shoppers, admins, and engineering team members running load tests and operations checks.

## Problem & Motivation
- Flash sale systems fail easily under burst traffic if inventory is updated non-atomically.
- Synchronous order creation can increase latency and error rates during peak windows.
- Teams need visibility and safe admin controls (RBAC, user moderation, health checks) to operate reliably.

## Features
- Atomic stock reservation with Redis (Lua script based decrement).
- Async order pipeline with RabbitMQ to decouple request handling from order persistence.
- JWT authentication + RBAC (`USER`, `SHOP_ADMIN`) for protected/admin endpoints.
- User module: register/login, profile APIs, password change, avatar update.
- Order history APIs for logged-in users with pagination and ownership checks.
- Admin APIs: list users, ban user, health check (MongoDB/Redis).
- Soft delete for user (`is_deleted`) with query-level filtering across auth/repository flows.

## Demo
> Keep visuals focused: 1-2 GIFs max, stored in `docs/`.

![Login Flow Demo](./docs/demo-login.gif)
![Order History + Admin Demo](./docs/demo-admin-order.gif)

## Architecture / System Design
![Architecture Diagram](./docs/architecture.png)

- Layered backend architecture:
  - `routes` -> request mapping
  - `validation` -> Joi request contracts
  - `controllers` -> transport orchestration
  - `services` -> business logic
  - `repositories` -> data access
- Shared response/error utilities to keep API shape consistent.

## Tech Stack
- Backend: Node.js, Express.js, MongoDB (Mongoose), Redis, RabbitMQ, Socket.IO
- Security & Validation: JWT, bcrypt, Joi
- DevOps & Tools: Docker, Postman, K6, Git

## My Contributions (Member 4 - Auth & User)
- Built Auth & User backend module with clean separation of transport, business, and data layers.
- Implemented JWT + RBAC and secured admin routes for `SHOP_ADMIN`.
- Delivered user profile APIs (`GET/PUT /users/me`, `POST /users/change-password`) with validation.
- Implemented avatar support and consistent API response contract.
- Built order-history APIs (`GET /order/me`, `GET /order/me/:id`) with pagination + ownership checks.
- Built admin APIs (`GET /admin/users`, `PATCH /admin/users/:id/ban`, `GET /admin/health`).
- Added user soft delete and updated auth/query paths to exclude logically deleted users.

## Challenges & Solutions
- **Challenge:** Race conditions during stock updates under high load.  
  **Solution:** Redis atomic reservation and async queue-based order flow.
- **Challenge:** API inconsistency across multiple contributors.  
  **Solution:** Shared response/error classes + Joi validation middleware.
- **Challenge:** Data retention and account lifecycle control.  
  **Solution:** Soft delete strategy for user data (`is_deleted`) and defensive filtering in auth/repo.

## Installation & Setup
### 1) Clone repository
```bash
git clone https://github.com/VoThanhHa28/flashsale-project.git
cd flashsale-project/flashsale-project
```

### 2) Install dependencies
```bash
npm install
```

### 3) Configure environment
Create/update `.env`:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/flashsale_db
JWT_SECRET=your-secret
REDIS_URI=redis://localhost:6379
RABBITMQ_URI=amqp://localhost:5672
```

### 4) Start infrastructure (if using Docker)
```bash
docker compose up -d
```

### 5) Run backend
```bash
npm run dev
```

## Lessons Learned
- Reliability in flash sale systems depends on atomic operations and asynchronous processing.
- Clean architecture improves maintainability when multiple team members deliver in parallel.
- Soft delete must be enforced at query boundaries, not only at delete operation points.

## Future Improvements
- Extend soft delete policy to additional domain models where required by business.
- Add structured observability (metrics, tracing, alerting for queue/stock anomalies).
- Improve admin tooling with richer filters and audit logs.

## Source Code
- Repository: [VoThanhHa28/flashsale-project](https://github.com/VoThanhHa28/flashsale-project.git)
# FLASHSALE PROJECT - HIGH CONCURRENCY SYSTEM

Dự án môn học: Hệ thống bán hàng chịu tải cao (Flash Sale).

## BAN ĐẦU CHƯA CÓ GÌ THÌ BỌN MÀY SẼ LÀM
Clone: git clone ...

Vào nhánh chung: git checkout develop

Tạo nhánh riêng: git checkout -b feature/login (ví dụ vậy).

Code & Push: Code xong -> git push origin feature/login.

Tạo PR (MR): Lên Github tạo Pull Request từ feature/login vào develop.

Tao: Review code -> Merge vào develop.

## 1. Yêu cầu môi trường
- Node.js: v20 LTS trở lên.
- Docker & Docker Desktop: Phải cài đặt và đang chạy.
- VS Code.

## 2. Cài đặt & Chạy dự án (Onboarding)

### Bước 1: Clone code
git clone https://github.com/VoThanhHa28/flashsale-project
cd flashsale-project

### Bước 2: Cài thư viện
npm install

### Bước 3: Bật hạ tầng (DB, Redis, Queue)
docker-compose up -d
# Chờ 1 chút, sau đó kiểm tra:
# - Vào http://localhost:15672 (User: guest / Pass: guest) -> Ra RabbitMQ là OK.

### Bước 4: Chạy Server
Code hằng ngày:
npm run dev

Demo / quay video / nộp:
npm start

# Nếu hiện "Server running on port 3000" là thành công.

## 3. Quy tắc Git (NGHIÊM TÚC THỰC HIỆN)
- Nhánh chính: `main` (Chỉ chứa code sạch để demo).
- Nhánh phát triển: `develop` (Mọi người merge vào đây).
- Nhánh cá nhân:
    - `feature/auth` (Member 4)
    - `feature/product` (Member 3)
    - `feature/worker` (Member 2)
    - `frontend/ui` (Member 5)
### QUY TRÌNH 3 BƯỚC KHI CODE:
# 1. Chuyển về nhánh develop và cập nhật code mới nhất từ trên mạng về (để tránh lệch code)
git checkout develop
git pull origin develop

# 2. Tạo nhánh mới để làm việc (Ví dụ Member 4 làm Login)
git checkout -b feature/login

# ... (Ngồi code chán chê xong xuôi) ...

# 3. Lưu code và đẩy lên Github
git add .
git commit -m "Done api login"
git push origin feature/login

- SAU ĐÓ Member làm xong thì vào trang Github của dự án, sẽ thấy nút màu xanh "Compare & pull request".

Bấm vào đó.

Chọn Base: develop (Mũi tên hướng vào develop) <- Compare: feature/login.

Bấm Create pull request.

- RỒi CUỐI CÙNG tao sẽ review và merge

## 4. API Documentation
Xem file GG Docs chung trong nhóm Zalo.
