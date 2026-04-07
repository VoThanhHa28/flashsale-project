Dưới đây là format JSON API chuẩn để member khác làm FE/K6/test theo. Bạn copy vào file (ví dụ docs/API_JSON_FORMAT.md hoặc gửi qua chat).

Format JSON API – Flash Sale (Member 4 – Auth & User)
Base URL: http://localhost:3000 (hoặc process.env.BACKEND_URL)
Chuẩn response thành công: mọi API trả về cùng format:

{
  "statusCode": 200,
  "message": "...",
  "data": { ... }
}
Lỗi (4xx/5xx): middleware error trả JSON, thường có statusCode và message (có thể thêm metadata tùy handler).

Auth: Các API Private cần header: Authorization: Bearer <accessToken>.

1. AUTH – /v1/api/auth
1.1 POST /v1/api/auth/register
Request (Body – JSON):

{
  "email": "user@example.com",
  "password": "Abc@1234",
  "name": "Tên người dùng"
}
email: bắt buộc, email hợp lệ, lowercase.
password: bắt buộc, 8–100 ký tự, có ít nhất 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt !@#$%^&*.
name: optional, 2–100 ký tự.
Response 201:

{
  "statusCode": 201,
  "message": "Đăng ký thành công",
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "name": "Tên người dùng"
    }
  }
}
1.2 POST /v1/api/auth/login
Request (Body – JSON):

{
  "email": "user@example.com",
  "password": "Abc@1234"
}
Response 200:

