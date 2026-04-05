# 🧪 Flash Sale API Testing - JSON Bodies

## 🔐 1. AUTH Setup

### 1.1 Login
```http
POST http://localhost:3000/v1/api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "code": 200,
  "message": "Đăng nhập thành công",
  "metadata": {
    "user": {
      "_id": "user_id_here",
      "email": "user@example.com",
      "name": "User Name"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Save token for next requests:** `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 📦 2. PRODUCT & INVENTORY

### 2.1 Get Product List
```http
GET http://localhost:3000/v1/api/products?isPublished=true&limit=5
Authorization: Bearer {token}
```

**Response:**
```json
{
  "code": 200,
  "message": "Lấy danh sách sản phẩm thành công",
  "metadata": {
    "products": [
      {
        "_id": "product_id_here",
        "productName": "Flash Sale Product",
        "productPrice": 99000,
        "productQuantity": 100,
        "productStartTime": "2026-04-05T10:00:00Z",
        "productEndTime": "2026-04-05T11:00:00Z",
        "isPublished": true
      }
    ]
  }
}
```

**Save product_id:** `product_id_here`

### 2.2 Get Product Details
```http
GET http://localhost:3000/v1/api/products/{product_id}
Authorization: Bearer {token}
```

### 2.3 Check Inventory Stock
```http
GET http://localhost:3000/v1/api/inventory/{product_id}
Authorization: Bearer {token}
```

**Response:**
```json
{
  "code": 200,
  "metadata": {
    "stock": 95,
    "product_id": "product_id_here",
    "is_active": true
  }
}
```

---

## 🛒 3. FLASH SALE - MAIN FLOW

### 3.1 ✅ [TEST 1] Normal Buy - Happy Path
```http
POST http://localhost:3000/v1/api/order/buy
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 1
}
```

**Expected Response (200 OK):**
```json
{
  "code": 200,
  "message": "Đặt hàng thành công",
  "metadata": {
    "data": {
      "client_order_id": "550e8400-e29b-41d4-a716-446655440000",
      "reservation_id": "reservation_id_here",
      "order": {
        "client_order_id": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "user_id_here",
        "productId": "product_id_here",
        "quantity": 1,
        "price": 99000,
        "orderTime": "2026-04-05T12:30:45.123Z"
      }
    }
  }
}
```

**Save for verification:**
- `client_order_id`: 550e8400-e29b-41d4-a716-446655440000
- `reservation_id`: reservation_id_here

---

### 3.2 ✅ [TEST 1.2] Verify Reservation Created (pending)
```http
GET http://localhost:3000/v1/api/reservations/reservation_id_here
Authorization: Bearer {token}
```

**Expected Response (200):**
```json
{
  "code": 200,
  "metadata": {
    "_id": "reservation_id_here",
    "user_id": "user_id_here",
    "product_id": "product_id_here",
    "client_order_id": "550e8400-e29b-41d4-a716-446655440000",
    "quantity": 1,
    "status": "pending",
    "expire_at": "2026-04-05T13:00:45Z",
    "createdAt": "2026-04-05T12:30:45Z",
    "updatedAt": "2026-04-05T12:30:45Z"
  }
}
```

**Key Checks:**
- ✅ status = "pending"
- ✅ client_order_id matches
- ✅ expire_at ~30 minutes from now

---

### 3.3 ✅ [TEST 1.4] Wait 5 seconds then Check Order
```http
GET http://localhost:3000/v1/api/orders/me
Authorization: Bearer {token}
```

**Expected Response (200):**
```json
{
  "code": 200,
  "metadata": {
    "orders": [
      {
        "_id": "order_id_here",
        "client_order_id": "550e8400-e29b-41d4-a716-446655440000",
        "userId": "user_id_here",
        "productId": "product_id_here",
        "quantity": 1,
        "price": 99000,
        "totalPrice": 99000,
        "status": "completed",
        "orderTime": "2026-04-05T12:30:45Z",
        "processedAt": "2026-04-05T12:30:50Z",
        "createdAt": "2026-04-05T12:30:50Z"
      }
    ]
  }
}
```

**Key Checks:**
- ✅ Order exists with same client_order_id
- ✅ status = "completed"
- ✅ processedAt is set

---

### 3.4 ✅ [TEST 1.5] Verify Reservation Status Updated
```http
GET http://localhost:3000/v1/api/reservations/reservation_id_here
Authorization: Bearer {token}
```

