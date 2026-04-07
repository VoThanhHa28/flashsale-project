# 📮 Postman Testing Guide - Flash Sale High-Concurrency

## 🚀 Quick Start

### 1. Import Collection
```
1. Open Postman
2. Click: Import → File
3. Select: FlashSale-HighConcurrency.postman_collection.json
4. Click: Import
```

### 2. Set Environment Variables
In Postman, create variables or set them during test execution:
```
{{token}}              → JWT token from login
{{product_id}}         → Product ID for testing
{{user_id}}            → User ID
{{client_order_id_X}}  → Auto-generated during tests
{{reservation_id_X}}   → Auto-generated during tests
```

---

## 📋 Test Execution Order

### Phase 1: Setup (Prerequisite)
```
✅ 1. Login & Get Token
   - Request: POST /v1/api/auth/login
   - Response: {token, user}
   - Save token to {{token}}

✅ 2. Get Product ID
   - Request: GET /v1/api/products
   - Response: Product list
   - Save first product._id to {{product_id}}

✅ 3. Get User ID
   - Request: GET /v1/api/users/me
   - Response: {_id, email, ...}
   - Save _id to {{user_id}}
```

---

### Phase 2: Normal Flow (Happy Path)
```
✅ TEST 1: Normal Flow - Happy Path
├─ 1.1 POST /order (Normal Buy)
│      Request: {productId, quantity: 1}
│      Checks:
│        ✓ Status 200 OK
│        ✓ Response has client_order_id
│        ✓ Response has reservation_id
│        ✓ Order payload complete
│        ✓ Response time < 100ms
│      Save: {{client_order_id_1}}, {{reservation_id_1}}
│
├─ 1.2 Verify Reservation Created (pending)
│      Request: GET /reservations/{{reservation_id_1}}
│      Checks:
│        ✓ status = "pending"
│        ✓ client_order_id matches
│        ✓ expire_at exists (TTL ~30 min)
│
├─ 1.3 Wait 5 seconds (Worker processes)
│      Simulates: Worker consuming RabbitMQ, creating Order
│
├─ 1.4 Verify Order Created
│      Request: GET /orders?clientOrderId={{client_order_id_1}}
│      Checks:
│        ✓ Order exists with client_order_id
│        ✓ Order status = "completed"
│        ✓ Order processedAt timestamp exists
│
└─ 1.5 Verify Reservation Status → confirmed
       Request: GET /reservations/{{reservation_id_1}}
       Checks:
         ✓ status = "confirmed"
         ✓ note contains Order ID
```

---

### Phase 3: Idempotency Test
```
❌ TEST 2: Idempotency - Duplicate Request
├─ 2.1 First Request (Success)
│      POST /order with client_order_id
│      Expected: 200 OK ✓
│
└─ 2.2 Duplicate Request (Should Fail)
       POST /order with SAME client_order_id
       Checks:
         ✗ Status = 400 (Unique constraint violation)
         ✗ Error message includes "duplicate"
         ✗ No additional Reservation created
         ✗ Redis stock NOT deducted again
```

**Key Point**: Database unique index on `client_order_id` prevents duplicate orders.

---

### Phase 4: Oversell Test
```
🚨 TEST 3: Oversell - Stock Exhaustion
├─ 3.1 Check Current Stock
│      GET /products/{{product_id}}
│      See: current stock level
│
├─ 3.2 Try to Buy More Than Available
│      POST /order with quantity = 999999
│      Checks:
│        ✗ Status = 400 (Out of Stock)
│        ✗ Error message: "...hết..."
│        ✗ No Reservation created
│        ✗ Redis stock unchanged (Lua script atomicity)
│
└─ 3.3 Verify No Reservation
       GET /reservations?clientOrderId=...
       Expected: 404 (Not found)
```

**Key Point**: Lua script ensures atomic stock check + deduction.

---

### Phase 5: Response Time (Non-blocking)
```
⏱️  TEST 4: Response Time (Non-blocking)
├─ 4.1 Measure Response Time
│      POST /order
│      Checks:
│        ✓ Response time < 50ms
│        ✓ Response received (200 OK)
│
└─ 4.2 Verify Order NOT Yet Created
       GET /orders/me (IMMEDIATELY after buy)
       Expected: 404 or empty list
       
       Why? Worker processes in background (~100ms)
            Client gets response in ~25ms (non-blocking)
```

---

### Phase 6: Concurrent Requests
```
🔄 TEST 5: Concurrent Requests (Race Condition)
├─ 5.1 Request 1 - Buy 1 unit
│      POST /order (Request fires)
│
├─ 5.2 Request 2 - Buy 1 unit (simultaneously)
│      POST /order (Request fires at same time)
│
└─ 5.3 Check Both Orders Created
       GET /orders/me?limit=10
       
       Expected Results:
       - Both have different client_order_id
       - Both create separate Reservations
       - Both succeed (different transactions)
       - Exactly 2 stock units deducted (no oversell)
       
       Due to: Lua script atomicity + UUID uniqueness
```

---

