# 📋 CHUẨN HÓA DỰ ÁN FLASHSALE - GIẢI THÍCH CHO LEADER

> **Mục đích**: Tài liệu này giải thích tại sao cần thống nhất các chuẩn trong dự án và thứ tự ưu tiên phát triển.

---

## 🎯 1. THỐNG NHẤT TÊN TRƯỜNG (SCHEMA) - QUAN TRỌNG NHẤT

### ❌ Vấn đề nếu không thống nhất:

**Tình huống thực tế:**

Member 3 làm Product Model:
```javascript
// Member 3 nghĩ: "Mình sẽ đặt tên là inventory cho chuyên nghiệp"
const productSchema = {
  name: String,
  price: Number,
  inventory: Number  // ← Member 3 đặt tên này
}
```

Member 1 làm Order Controller (sau đó):
```javascript
// Member 1 nghĩ: "Mình sẽ dùng stock vì ngắn gọn"
const product = await Product.findById(productId);
const remainingStock = product.stock;  // ❌ LỖI! Không có trường "stock"
// Phải sửa thành: product.inventory
```

Member 2 làm Worker (sau đó nữa):
```javascript
// Member 2 nghĩ: "Mình sẽ dùng qty cho ngắn"
const product = await Product.findById(productId);
const qty = product.qty;  // ❌ LỖI! Không có trường "qty"
// Phải sửa thành: product.inventory
```

**Hậu quả:**
- ❌ Mỗi member phải đọc code của nhau để biết tên trường
- ❌ Dễ gây bug khi gọi sai tên trường
- ❌ Refactor code rất mệt, phải sửa nhiều chỗ
- ❌ Code review khó khăn vì không nhất quán

### ✅ Giải pháp: Thống nhất Schema từ đầu

**Quy tắc đặt tên:**
- Sử dụng **snake_case** cho database fields: `product_quantity`, `user_name`, `order_status`
- Hoặc **camelCase** nhất quán: `productQuantity`, `userName`, `orderStatus`
- **KHÔNG** được tự ý đặt tên khác nhau

**Ví dụ chuẩn hóa:**
```javascript
// ✅ CHUẨN: Tất cả member dùng chung
const productSchema = {
  name: String,
  price: Number,
  product_quantity: Number,  // ← Tất cả member dùng tên này
  product_status: String
}

// Member 1 làm Order:
const remaining = product.product_quantity;  // ✅ Đúng

// Member 2 làm Worker:
const qty = product.product_quantity;  // ✅ Đúng

// Member 3 làm Product:
await Product.updateOne({ _id: id }, { 
  product_quantity: newQty 
});  // ✅ Đúng
```

**Kết luận:** 
> **Nếu không chốt `product_quantity` từ đầu, Member 3 có thể đặt là `inventory`, `stock`, `qty`... Đến lúc Member 1 viết code trừ kho sẽ không biết gọi trường nào → Sửa lại rất mệt.**

---

## 🎯 2. THỐNG NHẤT API RESPONSE FORMAT

### ❌ Vấn đề nếu không thống nhất:

**Tình huống thực tế:**

API Register (Member 4):
```json
{
  "code": 201,
  "message": "Registered!",
  "metadata": {
    "user": { ... }
  }
}
```

API Login (Member 4):
```json
{
  "token": "...",
  "userId": "..."
}
```

API Get Products (Member 3):
```json
{
  "data": {
    "products": [ ... ]
  }
}
```

API Create Order (Member 1):
```json
{
  "success": true,
  "order": { ... }
}
```

**Hậu quả với Frontend (Member 5):**

```javascript
// Member 5 phải viết 4 hàm xử lý khác nhau:

// Hàm 1: Xử lý Register
function handleRegister(response) {
  const user = response.metadata.user;  // ← Cấu trúc này
}

// Hàm 2: Xử lý Login
function handleLogin(response) {
  const token = response.token;  // ← Cấu trúc khác
}

// Hàm 3: Xử lý Products
function handleProducts(response) {
  const products = response.data.products;  // ← Cấu trúc khác nữa
}

// Hàm 4: Xử lý Order
function handleOrder(response) {
  const order = response.order;  // ← Cấu trúc khác hoàn toàn
}
```

**Vấn đề:**
- ❌ Frontend phải viết nhiều hàm xử lý khác nhau
- ❌ Dễ bug khi nhầm lẫn cấu trúc response
- ❌ Code Frontend dài dòng, khó maintain
- ❌ Member 5 rất ghét vì phải code nhiều lần

### ✅ Giải pháp: Thống nhất API Response Format

**Format chuẩn cho TẤT CẢ API:**

```json
{
  "code": 200,
  "message": "Success",
  "metadata": {
    // Dữ liệu trả về ở đây
  }
}
```

