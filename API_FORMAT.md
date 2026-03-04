# 📋 API FORMAT CHUẨN CHO BACKEND

**Mục đích:** File này định nghĩa format JSON chuẩn cho tất cả API mà Frontend (M5) sẽ sử dụng. Backend (M3, M4) cần tuân thủ format này để đảm bảo Frontend hoạt động đúng.

**Nguyên tắc:**
- Tất cả API trả về format JSend chuẩn (theo `update12.md`)
- Tên trường dùng `snake_case` (theo convention hiện tại của project)
- Tất cả response có `statusCode`, `message`, `data` hoặc `metadata`

---

## 🔵 NHÓM USER (M4 - Backend)

### 1. GET /v1/api/order/me
**Mô tả:** Lấy danh sách đơn hàng của user hiện tại

**Request:**
- Method: `GET`
- Headers: `Authorization: Bearer {token}`

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Lấy danh sách đơn hàng thành công",
  "metadata": {
    "orders": [
      {
        "order_id": "ORD-20240216-001",
        "user_id": "user-001",
        "order_date": "2024-02-16T10:30:00.000Z",
        "order_status": "delivered",
        "total_amount": 15000000,
        "items": [
          {
            "product_id": "prod-001",
            "product_name": "iPhone 15 Pro Max 256GB",
            "product_thumb": "https://example.com/image.jpg",
            "quantity": 1,
            "price": 15000000
          }
        ],
        "shipping_address": {
          "full_name": "Nguyễn Văn A",
          "phone": "0901234567",
          "address": "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
        }
      }
    ]
  }
}
```

**Trạng thái đơn hàng (`order_status`):**
- `pending`: Chờ xử lý
- `confirmed`: Đã xác nhận
- `shipping`: Đang giao hàng
- `delivered`: Đã giao hàng
- `cancelled`: Đã hủy

**Response Error (401):**
```json
{
  "statusCode": 401,
  "message": "Vui lòng đăng nhập",
  "status": "error"
}
```

---

### 2. GET /v1/api/order/me/:id
**Mô tả:** Lấy chi tiết 1 đơn hàng cụ thể

**Request:**
- Method: `GET`
- Headers: `Authorization: Bearer {token}`
- Params: `id` (order_id)

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Lấy chi tiết đơn hàng thành công",
  "metadata": {
    "order": {
      "order_id": "ORD-20240216-001",
      "user_id": "user-001",
      "order_date": "2024-02-16T10:30:00.000Z",
      "order_status": "delivered",
      "total_amount": 15000000,
      "items": [
        {
          "product_id": "prod-001",
          "product_name": "iPhone 15 Pro Max 256GB",
          "product_thumb": "https://example.com/image.jpg",
          "quantity": 1,
          "price": 15000000
        }
      ],
      "shipping_address": {
        "full_name": "Nguyễn Văn A",
        "phone": "0901234567",
        "address": "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM"
      },
      "timeline": [
        {
          "status": "pending",
          "timestamp": "2024-02-16T10:30:00.000Z",
          "note": "Đơn hàng đã được đặt"
        },
        {
          "status": "confirmed",
          "timestamp": "2024-02-16T11:00:00.000Z",
          "note": "Đơn hàng đã được xác nhận"
        },
        {
          "status": "shipping",
          "timestamp": "2024-02-16T14:00:00.000Z",
          "note": "Đơn hàng đang được giao"
        },
        {
          "status": "delivered",
          "timestamp": "2024-02-17T10:00:00.000Z",
          "note": "Đơn hàng đã được giao thành công"
        }
      ]
    }
  }
}
```

**Response Error (404):**
```json
{
  "statusCode": 404,
  "message": "Không tìm thấy đơn hàng",
  "status": "error"
}
```

---

### 3. GET /v1/api/user/me
**Mô tả:** Lấy thông tin user đang login

