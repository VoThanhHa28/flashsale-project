# CÁC QUY ƯỚC THỐNG NHẤT

### 1. BẢNG QUY ƯỚC CHUNG (CẢ TEAM PHẢI THEO)

### 🅰️ Quy ước API Response (Quan trọng nhất)

Tất cả API (Auth, Product, Order) **BẮT BUỘC** trả về theo format **JSend**:

- **Thành công (200/201):**JSON
    
    `{
      "status": "success",
      "message": "Mô tả ngắn gọn (VD: Lấy danh sách thành công)",
      "data": { ... } // Object hoặc Array dữ liệu nằm ở đây
    }`
    
- **Thất bại (400/401/500):**JSON
    
    `{
      "status": "error", // hoặc "fail"
      "message": "Mô tả lỗi (VD: Thiếu thông tin sản phẩm)",
      "data": null // Hoặc chi tiết lỗi nếu cần debug
    }`
    

```jsx
{
    "status": "success",
    "message": "Đặt hàng thành công! Đang xử lý...",
    "data": {
        "userId": "user-001",
        "productId": "product-123",
        "quantity": 1,
        "price": 20000,
        "orderTime": "2026-02-07T06:48:34.428Z"
    }
}
```

### 🅱️ Quy ước Naming (Đặt tên)

- **Biến trong Code (Node.js):** `camelCase` (ví dụ: `productName`, `userId`).
- **Database Field (MongoDB):**
    - Ban đầu đề xuất `snake_case` (`product_name`), **NHƯNG** trong Node.js/Mongoose, chuẩn cộng đồng là `camelCase`.
    - 👉 **CHỐT LẠI:** Dùng **`camelCase`** cho toàn bộ dự án (cả DB và Code) để đỡ phải map qua map lại.
    - **User:** `email`, `password`, `name`, `role`.
    - **Product:** `productName`, `productThumb`, `productDescription`, `productPrice`, `productQuantity`.
    - **Order:** `userId`, `productId`, `quantity`, `totalPrice`.

### 🆎 Quy ước HTTP Method

- **GET:** Lấy dữ liệu.
- **POST:** Tạo mới (Đăng ký, Đặt hàng, Tạo SP).
- **PUT/PATCH:** Cập nhật.
- **DELETE:** Xóa.