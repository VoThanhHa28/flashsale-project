# API M3 — Backend Shop & Search

**Member 3:** Dang-Van-Hau  
**Branches:** `feature/product-search`, `feature/shop-orders`  
**Base URL:** `http://localhost:3000`

---

## Quy tắc chung

### Response thành công (200/201)

```json
{
  "statusCode": 200,
  "message": "Mô tả",
  "data": { }
}
```

### Response lỗi (4xx/5xx)

```json
{
  "statusCode": 400,
  "message": "Mô tả lỗi"
}
```

### Header xác thực (bắt buộc với route Private)

```
Authorization: Bearer <accessToken>
```

---

## Bảng tóm tắt

| # | Method | Route | Access | Mô tả |
|---|--------|-------|:------:|-------|
| 1 | GET | `/v1/api/products/search` | Public | Tìm kiếm & lọc sản phẩm |
| 2 | GET | `/v1/api/shop/orders` | SHOP_ADMIN | Danh sách đơn hàng |
| 3 | PATCH | `/v1/api/shop/orders/:id/status` | SHOP_ADMIN | Cập nhật trạng thái đơn |
| 4 | GET | `/v1/api/shop/stats/revenue` | SHOP_ADMIN | Báo cáo doanh thu 7 ngày |

---

## 1. Tìm kiếm & Lọc sản phẩm

### `GET /v1/api/products/search`

**Access:** Public — không cần token

### Query Params

| Param | Type | Bắt buộc | Mặc định | Ghi chú |
|-------|------|:--------:|:-------:|---------|
| `keyword` | string | | `""` | Tìm theo tên SP, không phân biệt hoa/thường |
| `price_min` | number ≥ 0 | | `0` | Giá tối thiểu. `0` = bỏ qua |
| `price_max` | number ≥ 0 | | `0` | Giá tối đa. `0` = bỏ qua |
| `sort` | `price_asc` \| `price_desc` \| `newest` | | `newest` | Sắp xếp kết quả |
| `page` | integer ≥ 1 | | `1` | Trang hiện tại |
| `pageSize` | integer 1–100 | | `20` | Số bản ghi mỗi trang |

### Ví dụ Request

```
GET /v1/api/products/search?keyword=iphone&price_min=1000000&price_max=5000000&sort=price_asc&page=1&pageSize=10
```

### Response 200

```json
{
  "statusCode": 200,
  "message": "Tìm kiếm sản phẩm thành công",
  "data": {
    "products": [
      {
        "_id": "64abc123def456789...",
        "productName": "iPhone 15 Pro",
        "productThumb": "https://example.com/iphone15.jpg",
        "productDescription": "Mô tả sản phẩm chi tiết...",
        "productPrice": 2990000,
        "productQuantity": 50,
        "isPublished": true,
        "productStartTime": "2026-03-01T00:00:00.000Z",
        "productEndTime": "2026-03-10T00:00:00.000Z",
        "createdAt": "2026-02-20T10:00:00.000Z",
        "updatedAt": "2026-02-20T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 42,
      "totalPages": 5
    }
  }
}
```

### Response 400 — Params sai

```json
{
  "statusCode": 400,
  "message": "Validation error"
}
```

Các trường hợp trả 400:

| Trường hợp | Lỗi |
|-----------|-----|
| `sort=WRONG` | `"sort" must be one of [price_asc, price_desc, newest]` |
| `price_min=-100` | `"price_min" must be greater than or equal to 0` |
| `price_min=9000&price_max=1000` | `Giá tối thiểu không được lớn hơn giá tối đa` |
| `pageSize=999` | `"pageSize" must be less than or equal to 100` |

### Lưu ý cho FE

- Khi `products: []` → không có kết quả, **không phải lỗi**
- `price_min` và `price_max` = `0` nghĩa là **bỏ qua** bộ lọc giá
- `productId` trong `products` là object đã populate đầy đủ thông tin

---

## 2. Lấy danh sách đơn hàng Shop

### `GET /v1/api/shop/orders`

**Access:** Private — Cần token `SHOP_ADMIN`

### Query Params

| Param | Type | Bắt buộc | Mặc định | Ghi chú |
|-------|------|:--------:|:-------:|---------|
| `status` | string | | không lọc | Xem bảng trạng thái bên dưới |
| `page` | integer ≥ 1 | | `1` | |
| `pageSize` | integer 1–100 | | `20` | |

**Giá trị hợp lệ của `status`:**

| Giá trị | Ý nghĩa |
|---------|---------|
| `pending` | Đang chờ xử lý |
| `confirmed` | Đã xác nhận |
| `completed` | Hoàn thành |
| `success` | Thành công |
| `failed` | Thất bại |
| `cancelled` | Đã hủy |

### Ví dụ Request

```
GET /v1/api/shop/orders?status=pending&page=1&pageSize=20
Authorization: Bearer <accessToken>
```

### Response 200

```json
{
  "statusCode": 200,
  "message": "Lấy danh sách đơn hàng thành công",
  "data": {
    "orders": [
      {
        "_id": "64def456abc123...",
        "userId": "64user001abc...",
        "productId": {
          "_id": "64abc123def456...",
          "productName": "iPhone 15 Pro",
          "productThumb": "https://example.com/iphone15.jpg",
          "productPrice": 2990000
        },
        "quantity": 1,
        "price": 2990000,
        "totalPrice": 2990000,
        "status": "pending",
        "orderTime": "2026-03-07T08:00:00.000Z",
        "processedAt": null,
        "errorMessage": null,
        "createdAt": "2026-03-07T08:00:00.000Z",
        "updatedAt": "2026-03-07T08:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 135,
      "totalPages": 7
    }
  }
}
```