**Expected Response (200):**
```json
{
  "code": 200,
  "metadata": {
    "_id": "reservation_id_here",
    "status": "confirmed",
    "note": "Order created: order_id_here",
    "createdAt": "2026-04-05T12:30:45Z",
    "updatedAt": "2026-04-05T12:30:50Z"
  }
}
```

**Key Checks:**
- ✅ status = "confirmed" (changed from pending)
- ✅ note contains Order ID

---

## ❌ 4. IDEMPOTENCY TEST

### 4.1 ❌ [TEST 2] Duplicate Request - Same client_order_id
```http
POST http://localhost:3000/v1/api/order/buy
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 1
}
```

**First request: 200 OK ✓**

**Second request with SAME client_order_id: 400 ERROR ❌**
```json
{
  "code": 400,
  "message": "E11000 duplicate key error on client_order_id",
  "metadata": null
}
```

**Key Checks:**
- ✅ First request succeeds (200)
- ✅ Second request fails (400)
- ✅ Error mentions "duplicate"
- ✅ Redis stock NOT deducted twice
- ✅ Only 1 Reservation created

---

## 🚨 5. OVERSELL TEST

### 5.1 🚨 [TEST 3.2] Try to Buy More Than Stock
```http
POST http://localhost:3000/v1/api/order/buy
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 999999
}
```

**Expected Response (400):**
```json
{
  "code": 400,
  "message": "Rất tiếc! Sản phẩm đã hết hàng.",
  "metadata": null
}
```

**Key Checks:**
- ✅ Status 400 (Bad Request)
- ✅ Error message in Vietnamese about out of stock
- ✅ No Reservation created
- ✅ Redis stock unchanged

---

## ⏱️ 6. RESPONSE TIME TEST

### 6.1 ⏱️ [TEST 4.1] Check Response Time (Should be < 50ms)
```http
POST http://localhost:3000/v1/api/order/buy
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 1
}
```

**Expected Response Time:** < 50ms ✅

**Response (200 OK):**
```json
{
  "code": 200,
  "message": "Đặt hàng thành công",
  "metadata": {
    "data": {
      "client_order_id": "uuid-response-time-test",
      "reservation_id": "res_response_time_test"
    }
  }
}
```

### 6.2 ⏱️ [TEST 4.2] Immediately Check Order (Should NOT exist yet)
```http
GET http://localhost:3000/v1/api/orders/me
Authorization: Bearer {token}
```

**Expected Response (5ms after POST):** 404 or empty list
```json
{
  "code": 404,
  "message": "Không tìm thấy đơn hàng",
  "metadata": null
}
```

**Why?** Worker is still processing in background (~100ms)

**Wait 100ms then check again: Order exists ✓**

---

## 🔄 7. CONCURRENT REQUESTS TEST

### 7.1 🔄 [TEST 5.1] Concurrent Request 1
```http
POST http://localhost:3000/v1/api/order/buy
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 1
}
```

**Response: 200 OK**

### 7.2 🔄 [TEST 5.2] Concurrent Request 2 (Fire at same time)
```http
POST http://localhost:3000/v1/api/order/buy
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 1
}
```

**Response: 200 OK**

### 7.3 🔄 [TEST 5.3] Check Both Orders Exist
```http
GET http://localhost:3000/v1/api/orders/me?limit=10
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "code": 200,
  "metadata": {
    "orders": [
      {
        "_id": "order1",
        "client_order_id": "uuid-concurrent-1",
        "quantity": 1
      },
      {
        "_id": "order2",
        "client_order_id": "uuid-concurrent-2",
        "quantity": 1
      }
    ]
  }
}
```

**Key Checks:**
- ✅ Both orders exist
- ✅ Different client_order_id
- ✅ Stock deducted exactly 2 units (no oversell)
- ✅ Both succeeded (atomicity)

---

## 🗄️ 8. REDIS STOCK SYNC TEST

### 8.1 🗄️ [TEST 6.1] Check Stock Before Buy
```http
GET http://localhost:3000/v1/api/inventory/product_id_here
Authorization: Bearer {token}
```

**Response:**
```json
{
  "code": 200,
  "metadata": {
    "stock": 95,
    "in_redis": true,
    "in_mongodb": true
  }
}
```

### 8.2 🗄️ [TEST 6.2] Buy 1 Unit
```http
POST http://localhost:3000/v1/api/order/buy
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 1
}
```

**Response: 200 OK**

### 8.3 🗄️ [TEST 6.3] Check Stock After Buy
```http
GET http://localhost:3000/v1/api/inventory/product_id_here
Authorization: Bearer {token}
```

**Expected Response:**
```json
{
  "code": 200,
  "metadata": {
    "stock": 94,
    "in_redis": true,
    "in_mongodb": true
  }
}
```