### Phase 7: Redis Stock Sync
```
🗄️  TEST 6: Redis Stock Deduction (Lua Script)
├─ 6.1 Check Initial Stock (Redis)
│      GET /products/{{product_id}}/stock
│      See: current remaining stock
│
├─ 6.2 Buy 1 Unit
│      POST /order with quantity: 1
│
├─ 6.3 Verify Stock Decreased by 1
│      GET /products/{{product_id}}/stock
│      Expected: stock - 1
│
└─ 6.4 Verify Sync to MongoDB
       GET /inventory/{{product_id}}
       Expected: MongoDB stock = Redis stock
       (Should sync automatically)
```

---

### Phase 8: TTL Cleanup (Advanced - Optional)
```
⏱️  TEST 7: Reservation TTL Cleanup (30 minutes)
├─ 7.1 Create Reservation
│      POST /order
│
├─ 7.2 Verify Exists
│      GET /reservations/{{id}}
│      Expected: Found ✓
│
├─ 7.3 Wait for TTL (Simulated: 65 seconds for 1-min TTL)
│      Delay API call
│
└─ 7.4 Verify AUTO-DELETED
       GET /reservations/{{id}}
       Expected: 404 (Not found)
       
       Why? MongoDB TTL Index auto-deletes when expire_at passes
```

---

## ✅ Expected Test Results

### Happy Path (Test 1)
```
Summary:
  ✅ POST /order → 200 OK (< 100ms)
  ✅ Reservation created (status: pending)
  ✅ Message pushed to RabbitMQ
  ✅ Client receives response
  ✅ (Background) Worker processes
  ✅ Order created in MongoDB
  ✅ Reservation status → confirmed
```

### Idempotency (Test 2)
```
Request 1: 200 OK ✓
Request 2: 400 Error (duplicate key) ✗
Result: Exactly 1 Order, 1 Reservation
```

### Oversell (Test 3)
```
Trying to buy 999999 units:
  ❌ 400 Bad Request (Out of Stock)
  ❌ No Reservation created
  ❌ Stock unchanged
```

### Response Time (Test 4)
```
Response: < 50ms ✓
Order in DB: Not yet (background) ✓
After 100ms: Order now exists ✓
```

### Concurrency (Test 5)
```
2 simultaneous requests:
  ✅ Both succeed
  ✅ Different client_order_id
  ✅ Stock deducted exactly 2 times
  ✅ No oversell (atomicity)
```

### Stock Sync (Test 6)
```
Before buy: stock = 100
Buy 1 unit: stock = 99 (Redis + MongoDB match)
```

---

## 🔍 Debugging Failed Tests

### 1. "❌ Status 400 - Duplicate key error"
**Expected for Test 2.2** ✓ This is correct behavior!

### 2. "❌ Reservation not found (404)"
**Check:**
- Worker is running: `npm run worker`
- RabbitMQ connection: Check worker logs
- Wait longer (5-10 sec): Worker might be slow

### 3. "❌ Response time > 100ms"
**Possible reasons:**
- Database is slow
- Redis connection slow
- Network latency
- Server overloaded

**Action:** Reduce payload size, check server health

### 4. "✅ Order not created after 5 sec wait"
**Check:**
- Worker logs for errors
- RabbitMQ queue has messages
- MongoDB connection in worker
- Reservation model imported in worker

### 5. "✅ TTL test - Reservation not deleted"
**Note:** MongoDB TTL cleanup runs every 60 seconds
- Might need to wait 65-120 seconds
- Check MongoDB logs: `db.adminCommand({currentOp:true})`

---

## 🎯 Full Test Execution Timeline

```
T+0:00    ✅ Setup: Login, get product, get user
T+0:05    ✅ Test 1: Normal flow POST /order
T+0:10    ✅ Verify Reservation (status: pending)
T+0:11    ✅ Wait 5 seconds (worker processing)
T+0:16    ✅ Verify Order created
T+0:21    ✅ Verify Reservation (status: confirmed)
T+0:22    ❌ Test 2: Idempotency (duplicate fails)
T+0:30    🚨 Test 3: Oversell (out of stock)
T+0:35    ⏱️  Test 4: Response time
T+0:40    🔄 Test 5: Concurrent requests
T+0:45    🗄️  Test 6: Redis stock deduction
T+0:50    ⏱️  Test 7: TTL cleanup (wait 65 sec)
T+1:55    ✅ All tests complete!

Total: ~2 minutes (without TTL wait)
       ~2 minutes + 1 minute (with TTL wait) = ~3 minutes total
```

---

## 📊 Success Criteria

| Test | Expected Result | Status |
|------|-----------------|--------|
| 1.1 POST /order | 200 OK, < 100ms | ✅ |
| 1.2-1.5 Flow | Pending → Confirmed | ✅ |
| 2.2 Duplicate | 400 Error | ✅ |
| 3.2 Oversell | 400 Out of Stock | ✅ |
| 4.1 Response time | < 50ms | ✅ |
| 5.3 Concurrent | Both succeed | ✅ |
| 6.3 Stock sync | Decremented correctly | ✅ |
| 7.4 TTL cleanup | Auto-deleted | ✅ |

**Pass/Fail:** All 8 test scenarios ✅ = **Production Ready**

---

## 🚀 Ready to Test!

1. **Import Postman collection** → `FlashSale-HighConcurrency.postman_collection.json`
2. **Setup environment variables** → token, product_id, user_id
3. **Run tests in order** → Follow Phase 1-8
4. **Review results** → Check all assertions pass ✅
5. **Document findings** → Share with team

**Good luck! 🎉**