### Response 401 — Chưa đăng nhập

```json
{
  "status": "error",
  "message": "Unauthorized - No token provided"
}
```

### Response 403 — Không phải SHOP_ADMIN

```json
{
  "statusCode": 403,
  "message": "Forbidden"
}
```

### Lưu ý cho FE

- `productId` là **object** (đã populate), **không phải** string ID
- Khi không truyền `status` → lấy **tất cả** đơn hàng không phân biệt trạng thái

---

## 3. Cập nhật trạng thái đơn hàng

### `PATCH /v1/api/shop/orders/:id/status`

**Access:** Private — Cần token `SHOP_ADMIN`

### Path Params

| Param | Type | Bắt buộc | Ghi chú |
|-------|------|:--------:|---------|
| `id` | string (MongoDB ObjectId) | ✅ | ID của đơn hàng |

### Request Body

```json
{
  "status": "confirmed"
}
```

| Field | Type | Bắt buộc | Giá trị hợp lệ |
|-------|------|:--------:|--------------|
| `status` | string | ✅ | `confirmed` hoặc `cancelled` |

### Response 200

```json
{
  "statusCode": 200,
  "message": "Cập nhật trạng thái đơn hàng thành công",
  "data": {
    "_id": "64def456abc123...",
    "userId": "64user001abc...",
    "productId": {
      "_id": "64abc123def456...",
      "productName": "iPhone 15 Pro",
      "productThumb": "https://example.com/iphone15.jpg",
      "productPrice": 2990000
    },
    "quantity": 1,
    "price": 2990000,
    "totalPrice": 2990000,
    "status": "confirmed",
    "orderTime": "2026-03-07T08:00:00.000Z",
    "processedAt": null,
    "errorMessage": null,
    "createdAt": "2026-03-07T08:00:00.000Z",
    "updatedAt": "2026-03-07T09:15:00.000Z"
  }
}
```

### Response 400 — Status không hợp lệ

```json
{
  "statusCode": 400,
  "message": "Trạng thái chỉ được là confirmed hoặc cancelled"
}
```

### Response 404 — Không tìm thấy đơn hàng

```json
{
  "statusCode": 404,
  "message": "Không tìm thấy đơn hàng"
}
```

---

## 4. Báo cáo Doanh thu

### `GET /v1/api/shop/stats/revenue`

**Access:** Private — Cần token `SHOP_ADMIN`

### Không có params

### Ví dụ Request

```
GET /v1/api/shop/stats/revenue
Authorization: Bearer <accessToken>
```

### Response 200

```json
{
  "statusCode": 200,
  "message": "Lấy báo cáo doanh thu thành công",
  "data": {
    "period": "7 ngày gần nhất",
    "totalRevenue": 145800000,
    "totalOrders": 48,
    "daily": [
      { "date": "2026-03-01", "totalRevenue": 8900000, "totalOrders": 3 },
      { "date": "2026-03-02", "totalRevenue": 21500000, "totalOrders": 7 },
      { "date": "2026-03-04", "totalRevenue": 35200000, "totalOrders": 12 },
      { "date": "2026-03-05", "totalRevenue": 18700000, "totalOrders": 6 },
      { "date": "2026-03-06", "totalRevenue": 42300000, "totalOrders": 14 },
      { "date": "2026-03-07", "totalRevenue": 19200000, "totalOrders": 6 }
    ]
  }
}
```

### Cấu trúc `data`

| Field | Type | Mô tả |
|-------|------|-------|
| `period` | string | Mô tả khoảng thời gian |
| `totalRevenue` | number | Tổng doanh thu 7 ngày (VNĐ) |
| `totalOrders` | number | Tổng số đơn thành công 7 ngày |
| `daily` | array | Doanh thu theo từng ngày |
| `daily[].date` | string `YYYY-MM-DD` | Ngày |
| `daily[].totalRevenue` | number | Doanh thu ngày đó (VNĐ) |
| `daily[].totalOrders` | number | Số đơn thành công ngày đó |

### Lưu ý cho FE

> ⚠️ Mảng `daily` chỉ chứa những ngày **có đơn thành công** (`status = "success"`).  
> Ngày không có đơn sẽ **không xuất hiện** trong `daily`.  
> **FE cần tự fill `{ totalRevenue: 0, totalOrders: 0 }` cho các ngày còn thiếu khi vẽ biểu đồ.**

---

## Mã lỗi HTTP

| Code | Ý nghĩa | Trường hợp gặp |
|------|---------|---------------|
| `200` | Thành công | Mọi request thành công |
| `400` | Dữ liệu không hợp lệ | Sai params, sai body |
| `401` | Chưa xác thực | Thiếu token, token hết hạn |
| `403` | Không có quyền | Không phải SHOP_ADMIN |
| `404` | Không tìm thấy | ID đơn hàng không tồn tại |
| `500` | Lỗi server | Lỗi DB, lỗi hệ thống |