{
  "statusCode": 200,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "name": "Tên người dùng"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
1.3 GET /v1/api/auth/me (Private)
Headers: Authorization: Bearer <accessToken>

Response 200:

{
  "statusCode": 200,
  "message": "Lấy thông tin thành công",
  "data": {
    "_id": "...",
    "email": "...",
    "name": "...",
    "address": "...",
    "avatar": "...",
    "usr_role": "USER",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
(Không có field password.)

2. USER PROFILE – /v1/api/users
Tất cả route dưới đây đều Private (header Authorization: Bearer <accessToken>).

2.1 GET /v1/api/users/me
Response 200:

{
  "statusCode": 200,
  "message": "Lấy thông tin thành công",
  "data": {
    "user": {
      "_id": "...",
      "email": "...",
      "name": "...",
      "address": "...",
      "avatar": "...",
      "usr_role": "USER",
      "status": "active"
    }
  }
}
2.2 PUT /v1/api/users/me
Request (Body – JSON): ít nhất 1 field.

{
  "name": "Tên mới",
  "address": "Địa chỉ mới",
  "avatar": "https://example.com/avatar.png"
}
name: optional, 1–100 ký tự, có thể "".
address: optional, tối đa 500 ký tự.
avatar: optional, URL hợp lệ hoặc "".
Response 200:

{
  "statusCode": 200,
  "message": "Cập nhật thông tin thành công",
  "data": {
    "user": {
      "_id": "...",
      "email": "...",
      "name": "Tên mới",
      "address": "Địa chỉ mới",
      "avatar": "https://example.com/avatar.png",
      "usr_role": "USER",
"status": "active"
    }
  }
}
2.3 POST /v1/api/users/change-password
Request (Body – JSON):

{
  "oldPassword": "Mật khẩu cũ",
  "newPassword": "Mật khẩu mới 6-100 ký tự"
}
Response 200:

{
  "statusCode": 200,
  "message": "Đổi mật khẩu thành công",
  "data": {}
}
3. ORDER – /v1/api/order
3.1 POST /v1/api/order (Private – đặt hàng)
Headers: Authorization: Bearer <accessToken>

Request (Body – JSON):

{
  "items": [
    {
      "productId": "id_sản_phẩm",
      "quantity": 1
    }
  ],
  "note": "Ghi chú (optional)"
}
items: bắt buộc, mảng ít nhất 1 phần tử; mỗi phần tử có productId (string), quantity (số nguyên ≥ 1).
note: optional, tối đa 500 ký tự.
Response 200:

{
  "statusCode": 200,
  "message": "Đặt hàng thành công!",
  "data": {
    "order": {
      "userId": "...",
      "productId": "...",
      "quantity": 1,
      "price": 123,
      "orderTime": "2026-03-06T..."
    }
  }
}
3.2 GET /v1/api/order/me (Private – lịch sử đơn)
Headers: Authorization: Bearer <accessToken>

Query (optional):

page: number, ≥ 1.
limit: number, 1–100.
Response 200:

{
  "statusCode": 200,
  "message": "Lấy danh sách đơn hàng thành công",
  "data": {
    "orders": [
      {
        "_id": "...",
        "userId": "...",
        "productId": { "_id": "...", "name": "...", "price": 123, "imageUrl": "..." },
        "quantity": 1,
        "price": 123,
        "totalPrice": 123,
        "status": "completed",
        "orderTime": "...",
        "processedAt": "...",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "total": 10,
    "page": 1,
    "limit": 10
  }
}
3.3 GET /v1/api/order/me/:id (Private – chi tiết 1 đơn)
Headers: Authorization: Bearer <accessToken>
Params: id = ID đơn hàng (string).

Response 200:

{
  "statusCode": 200,
  "message": "Lấy chi tiết đơn hàng thành công",
  "data": {
    "order": {
      "_id": "...",
      "userId": "...",
      "productId": { "_id": "...", "name": "...", "price": 123, "imageUrl": "..." },
      "quantity": 1,
      "price": 123,
      "totalPrice": 123,
      "status": "completed",
      "orderTime": "...",
      "processedAt": "..."
    }
  }
}
Nếu đơn không thuộc user: 403 với message kiểu "Bạn không có quyền xem đơn hàng này".

4. ADMIN – /v1/api/admin
Tất cả route Private + SHOP_ADMIN (header Authorization: Bearer <accessToken>, user có usr_role: "SHOP_ADMIN").

4.1 GET /v1/api/admin/users
Query (optional):

page: number, ≥ 1.
limit: number, 1–100.
Response 200:

{
  "statusCode": 200,
  "message": "Lấy danh sách user thành công",
  "data": {
    "users": [
      {
        "_id": "...",
        "email": "...",
        "name": "...",
        "address": "...",
        "avatar": "...",
        "usr_role": "USER",
        "status": "active",
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "total": 100,
    "page": 1,
"limit": 10
  }
}
(Không có field password.)

4.2 PATCH /v1/api/admin/users/:id/ban
Params: id = ID user (string).
Request (Body – JSON):

{
  "status": "inactive"
}
Chỉ chấp nhận "status": "inactive".

Response 200:

{
  "statusCode": 200,
  "message": "Khóa tài khoản thành công",
  "data": {
    "user": {
      "_id": "...",
      "email": "...",
      "name": "...",
      "usr_role": "...",
      "status": "inactive",
      ...
    }
  }
}
4.3 GET /v1/api/admin/health
Response 200:

{
  "statusCode": 200,
  "message": "Health check thành công",
  "data": {
    "mongo": "ok",
    "redis": "ok"
  }
}
(mongo / redis có thể là "ok" hoặc "fail".)

4.4 POST /v1/api/admin/flash-sale/activate
Request (Body – JSON):

{
  "productId": "id_sản_phẩm",
  "startTime": "2026-03-10T10:00:00.000Z",
  "endTime": "2026-03-10T12:00:00.000Z"
}
4.5 POST /v1/api/admin/flash-sale/hot-activate
Request (Body – JSON):

{
  "productId": "id_sản_phẩm",
  "duration": 3600
}
duration: số giây (optional, mặc định 3600).

5. SEED – /v1/api/seed (dev/test)
5.1 POST /v1/api/seed/users
Request (Body – JSON, optional):

{
  "count": 1000
}
count: 1–10000, mặc định 1000.

Response (thành công): status 200/201, body có dạng:


{
  "statusCode": 200,
  "message": "Đã tạo thành công ... users",
  "data": {
    "created": 1000,
    "defaultPassword": "123456",
    "emailPattern": "testuser<timestamp>_[1-1000]@flashsale.test",
    "timestamp": ...
  }
}
Tóm tắt cho member
Success: Luôn có statusCode, message, data (object).
Auth: API Private/Admin dùng header Authorization: Bearer <accessToken> (lấy từ POST /v1/api/auth/login → data.accessToken).
Admin: Chỉ user có usr_role: "SHOP_ADMIN" mới gọi được /v1/api/admin/*.
Lỗi: Dùng statusCode và message trong body JSON để hiển thị lỗi cho user.