**Request:**
- Method: `GET`
- Headers: `Authorization: Bearer {token}`

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Lấy thông tin user thành công",
  "metadata": {
    "user": {
      "user_id": "user-001",
      "email": "user@example.com",
      "name": "Nguyễn Văn A",
      "avatar": "https://example.com/avatar.jpg",
      "phone": "0901234567",
      "addresses": [
        {
          "address_id": "addr-001",
          "full_name": "Nguyễn Văn A",
          "phone": "0901234567",
          "address": "123 Đường ABC, Phường XYZ, Quận 1, TP.HCM",
          "is_default": true
        }
      ]
    }
  }
}
```

---

### 4. PUT /v1/api/user/me
**Mô tả:** Update thông tin user (Tên, Avatar, Địa chỉ)

**Request:**
- Method: `PUT`
- Headers: `Authorization: Bearer {token}`
- Body:
```json
{
  "name": "Nguyễn Văn B",
  "avatar": "https://example.com/new-avatar.jpg",
  "phone": "0901234568",
  "addresses": [
    {
      "address_id": "addr-001",
      "full_name": "Nguyễn Văn B",
      "phone": "0901234568",
      "address": "456 Đường DEF, Phường UVW, Quận 2, TP.HCM",
      "is_default": true
    }
  ]
}
```

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Cập nhật thông tin thành công",
  "metadata": {
    "user": {
      "user_id": "user-001",
      "email": "user@example.com",
      "name": "Nguyễn Văn B",
      "avatar": "https://example.com/new-avatar.jpg",
      "phone": "0901234568",
      "addresses": [...]
    }
  }
}
```

---

### 5. GET /v1/api/admin/users
**Mô tả:** List toàn bộ User (có phân trang)

