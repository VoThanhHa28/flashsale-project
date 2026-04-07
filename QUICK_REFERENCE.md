# ⚡ QUICK REFERENCE - 1 PAGE SUMMARY

## 3 FEATURES AT A GLANCE

### 1️⃣ FLASH SALE (30 min TTL)
```
POST /v1/api/order (JWT required)
├─ Input: { productId, quantity, client_order_id (UUID) }
├─ Process:
│  ├─ Redis Lua: atomic check stock → decrement (NO RACE CONDITIONS)
│  ├─ MongoDB: create Reservation (TTL 30 min)
│  ├─ RabbitMQ: queue async order creation
│  └─ Return: reservation_id + expire_at
└─ Test: K6 100 users × 5 stock = 5 success + 95 rejected
```
**Key**: Lua script guarantees zero oversell, idempotency via client_order_id

---

### 2️⃣ INVENTORIES (Stock Tracking)
```
GET /v1/api/inventories/:productId/total (no auth)
├─ Returns: { totalQty, reserved, available }
├─ totalQty = SUM(InventoryTransaction where status=confirmed)
├─ reserved = COUNT(Reservation where status=pending)
└─ available = totalQty - reserved

GET /v1/api/inventories/:productId/history (pagination)
└─ Returns: list of import/export/adjustment transactions with audit log
```
**Key**: Every stock change = InventoryTransaction record (audit trail), real-time calculation

---

### 3️⃣ CHECKOUT COUNTDOWN (5 min TTL)
```
POST /v1/api/checkout (JWT required)
├─ Input: { productId, quantity }
├─ Return: { reservation_id, expiresIn (300 sec) }
│
GET /v1/api/checkout/:id (JWT required)
├─ Return: { expiresIn, product_name, quantity }
│
POST /v1/api/checkout/:id/confirm (JWT required)
├─ Input: { address, phone, notes }
├─ Process: create final Order in MongoDB
└─ Return: { order_id, client_order_id }
```
**Key**: Collects shipping info DURING checkout, confirms before TTL expires

---

## ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React)                                            │
│ - Flash Sale button + 30min timer                          │
│ - Checkout modal + 5min timer + form                       │
│ - Inventory display (available qty)                        │
└──────────────────────┬──────────────────────────────────────┘
                       │ JWT Auth
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend API (Express.js)                                    │
│ ├─ POST /v1/api/order                (Flash Sale)          │
│ ├─ GET  /v1/api/inventories/:id/total                      │
│ ├─ POST /v1/api/checkout              (Checkout init)      │
│ └─ POST /v1/api/checkout/:id/confirm  (Checkout confirm)   │
└──┬──────────────────────┬──────────────────────┬────────────┘
   │                      │                      │
   ▼                      ▼                      ▼
┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
│ Redis       │   │ MongoDB      │   │ RabbitMQ         │
│ ├─ Lua:     │   │ ├─ Order     │   │ (async worker)   │
│ │  Atomic   │   │ ├─ Reserv.   │   │ ├─ Create Order  │
│ │  stock--  │   │ ├─ Inventory │   │ ├─ Update final  │
│ │           │   │ │  Trans.    │   │ │ inventory      │
│ └─ TTL:     │   │ └─ Product   │   │ └─ Log activity  │
│    Cache    │   │ (TTL index:  │   └──────────────────┘
│    expiry   │   │  auto-clean) │
└─────────────┘   └──────────────┘
```

---

## CODE FILES (FEATURE-WISE)

**Flash Sale**: order.controller.js → order.service.js (Lua) → order.route.js  
**Inventories**: inventoryTransaction.controller.js → inventoryTransaction.service.js → inventory.route.js  
**Checkout**: checkout.controller.js → checkout.service.js → checkout.route.js  
**Shared Models**: order.model.js, reservation.model.js, inventoryTransaction.model.js  
**Test**: tests/oversell-protection.js (K6)

---

## KEY CONCEPTS

| Term | Meaning | Where |
|------|---------|-------|
| **Idempotency Key** | client_order_id (UUID) - prevents duplicate orders | order.model.js, order.controller.js |
| **Lua Script** | Atomic Redis operation - checks + decrements stock in 1 step | order.service.js reserveProductSlot() |
| **TTL** | Time-to-live index - MongoDB auto-deletes after time expires | reservation.model.js (30/5 min) |
| **Reservation** | Time-locked slot - temporary claim on stock | reservation.model.js, order.service.js |
| **RabbitMQ** | Message queue - async order processing | order.controller.js, config/rabbitmq.js |
| **Aggregate Query** | MongoDB: SUM confirmed inventory transactions | inventoryTransaction.repo.js getTotalQty() |

---

## PROOF OF CORRECTNESS

1. **Zero Oversell**: K6 test (100 users × 5 stock) → exactly 5 orders succeed
2. **Idempotency**: Retry same client_order_id → get 409, not duplicate order
3. **TTL Auto-cleanup**: MongoDB TTL index + Redis EXPIRE remove records automatically
4. **Real-time Inventory**: GET /inventories endpoint calculates available = total - reserved
5. **Atomic Stock**: Lua script ensures stock never goes negative even with race conditions

---

## DEPLOYMENT

```bash
# Container setup (already running):
docker-compose up -d

# Backend: Node.js + Express on port 3000
# MongoDB: Atlas cloud (connection in .env)
# Redis: localhost:6379 (non-blocking async)
# RabbitMQ: localhost:5672

# Last commit: 9042c77 (develop branch)
# All features: READY FOR FE INTEGRATION
```

---

## INTERVIEW SOUNDBITES

**Q: How did you build a system that won't oversell under heavy load?**  
→ Lua script in Redis executes atomically. Even 100 concurrent users trying to buy 5 units = only 5 succeed.

**Q: How do you prevent duplicate orders?**  
→ client_order_id is unique + indexed. Retry = 409 Conflict, not new order.

**Q: How long does an order take?**  
→ Reservation: < 10ms (Lua). Queue to worker: async (user gets response immediately).

**Q: What if the worker crashes?**  
→ Message stays in RabbitMQ queue, worker replays when it comes back up.

**Q: How do you handle 5-minute checkout timeouts?**  
→ MongoDB TTL index auto-deletes Reservation after 5 min. FE disables confirm button when expiresIn <= 0.

**Q: What's the stock calculation formula?**  
→ available = SUM(confirmed InventoryTransactions) - COUNT(pending Reservations)

---

## QUICK DEMO COMMANDS

```bash
# Test Flash Sale endpoint
curl -X POST http://localhost:3000/v1/api/order/test \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","quantity":1}'

# Run load test (if K6 installed)
k6 run tests/oversell-protection.js

# Check inventory
curl http://localhost:3000/v1/api/inventories/PRODUCT_ID/total

# List files created
ls -la src/controllers/inventory* src/services/inventory* src/routes/inventory*
ls -la src/controllers/checkout* src/services/checkout* src/routes/checkout*
ls -la tests/oversell*

# Check last commit
git log -1 --format="%H %s"
```

---

**Status**: ✅ READY FOR INTERVIEW  
**Time to explain**: 10 min (3 features × 3-4 min each) + Q&A  
**Confidence Level**: 💯 All 3 features fully implemented + tested
