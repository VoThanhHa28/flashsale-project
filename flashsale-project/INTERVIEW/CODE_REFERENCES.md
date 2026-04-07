# 🔍 SPECIFIC CODE REFERENCES - Quick Navigation

**Use this to find exact lines/methods during interview**

---

## ⚡ Flash Sale - Code Locations

### How Lua Script Works
**File**: `src/services/order.service.js`  
**Method**: `reserveProductSlot()`  
**Key Lines**: Lua script logic

```
Lua Script Does:
  1. GET "product:{productId}:stock"
  2. IF quantity > stock THEN FAIL
  3. ELSE DECRBY stock, INCRBY reserved
  4. RETURN success
```
**Why Atomic**: Single Redis operation = no race conditions

---

### How Idempotency Works
**File**: `src/models/order.model.js`  
**Key Line**: `unique: true, index: true` on `client_order_id`

```javascript
client_order_id: {
  type: String,
  sparse: true,      // Allow null
  unique: true,      // ← Prevent duplicates!
  index: true        // ← Fast lookup
}
```

**Test It**:
```bash
# First request - succeeds
curl -X POST /v1/api/order \
  -d '{"productId":"...", "quantity":1, "client_order_id":"uuid-123"}'
# Response: 201

# Retry with same UUID - fails gracefully
curl -X POST /v1/api/order \
  -d '{"productId":"...", "quantity":1, "client_order_id":"uuid-123"}'
# Response: 409 Conflict
```

---

### How TTL (30 min) works
**File**: `src/models/reservation.model.js`  
**Key Lines**: TTL index definition

```javascript
// At bottom of schema:
orderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 })
// 1800 seconds = 30 minutes
```

**How to Verify**:
```bash
docker exec flashsale_mongo mongosh flashsale_db
> db.reservations.getIndexes()
# Look for: { expireAfterSeconds: 1800 }
```

---

### How RabbitMQ Queue Works
**File**: `src/config/rabbitmq.js`  
**Method**: `sendToQueue()`

```javascript
// In order.controller.js placeOrder():
await sendToQueue('ORDER_QUEUE', {
  client_order_id: ...,
  reservation_id: ...,
  userId: ...,
  productId: ...
})
```

