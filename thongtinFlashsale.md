# 📋 BÁO CÁO TỔNG HỢP HỆ THỐNG FLASH SALE

---

## MỤC LỤC

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Database Design](#3-database-design)
4. [API Documentation](#4-api-documentation)
5. [Luồng xử lý đặt hàng](#5-luồng-xử-lý-đặt-hàng)
6. [Phân công Member](#6-phân-công-member)
7. [Các biểu đồ cần vẽ](#7-các-biểu-đồ-cần-vẽ)
8. [Cấu trúc báo cáo](#8-cấu-trúc-báo-cáo)
9. [Checklist](#9-checklist)

---

## 1. TỔNG QUAN HỆ THỐNG

### 1.1. Mô tả hệ thống

**Flash Sale System** là hệ thống thương mại điện tử cho phép bán hàng với số lượng giới hạn trong thời gian ngắn (Flash Sale/Giờ G). Hệ thống được thiết kế để xử lý lượng truy cập cao đồng thời (High Concurrency).

| Tính năng | Mô tả |
|-----------|-------|
| **Đăng ký/Đăng nhập** | Xác thực người dùng qua JWT |
| **Quản lý Profile** | Cập nhật thông tin cá nhân, đổi mật khẩu |
| **Xem sản phẩm** | Danh sách sản phẩm Flash Sale với countdown timer |
| **Tìm kiếm sản phẩm** | Search theo keyword, lọc giá, sort |
| **Đặt hàng Flash Sale** | Kiểm tra tồn kho realtime, trừ kho atomic |
| **Xử lý bất đồng bộ** | Order được đẩy vào Message Queue |
| **Realtime Update** | Cập nhật tồn kho qua Socket.IO |
| **Quản trị hệ thống** | Admin quản lý sản phẩm, user, đơn hàng, thống kê |

### 1.2. Luồng hoạt động chính

```
User → Register/Login → Xem sản phẩm → Click "Mua" 
    → API Order (Check giờ G, Trừ kho Redis Lua Script) 
    → Gửi Message vào RabbitMQ → Response ngay cho User
    → Worker consume từ Queue → Lưu Order vào MongoDB
    → Emit Socket.IO update stock realtime
```

### 1.3. Công nghệ sử dụng

| Thành phần | Công nghệ | Phiên bản | Mục đích |
|------------|-----------|-----------|----------|
| **Runtime** | Node.js | 20 LTS | JavaScript Runtime |
| **Framework** | Express.js | 4.x | Web Framework |
| **Database** | MongoDB | 6.x | Lưu trữ dữ liệu chính |
| **Cache** | Redis | 7.x | Cache, Inventory Lock |
| **Message Queue** | RabbitMQ | 3.x | Xử lý đơn hàng bất đồng bộ |
| **Frontend** | React.js | 18.x | Giao diện người dùng |
| **Realtime** | Socket.IO | 4.x | Cập nhật tồn kho realtime |
| **Authentication** | JWT | - | JSON Web Token |
| **Password Hash** | bcrypt | - | Mã hóa mật khẩu |

---

## 2. KIẾN TRÚC HỆ THỐNG

### 2.1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (ReactJS)                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │  Login  │ │Register │ │  Home   │ │ Product │ │  Order  │ │  Admin  │   │
│  │  Page   │ │  Page   │ │  Page   │ │ Detail  │ │ History │ │  Panel  │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                          HTTP/REST API + Socket.IO
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND API (Express.js)                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                           /v1/api                                    │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │    │
│  │  │  /auth   │ │ /users   │ │/products │ │  /order  │ │  /admin  │  │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    MongoDB    │   │     Redis     │   │   RabbitMQ    │
│  ┌─────────┐  │   │  ┌─────────┐  │   │  ┌─────────┐  │
│  │  users  │  │   │  │product: │  │   │  │ order-  │  │
│  │products │  │   │  │stock:id │  │   │  │  queue  │  │
│  │ orders  │  │   │  │ info:id │  │   │  └────┬────┘  │
│  └─────────┘  │   │  └─────────┘  │   │       │       │
└───────────────┘   └───────────────┘   └───────┼───────┘
                                                │
                                                ▼
                                    ┌───────────────────┐
                                    │   Order Worker    │
                                    │  ┌─────────────┐  │
                                    │  │  consume()  │  │
                                    │  │  saveToDB() │  │
                                    │  │emitSocket() │  │
                                    │  └─────────────┘  │
                                    └───────────────────┘
```

### 2.2. Vai trò từng thành phần

| Thành phần | Vai trò | Chi tiết |
|------------|---------|----------|
| **Frontend (ReactJS)** | Giao diện người dùng | 12 pages |
| **Backend API (Express)** | Business Logic | 29 API endpoints |
| **Redis** | Cache & Inventory Lock | Lua Script atomic decrby |
| **RabbitMQ** | Message Broker | Hàng đợi `order-queue` |
| **MongoDB** | Database chính | 3 Collections |
| **Worker** | Background Processor | Consume queue, lưu order |
| **Socket.IO** | Realtime | Broadcast `update-stock` |

---

## 3. DATABASE DESIGN

### 3.1. Tổng quan Database

| Mục | Chi tiết |
|-----|----------|
| **Database** | MongoDB |
| **ODM** | Mongoose |
| **Số Collections** | 3 |
| **Collections** | `users`, `products`, `orders` |

### 3.2. ERD Diagram

```
┌─────────────────────────────┐              ┌─────────────────────────────┐
│           USERS             │              │          PRODUCTS           │
├─────────────────────────────┤              ├─────────────────────────────┤
│ _id: ObjectId (PK)          │              │ _id: ObjectId (PK)          │
│ email: String (UK)          │              │ productName: String         │
│ password: String            │              │ productThumb: String        │
│ name: String                │              │ productDescription: String  │
│ address: String             │              │ productPrice: Number        │
│ avatar: String              │              │ productQuantity: Number     │
│ usr_role: Enum              │              │ productStartTime: Date      │
│ status: Enum                │              │ productEndTime: Date        │
│ is_deleted: Boolean         │              │ isPublished: Boolean        │
│ createdAt: Date             │              │ is_deleted: Boolean         │
│ updatedAt: Date             │              │ createdAt: Date             │
└──────────────┬──────────────┘              └──────────────┬──────────────┘
               │                                            │
               │          1 : N                             │         1 : N
               │                                            │
               └──────────────────┐    ┌────────────────────┘
                                  │    │
                                  ▼    ▼
                        ┌─────────────────────────┐
                        │          ORDERS         │
                        ├─────────────────────────┤
                        │ _id: ObjectId (PK)      │
                        │ userId: String (FK)     │
                        │ productId: String (FK)  │
                        │ quantity: Number        │
                        │ price: Number           │
                        │ totalPrice: Number      │
                        │ status: Enum            │
                        │ orderTime: Date         │
                        │ processedAt: Date       │
                        │ errorMessage: String    │
                        │ createdAt: Date         │
                        └─────────────────────────┘
```

---

### 3.3. USERS Collection

#### Schema Definition

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  name: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
    default: '',
  },
  avatar: {
    type: String,
    trim: true,
    default: '',
  },
  usr_role: {
    type: String,
    enum: ['USER', 'SHOP_ADMIN'],
    default: 'USER',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  is_deleted: {
    type: Boolean,
    default: false,
    index: true,
  },
}, { timestamps: true, collection: 'users' });
```

#### Chi tiết Fields

| # | Field | Type | Required | Default | Constraint | Mô tả |
|---|-------|------|----------|---------|------------|-------|
| 1 | `_id` | ObjectId | Auto | Auto | Primary Key | ID duy nhất |
| 2 | `email` | String | ✅ | - | Unique, Lowercase, Trim | Email đăng nhập |
| 3 | `password` | String | ✅ | - | Select: false | Mật khẩu (bcrypt hash) |
| 4 | `name` | String | ❌ | - | Trim | Tên hiển thị |
| 5 | `address` | String | ❌ | `''` | Trim | Địa chỉ giao hàng |
| 6 | `avatar` | String | ❌ | `''` | Trim | URL ảnh đại diện |
| 7 | `usr_role` | String | ❌ | `'USER'` | Enum: USER, SHOP_ADMIN | Vai trò |
| 8 | `status` | String | ❌ | `'active'` | Enum: active, inactive | Trạng thái |
| 9 | `is_deleted` | Boolean | ❌ | `false` | Index | Soft delete |
| 10 | `createdAt` | Date | Auto | Auto | - | Ngày tạo |
| 11 | `updatedAt` | Date | Auto | Auto | - | Ngày cập nhật |

#### Indexes

| # | Index | Type | Mục đích |
|---|-------|------|----------|
| 1 | `_id` | Primary | Truy vấn theo ID |
| 2 | `email` | Unique | Đảm bảo email duy nhất |
| 3 | `is_deleted` | Single | Lọc user đã xóa |

#### Enum Values

**usr_role:**

| Value | Mô tả |
|-------|-------|
| `USER` | Người dùng thường, có thể mua hàng |
| `SHOP_ADMIN` | Quản trị viên, quản lý sản phẩm/đơn hàng |

**status:**

| Value | Mô tả |
|-------|-------|
| `active` | Tài khoản đang hoạt động |
| `inactive` | Tài khoản bị khóa/vô hiệu hóa |

#### Sample Document

```json
{
  "_id": "65a1b2c3d4e5f6789012345a",
  "email": "user@example.com",
  "password": "$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "name": "Nguyen Van A",
  "address": "123 Nguyen Trai, Q1, HCM",
  "avatar": "",
  "usr_role": "USER",
  "status": "active",
  "is_deleted": false,
  "createdAt": "2026-03-01T08:00:00.000Z",
  "updatedAt": "2026-03-10T10:00:00.000Z"
}
```

---

### 3.4. PRODUCTS Collection

#### Schema Definition

```javascript
const productSchema = new mongoose.Schema({
  productName: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    minlength: [1, 'Min 1 character'],
    maxlength: [200, 'Max 200 characters'],
  },
  productThumb: {
    type: String,
    required: [true, 'Product thumbnail URL is required'],
    trim: true,
  },
  productDescription: {
    type: String,
    required: [true, 'Product description is required'],
    trim: true,
    minlength: [1, 'Min 1 character'],
    maxlength: [2000, 'Max 2000 characters'],
  },
  productPrice: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Min 0'],
    max: [999999999999, 'Max 999999999999'],
  },
  productQuantity: {
    type: Number,
    required: [true, 'Product quantity is required'],
    min: [0, 'Min 0'],
    max: [999999, 'Max 999999'],
  },
  isPublished: { 
    type: Boolean, 
    default: true, 
    index: true
  },
  productStartTime: { 
    type: Date, 
    required: true, 
    default: Date.now,
    index: true
  },
  productEndTime: { 
    type: Date, 
    required: true, 
    default: () => new Date(+new Date() + 7*24*60*60*1000)
  },
  is_deleted: {
    type: Boolean,
    default: false,
    index: true
  },
}, { timestamps: true, collection: 'products' });
```

#### Chi tiết Fields

| # | Field | Type | Required | Default | Constraint | Mô tả |
|---|-------|------|----------|---------|------------|-------|
| 1 | `_id` | ObjectId | Auto | Auto | Primary Key | ID sản phẩm |
| 2 | `productName` | String | ✅ | - | 1-200 chars, Trim | Tên sản phẩm |
| 3 | `productThumb` | String | ✅ | - | Trim, Not empty | URL thumbnail |
| 4 | `productDescription` | String | ✅ | - | 1-2000 chars, Trim | Mô tả |
| 5 | `productPrice` | Number | ✅ | - | 0 - 999,999,999,999 | Giá bán (VND) |
| 6 | `productQuantity` | Number | ✅ | - | Integer, 0 - 999,999 | Số lượng |
| 7 | `isPublished` | Boolean | ❌ | `true` | Index | Trạng thái hiển thị |
| 8 | `productStartTime` | Date | ✅ | `Date.now` | Index | Thời gian bắt đầu Flash Sale |
| 9 | `productEndTime` | Date | ✅ | `now + 7 days` | - | Thời gian kết thúc Flash Sale |
| 10 | `is_deleted` | Boolean | ❌ | `false` | Index | Soft delete |
| 11 | `createdAt` | Date | Auto | Auto | - | Ngày tạo |
| 12 | `updatedAt` | Date | Auto | Auto | - | Ngày cập nhật |

#### Indexes

| # | Index | Type | Fields | Mục đích |
|---|-------|------|--------|----------|
| 1 | `_id` | Primary | `_id` | Truy vấn theo ID |
| 2 | `productName_text` | Text | `productName` | Full-text search |
| 3 | `productPrice_1` | Single | `productPrice: 1` | Sort theo giá |
| 4 | `createdAt_-1` | Single | `createdAt: -1` | Sort theo ngày tạo |
| 5 | `productQuantity_1` | Single | `productQuantity: 1` | Filter hết hàng |
| 6 | `time_compound` | Compound | `productStartTime: 1, productEndTime: 1` | Query Flash Sale |
| 7 | `published_time` | Compound | `isPublished: 1, productStartTime: 1` | Filter + Sort |
| 8 | `isPublished_1` | Single | `isPublished: 1` | Filter trạng thái |
| 9 | `is_deleted_1` | Single | `is_deleted: 1` | Filter soft delete |

#### Sample Document

```json
{
  "_id": "65b2c3d4e5f6789012345b",
  "productName": "iPhone 15 Pro Max 256GB",
  "productThumb": "https://example.com/images/iphone15.jpg",
  "productDescription": "Điện thoại iPhone 15 Pro Max với chip A17 Pro",
  "productPrice": 29990000,
  "productQuantity": 100,
  "isPublished": true,
  "productStartTime": "2026-03-13T10:00:00.000Z",
  "productEndTime": "2026-03-13T12:00:00.000Z",
  "is_deleted": false,
  "createdAt": "2026-03-10T08:00:00.000Z",
  "updatedAt": "2026-03-12T15:30:00.000Z"
}
```

---

### 3.5. ORDERS Collection

#### Schema Definition

```javascript
const orderSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: "User",
    required: true,
    index: true,
  },
  productId: {
    type: String,
    ref: "Product",
    required: true,
    index: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, "Số lượng phải lớn hơn 0"],
  },
  price: {
    type: Number,
    required: true,
    min: [0, "Giá không được âm"],
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'success', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  orderTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  processedAt: {
    type: Date,
    default: null,
  },
  errorMessage: {
    type: String,
    default: null,
  },
}, { timestamps: true, collection: "orders" });
```

#### Chi tiết Fields

| # | Field | Type | Required | Default | Constraint | Mô tả |
|---|-------|------|----------|---------|------------|-------|
| 1 | `_id` | ObjectId | Auto | Auto | Primary Key | ID đơn hàng |
| 2 | `userId` | String | ✅ | - | Index, Ref: User | ID người đặt |
| 3 | `productId` | String | ✅ | - | Index, Ref: Product | ID sản phẩm |
| 4 | `quantity` | Number | ✅ | - | Min: 1 | Số lượng mua |
| 5 | `price` | Number | ✅ | - | Min: 0 | Đơn giá |
| 6 | `totalPrice` | Number | ✅ | `0` | Auto calculate | Tổng tiền |
| 7 | `status` | String | ❌ | `'pending'` | Enum, Index | Trạng thái |
| 8 | `orderTime` | Date | ✅ | `Date.now` | - | Thời điểm đặt |
| 9 | `processedAt` | Date | ❌ | `null` | - | Thời điểm xử lý |
| 10 | `errorMessage` | String | ❌ | `null` | - | Lý do lỗi |
| 11 | `createdAt` | Date | Auto | Auto | - | Ngày tạo |
| 12 | `updatedAt` | Date | Auto | Auto | - | Ngày cập nhật |

#### Order Status Values

| Value | Mô tả |
|-------|-------|
| `pending` | Đang chờ xử lý |
| `confirmed` | Đã xác nhận |
| `completed` | Hoàn thành |
| `success` | Thành công |
| `failed` | Thất bại |
| `cancelled` | Đã hủy |

#### Indexes

| # | Index | Type | Fields | Mục đích |
|---|-------|------|--------|----------|
| 1 | `_id` | Primary | `_id` | Truy vấn theo ID |
| 2 | `userId_1` | Single | `userId: 1` | Tìm đơn theo user |
| 3 | `productId_1` | Single | `productId: 1` | Tìm đơn theo sản phẩm |
| 4 | `status_1` | Single | `status: 1` | Filter theo trạng thái |
| 5 | `user_created` | Compound | `userId: 1, createdAt: -1` | Lịch sử đơn hàng |
| 6 | `status_created` | Compound | `status: 1, createdAt: -1` | Filter + Sort |
| 7 | `product_status` | Compound | `productId: 1, status: 1` | Thống kê |
| 8 | `orderTime_1` | Single | `orderTime: 1` | Sort theo thời gian |

#### Virtual Fields

```javascript
orderSchema.virtual("processingDelay").get(function () {
  if (this.processedAt && this.orderTime) {
    return this.processedAt.getTime() - new Date(this.orderTime).getTime();
  }
  return null;
});
```

#### Methods

```javascript
// Instance method
orderSchema.methods.calculateTotalPrice = function () {
  this.totalPrice = this.quantity * this.price;
  return this.totalPrice;
};

// Static method
orderSchema.statics.findByUserId = function (userId, options = {}) {
  const { limit = 10, skip = 0, status } = options;
  const query = { userId };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip);
};

// Static method - Thống kê
orderSchema.statics.getProductStats = function (productId) {
  return this.aggregate([
    { $match: { productId: mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalQuantity: { $sum: "$quantity" },
        totalRevenue: { $sum: "$totalPrice" },
      },
    },
  ]);
};
```

#### Middleware (Hooks)

```javascript
// Pre-save: Tự động tính totalPrice
orderSchema.pre("save", function () {
  if (this.quantity && this.price) {
    this.totalPrice = this.quantity * this.price;
  }
});

// Post-save: Log sau khi tạo
orderSchema.post("save", function (doc) {
  console.log(`[OrderModel] Đã lưu đơn hàng: ${doc._id}`);
});
```

#### Sample Document

```json
{
  "_id": "65c3d4e5f6789012345c",
  "userId": "65a1b2c3d4e5f6789012345a",
  "productId": "65b2c3d4e5f6789012345b",
  "quantity": 1,
  "price": 29990000,
  "totalPrice": 29990000,
  "status": "completed",
  "orderTime": "2026-03-13T10:00:05.123Z",
  "processedAt": "2026-03-13T10:00:06.456Z",
  "errorMessage": null,
  "createdAt": "2026-03-13T10:00:06.456Z",
  "updatedAt": "2026-03-13T10:00:06.456Z"
}
```

---

### 3.6. Relationships

| Quan hệ | From | To | Cardinality | Foreign Key |
|---------|------|-----|-------------|-------------|
| User → Order | users | orders | 1 : N | `orders.userId` |
| Product → Order | products | orders | 1 : N | `orders.productId` |

---

### 3.7. Redis Cache Structure

| Key Pattern | Example | Data Type | Mô tả | TTL |
|-------------|---------|-----------|-------|-----|
| `product:stock:{id}` | `product:stock:65b2c3d4...` | String | Số lượng tồn kho | 7 ngày |
| `product:info:{id}` | `product:info:65b2c3d4...` | JSON | Cache giờ G | 7 ngày |

**product:info:{id} format:**

```json
{
  "start": 1710320400000,
  "end": 1710327600000
}
```

---

## 4. API DOCUMENTATION

### 4.1. Tổng quan API

| Mục | Chi tiết |
|-----|----------|
| **Base URL** | `http://localhost:3000` |
| **API Prefix** | `/v1/api` |
| **Format** | JSON |
| **Authentication** | JWT Bearer Token |

### 4.2. Thống kê API

| Module | Prefix | Số API | Member |
|--------|--------|--------|--------|
| Health Check | `/` | 1 | M1 |
| Auth | `/v1/api/auth` | 3 | M4 |
| User | `/v1/api/users` | 3 | M4 |
| Product | `/v1/api/products` | 7 | M3 |
| Order | `/v1/api/order` | 4 | M1 |
| Admin | `/v1/api/admin` | 5 | M1 |
| Shop | `/v1/api/shop` | 3 | M1 |
| Seed | `/v1/api/seed` | 2 | M1 |
| Internal | `/internal` | 1 | M2 |
| **Tổng** | | **29** | |

### 4.3. HTTP Status Codes

| Code | Constant | Mô tả |
|------|----------|-------|
| `200` | OK | Thành công |
| `201` | CREATED | Tạo mới thành công |
| `400` | BAD_REQUEST | Request không hợp lệ |
| `401` | UNAUTHORIZED | Chưa xác thực |
| `403` | FORBIDDEN | Không có quyền |
| `404` | NOT_FOUND | Không tìm thấy |
| `409` | CONFLICT | Xung đột dữ liệu |
| `500` | INTERNAL_SERVER_ERROR | Lỗi server |

### 4.4. Response Format

**Success Response:**

```json
{
  "statusCode": 200,
  "message": "Success message",
  "data": { }
}
```

**Error Response:**

```json
{
  "statusCode": 400,
  "message": "Error message"
}
```

---

### 4.5. MEMBER 4 - AUTH API (3 API)

#### 4.5.1. POST /v1/api/auth/register

**Đăng ký tài khoản mới**

| Mục | Chi tiết |
|-----|----------|
| **Method** | POST |
| **URL** | `/v1/api/auth/register` |
| **Auth** | Public |

**Request Body:**

| Field | Type | Required | Validation | Mô tả |
|-------|------|----------|------------|-------|
| `email` | String | ✅ | Email format, lowercase | Email đăng nhập |
| `password` | String | ✅ | Min 8 chars, A-Z, a-z, 0-9, !@#$%^&* | Mật khẩu mạnh |
| `name` | String | ❌ | 2-100 chars | Tên hiển thị |

**Request Example:**

```json
{
  "email": "user@example.com",
  "password": "Password@123",
  "name": "Nguyen Van A"
}
```

**Response Success (201):**

```json
{
  "statusCode": 201,
  "message": "Đăng ký thành công",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6789012345a",
      "email": "user@example.com",
      "name": "Nguyen Van A"
    }
  }
}
```

**Response Errors:**

| Status | Message |
|--------|---------|
| 400 | `"email" is required` |
| 400 | `"password" must be at least 8 characters` |
| 409 | `Email đã được sử dụng` |

---

#### 4.5.2. POST /v1/api/auth/login

**Đăng nhập**

| Mục | Chi tiết |
|-----|----------|
| **Method** | POST |
| **URL** | `/v1/api/auth/login` |
| **Auth** | Public |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | String | ✅ | Email format |
| `password` | String | ✅ | Required |

**Request Example:**

```json
{
  "email": "user@example.com",
  "password": "Password@123"
}
```

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Đăng nhập thành công",
  "data": {
    "user": {
      "_id": "65a1b2c3d4e5f6789012345a",
      "email": "user@example.com",
      "name": "Nguyen Van A"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response Errors:**

| Status | Message |
|--------|---------|
| 401 | `Email hoặc mật khẩu không đúng` |

---

#### 4.5.3. GET /v1/api/auth/me

**Lấy thông tin user từ token**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/auth/me` |
| **Auth** | JWT Required |

**Request Header:**

```
Authorization: Bearer <accessToken>
```

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Lấy thông tin thành công",
  "data": {
    "_id": "65a1b2c3d4e5f6789012345a",
    "email": "user@example.com",
    "name": "Nguyen Van A",
    "address": "",
    "avatar": "",
    "usr_role": "USER",
    "status": "active"
  }
}
```

**Response Errors:**

| Status | Message |
|--------|---------|
| 401 | `Unauthorized - No token provided` |
| 401 | `Unauthorized - Invalid token` |
| 401 | `Unauthorized - Token expired` |

---

### 4.6. MEMBER 4 - USER API (3 API)

#### 4.6.1. GET /v1/api/users/me

**Lấy profile user**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/users/me` |
| **Auth** | JWT Required |

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Lấy thông tin thành công",
  "data": {
    "_id": "65a1b2c3d4e5f6789012345a",
    "email": "user@example.com",
    "name": "Nguyen Van A",
    "address": "123 Nguyen Trai, Q1",
    "avatar": "",
    "usr_role": "USER",
    "status": "active"
  }
}
```

---

#### 4.6.2. PUT /v1/api/users/me

**Cập nhật profile**

| Mục | Chi tiết |
|-----|----------|
| **Method** | PUT |
| **URL** | `/v1/api/users/me` |
| **Auth** | JWT Required |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | String | ❌ | 1-100 chars, allow empty |
| `address` | String | ❌ | Max 500 chars, allow empty |
| `avatar` | String | ❌ | URI format, allow empty |

**Request Example:**

```json
{
  "name": "Nguyen Van B",
  "address": "456 Le Loi, Q3, HCM"
}
```

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Cập nhật thông tin thành công",
  "data": {
    "_id": "65a1b2c3d4e5f6789012345a",
    "email": "user@example.com",
    "name": "Nguyen Van B",
    "address": "456 Le Loi, Q3, HCM"
  }
}
```

---

#### 4.6.3. POST /v1/api/users/change-password

**Đổi mật khẩu**

| Mục | Chi tiết |
|-----|----------|
| **Method** | POST |
| **URL** | `/v1/api/users/change-password` |
| **Auth** | JWT Required |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `oldPassword` | String | ✅ | Required |
| `newPassword` | String | ✅ | 6-100 chars |

**Request Example:**

```json
{
  "oldPassword": "Password@123",
  "newPassword": "NewPassword@456"
}
```

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Đổi mật khẩu thành công",
  "data": {}
}
```

**Response Errors:**

| Status | Message |
|--------|---------|
| 400 | `Mật khẩu cũ không đúng` |

---

### 4.7. MEMBER 3 - PRODUCT API (7 API)

#### 4.7.1. GET /v1/api/products

**Danh sách sản phẩm**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/products` |
| **Auth** | Public |

**Query Parameters:**

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| `page` | Number | 1 | Integer, min 1 |
| `pageSize` | Number | 20 | Integer, 1-100 |
| `sortBy` | String | `createdAt` | Enum values |
| `sortOrder` | String | `asc` | `asc` / `desc` |

**sortBy Allowed Values:**

- `productName`
- `productPrice`
- `productQuantity`
- `createdAt`
- `updatedAt`
- `productStartTime`

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Lấy danh sách sản phẩm thành công!",
  "data": {
    "products": [
      {
        "_id": "65b2c3d4e5f6789012345b",
        "productName": "iPhone 15 Pro Max",
        "productThumb": "https://example.com/iphone.jpg",
        "productDescription": "Điện thoại iPhone mới nhất",
        "productPrice": 29990000,
        "productQuantity": 100,
        "productStartTime": "2026-03-13T10:00:00.000Z",
        "productEndTime": "2026-03-13T12:00:00.000Z",
        "isPublished": true
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 50,
      "totalPages": 3
    }
  }
}
```

---

#### 4.7.2. GET /v1/api/products/search

**Tìm kiếm sản phẩm**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/products/search` |
| **Auth** | Public |

**Query Parameters:**

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| `keyword` | String | `''` | Max 200 chars |
| `price_min` | Number | 0 | Min 0 |
| `price_max` | Number | 0 | Min 0 (0 = không giới hạn) |
| `sort` | String | `newest` | `price_asc`, `price_desc`, `newest` |
| `page` | Number | 1 | Integer, min 1 |
| `pageSize` | Number | 20 | Integer, 1-100 |

**Request Example:**

```
GET /v1/api/products/search?keyword=iphone&price_min=10000000&price_max=50000000&sort=price_asc
```

**Response Errors:**

| Status | Message |
|--------|---------|
| 400 | `Giá tối thiểu không được lớn hơn giá tối đa` |

---

#### 4.7.3. GET /v1/api/products/stats

**Thống kê sản phẩm**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/products/stats` |
| **Auth** | Admin |

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Lấy thống kê thành công!",
  "data": {
    "total": 100,
    "published": 85,
    "outOfStock": 10,
    "activeFlashSale": 5,
    "upcomingFlashSale": 15,
    "endedFlashSale": 20
  }
}
```

---

#### 4.7.4. POST /v1/api/products

**Tạo sản phẩm mới**

| Mục | Chi tiết |
|-----|----------|
| **Method** | POST |
| **URL** | `/v1/api/products` |
| **Auth** | Admin |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `productName` | String | ✅ | 1-200 chars |
| `productThumb` | String | ✅ | Not empty |
| `productDescription` | String | ✅ | Max 2000 chars |
| `productPrice` | Number | ✅ | Min 0 |
| `productQuantity` | Number | ✅ | Integer, min 0 |
| `startTime` | Date | ✅ | ISO format |
| `endTime` | Date | ✅ | ISO format, > startTime |
| `isPublished` | Boolean | ❌ | Default: true |

**Request Example:**

```json
{
  "productName": "iPhone 15 Pro Max 256GB",
  "productThumb": "https://example.com/iphone.jpg",
  "productDescription": "Điện thoại iPhone mới nhất với chip A17 Pro",
  "productPrice": 29990000,
  "productQuantity": 100,
  "startTime": "2026-03-14T10:00:00Z",
  "endTime": "2026-03-14T12:00:00Z",
  "isPublished": true
}
```

**Response Success (201):**

```json
{
  "statusCode": 201,
  "message": "Tạo sản phẩm thành công!",
  "data": { ... }
}
```

**Response Errors:**

| Status | Message |
|--------|---------|
| 400 | `"productName" is required` |
| 400 | `Thời gian kết thúc phải lớn hơn thời gian bắt đầu` |
| 403 | `Forbidden` |

---

#### 4.7.5. PUT /v1/api/products/:id

**Cập nhật sản phẩm**

| Mục | Chi tiết |
|-----|----------|
| **Method** | PUT |
| **URL** | `/v1/api/products/:id` |
| **Auth** | Admin |

**Request Body (Partial Update):**

```json
{
  "productPrice": 27990000,
  "productQuantity": 150
}
```

**Response Errors:**

| Status | Message |
|--------|---------|
| 404 | `Sản phẩm không tồn tại!` |

---

#### 4.7.6. PUT /v1/api/products/:id/force-start

**Kích hoạt Flash Sale ngay**

| Mục | Chi tiết |
|-----|----------|
| **Method** | PUT |
| **URL** | `/v1/api/products/:id/force-start` |
| **Auth** | Admin |

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Kích hoạt Flash Sale thành công!",
  "data": {
    "productStartTime": "2026-03-13T09:30:00.000Z"
  }
}
```

---

#### 4.7.7. DELETE /v1/api/products/:id

**Xóa mềm sản phẩm**

| Mục | Chi tiết |
|-----|----------|
| **Method** | DELETE |
| **URL** | `/v1/api/products/:id` |
| **Auth** | Admin |

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Xóa sản phẩm thành công!",
  "data": {
    "is_deleted": true,
    "isPublished": false
  }
}
```

---

### 4.8. MEMBER 1 - ORDER API (4 API)

#### 4.8.1. POST /v1/api/order

**Đặt hàng Flash Sale (Core API)**

| Mục | Chi tiết |
|-----|----------|
| **Method** | POST |
| **URL** | `/v1/api/order` |
| **Auth** | JWT Required |

**Request Body:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `items` | Array | ✅ | Min 1 item |
| `items[].productId` | String | ✅ | Required |
| `items[].quantity` | Number | ✅ | Integer, min 1 |
| `note` | String | ❌ | Max 500 chars |

**Request Example:**

```json
{
  "items": [
    {
      "productId": "65b2c3d4e5f6789012345b",
      "quantity": 1
    }
  ],
  "note": "Giao hàng nhanh"
}
```

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Đặt hàng thành công!",
  "data": {
    "order": {
      "userId": "65a1b2c3d4e5f6789012345a",
      "productId": "65b2c3d4e5f6789012345b",
      "quantity": 1,
      "price": 29990000,
      "orderTime": "2026-03-13T10:00:05.123Z"
    }
  }
}
```

**Response Errors:**

| Status | Message |
|--------|---------|
| 400 | `Sản phẩm không tồn tại` |
| 400 | `Flash Sale chưa bắt đầu!` |
| 400 | `Flash Sale đã kết thúc!` |
| 400 | `Rất tiếc! Sản phẩm đã hết hàng.` |

---

#### 4.8.2. POST /v1/api/order/test

**API Test cho Load Testing**

| Mục | Chi tiết |
|-----|----------|
| **Method** | POST |
| **URL** | `/v1/api/order/test` |
| **Auth** | Public |

---

#### 4.8.3. GET /v1/api/order/me

**Lịch sử đơn hàng**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/order/me` |
| **Auth** | JWT Required |

**Query Parameters:**

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| `page` | Number | 1 | Integer, min 1 |
| `limit` | Number | 10 | Integer, 1-100 |

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Lấy danh sách đơn hàng thành công",
  "data": {
    "orders": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25
    }
  }
}
```

---

#### 4.8.4. GET /v1/api/order/me/:id

**Chi tiết đơn hàng**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/order/me/:id` |
| **Auth** | JWT Required |

**Response Errors:**

| Status | Message |
|--------|---------|
| 403 | `Bạn không có quyền xem đơn hàng này` |
| 404 | `Không tìm thấy đơn hàng` |

---

### 4.9. MEMBER 1 - ADMIN API (5 API)

#### 4.9.1. POST /v1/api/admin/flash-sale/activate

**Kích hoạt Flash Sale**

| Mục | Chi tiết |
|-----|----------|
| **Method** | POST |
| **URL** | `/v1/api/admin/flash-sale/activate` |
| **Auth** | Admin |

**Request Body:**

```json
{
  "productId": "65b2c3d4e5f6789012345b",
  "startTime": "2026-03-14T10:00:00Z",
  "endTime": "2026-03-14T12:00:00Z"
}
```

---

#### 4.9.2. POST /v1/api/admin/flash-sale/hot-activate

**Kích hoạt nóng Flash Sale**

| Mục | Chi tiết |
|-----|----------|
| **Method** | POST |
| **URL** | `/v1/api/admin/flash-sale/hot-activate` |
| **Auth** | Admin |

**Request Body:**

```json
{
  "productId": "65b2c3d4e5f6789012345b",
  "duration": 3600
}
```

---

#### 4.9.3. GET /v1/api/admin/users

**Danh sách user**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/admin/users` |
| **Auth** | Admin |

**Query Parameters:**

| Param | Type | Default |
|-------|------|---------|
| `page` | Number | 1 |
| `limit` | Number | 20 |

---

#### 4.9.4. PATCH /v1/api/admin/users/:id/ban

**Khóa tài khoản user**

| Mục | Chi tiết |
|-----|----------|
| **Method** | PATCH |
| **URL** | `/v1/api/admin/users/:id/ban` |
| **Auth** | Admin |

**Request Body:**

```json
{
  "status": "inactive"
}
```

---

#### 4.9.5. GET /v1/api/admin/health

**Health Check**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/admin/health` |
| **Auth** | Admin |

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Health check thành công!",
  "data": {
    "mongodb": "connected",
    "redis": "connected",
    "uptime": 86400
  }
}
```

---

### 4.10. MEMBER 1 - SHOP API (3 API)

#### 4.10.1. GET /v1/api/shop/orders

**Danh sách đơn hàng của shop**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/shop/orders` |
| **Auth** | Admin |

**Query Parameters:**

| Param | Type | Default | Validation |
|-------|------|---------|------------|
| `status` | String | - | `pending`, `confirmed`, `completed`, `success`, `failed`, `cancelled` |
| `page` | Number | 1 | Integer, min 1 |
| `pageSize` | Number | 20 | Integer, 1-100 |

---

#### 4.10.2. PATCH /v1/api/shop/orders/:id/status

**Cập nhật trạng thái đơn hàng**

| Mục | Chi tiết |
|-----|----------|
| **Method** | PATCH |
| **URL** | `/v1/api/shop/orders/:id/status` |
| **Auth** | Admin |

**Request Body:**

```json
{
  "status": "confirmed"
}
```

| Field | Validation |
|-------|------------|
| `status` | `confirmed` hoặc `cancelled` |

**Response Errors:**

| Status | Message |
|--------|---------|
| 400 | `Trạng thái chỉ được là confirmed hoặc cancelled` |

---

#### 4.10.3. GET /v1/api/shop/stats/revenue

**Báo cáo doanh thu 7 ngày**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/v1/api/shop/stats/revenue` |
| **Auth** | Admin |

**Response Success (200):**

```json
{
  "statusCode": 200,
  "message": "Lấy báo cáo doanh thu thành công!",
  "data": {
    "revenue": [
      { "date": "2026-03-13", "total": 150000000, "orderCount": 50 },
      { "date": "2026-03-12", "total": 120000000, "orderCount": 40 }
    ],
    "totalRevenue": 990000000,
    "totalOrders": 330
  }
}
```

---

### 4.11. MEMBER 1 - SEED API (2 API)

#### 4.11.1. POST /v1/api/seed/users

**Tạo users test**

| Mục | Chi tiết |
|-----|----------|
| **Method** | POST |
| **URL** | `/v1/api/seed/users` |
| **Auth** | Public (Dev only) |

**Request Body:**

```json
{
  "count": 1000
}
```

---

#### 4.11.2. DELETE /v1/api/seed/users

**Xóa test users**

| Mục | Chi tiết |
|-----|----------|
| **Method** | DELETE |
| **URL** | `/v1/api/seed/users` |
| **Auth** | Public (Dev only) |

---

### 4.12. MEMBER 2 - INTERNAL API (1 API)

#### 4.12.1. POST /internal/emit-system-error

**Worker gọi Main App emit socket**

| Mục | Chi tiết |
|-----|----------|
| **Method** | POST |
| **URL** | `/internal/emit-system-error` |
| **Auth** | Internal Secret |

**Request Header:**

```
X-Internal-Secret: flashsale-internal-dev
```

**Request Body:**

```json
{
  "message": "Hệ thống đang bảo trì"
}
```

**Response Success (200):**

```json
{
  "ok": true,
  "message": "Emitted"
}
```

---

### 4.13. HEALTH CHECK (1 API)

#### 4.13.1. GET /

**Server Health Check**

| Mục | Chi tiết |
|-----|----------|
| **Method** | GET |
| **URL** | `/` |
| **Auth** | Public |

**Response:**

```json
{
  "status": "success",
  "message": "Server FlashSale is running! 🚀"
}
```

---

### 4.14. Bảng tổng hợp tất cả Endpoints

| # | Method | Endpoint | Auth | Member |
|---|--------|----------|------|--------|
| 1 | GET | `/` | Public | M1 |
| 2 | POST | `/v1/api/auth/register` | Public | M4 |
| 3 | POST | `/v1/api/auth/login` | Public | M4 |
| 4 | GET | `/v1/api/auth/me` | JWT | M4 |
| 5 | GET | `/v1/api/users/me` | JWT | M4 |
| 6 | PUT | `/v1/api/users/me` | JWT | M4 |
| 7 | POST | `/v1/api/users/change-password` | JWT | M4 |
| 8 | GET | `/v1/api/products` | Public | M3 |
| 9 | GET | `/v1/api/products/search` | Public | M3 |
| 10 | GET | `/v1/api/products/stats` | Admin | M3 |
| 11 | POST | `/v1/api/products` | Admin | M3 |
| 12 | PUT | `/v1/api/products/:id` | Admin | M3 |
| 13 | PUT | `/v1/api/products/:id/force-start` | Admin | M3 |
| 14 | DELETE | `/v1/api/products/:id` | Admin | M3 |
| 15 | POST | `/v1/api/order` | JWT | M1 |
| 16 | POST | `/v1/api/order/test` | Public | M1 |
| 17 | GET | `/v1/api/order/me` | JWT | M1 |
| 18 | GET | `/v1/api/order/me/:id` | JWT | M1 |
| 19 | POST | `/v1/api/admin/flash-sale/activate` | Admin | M1 |
| 20 | POST | `/v1/api/admin/flash-sale/hot-activate` | Admin | M1 |
| 21 | GET | `/v1/api/admin/users` | Admin | M1 |
| 22 | PATCH | `/v1/api/admin/users/:id/ban` | Admin | M1 |
| 23 | GET | `/v1/api/admin/health` | Admin | M1 |
| 24 | GET | `/v1/api/shop/orders` | Admin | M1 |
| 25 | PATCH | `/v1/api/shop/orders/:id/status` | Admin | M1 |
| 26 | GET | `/v1/api/shop/stats/revenue` | Admin | M1 |
| 27 | POST | `/v1/api/seed/users` | Public | M1 |
| 28 | DELETE | `/v1/api/seed/users` | Public | M1 |
| 29 | POST | `/internal/emit-system-error` | Internal | M2 |

---

## 5. LUỒNG XỬ LÝ ĐẶT HÀNG

### 5.1. Sequence Diagram

```
┌──────┐    ┌──────────┐    ┌───────┐    ┌─────────┐    ┌──────────┐    ┌────────┐
│Client│    │ Express  │    │ Redis │    │RabbitMQ │    │  Worker  │    │MongoDB │
└──┬───┘    └────┬─────┘    └───┬───┘    └────┬────┘    └────┬─────┘    └───┬────┘
   │             │              │             │              │              │
   │ POST /order │              │             │              │              │
   │────────────>│              │             │              │              │
   │             │ 1. verifyToken             │              │              │
   │             │ 2. Get Price from MongoDB  │              │              │
   │             │ 3. Check Giờ G (Redis)     │              │              │
   │             │─────────────>│             │              │              │
   │             │ 4. Lua Script (trừ kho)    │              │              │
   │             │─────────────>│ DECRBY      │              │              │
   │             │ 5. sendToQueue             │              │              │
   │             │────────────────────────────>│              │              │
   │  200 OK     │              │             │              │              │
   │<────────────│              │             │              │              │
   │             │              │  6. consume │              │              │
   │             │              │<────────────│──────────────│              │
   │             │              │             │ 7. saveOrder │              │
   │             │              │             │──────────────────────────────>│
   │             │              │  8. ack     │              │              │
   │ Socket.IO   │              │             │              │              │
   │ update-stock│              │             │              │              │
   │<───────────────────────────────────────────────────────│              │
```

### 5.2. Chi tiết từng bước

| Bước | Thành phần | Hành động |
|------|------------|-----------|
| 1 | Middleware | Verify JWT token |
| 2 | Controller → MongoDB | Lấy giá sản phẩm |
| 3 | Service → Redis | Check Giờ G (start/end time) |
| 4 | Service → Redis | Lua Script atomic DECRBY |
| 5 | Controller → RabbitMQ | sendToQueue('order-queue') |
| 6 | Worker ← RabbitMQ | Consume message |
| 7 | Worker → MongoDB | Lưu order: status = COMPLETED |
| 8 | Worker → RabbitMQ | ACK message |
| 9 | Worker → Socket.IO | Emit 'update-stock' |

### 5.3. Redis Lua Script

```lua
local stock = redis.call('get', KEYS[1])
if stock == false then return 0 end
if tonumber(stock) >= tonumber(ARGV[1]) then
    redis.call('decrby', KEYS[1], ARGV[1])
    return 1
else 
    return 0
end
```

**Giải thích:**
- `KEYS[1]`: Key stock Redis (VD: `product:stock:65a1b2c3...`)
- `ARGV[1]`: Số lượng muốn mua
- Return `1`: Đặt hàng thành công
- Return `0`: Hết hàng

---

## 6. PHÂN CÔNG MEMBER

### 6.1. Bảng tổng hợp

|