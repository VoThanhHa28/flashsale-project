# FE Checklist - Flash Sale + Option A (Inventories + Checkout Countdown)

## 🎯 Tổng Quan
- **Flash Sale** (30 phút): Giữ chỗ với Lua Redis, chủ yếu cho event sale
- **Inventories** (Quản lý kho): Theo dõi lịch sử nhập/xuất, hiển thị tồn kho
- **Checkout Countdown** (5 phút): Cho phép khách hàng lock qty trước khi thanh toán (option A)

---

## ✅ FEATURE 1: FLASH SALE (30 phút - hiện tại)

### 1.1 Endpoint
```
POST /v1/api/order
Headers: Authorization: Bearer {JWT_TOKEN}
Body: {
  "productId": "69d3c467ed5722e145a721fe",
  "quantity": 2,
  "client_order_id": "uuid-v4-123" (auto-generate mỗi lần bấm)
}

Response:
201: {
  "statusCode": 201,
  "message": "Reserved successfully",
  "data": {
    "reservation_id": "69d3d1234567890abcdef123",
    "product_id": "69d3c467ed5722e145a721fe",
    "quantity": 2,
    "status": "pending",
    "expire_at": "2026-04-06T16:15:00.000Z"
  }
}

409: {
  "statusCode": 409,
  "message": "Order already exists with this client_order_id"
}

400: {
  "statusCode": 400,
  "message": "Not enough quantity available"
}
```

### 1.2 FE Implementation
1. **Button "Đặt Flash Sale"** - Riêng biệt với "Add to Cart"
   - Trigger: `handleFlashSale()` function
   - Requires: User logged in (check JWT token)

2. **Auto-generate UUID mỗi lần bấm**
   ```javascript
   import { v4 as uuidv4 } from 'uuid';
   
   const handleFlashSale = async () => {
     const clientOrderId = uuidv4(); // Fresh UUID mỗi lần
     const response = await POST /v1/api/order {
       productId,
       quantity,
       client_order_id: clientOrderId
     };
   };
   ```

3. **Xử lý 3 response status**
   - **201 (Thành công)**:
     - Lưu `reservation_id` vào state
     - Hiển thị modal: "✅ Reserved! Hãy hoàn tất thanh toán trước khi hết hạn"
     - Start 30-minute countdown timer
   
   - **409 (Idempotency - gửi trùng lệnh)**:
     - Hiển thị: "⚠️ Bạn đã giữ sản phẩm này rồi! Kiểm tra lại?"
     - Suggest: Quay lại cart để xem đơn cũ
   
   - **400 (Hết hàng)**:
     - Hiển thị: "❌ Không còn hàng! Vui lòng chọn sản phẩm khác"
     - Disable button

4. **30-Minute Countdown Timer**
   ```javascript
   const [timeLeft, setTimeLeft] = useState(30 * 60); // 1800 giây
   
   useEffect(() => {
     const interval = setInterval(() => {
       setTimeLeft(prev => {
         if (prev <= 0) {
           clearInterval(interval);
           showNotification("⏰ Giữ chỗ hết hạn!");
           return 0;
         }
         return prev - 1;
       });
     }, 1000);
     return () => clearInterval(interval);
   }, []);
   
   // Format: MM:SS
   const minutes = Math.floor(timeLeft / 60);
   const seconds = timeLeft % 60;
   const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
   ```

5. **UI Display**
   - Hiển thị: "⏱️ Giữ chỗ hết hạn trong: **29:58**"
   - Màu sắc:
     - Xanh (> 5 phút): Bình thường
     - Vàng (2-5 phút): Cảnh báo
     - Đỏ (< 2 phút): Gấp

---

## ✅ FEATURE 2: INVENTORIES (Quản lý kho)

