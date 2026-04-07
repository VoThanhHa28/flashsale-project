# 📋 HƯỚNG DẪN THAM KHẢO FILE-BY-FILE

## File Được Tạo (Triển Khai Option A)

### 🎯 TÍNH NĂNG 1: FLASH SALE (30 phút)

| File | Mục Đích | Chức Năng Chính |
|------|---------|-----------------|
| `src/controllers/order.controller.js` | Handler API Flash Sale | `placeOrder()` - Kiểm thử, reserve slot, queue order |
| `src/services/order.service.js` | Business logic Flash Sale | `reserveProductSlot()` - Lua script + Reservation creation |
| `src/routes/order.route.js` | Routes Flash Sale | `POST /v1/api/order` (JWT bắt buộc) + `/test` (public K6) |
| `src/models/order.model.js` | Order schema | Fields: userId, productId, quantity, price, client_order_id (idempotency) |
| `src/models/reservation.model.js` | Time-locked slot | FIELD MỚI: `type` (flash_sale \| checkout) - xác định TTL |
| `src/validation/order.validation.js` | Input kiểm thử | Joi schemas: productId, quantity, client_order_id (optional) |
| `tests/oversell-protection.js` | Load test (K6) | 100 concurrent users test - chứng minh không quá bán |

**Happy Path**:
1. Customer POSTs /v1/api/order với JWT + productId + quantity
2. OrderController tạo/dùng client_order_id (UUID)
3. OrderService gọi Redis Lua script (atomic deduction + Reservation TTL 30 phút)
4. RabbitMQ queue order payload cho xử lý async
5. Response 201 với reservation_id + expire_at
6. FE hiển thị 30-phút countdown timer

---

### 📦 TÍNH NĂNG 2: QUẢN LÝ KHO (Stock Tracking)

| File | Mục Đích | Chức Năng Chính |
|------|---------|-----------------|
| `src/controllers/inventoryTransaction.controller.js` | Inventory admin endpoints | 5 handlers: create, list, history, update status |
| `src/services/inventoryTransaction.service.js` | Inventory logic | `createTransaction()`, `getProductTotalQty()`, `getProductTransactionHistory()` |
| `src/repositories/inventoryTransaction.repo.js` | Inventory DB access | `getTotalQty()` aggregate (SUM confirmed chỉ) |
| `src/routes/inventory.route.js` | Inventory endpoints | GET/PATCH với SHOP_ADMIN role protection |
| `src/models/inventoryTransaction.model.js` | Transaction schema | type: import/export/adjustment, quantityChange, reason, status, TTL index |
| `src/validation/inventoryTransaction.validation.js` | Input kiểm thử | Joi schemas: type, quantity, reason |
| `src/controllers/product.controller.js` | (MODIFIED) | Giờ pass userId khi tạo product → auto-create initial inventory |
| `src/services/product.service.js` | (MODIFIED) | Gọi InventoryService.createTransaction() khi tạo product |

**Happy Path**:
1. Product được tạo → Auto-create InventoryTransaction (import, status: confirmed)
2. Admin nhập stock → POST /v1/api/admin/inventories/import (status: pending)
3. Admin xác nhận nhập → PATCH /v1/api/admin/inventories/:id/confirm (status: confirmed)
4. FE gọi GET /v1/api/inventories/:productId/total → Trả về totalQty, reserved, available
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

### ⏱️ TÍNH NĂNG 3: CHECKOUT COUNTDOWN (5 phút)