**Ví dụ áp dụng:**

```javascript
// ✅ Register API
{
  "code": 201,
  "message": "Registered!",
  "metadata": {
    "user": { ... }
  }
}

// ✅ Login API (CẦN SỬA LẠI)
{
  "code": 200,
  "message": "Login successful",
  "metadata": {
    "token": "...",
    "userId": "..."
  }
}

// ✅ Get Products API
{
  "code": 200,
  "message": "Success",
  "metadata": {
    "products": [ ... ],
    "total": 100
  }
}

// ✅ Create Order API
{
  "code": 201,
  "message": "Order created",
  "metadata": {
    "order": { ... }
  }
}
```

**Lợi ích với Frontend:**

```javascript
// ✅ Member 5 chỉ cần viết 1 hàm xử lý chung:
function handleAPIResponse(response) {
  if (response.code >= 200 && response.code < 300) {
    return response.metadata;  // ← Luôn lấy metadata
  } else {
    throw new Error(response.message);
  }
}

// Dùng cho TẤT CẢ API:
const userData = handleAPIResponse(registerResponse);
const loginData = handleAPIResponse(loginResponse);
const products = handleAPIResponse(productsResponse);
const order = handleAPIResponse(orderResponse);
```

**Kết luận:**
> **Frontend (M5) rất ghét lúc thì nhận được `{ user: ... }`, lúc thì `{ data: ... }`. Thống nhất mẫu JSON giúp M5 code 1 hàm xử lý chung cho toàn bộ dự án.**

---

## 🎯 3. THỨ TỰ ƯU TIÊN PHÁT TRIỂN

### ✅ Ưu tiên số 1: M4 (Authentication) - PHẢI LÀM TRƯỚC

**Lý do:**

1. **Không có User thì không đặt hàng được**
   - Order API cần `userId` từ JWT token
   - Không có Auth → Không có token → Không thể tạo Order
   - Member 1 (Order) phải chờ Member 4 (Auth) xong mới code được

2. **Các module khác phụ thuộc vào Auth**
   ```
   Auth (M4) → Order (M1) → Worker (M2)
        ↓
   Product (M3) có thể làm song song
        ↓
   Frontend (M5) phải chờ Auth xong mới code được
   ```

3. **Auth là nền tảng của hệ thống**
   - JWT middleware cần có sẵn để protect các API khác
   - User model cần có sẵn để các model khác reference
   - Login/Register phải hoàn thiện trước khi test các tính năng khác

**Thứ tự đề xuất:**

```
1. M4: Auth (Register, Login, JWT Middleware) ← LÀM TRƯỚC
   ↓
2. M3: Product (Có thể làm song song với Auth)
   ↓
3. M1: Order (Cần Auth để lấy userId)
   ↓
4. M2: Worker (Cần Order để xử lý)
   ↓
5. M5: Frontend (Cần tất cả API backend)
```

**Kết luận:**
> **M4 (Auth) quan trọng nhất vì không có User thì không đặt hàng được. Nên push M4 làm sớm.**

---

## 📝 TÓM TẮT CÁC CHUẨN CẦN THỐNG NHẤT

### 1. Schema Naming Convention
- ✅ Sử dụng **snake_case** hoặc **camelCase** nhất quán
- ✅ Đặt tên trường rõ ràng, không viết tắt tùy tiện
- ✅ Document tất cả Schema trong file `SCHEMA-STANDARDS.md`

### 2. API Response Format
- ✅ Format chuẩn:
  ```json
  {
    "code": 200,
    "message": "Success",
    "metadata": { ... }
  }
  ```
- ✅ Tất cả API phải follow format này
- ✅ Error response cũng phải có `code`, `message`

### 3. Thứ tự phát triển
- ✅ **M4 (Auth) làm trước** - Ưu tiên cao nhất
- ✅ M3 (Product) có thể làm song song
- ✅ M1 (Order) chờ Auth xong
- ✅ M2 (Worker) chờ Order xong
- ✅ M5 (Frontend) chờ tất cả API backend

---

## ✅ CHECKLIST CHO LEADER

- [ ] Review và approve Schema naming convention
- [ ] Review và approve API Response format
- [ ] Xác nhận thứ tự ưu tiên: M4 → M3 → M1 → M2 → M5
- [ ] Tạo file `SCHEMA-STANDARDS.md` để document tất cả Schema
- [ ] Tạo file `API-CONTRACT.md` để document API Response format
- [ ] Yêu cầu tất cả member follow các chuẩn này

---

**Ngày tạo:** 2026-02-05  
**Người tạo:** Development Team  
**Mục đích:** Đảm bảo code quality và giảm thiểu conflict giữa các member