**What Happens**:
1. Order payload → RabbitMQ queue
2. Backend worker listens to queue
3. Worker: create Order + update inventory (async)
4. User gets response immediately (doesn't wait for worker)

---

## 📦 Inventories - Code Locations

### How getTotalQty() Aggregate Query Works
**File**: `src/repositories/inventoryTransaction.repo.js`  
**Method**: `getTotalQty()`

```javascript
InventoryTransaction.aggregate([
  { $match: { product_id: productId, status: 'confirmed' } },
  { $group: { _id: null, total: { $sum: '$quantityChange' } } }
])
```

**Why It Works**:
- `$match`: Filter only "confirmed" (skip pending/rejected)
- `$group`: Aggregate across all transactions
- `$sum`: Sum all quantityChange values

**Example Data**:
```
InventoryTransaction records:
1. type: "import", quantityChange: +10, status: "confirmed"
2. type: "import", quantityChange: +5, status: "pending"
3. type: "export", quantityChange: -3, status: "confirmed"

getTotalQty() returns: 10 + (-3) = 7 (pending 5 not counted)
```

---

### How Available Stock is Calculated
**File**: `src/controllers/inventoryTransaction.controller.js`  
**Method**: `getTotalQty()` (GET endpoint)

```javascript
const totalQty = await repo.getTotalQty(productId);
const reservedQty = await Reservation.countDocuments({
  product_id: productId,
  status: 'pending'
});
const availableQty = totalQty - reservedQty;

return { totalQty, reserved: reservedQty, available: availableQty }
```

**Flow**:
```
Total Qty (7) - Reserved (3) = Available (4)
     ↑                ↑              ↑
  confirmed      flash_sale    visible to
  imports        + checkout     customers
```

---

### Admin Import Flow
**File**: `src/controllers/inventoryTransaction.controller.js`  
**Methods**: 
- `createTransaction()` - Create pending import
- `updateTransactionStatus()` - Confirm import

**Steps**:
1. Admin POST `/v1/api/admin/inventories/import` → Creates InventoryTransaction (status: pending)
2. Admin PATCH `/v1/api/admin/inventories/:id/confirm` → Status changes to "confirmed"
3. Next GET `/inventories/:id/total` includes the new qty in totalQty

---

## ⏱️ Checkout Countdown - Code Locations

### 3-Step Checkout Flow
**File**: `src/services/checkout.service.js`  
**Methods**: `initiateCheckout()`, `getCheckoutStatus()`, `confirmCheckout()`

**Step 1: Initiate (POST /checkout)**
```javascript
async initiateCheckout({ userId, productId, quantity }) {
  // Create Reservation with type: 'checkout' + TTL: 5 min
  const reservation = new Reservation({
    type: 'checkout',          // ← Different from flash_sale
    product_id: productId,
    quantity,
    user_id: userId,
    status: 'pending',
    TTL expires in 5 min ← auto-delete
  })
  await reservation.save()
  return { reservation_id, expiresIn: 300 }
}
```

**Step 2: Check Status (GET /checkout/:id)**
```javascript
async getCheckoutStatus({ reservationId, userId }) {
  const reservation = await Reservation.findById(reservationId)
  const remainingSeconds = calculateTTL(reservation.createdAt)
  return { 
    expiresIn: remainingSeconds,
    product_name: ...,
    quantity: ...
  }
}
```

**Step 3: Confirm (POST /checkout/:id/confirm)**
```javascript
async confirmCheckout({ reservationId, userId, address, phone, notes }) {
  const reservation = await Reservation.findById(reservationId)
  
  // BEFORE creating order, check: expiresIn > 0?
  if (appointment.expiresIn <= 0) {
    throw new Error('Checkout expired')
  }
  
  // Create final Order
  const order = new Order({
    userId, productId, quantity, price,
    client_order_id: reservation.client_order_id,
    address, phone, notes  // ← Collected during checkout
  })
  await order.save()
  
  // Mark reservation as confirmed
  reservation.status = 'confirmed'
  await reservation.save()
  
  return { order_id, client_order_id }
}
```

---

### TTL field in Reservation Model
**File**: `src/models/reservation.model.js`

```javascript
const reservationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['flash_sale', 'checkout'],
    required: true
  },
  // ... other fields
}, { timestamps: true })

// Different TTL based on type:
// Flash Sale: 30 minutes (1800 seconds)
// Checkout: 5 minutes (300 seconds)

// MongoDB TTL index:
reservationSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 1800  // ← 30 min for flash_sale
})
```

**Note**: For checkout (5 min), you might need separate TTL handling or middleware to recalculate.

---

## 🧪 K6 Load Test - Code Locations

### Test Script Overview
**File**: `tests/oversell-protection.js`

**Key Config**:
```javascript
const STOCK = 5;          // Product has 5 units
const VUS = 100;          // 100 concurrent users
const DURATION = '30s';   // Run for 30 seconds

// Each user makes 1 request:
POST /v1/api/order/test with { productId, quantity: 1 }
```

**Expected Results**:
```
successCount = 5    (201 responses)
failCount = 95      (400 "out of stock" responses)
oversellCount = 0   (NO orders beyond stock)

✅ TEST PASSES if: successCount === 5 && failCount === 95
❌ TEST FAILS if: successCount > 5 (oversell happened!)
```

**Run Command**:
```bash
cd flashsale-project
k6 run tests/oversell-protection.js
```

---

## 🔐 Authentication - Where It's Checked

### Flash Sale - JWT Required
**File**: `src/routes/order.route.js`  
**Line**: `router.post("/", auth.verifyToken, ...)`

```javascript
router.post(
    "/",
    auth.verifyToken,              // ← Check JWT here
    validate(orderValidation.create),
    OrderController.placeOrder
)
```

### Checkout - JWT Required
**File**: `src/routes/checkout.route.js`  
**All 3 endpoints**: `auth.verifyToken` middleware

### Inventory Admin - JWT + SHOP_ADMIN Role
**File**: `src/routes/inventory.route.js`  
**Lines**: `checkRole('SHOP_ADMIN')`

```javascript
router.post(
    '/import',
    auth.verifyToken,              // ← Check JWT
    checkRole('SHOP_ADMIN'),       // ← Check role (NOT "admin", must be "SHOP_ADMIN")
    validate(...),
    InventoryTransactionController.createTransaction
)
```

---

## 🧩 How to Find Stuff During Interview

| Question | Go To |
|----------|-------|
| "How do you prevent oversell?" | order.service.js > Lua script |
| "What if user gets disconnected?" | models/order.model.js > client_order_id unique |
| "How do you avoid duplicate orders?" | services/order.service.js > Idempotency check |
| "How does inventory auto-cleanup?" | models/reservation.model.js > TTL index |
| "How do you track stock changes?" | repositories/inventoryTransaction.repo.js > getTotalQty() |
| "How does checkout timeout work?" | models/reservation.model.js > type field + TTL |
| "How is order processing async?" | config/rabbitmq.js > sendToQueue() |
| "Can we load test this?" | tests/oversell-protection.js > K6 script |
| "How do admins import stock?" | controllers/inventoryTransaction.controller.js > createTransaction() |
| "What prevents unauthorized access?" | routes/inventory.route.js > checkRole('SHOP_ADMIN') |

---

## 🎯 5-MINUTE WALKTHROUGH

If interviewer says "Walk me through one feature in 5 minutes":

**Flash Sale (Pick This)**:
1. Show: order.route.js (POST /v1/api/order)
2. Show: order.controller.js (placeOrder method)
3. Show: order.service.js (Lua script in reserveProductSlot)
4. Show: tests/oversell-protection.js (K6 test proof)
5. Say: "Lua script is atomic, so 100 users on 5 stock = 5 succeed, 95 rejected, zero oversells"

**Inventories (Alternative)**:
1. Show: inventory.route.js (GET /v1/api/inventories/:id/total)
2. Show: inventoryTransaction.repo.js (getTotalQty aggregate)
3. Show: inventoryTransaction.service.js (createTransaction flow)
4. Say: "Every stock change creates a transaction record - audit trail"
5. Say: "Available = totalQty - reserved (real-time calculation)"

**Checkout (Best for "Compare Features")**:
1. Show: checkout.route.js (3 endpoints)
2. Show: checkout.service.js (initiateCheckout → getCheckoutStatus → confirmCheckout)
3. Show: models/reservation.model.js (type field distinguishes 30 vs 5 min)
4. Say: "Similar to Flash Sale but collects address/phone DURING countdown"25. Say: "Only creates Order on confirm, not on initiate"

---

## 📌 QUICK GREP COMMANDS

Find specific code quickly:

```bash
# Find all Lua script code
grep -n "EVAL" src/services/order.service.js

# Find all client_order_id usage
grep -rn "client_order_id" src/

# Find all Reservation creation
grep -rn "new Reservation" src/

# Find all RabbitMQ sends
grep -rn "sendToQueue" src/

# Find all aggregate queries
grep -rn "aggregate" src/

# Find all TTL index definitions
grep -rn "expireAfterSeconds" src/

# Find all JWT auth checks
grep -rn "auth.verifyToken" src/routes/

# Find all role checks
grep -rn "checkRole" src/routes/
```

---

**Last Updated**: April 7, 2026  
**Use During**: Technical interview  
**Status**: ✅ Ready to reference