| File | Mục Đích | Chức Năng Chính |
|------|---------|-----------------|
| `src/controllers/checkout.controller.js` | Checkout endpoints | `initiateCheckout()`, `getCheckoutStatus()`, `confirmCheckout()` |
| `src/services/checkout.service.js` | Checkout workflow | 3 phương thức giống - kiểm thử time, collect shipping info |
| `src/routes/checkout.route.js` | Checkout routes | POST/GET /v1/api/checkout/* (JWT bắt buộc) |
| `src/validation/checkout.validation.js` | Input kiểm thử | Joi schemas: productId, quantity, address, phone, notes |
| `src/models/reservation.model.js` | (MODIFIED) | Thêm field `type` để phân biệt Flash Sale (30 phút) vs Checkout (5 phút) |

**Happy Path**:
1. Customer POSTs /v1/api/checkout với JWT + productId + quantity
2. CheckoutController gọi CheckoutService.initiateCheckout()
3. Tạo Reservation với type: "checkout" + TTL: 5 phút
4. Response 201 với reservation_id + expiresIn (300 giây)
5. FE hiển thị 5-phút countdown modal + form (address, phone, notes)
6. Trước khi expiresIn = 0, customer POSTs /v1/api/checkout/:id/confirm
7. CheckoutController gọi confirmCheckout() → Tạo actual Order
8. Response 201 với order_id + client_order_id

**Sự Khác Biệt So Với Flash Sale**:
- Flash Sale: Reserve → Queue → Async order creation
- Checkout: Reserve → Collect shipping → Confirm → Sync order creation

---

### 🔧 FILE ĐƯỢC MODIFIED (Updates cho Option A)

| File | Thay Đổi | Lý Do |
|------|----------|--------|
| `src/models/reservation.model.js` | Thêm `type: { enum: ['flash_sale', 'checkout'] }` | Phân biệt 30 phút vs 5 phút TTL |
| `src/models/order.model.js` | Fixed: userId/productId là String (không ObjectId ref), thêm price field | Checkout cần store giá vào order time |
| `src/routes/index.js` | Mount checkout routes + inventory routes | Làm endpoints có thể truy cập được |
| `src/controllers/product.controller.js` | Pass userId tới service | Track ai tạo initial inventory |
| `src/services/product.service.js` | Gọi InventoryService.createTransaction() | Auto-create first inventory record |

---

### 🧪 TEST & CONFIG FILES

| File | Mục Đích |
|------|---------|
| `tests/oversell-protection.js` | K6 load test (100 concurrent users on 5-unit stock) |
| `src/config/redis.js` | Redis async connection (non-blocking) |
| `src/config/rabbitmq.js` | RabbitMQ producer + consumer setup |
| `src/config/db.js` | MongoDB connection tới Atlas |

---

## 📂 Quick File Lookup Bởi Câu Hỏi

### Q: "Làm sao bạn ngăn chặn quá bán?"
→ Xem: `src/services/order.service.js` (Lua script trong phương thức reserveProductSlot)

### Q: "TTL 30-phút được triển khai như nào?"
→ Xem: `src/models/reservation.model.js` (Mongoose TTL index)

### Q: "Admin quản lý inventory như nào?"
→ Xem: `src/routes/inventory.route.js` + `src/controllers/inventoryTransaction.controller.js`

### Q: "Stock được tính real-time như nào?"
→ Xem: `src/repositories/inventoryTransaction.repo.js` (getTotalQty aggregate query)

### Q: "Quy trình Checkout là gì?"
→ Xem: `src/services/checkout.service.js` (3-bước flow: initiate, status, confirm)

### Q: "Cách kiểm thử concurrency?"
→ Xem: `tests/oversell-protection.js` (K6 script)

### Q: "Chiến lược idempotency là gì?"
→ Xem: `src/models/order.model.js` (unique index trên client_order_id) + `src/services/order.service.js` (check trước khi create)

### Q: "Orders được xử lý async như nào?"
→ Xem: `src/config/rabbitmq.js` + RabbitMQ worker (check codebase hoặc hỏi user về worker implementation)

---

## 🎤 Interview Script Template

**Phỏng Vấn Viên**: "Hãy giải thích triển khai Flash Sale của bạn"

**Câu Trả Lời**:
```
"Khách hàng nhấp nút [Đặt Flash Sale] và chúng tôi POST tới /v1/api/order 
với JWT của họ, productId, và một unique client_order_id (UUID).

OrderController kiểm thử input bằng Joi, sau đó gọi 
OrderService.reserveProductSlot(). Đây là nơi xảy ra điều kỳ diệu - 
chúng tôi thực thi Lua script trong Redis mà:
  1. Kiểm tra nếu stock >= requested quantity (atomic check)
  2. Giảm stock
  3. Tăng reserved counter

Tất cả trong một Redis operation, đảm bảo không có race conditions.

Đồng thời, chúng tôi tạo record Reservation trong MongoDB với 30-phút 
TTL index. Sau 30 phút, MongoDB tự động xóa nó.

Chúng tôi sau đó đẩy order payload tới RabbitMQ nên worker có thể xử lý 
nó async - tạo actual Order record, update inventory, log activity. 
Điều này giữ API response nhanh (< 50ms).

Khách hàng nhận lại reservation_id và expire_at timestamp. 
Frontend của họ bắt đầu 30-phút countdown, gọi server nếu cần 
để lấy thời gian còn lại thật (không dựa vào client clock).

Để load testing, chúng tôi xây dựng K6 script spins up 100 concurrent users 
cố gắng mua từ 5-unit stock. Result: chính xác 5 succeed (201), 
95 get 'hết hàng' (400), zero oversells. Lua script hoạt động."
```

---

## 💾 Commit History

```bash
git log --oneline

9042c77 fix: ObjectId constructor + add K6 oversell protection test
        └─ Fixed POST /test endpoint cho K6 load testing
        └─ Added tests/oversell-protection.js

[earlier commits cho inventories, checkout, flash sale features...]
```

**Kiểm tra commits**:
```bash
cd flashsale-project
git log --oneline -n 20
git diff HEAD~5..HEAD -- src/  # Xem thay đổi 5 commits cuối cùng
```

---

## 🚀 DEMO CHECKLIST

Trước khi phỏng vấn, bạn có thể hiển thị:

```bash
# 1. Kiểm thử Flash Sale endpoint
curl -X POST http://localhost:3000/v1/api/order/test \
  -H "Content-Type: application/json" \
  -d '{"productId": "PRODUCT_ID", "quantity": 1}'

# 2. Chạy K6 oversell test (cần cài K6)
k6 run tests/oversell-protection.js

# 3. Kiểm tra MongoDB cho Reservation TTL
docker exec flashsale_mongo mongosh flashsale_db --eval "db.reservations.findOne({})"

# 4. Kiểm tra Redis Lua script
docker exec flashsale_redis redis-cli KEYS "product:*:stock"

# 5. Kiểm tra RabbitMQ messages
docker exec flashsale_rabbitmq rabbitmqctl list_queues

# 6. Lấy thống kê inventory
curl http://localhost:3000/v1/api/inventories/{productId}/total

# 7. Tạo Checkout session
curl -X POST http://localhost:3000/v1/api/checkout \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"productId": "PRODUCT_ID", "quantity": 1}'
```

---

**Sẵn Sàng Cho Phỏng Vấn!** ✨  
In tệp này + INTERVIEW_PREP_VI.md để tham khảo.
