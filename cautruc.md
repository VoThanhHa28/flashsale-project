# THÊM REPOSITORY VÀ TÁCH SERVICE

> **QUY ĐỊNH CẤU TRÚC CODE (REPOSITORY PATTERN)**
> 
> 
> Để code sạch, dễ bảo trì và tái sử dụng, yêu cầu anh em **KHÔNG gọi Model trực tiếp trong Service**. Phải tách lớp Repository ra.
> 
> **Cấu trúc chuẩn:**`Controller` -> gọi -> `Service` -> gọi -> `Repository` -> gọi -> `Model (DB)`
> 
> **1. Ví dụ File Repo (`src/repositories/user.repo.js`):**
> Chỉ chứa lệnh DB, không chứa logic nghiệp vụ.
> 
> `const User = require('../models/user.model');`
> 

> const findByEmail = async (email) => {
return await User.findOne({ email }).lean();
};
> 

> const createUser = async ({ name, email, password }) => {
return await User.create({ name, email, password });
};
> 

> module.exports = { findByEmail, createUser };
> 
> 
> 
> `**2. Ví dụ File Service (`src/services/auth.service.js`):**
> Chỉ gọi Repo, không import Model.`
> 

> JavaScript
> 
> 
> `const UserRepo = require('../repositories/user.repo'); // <--- Gọi Repo`
> 

> class AuthService {
static async register({ email, password, name }) {
// Gọi hàm từ Repo
const holderUser = await UserRepo.findByEmail(email);
if (holderUser) throw new ConflictRequestError('Email đã tồn tại');
// ... logic tiếp theo
}
}
> 
> 
> 
> `👉 **Áp dụng:**`
> 

> • **M3 (Product):** Tạo `product.repo.js` (chứa các hàm `findAllDrafts`, `publishProduct`, `searchProduct`...).
• **M4 (Auth/User):** Tạo `user.repo.js` (chứa `findById`, `findByEmail`...).
• **M2 (Order):** Tạo `order.repo.js` (chứa `createOrder`, `findOrderByUser`...).
>