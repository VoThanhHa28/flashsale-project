# Merge feature/product into develop

## 📋 Mô tả
Gộp 2 chức năng **Hiển thị sản phẩm** và **Tạo sản phẩm** vào nhánh `feature/product` và merge vào `develop`.

## ✨ Các thay đổi chính

### 1. Chức năng Hiển thị sản phẩm (GET `/v1/api/products`)
- ✅ Lấy danh sách sản phẩm với pagination
- ✅ Hỗ trợ sorting theo các trường: `productName`, `productPrice`, `productQuantity`, `createdAt`, `updatedAt`
- ✅ Hỗ trợ sort order: `asc`, `desc`
- ✅ Response format chuẩn với metadata và pagination info
- ✅ Validation middleware cho query params

### 2. Chức năng Tạo sản phẩm (POST `/v1/api/products`)
- ✅ Tạo sản phẩm mới với đầy đủ thông tin
- ✅ Validation đầy đủ cho tất cả các trường
- ✅ Error handling cho các trường hợp lỗi
- ✅ Response format chuẩn

## 🔧 Các file đã thay đổi
- `src/routes/product.route.js` - Routes cho product API
- `src/controllers/product.controller.js` - Controllers cho getProducts và createProduct
- `src/middleware/validation.js` - Validation middleware cho GET và POST
- `src/models/product.model.js` - Product schema với validation
- `app.js` - Đăng ký product routes

## 🧪 Testing
- [ ] Test GET `/v1/api/products` với pagination
- [ ] Test GET `/v1/api/products` với sorting
- [ ] Test POST `/v1/api/products` với dữ liệu hợp lệ
- [ ] Test POST `/v1/api/products` với dữ liệu không hợp lệ
- [ ] Test error handling

## 📝 Checklist
- [x] Code đã được review
- [x] Không có conflict với develop
- [x] Đã test các chức năng
- [x] Code follow coding standards của project

## 🔗 Related Issues
- Merge từ `feature/create-product` và `feature/display_product` vào `feature/product`