### 2.1 Endpoints
```
GET /v1/api/inventories/:productId/total
Response 200:
{
  "statusCode": 200,
  "message": "Lấy tổng số lượng kho thành công",
  "data": {
    "productId": "69d3c467ed5722e145a721fe",
    "productName": "iPhone 15",
    "totalQty": 20,
    "reserved": 3,
    "available": 17
  }
}

GET /v1/api/inventories/:productId/history (không cần token)
Response 200:
{
  "statusCode": 200,
  "message": "Lấy lịch sử kho thành công",
  "data": {
    "productName": "iPhone 15",
    "transactions": [
      {
        "_id": "69d3c468ed5722e145a7220b",
        "type": "import",
        "quantityChange": 10,
        "reason": "Initial inventory setup from seed",
        "createdBy": null,
        "status": "confirmed",
        "createdAt": "2026-04-06T14:34:16.011Z"
      }
    ],
    "totalCount": 1,
    "totalPages": 1,
    "currentPage": 1
  }
}
```

### 2.2 FE Implementation
1. **Hiển thị trạng thái kho trong Product Detail**
   ```
   Tồn kho: 20 cái
   Đã đặt: 3 cái
   ━━━━━━━━━━━━━
   Còn lại: 17 cái (✅ Còn hàng)
   ```

2. **Gọi API khi load product detail**
   ```javascript
   useEffect(() => {
     const fetchInventory = async () => {
       const data = await GET /v1/api/inventories/{productId}/total;
       setInventory(data);
     };
     fetchInventory();
   }, [productId]);
   ```

3. **Logic hiển thị nút**
   - `available > 0`: Nút "Đặt Flash Sale" active
   - `available = 0`: Nút disabled + "Hết hàng"
   - `reserved > 0`: Hiển thị "({reserved} đang chờ thanh toán)"

4. **Optional: Lịch sử nhập/xuất kho** (cho admin)
   - Tab "Lịch sử kho" trong admin dashboard
   - Gọi GET `/v1/api/inventories/:productId/history`
   - Hiển thị bảng: Date | Type | Qty | Reason | CreatedBy

---

## ✅ FEATURE 3: CHECKOUT COUNTDOWN (5 phút - Option A)

### 3.1 Endpoints
```
POST /v1/api/checkout
Headers: Authorization: Bearer {JWT_TOKEN}
Body: {
  "productId": "69d3c467ed5722e145a721fe",
  "quantity": 2
  (client_order_id optional - auto-generate nếu không có)
}

Response 201:
{
  "statusCode": 201,
  "message": "Checkout initialized - 5 min countdown started",
  "data": {
    "reservation_id": "69d3d204c78bf9717445527a",
    "product_id": "69d3c467ed5722e145a721fe",
    "product_name": "iPhone 15",
    "quantity": 2,
    "expiresIn": 300,
    "created_at": "2026-04-06T15:45:00.000Z"
  }
}

GET /v1/api/checkout/:reservationId
Headers: Authorization: Bearer {JWT_TOKEN}

Response 200:
{
  "statusCode": 200,
  "message": "Checkout status retrieved",
  "data": {
    "reservation_id": "69d3d204c78bf9717445527a",
    "product_id": "...",
    "product_name": "iPhone 15",
    "quantity": 2,
    "status": "pending",
    "expiresIn": 287
  }
}

POST /v1/api/checkout/:reservationId/confirm
Headers: Authorization: Bearer {JWT_TOKEN}
Body: {
  "address": "123 Đường ABC, Quận 1, TP.HCM",
  "phone": "0912345678",
  "notes": "Giao vào buổi sáng"
}

Response 201:
{
  "statusCode": 201,
  "message": "Order created from checkout",
  "data": {
    "order_id": "69d3d2234567890abcdef456",
    "client_order_id": "uuid-v4-here-abc123",
    "status": "pending",
    "message": "Order created successfully"
  }
}
```

### 3.2 FE Implementation

1. **Button "Checkout với Countdown"** (New - khác Flash Sale)
   ```javascript
   const handleCheckout = async () => {
     const response = await POST /v1/api/checkout {
       productId,
       quantity
       // client_order_id auto-generated in BE
     };
     
     if (response.status === 201) {
       setReservationId(response.data.reservation_id);
       setExpiresIn(response.data.expiresIn);
       showCheckoutModal();
     }
   };
   ```

