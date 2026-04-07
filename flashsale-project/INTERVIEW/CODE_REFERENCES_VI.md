# 🔍 THAM KHẢO CODE CỤ THỂ - Điều Hướng Nhanh

**Sử dụng điều này để tìm dòng/phương thức chính xác trong phỏng vấn**

---

## ⚡ Flash Sale - Vị Trí Code

### Lua Script Hoạt Dynamic Như Thế Nào
**File**: `src/services/order.service.js`  
**Phương Thức**: `reserveProductSlot()`  
**Dòng Chính**: Logic Lua script

```
Lua Script Làm:
  1. GET "product:{productId}:stock"
  2. IF quantity > stock THEN FAIL
  3. ELSE DECRBY stock, INCRBY reserved
  4. RETURN success
```
**Tại Sao Atomic**: Single Redis operation = không race conditions

---

### Idempotency Hoạt Động Như Thế Nào
**File**: `src/models/order.model.js`  
**Dòng Chính**: `unique: true, index: true` on `client_order_id`

```javascript
client_order_id: {
  type: String,
  sparse: true,          // Allow null
  unique: true,          // ← Ngăn chặn duplicates!
  index: true            // ← Tìm kiếm nhanh
}
```

**Kiểm Thử**:
```bash
# Request đầu tiên - thành công
curl -X POST /v1/api/order \
  -d '{"productId":"...", "quantity":1, "client_order_id":"uuid-123"}'
# Response: 201

# Retry với cùng UUID - fails gracefully
curl -X POST /v1/api/order \
  -d '{"productId":"...", "quantity":1, "client_order_id":"uuid-123"}'
# Response: 409 Conflict
```

---

### TTL (30 Phút) Hoạt Động Như Thế Nào
**File**: `src/models/reservation.model.js`  
**Dòng Chính**: Định nghĩa TTL index

```javascript
// Ở cuối schema:
orderSchema.index({ createdAt: 1 }, { expireAfterSeconds: 1800 })
// 1800 giây = 30 phút
```

**Cách Kiểm Tra**:
```bash
docker exec flashsale_mongo mongosh flashsale_db
> db.reservations.getIndexes()
# Tìm: { expireAfterSeconds: 1800 }
```

---

### RabbitMQ Queue Hoạt Động Như Thế Nào
**File**: `src/config/rabbitmq.js`  
**Phương Thức**: `sendToQueue()`

```javascript
// Trong order.controller.js placeOrder():
await sendToQueue('ORDER_QUEUE', {
  client_order_id: ...,
  reservation_id: ...,
  userId: ...,
  productId: ...
})
```

**Điều Xảy Ra**:
1. Order payload → RabbitMQ queue
2. Backend worker nghe queue
3. Worker: tạo Order + update inventory (async)
4. User nhận response ngay lập tức (không chờ worker)

---

## 📦 Quản Lý Kho - Vị Trí Code

### Aggregate Query getTotalQty() Hoạt Động Như Thế Nào
**File**: `src/repositories/inventoryTransaction.repo.js`  
**Phương Thức**: `getTotalQty()`

```javascript
InventoryTransaction.aggregate([
  { $match: { product_id: productId, status: 'confirmed' } },
  { $group: { _id: null, total: { $sum: '$quantityChange' } } }
])
```

**Tại Sao Hoạt Động**:
- `$match`: Lọc chỉ "confirmed" (bỏ qua pending/rejected)
- `$group`: Tổng hợp tất cả transactions
- `$sum`: Tổng tất cả quantityChange values

**Dữ Liệu Ví Dụ**:
```
InventoryTransaction records:
1. type: "import", quantityChange: +10, status: "confirmed"
2. type: "import", quantityChange: +5, status: "pending"
3. type: "export", quantityChange: -3, status: "confirmed"

getTotalQty() trả về: 10 + (-3) = 7 (pending 5 không được tính)
```

---

### Stock Khả Dụng Được Tính Như Thế Nào
**File**: `src/controllers/inventoryTransaction.controller.js`  
**Phương Thức**: `getTotalQty()` (GET endpoint)

```javascript
const totalQty = await repo.getTotalQty(productId);
const reservedQty = await Reservation.countDocuments({
  product_id: productId,
  status: 'pending'
});
const availableQty = totalQty - reservedQty;

return { totalQty, reserved: reservedQty, available: availableQty }
```

