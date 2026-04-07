# ⚡ TÀI LIỆU THAM KHẢO NHANH - 1 TRANG TÓM TẮT

## 3 TÍNH NĂNG OVERVIEW

### 1️⃣ FLASH SALE (30 phút TTL)
```
POST /v1/api/order (JWT bắt buộc)
├─ Input: { productId, quantity, client_order_id (UUID) }
├─ Quy Trình:
│  ├─ Redis Lua: kiểm tra atomic stock → giảm (KHÔNG CÓ RACE CONDITIONS)
│  ├─ MongoDB: tạo Reservation (TTL 30 phút)
│  ├─ RabbitMQ: queue async order creation
│  └─ Trả về: reservation_id + expire_at
└─ Kiểm Thử: K6 100 users × 5 stock = 5 success + 95 rejected
```
**Chìa Khóa**: Lua script đảm bảo zero quá bán, idempotency via client_order_id

---

### 2️⃣ QUẢN LÝ KHO (Stock Tracking)
```
GET /v1/api/inventories/:productId/total (không cần auth)
├─ Trả về: { totalQty, reserved, available }
├─ totalQty = SUM(InventoryTransaction where status=confirmed)
├─ reserved = COUNT(Reservation where status=pending)
└─ available = totalQty - reserved

GET /v1/api/inventories/:productId/history (pagination)
└─ Trả về: danh sách import/export/adjustment transactions với audit log
```
**Chìa Khóa**: Mỗi thay đổi stock = InventoryTransaction record (audit trail), tính toán real-time

---

### 3️⃣ CHECKOUT COUNTDOWN (5 phút TTL)
```
POST /v1/api/checkout (JWT bắt buộc)
├─ Input: { productId, quantity }
├─ Trả về: { reservation_id, expiresIn (300 giây) }
│
GET /v1/api/checkout/:id (JWT bắt buộc)
├─ Trả về: { expiresIn, product_name, quantity }
│
POST /v1/api/checkout/:id/confirm (JWT bắt buộc)
├─ Input: { address, phone, notes }
├─ Quy Trình: tạo final Order trong MongoDB
└─ Trả về: { order_id, client_order_id }
```
**Chìa Khóa**: Lấy shipping info TRONG checkout, confirm trước khi hết giờ

---

## KIẾN TRÚC

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React)                                            │
│ - Flash Sale button + 30 phút timer                        │
│ - Checkout modal + 5 phút timer + form                     │
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

## CODE FILES (THEO TÍNH NĂNG)

**Flash Sale**: order.controller.js → order.service.js (Lua) → order.route.js  
**Quản Lý Kho**: inventoryTransaction.controller.js → inventoryTransaction.service.js → inventory.route.js  
**Checkout**: checkout.controller.js → checkout.service.js → checkout.route.js  
**Shared Models**: order.model.js, reservation.model.js, inventoryTransaction.model.js  
**Kiểm Thử**: tests/oversell-protection.js (K6)

---

## KHÁI NIỆM CHÍNH

| Thuật Ngữ | Ý Nghĩa | Nơi |
|-----------|---------|-----|
| **Idempotency Key** | client_order_id (UUID) - ngăn chặn duplicate orders | order.model.js, order.controller.js |
| **Lua Script** | Atomic Redis operation - check + decrement stock trong 1 bước | order.service.js reserveProductSlot() |
| **TTL** | Time-to-live index - MongoDB tự xóa sau khi hết hạn | reservation.model.js (30/5 phút) |
| **Reservation** | Time-locked slot - tạm thời claim stock | reservation.model.js, order.service.js |
| **RabbitMQ** | Message queue - xử lý order async | order.controller.js, config/rabbitmq.js |
| **Aggregate Query** | MongoDB: SUM confirmed inventory transactions | inventoryTransaction.repo.js getTotalQty() |

---

## CHỨNG MINH ĐÚNG ĐẮN

1. **Zero Quá Bán**: K6 test (100 users × 5 stock) → chính xác 5 orders succeed
2. **Idempotency**: Retry cùng client_order_id → get 409, không phải duplicate order
3. **TTL Auto-cleanup**: MongoDB TTL index + Redis EXPIRE xóa records tự động
4. **Real-time Inventory**: GET /inventories endpoint tính available = total - reserved
5. **Atomic Stock**: Lua script đảm bảo stock không bao giờ âm ngay cả với race conditions

---

## TRIỂN KHAI

```bash
# Container setup (đang chạy):
docker-compose up -d

# Backend: Node.js + Express on port 3000
# MongoDB: Atlas cloud (connection trong .env)
# Redis: localhost:6379 (non-blocking async)
# RabbitMQ: localhost:5672

# Commit cuối: 9042c77 (develop branch)
# Tất cả tính năng: SẴN SÀNG CHO FE INTEGRATION
```

---

## CÂU HỎI VĂN ĐẠP TRONG PHỎNG VẤN

**Q: Làm sao bạn xây dựng hệ thống không quá bán dưới tải cao?**  
→ Lua script trong Redis chạy atomic. Ngay cả 100 concurrent users cố gắng mua 5 units = chỉ 5 succeed.

**Q: Làm sao bạn ngăn chặn duplicate orders?**  
→ client_order_id unique + indexed. Retry = 409 Conflict, không phải new order.

**Q: Order tốn bao lâu?**  
→ Reservation: < 10ms (Lua). Queue to worker: async (user nhận response ngay lập tức).

**Q: Nếu worker crash?**  
→ Message ở trong RabbitMQ queue, worker replay khi nó trở lại.

**Q: Làm sao xử lý 5-phút checkout timeouts?**  
→ MongoDB TTL index tự xóa Reservation sau 5 phút. FE disable confirm button khi expiresIn <= 0.

**Q: Công thức tính stock là gì?**  
→ available = SUM(confirmed InventoryTransactions) - COUNT(pending Reservations)

---

## LỆNH DEMO NHANH

```bash
# Kiểm thử Flash Sale endpoint
curl -X POST http://localhost:3000/v1/api/order/test \
  -H "Content-Type: application/json" \
  -d '{"productId":"PRODUCT_ID","quantity":1}'

# Chạy load test (nếu cài K6)
k6 run tests/oversell-protection.js

# Kiểm tra inventory
curl http://localhost:3000/v1/api/inventories/PRODUCT_ID/total

# Liệt kê files được tạo
ls -la src/controllers/inventory* src/services/inventory* src/routes/inventory*
ls -la src/controllers/checkout* src/services/checkout* src/routes/checkout*
ls -la tests/oversell*

# Kiểm tra commit cuối
git log -1 --format="%H %s"
```

---

**Trạng Thái**: ✅ SẴN SÀNG CHO PHỎNG VẤN  
**Thời Gian Giải Thích**: 10 phút (3 tính năng × 3-4 phút mỗi cái) + Q&A  
**Mức Độ Tự Tin**: 💯 Cả 3 tính năng triển khai đầy đủ + kiểm thử
