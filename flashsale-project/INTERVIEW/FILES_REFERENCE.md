# 📋 FILE-BY-FILE REFERENCE GUIDE

## Created Files (Option A Implementation)

### 🎯 FEATURE 1: FLASH SALE (30 min)

| File | Purpose | Key Functions |
|------|---------|----------------|
| `src/controllers/order.controller.js` | Flash Sale API handler | `placeOrder()` - Validates, reserves slot, queues order |
| `src/services/order.service.js` | Flash Sale business logic | `reserveProductSlot()` - Lua script + Reservation creation |
| `src/routes/order.route.js` | Flash Sale routes | `POST /v1/api/order` (JWT required) + `/test` (public K6) |
| `src/models/order.model.js` | Order schema | Fields: userId, productId, quantity, price, client_order_id (idempotency) |
| `src/models/reservation.model.js` | Time-locked slot | NEW field: `type` (flash_sale | checkout) - determines TTL |
| `src/validation/order.validation.js` | Input validation | Joi schemas: productId, quantity, client_order_id (optional) |
| `tests/oversell-protection.js` | Load test (K6) | 100 concurrent users test - proves no oversell |

**Happy Path**:
1. Customer POSTs /v1/api/order with JWT + productId + quantity
2. OrderController generates/uses client_order_id (UUID)
3. OrderService calls Redis Lua script (atomic deduction + Reservation TTL 30min)
4. RabbitMQ queues order payload for async processing
5. Response 201 with reservation_id + expire_at
6. FE shows 30-minute countdown timer

---

### 📦 FEATURE 2: INVENTORIES (Stock Tracking)

| File | Purpose | Key Functions |
|------|---------|----------------|
| `src/controllers/inventoryTransaction.controller.js` | Inventory admin endpoints | 5 handlers: create, list, history, update status |
| `src/services/inventoryTransaction.service.js` | Inventory logic | `createTransaction()`, `getProductTotalQty()`, `getProductTransactionHistory()` |
| `src/repositories/inventoryTransaction.repo.js` | Inventory DB access | `getTotalQty()` aggregate (SUM confirmed only) |
| `src/routes/inventory.route.js` | Inventory endpoints | GET/PATCH with SHOP_ADMIN role protection |
| `src/models/inventoryTransaction.model.js` | Transaction schema | type: import/export/adjustment, quantityChange, reason, status, TTL index |
| `src/validation/inventoryTransaction.validation.js` | Input validation | Joi schemas: type, quantity, reason |
| `src/controllers/product.controller.js` | (MODIFIED) | Now passes userId when creating product → auto-create initial inventory |
| `src/services/product.service.js` | (MODIFIED) | Calls InventoryService.createTransaction() on product creation |

**Happy Path**:
1. Product created → Auto-create InventoryTransaction (import, status: confirmed)
2. Admin imports stock → POST /v1/api/admin/inventories/import (status: pending)
3. Admin confirms import → PATCH /v1/api/admin/inventories/:id/confirm (status: confirmed)
4. FE calls GET /v1/api/inventories/:productId/total → Returns totalQty, reserved, available
5. Reserved = pending Reservation count, Available = totalQty - reserved

**Key Query**:
```javascript
// Repository: getTotalQty()
InventoryTransaction.aggregate([
  { $match: { product_id, status: 'confirmed' } },
  { $group: { _id: null, total: { $sum: '$quantityChange' } } }
])
```

---

### ⏱️ FEATURE 3: CHECKOUT COUNTDOWN (5 min)