2. **5-Minute Countdown Timer** (Giống Flash Sale nhưng 5 phút)
   ```javascript
   useEffect(() => {
     const interval = setInterval(async () => {
       const status = await GET /v1/api/checkout/{reservationId};
       setExpiresIn(status.data.expiresIn);
       
       if (status.data.expiresIn <= 0) {
         clearInterval(interval);
         showNotification("⏰ Checkout đã hết hạn!");
       }
     }, 1000);
     return () => clearInterval(interval);
   }, [reservationId]);
   ```

3. **UI Modal - Checkout Countdown**
   ```
   ┌─────────────────────────────────┐
   │ 🛒 Thanh toán trong             │
   │   ⏱️  04:55                      │ ← Đỏ khi < 1 phút
   ├─────────────────────────────────┤
   │ iPhone 15 x 2                   │
   │ Giá: 40,000,000 VNĐ             │
   ├─────────────────────────────────┤
   │ Địa chỉ:   [________]           │
   │ Số điện thoại: [________]       │
   │ Ghi chú: [____________]         │
   ├─────────────────────────────────┤
   │ [HUỶ]              [XÁC NHẬN]  │ ← Disable nếu hết giờ
   └─────────────────────────────────┘
   ```

4. **Xử lý Confirm**
   ```javascript
   const handleConfirmCheckout = async () => {
     if (expiresIn <= 0) {
       showNotification("❌ Thời gian đã hết!");
       return;
     }
     
     const response = await POST /v1/api/checkout/{reservationId}/confirm {
       address,
       phone,
       notes
     };
     
     if (response.status === 201) {
       showNotification("✅ Đơn hàng tạo thành công!");
       redirectToOrder(response.data.order_id);
     }
   };
   ```

5. **Hết giờ (Timeout)**
   - Disable nút "Xác Nhận"
   - Hiển thị: "❌ Checkout đã hết hạn!"
   - Button "Bắt đầu lại": Reset handler

---

## 📊 FE Priority (Ưu tiên triển khai)

### Phase 1 (Cao)
- [ ] Flash Sale (30 min) - Nút + Timer + 3 response handlers
- [ ] Inventories - Hiển thị available qty

### Phase 2 (Trung)
- [ ] Checkout Countdown (5 min) - Nút + Timer + Confirm
- [ ] Inventory history (admin dashboard)

### Phase 3 (Thấp)
- [ ] Polish UI/UX
- [ ] Error handling improvements
- [ ] Loading states

---

## 🔗 API Base URLs

```
POST   /v1/api/order                              (Flash Sale 30 min)
GET    /v1/api/inventories/:productId/total      (Stock info)
GET    /v1/api/inventories/:productId/history    (Stock history)
POST   /v1/api/checkout                          (Start 5 min checkout)
GET    /v1/api/checkout/:reservationId           (Get countdown status)
POST   /v1/api/checkout/:reservationId/confirm   (Create order)
```

---

## 📝 Lưu Ý Quan Trọng

1. **UUID mỗi lần**: `client_order_id` phải fresh UUID cho mỗi request
2. **Token**: Tất cả endpoints POST/GET cần `Authorization: Bearer {JWT}`
3. **Lỗi 409**: Nếu nhận 409, hãy generate UUID mới + thử lại
4. **Timer máy tính**: Dùng `expiresIn` từ server, không dựa vào client clock
5. **Disable button**: Khi `expiresIn = 0`, disable nút confirm ngay lập tức

---

## 🚀 Deployment Checklist

- [ ] Test Flash Sale - 3 scenarios (201, 409, 400)
- [ ] Test Checkout Countdown - Confirm trước hết giờ ✅
- [ ] Test Checkout Timeout - Confirm sau hết giờ ❌
- [ ] Check token refresh (JWT expiration)
- [ ] Mobile responsiveness (timer, modal)
- [ ] Error notifications (toast/modal)