**Quy Trình**:
```
Total Qty (7) - Reserved (3) = Available (4)
     ↑                ↑              ↑
  confirmed      flash_sale    visible
  imports        + checkout     to users
```

---

### Admin Import Flow
**File**: `src/controllers/inventoryTransaction.controller.js`  
**Phương Thức**: 
- `createTransaction()` - Tạo pending import
- `updateTransactionStatus()` - Confirm import

**Bước**:
1. Admin POST `/v1/api/admin/inventories/import` → Tạo InventoryTransaction (status: pending)
2. Admin PATCH `/v1/api/admin/inventories/:id/confirm` → Status thành "confirmed"
3. Tiếp theo GET `/inventories/:id/total` bao gồm new qty trong totalQty

---

## ⏱️ Checkout Countdown - Vị Trí Code

### 3-Bước Checkout Flow
**File**: `src/services/checkout.service.js`  
**Phương Thức**: `initiateCheckout()`, `getCheckoutStatus()`, `confirmCheckout()`

**Bước 1: Khởi Tạo (POST /checkout)**
```javascript
async initiateCheckout({ userId, productId, quantity }) {
  // Tạo Reservation type: 'checkout' + TTL: 5 phút
  const reservation = new Reservation({
    type: 'checkout',          // ← Khác từ flash_sale
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

**Bước 2: Kiểm Tra Trạng Thái (GET /checkout/:id)**
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

**Bước 3: Xác Nhận (POST /checkout/:id/confirm)**
```javascript
async confirmCheckout({ reservationId, userId, address, phone, notes }) {
  const reservation = await Reservation.findById(reservationId)
  
  // TRƯỚC khi tạo order, kiểm tra: expiresIn > 0?
  if (reservation.expiresIn <= 0) {
    throw new Error('Checkout hết hạn')
  }
  
  // Tạo final Order
  const order = new Order({
    userId, productId, quantity, price,
    client_order_id: reservation.client_order_id,
    address, phone, notes  // ← Lấy được từ checkout
  })
  await order.save()
  
  // Đánh dấu reservation là confirmed
  reservation.status = 'confirmed'
  await reservation.save()
  
  return { order_id, client_order_id }
}
```

---

### TTL field trong Reservation Model
**File**: `src/models/reservation.model.js`

```javascript
const reservationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['flash_sale', 'checkout'],
    required: true
  },
  // ... fields khác
}, { timestamps: true })

// TTL khác nhau dựa trên type:
// Flash Sale: 30 phút (1800 giây)
// Checkout: 5 phút (300 giây)

// MongoDB TTL index:
reservationSchema.index({ createdAt: 1 }, { 
  expireAfterSeconds: 1800  // ← 30 phút cho flash_sale
})
```

---

## 🧪 K6 Load Test - Vị Trí Code

### Test Script Overview
**File**: `tests/oversell-protection.js`

**Cấu Hình Chính**:
```javascript
const STOCK = 5;          // Product có 5 units
const VUS = 100;          // 100 concurrent users
const DURATION = '30s';   // Chạy trong 30 giây

// Mỗi user tạo 1 request:
POST /v1/api/order/test với { productId, quantity: 1 }
```

**Kết Quả Mong Đợi**:
```
successCount = 5    (201 responses)
failCount = 95      (400 "hết hàng" responses)
oversellCount = 0   (KHÔNG có orders vượt stock)