**Request:**
- Method: `GET`
- Headers: `Authorization: Bearer {token}`
- Query params:
  - `page`: số trang (mặc định: 1)
  - `limit`: số item mỗi trang (mặc định: 20)

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Lấy danh sách user thành công",
  "metadata": {
    "users": [
      {
        "user_id": "user-001",
        "email": "user1@example.com",
        "name": "Nguyễn Văn A",
        "usr_role": "USER",
        "status": "active",
        "created_at": "2024-01-01T00:00:00.000Z"
      },
      {
        "user_id": "user-002",
        "email": "user2@example.com",
        "name": "Trần Thị B",
        "usr_role": "SHOP_ADMIN",
        "status": "active",
        "created_at": "2024-01-02T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

**Trạng thái user (`status`):**
- `active`: Hoạt động
- `inactive`: Đã khóa

---

### 6. PATCH /v1/api/admin/users/:id/ban
**Mô tả:** Khóa/Mở khóa tài khoản user

**Request:**
- Method: `PATCH`
- Headers: `Authorization: Bearer {token}`
- Params: `id` (user_id)
- Body:
```json
{
  "status": "inactive"
}
```

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Cập nhật trạng thái user thành công",
  "metadata": {
    "user": {
      "user_id": "user-001",
      "status": "inactive"
    }
  }
}
```

---

### 7. GET /v1/api/admin/health
**Mô tả:** Kiểm tra trạng thái Server (Redis, MongoDB)

**Request:**
- Method: `GET`
- Headers: `Authorization: Bearer {token}`

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Kiểm tra hệ thống thành công",
  "metadata": {
    "redis": {
      "status": "ok",
      "response_time_ms": 5
    },
    "mongo": {
      "status": "ok",
      "response_time_ms": 10
    },
    "timestamp": "2024-02-16T10:30:00.000Z"
  }
}
```

**Response Error (503) - Khi có service down:**
```json
{
  "statusCode": 503,
  "message": "Một số dịch vụ đang gặp sự cố",
  "metadata": {
    "redis": {
      "status": "error",
      "error": "Connection timeout"
    },
    "mongo": {
      "status": "ok",
      "response_time_ms": 10
    }
  }
}
```

---

## 🟢 NHÓM SHOP OWNER (M3 - Backend)

### 8. GET /v1/api/product/search
**Mô tả:** Tìm kiếm và lọc sản phẩm

**Request:**
- Method: `GET`
- Query params:
  - `keyword`: từ khóa tìm kiếm (optional)
  - `price_min`: giá tối thiểu (optional)
  - `price_max`: giá tối đa (optional)
  - `sort`: sắp xếp (`asc` hoặc `desc`, mặc định: `asc`)

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Tìm kiếm sản phẩm thành công",
  "metadata": {
    "products": [
      {
        "product_id": "prod-001",
        "product_name": "iPhone 15 Pro Max 256GB",
        "product_thumb": "https://example.com/image.jpg",
        "product_price": 15000000,
        "product_quantity": 10,
        "product_start_time": "2024-02-16T10:00:00.000Z",
        "product_end_time": "2024-02-16T10:30:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20
  }
}
```

---

### 9. GET /v1/api/shop/orders
**Mô tả:** Lấy danh sách đơn hàng của Shop

**Request:**
- Method: `GET`
- Headers: `Authorization: Bearer {token}` (phải là SHOP_ADMIN)

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Lấy danh sách đơn hàng thành công",
  "metadata": {
    "orders": [
      {
        "order_id": "ORD-20240216-001",
        "user_id": "user-001",
        "user_name": "Nguyễn Văn A",
        "user_email": "user@example.com",
        "order_date": "2024-02-16T10:30:00.000Z",
        "order_status": "pending",
        "total_amount": 15000000,
        "items": [
          {
            "product_id": "prod-001",
            "product_name": "iPhone 15 Pro Max 256GB",
            "quantity": 1,
            "price": 15000000
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "total_pages": 5
    }
  }
}
```

---

### 10. PATCH /v1/api/shop/orders/:id/status
**Mô tả:** Duyệt/Hủy đơn hàng

**Request:**
- Method: `PATCH`
- Headers: `Authorization: Bearer {token}` (phải là SHOP_ADMIN)
- Params: `id` (order_id)
- Body:
```json
{
  "status": "confirmed"
}
```
hoặc
```json
{
  "status": "cancelled"
}
```

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Cập nhật trạng thái đơn hàng thành công",
  "metadata": {
    "order": {
      "order_id": "ORD-20240216-001",
      "order_status": "confirmed"
    }
  }
}
```

---

### 11. GET /v1/api/shop/stats/revenue
**Mô tả:** Báo cáo doanh thu (7 ngày qua)

**Request:**
- Method: `GET`
- Headers: `Authorization: Bearer {token}` (phải là SHOP_ADMIN)
- Query params:
  - `days`: số ngày (mặc định: 7)

**Response Success (200):**
```json
{
  "statusCode": 200,
  "message": "Lấy báo cáo doanh thu thành công",
  "metadata": {
    "revenue": {
      "total_revenue": 500000000,
      "total_orders": 150,
      "successful_orders": 140,
      "cancelled_orders": 10,
      "daily_stats": [
        {
          "date": "2024-02-10",
          "revenue": 50000000,
          "orders": 15,
          "successful": 14,
          "cancelled": 1
        },
        {
          "date": "2024-02-11",
          "revenue": 75000000,
          "orders": 20,
          "successful": 19,
          "cancelled": 1
        }
      ]
    }
  }
}
```

---

## 📝 LƯU Ý QUAN TRỌNG

1. **Format Response:** Tất cả API phải trả về format JSend chuẩn:
   ```json
   {
     "statusCode": 200,
     "message": "...",
     "metadata": { ... }
   }
   ```

2. **Tên trường:** Dùng `snake_case` cho tất cả các trường (ví dụ: `order_id`, `product_name`, `total_amount`)

3. **Ngày tháng:** Format ISO 8601: `"2024-02-16T10:30:00.000Z"`

4. **Giá tiền:** Số nguyên (đơn vị: VNĐ), không có dấu phẩy hoặc dấu chấm

5. **Error Handling:** Khi có lỗi, trả về:
   ```json
   {
     "statusCode": 400,
     "message": "Thông báo lỗi bằng tiếng Việt",
     "status": "error"
   }
   ```

6. **Authentication:** Tất cả API cần authentication (trừ `/v1/api/product/search`) phải có header:
   ```
   Authorization: Bearer {token}
   ```

7. **Authorization:** API Shop Owner và Admin phải check `usr_role`:
   - Shop Owner: `usr_role === 'SHOP_ADMIN'`
   - Admin: `usr_role === 'SHOP_ADMIN'` (có thể mở rộng sau)

---

**Cập nhật lần cuối:** 16/02/2024
**Người tạo:** M5 (Frontend)
**Người sử dụng:** M3, M4 (Backend)