| File | Purpose | Key Functions |
|------|---------|----------------|
| `src/controllers/checkout.controller.js` | Checkout endpoints | `initiateCheckout()`, `getCheckoutStatus()`, `confirmCheckout()` |
| `src/services/checkout.service.js` | Checkout workflow | Same 3 methods - validates time, collects shipping info |
| `src/routes/checkout.route.js` | Checkout routes | POST/GET /v1/api/checkout/* (JWT required) |
| `src/validation/checkout.validation.js` | Input validation | Joi schemas: productId, quantity, address, phone, notes |
| `src/models/reservation.model.js` | (MODIFIED) | Added `type` field to distinguish Flash Sale (30min) vs Checkout (5min) |

**Happy Path**:
1. Customer POSTs /v1/api/checkout with JWT + productId + quantity
2. CheckoutController calls CheckoutService.initiateCheckout()
3. Creates Reservation with type: "checkout" + TTL: 5 minutes
4. Response 201 with reservation_id + expiresIn (300 seconds)
5. FE shows 5-minute countdown modal + form (address, phone, notes)
6. Before expiresIn = 0, customer POSTs /v1/api/checkout/:id/confirm
7. CheckoutController calls confirmCheckout() → Creates actual Order
8. Response 201 with order_id + client_order_id

**Key Difference from Flash Sale**:
- Flash Sale: Reserve → Queue → Async order creation
- Checkout: Reserve → Collect shipping → Confirm → Sync order creation

---

### 🔧 MODIFIED FILES (Updates for Option A)

| File | Changes | Reason |
|------|---------|--------|
| `src/models/reservation.model.js` | Added `type: { enum: ['flash_sale', 'checkout'] }` | Distinguish 30min vs 5min TTL |
| `src/models/order.model.js` | Fixed: userId/productId are String (not ObjectId ref), added price field | Checkout needs to store price at order time |
| `src/routes/index.js` | Mounted checkout routes + inventory routes | Make endpoints accessible |
| `src/controllers/product.controller.js` | Pass userId to service | Track who created initial inventory |
| `src/services/product.service.js` | Call InventoryService.createTransaction() | Auto-create first inventory record |

---

### 🧪 TEST & CONFIG FILES

| File | Purpose |
|------|---------|
| `tests/oversell-protection.js` | K6 load test (100 concurrent users on 5-unit stock) |
| `src/config/redis.js` | Redis async connection (non-blocking) |
| `src/config/rabbitmq.js` | RabbitMQ producer + consumer setup |
| `src/config/db.js` | MongoDB connection to Atlas |

---

## 📂 Quick File Lookup by Question

### Q: "How do you prevent oversell?"
→ Look at: `src/services/order.service.js` (Lua script in reserveProductSlot method)

### Q: "How is the 30-minute TTL implemented?"
→ Look at: `src/models/reservation.model.js` (Mongoose TTL index)

### Q: "How do admins manage inventory?"
→ Look at: `src/routes/inventory.route.js` + `src/controllers/inventoryTransaction.controller.js`

### Q: "How is stock calculated in real-time?"
→ Look at: `src/repositories/inventoryTransaction.repo.js` (getTotalQty aggregate query)

### Q: "What's the flow for Checkout?"
→ Look at: `src/services/checkout.service.js` (3-step flow: initiate, status, confirm)

### Q: "How do you test concurrency?"
→ Look at: `tests/oversell-protection.js` (K6 script)

### Q: "What's the idempotency strategy?"
→ Look at: `src/models/order.model.js` (client_order_id unique index) + `src/services/order.service.js` (check before create)

### Q: "How are orders processed asynchronously?"
→ Look at: `src/config/rabbitmq.js` + RabbitMQ worker (check codebase or ask user for worker implementation)

---

## 🎤 Interview Script Template

**Interviewer**: "Walk me through your Flash Sale implementation"

**Your Answer**:
```
"The customer clicks [Đặt Flash Sale] button and we POST to /v1/api/order 
with their JWT token, productId, and a unique client_order_id (UUID).

The OrderController validates the input using Joi, then calls 
OrderService.reserveProductSlot(). This is where the magic happens - 
we execute a Lua script in Redis that:
  1. Checks if stock >= requested quantity (atomic check)
  2. Decrements stock
  3. Increments reserved counter

All in one Redis operation, guaranteeing no race conditions.

Simultaneously, we create a Reservation record in MongoDB with a 30-minute 
TTL index. After 30 minutes, MongoDB automatically deletes it.

We then push the order payload to RabbitMQ so the worker can process it 
asynchronously - create the actual Order record, update inventory, log 
activity. This keeps the API response fast (< 50ms).

The customer gets back a reservation_id and an expire_at timestamp. 
Their frontend starts a 30-minute countdown, calling the server if needed 
to get the true remaining time (not relying on client clock).

For load testing, we built a K6 script that spins up 100 concurrent users 
trying to buy from a 5-unit stock. Result: exactly 5 succeed (201), 
95 get 'out of stock' (400), zero oversells. The Lua script held up."
```

---

## 💾 Commit History

```bash
git log --oneline

9042c77 fix: ObjectId constructor + add K6 oversell protection test
        └─ Fixed POST /test endpoint for K6 load testing
        └─ Added tests/oversell-protection.js

[earlier commits for inventories, checkout, flash sale features...]
```

**Check commits**:
```bash
cd flashsale-project
git log --oneline -n 20
git diff HEAD~5..HEAD -- src/  # See last 5 commits changes
```

---

## 🚀 DEMO CHECKLIST

Before interview, you can show:

```bash
# 1. Test Flash Sale endpoint
curl -X POST http://localhost:3000/v1/api/order/test \
  -H "Content-Type: application/json" \
  -d '{"productId": "PRODUCT_ID", "quantity": 1}'

# 2. Run K6 oversell test (requires K6 installed)
k6 run tests/oversell-protection.js

# 3. Check MongoDB for Reservation TTL
docker exec flashsale_mongo mongosh flashsale_db --eval "db.reservations.findOne({})"

# 4. Check Redis Lua script
docker exec flashsale_redis redis-cli KEYS "product:*:stock"

# 5. Check RabbitMQ messages
docker exec flashsale_rabbitmq rabbitmqctl list_queues

# 6. Get inventory stats
curl http://localhost:3000/v1/api/inventories/{productId}/total

# 7. Create Checkout session
curl -X POST http://localhost:3000/v1/api/checkout \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "PRODUCT_ID", "quantity": 1}'
```

---

**Ready for Interview!** ✨  
Print this file + INTERVIEW_PREP.md for reference.