**Key Checks:**
- ✅ Stock = 95 - 1 = 94
- ✅ Redis and MongoDB match
- ✅ Lua script deducted atomically

---

## ⏱️ 9. TTL CLEANUP TEST (Advanced)

### 9.1 ⏱️ [TEST 7.1] Create Reservation for TTL Test
```http
POST http://localhost:3000/v1/api/order/buy
Authorization: Bearer {token}
Content-Type: application/json

{
  "productId": "product_id_here",
  "quantity": 1
}
```

**Save reservation_id: res_ttl_test**

### 9.2 ⏱️ [TEST 7.2] Verify Reservation Exists
```http
GET http://localhost:3000/v1/api/reservations/res_ttl_test
Authorization: Bearer {token}
```

**Expected Response (200):** Reservation found ✓

### 9.3 ⏱️ [TEST 7.3] Wait 65 Seconds
Manual delay or use: `sleep 65` in terminal

### 9.4 ⏱️ [TEST 7.4] Check Reservation Auto-Deleted
```http
GET http://localhost:3000/v1/api/reservations/res_ttl_test
Authorization: Bearer {token}
```

**Expected Response (404):**
```json
{
  "code": 404,
  "message": "Reservation not found",
  "metadata": null
}
```

**Key Checks:**
- ✅ Reservation auto-deleted by MongoDB TTL Index
- ✅ No manual deletion needed

---

## 📊 10. ADMIN STATS (Optional)

### 10.1 Get Reservation Stats
```http
GET http://localhost:3000/v1/api/reservations/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "code": 200,
  "metadata": {
    "total": 10,
    "pending": 2,
    "confirmed": 6,
    "failed": 2,
    "expired": 0
  }
}
```

### 10.2 Get Order Stats
```http
GET http://localhost:3000/v1/api/orders/stats
Authorization: Bearer {token}
```

**Response:**
```json
{
  "code": 200,
  "metadata": {
    "total": 8,
    "completed": 6,
    "pending": 1,
    "failed": 1
  }
}
```

---

## 🧪 QUICK TEST CHECKLIST

### ✅ Happy Path (3 min)
- [ ] Login & get token
- [ ] POST /order → 200 OK
- [ ] GET /reservations → status = pending
- [ ] Wait 5s
- [ ] GET /orders → Order created
- [ ] GET /reservations → status = confirmed

### ❌ Idempotency (2 min)
- [ ] POST /order → 200 OK
- [ ] POST /order (same UUID) → 400 Duplicate

### 🚨 Oversell (1 min)
- [ ] POST /order with qty=999999 → 400 Out of Stock
- [ ] Verify no Reservation created

### ⏱️ Response Time (2 min)
- [ ] POST /order → response < 50ms
- [ ] GET /orders /me (immediately) → not found
- [ ] Wait 100ms
- [ ] GET /orders/me → Order now exists

### 🔄 Concurrent (2 min)
- [ ] Fire 2 POST /order simultaneously
- [ ] Both succeed (200)
- [ ] Both Orders exist (different UUID)

### 🗄️ Stock Sync (2 min)
- [ ] GET /inventory → stock = 100
- [ ] POST /order (qty=1)
- [ ] GET /inventory → stock = 99

### ⏱️ TTL (65+ min) - Optional
- [ ] Create Reservation
- [ ] Wait 65 seconds
- [ ] GET /reservations → 404 (auto-deleted)

---

## 🎯 PASS/FAIL CRITERIA

| Test | Expected | Status |
|------|----------|--------|
| Happy Path | 200 OK + Reservation + Order | ✅ or ❌ |
| Idempotency | 200 then 400 (duplicate) | ✅ or ❌ |
| Oversell | 400 Out of Stock | ✅ or ❌ |
| Response Time | < 50ms | ✅ or ❌ |
| Concurrent | Both succeed | ✅ or ❌ |
| Stock Sync | Stock -= qty | ✅ or ❌ |
| TTL Cleanup | Auto-deleted | ✅ or ❌ |

**All ✅ = Production Ready! 🚀**

---

## 💾 Copy-Paste Commands

### cURL Examples

**Login:**
```bash
curl -X POST http://localhost:3000/v1/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

**Buy:**
```bash
curl -X POST http://localhost:3000/v1/api/order/buy \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID",
    "quantity": 1
  }'
```

**Check Order:**
```bash
curl -X GET http://localhost:3000/v1/api/orders/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check Reservation:**
```bash
curl -X GET http://localhost:3000/v1/api/reservations/RESERVATION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Ready to test! 🧪**