✅ TEST PASSES nếu: successCount === 5 && failCount === 95
❌ TEST FAILS nếu: successCount > 5 (quá bán xảy ra!)
```

**Lệnh Chạy**:
```bash
cd flashsale-project
k6 run tests/oversell-protection.js
```

---

## 🔐 Authentication - Nơi Kiểm Tra

### Flash Sale - JWT Bắt Buộc
**File**: `src/routes/order.route.js`  
**Dòng**: `router.post("/", auth.verifyToken, ...)`

```javascript
router.post(
    "/",
    auth.verifyToken,              // ← Kiểm tra JWT tại đây
    validate(orderValidation.create),
    OrderController.placeOrder
)
```

### Checkout - JWT Bắt Buộc
**File**: `src/routes/checkout.route.js`  
**Tất Cả 3 Endpoints**: middleware `auth.verifyToken`

### Inventory Admin - JWT + SHOP_ADMIN Role
**File**: `src/routes/inventory.route.js`  
**Dòng**: `checkRole('SHOP_ADMIN')`

```javascript
router.post(
    '/import',
    auth.verifyToken,              // ← Kiểm tra JWT
    checkRole('SHOP_ADMIN'),       // ← Kiểm tra role (KHÔNG "admin", phải "SHOP_ADMIN")
    validate(...),
    InventoryTransactionController.createTransaction
)
```

---

## 🧩 Cách Tìm Thứ Gì Đó Trong Phỏng Vấn

| Câu Hỏi | Đi Đến |
|---------|--------|
| "Làm sao bạn ngăn chặn quá bán?" | order.service.js > Lua script |
| "Nếu user bị disconnect?" | models/order.model.js > client_order_id unique |
| "Làm sao tránh duplicate orders?" | services/order.service.js > Idempotency check |
| "Stock tự động clean-up như nào?" | models/reservation.model.js > TTL index |
| "Cách track thay đổi stock?" | repositories/inventoryTransaction.repo.js > getTotalQty() |
| "Checkout timeout hoạt động thế nào?" | models/reservation.model.js > type field + TTL |
| "Order processing async thế nào?" | config/rabbitmq.js > sendToQueue() |
| "Có thể load test cái này không?" | tests/oversell-protection.js > K6 script |
| "Admin nhập stock như nào?" | controllers/inventoryTransaction.controller.js > createTransaction() |
| "Gì ngăn chặn truy cập không được phép?" | routes/inventory.route.js > checkRole('SHOP_ADMIN') |

---

## 🎯 WALKTHROUGH 5-PHÚT

Nếu phỏng vấn nói "Hãy giải thích một tính năng trong 5 phút":

**Flash Sale (Chọn Cái Này)**:
1. Hiền thị: order.route.js (POST /v1/api/order)
2. Hiển thị: order.controller.js (phương thức placeOrder)
3. Hiển thị: order.service.js (Lua script trong reserveProductSlot)
4. Hiển thị: tests/oversell-protection.js (chứng minh K6 test)
5. Nói: "Lua script atomic, nên 100 users on 5 stock = 5 succeed, 95 rejected, zero oversells"

**Quản Lý Kho (Thay Thế)**:
1. Hiển thị: inventory.route.js (GET /v1/api/inventories/:id/total)
2. Hiển thị: inventoryTransaction.repo.js (getTotalQty aggregate)
3. Hiển thị: inventoryTransaction.service.js (createTransaction flow)
4. Nói: "Mỗi thay đổi stock tạo bản ghi transaction - audit trail"
5. Nói: "Available = totalQty - reserved (real-time calculation)"

**Checkout (Tốt Nhất Cho "So Sánh Tính Năng")**:
1. Hiển thị: checkout.route.js (3 endpoints)
2. Hiển thị: checkout.service.js (initiateCheckout → getCheckoutStatus → confirmCheckout)
3. Hiển thị: models/reservation.model.js (type field phân biệt 30 vs 5 phút)
4. Nói: "Giống Flash Sale nhưng lấy address/phone TRONG countdown"
5. Nói: "Chỉ tạo Order khi confirm, không phải khi initiate"

---

## 📌 LỆNH GREP NHANH

Tìm code cụ thể nhanh:

```bash
# Tìm tất cả Lua script code
grep -n "EVAL" src/services/order.service.js

# Tìm tất cả client_order_id usage
grep -rn "client_order_id" src/

# Tìm tất cả Reservation creation
grep -rn "new Reservation" src/

# Tìm tất cả RabbitMQ sends
grep -rn "sendToQueue" src/

# Tìm tất cả aggregate queries
grep -rn "aggregate" src/

# Tìm tất cả TTL index definitions
grep -rn "expireAfterSeconds" src/

# Tìm tất cả JWT auth checks
grep -rn "auth.verifyToken" src/routes/

# Tìm tất cả role checks
grep -rn "checkRole" src/routes/
```

---

**Cập Nhật Cuối Cùng**: Tháng 4, 2026  
**Sử Dụng Trong**: Phỏng Vấn Kỹ Thuật  
**Trạng Thái**: ✅ Sẵn Sàng Tham Khảo
