# THÔNG TIN UPDATE QUAN TRỌNG NGÀY 2/12

### 📢 THÔNG BÁO: CẬP NHẬT KIẾN TRÚC CORE (BẮT BUỘC ĐỌC)

**Gửi:** Toàn thể anh em (M2, M3, M4, M5).
**Từ:** (M1).

Để đảm bảo project đạt chuẩn Senior và Scale tốt, mình đã refactor lại Core hệ thống. Từ giờ, anh em code tính năng mới phải tuân thủ nghiêm ngặt quy trình **4-STEP** sau đây.

### 🚫 NHỮNG ĐIỀU CẤM KỴ (Tuyệt đối không làm nữa)

1. **KHÔNG dùng `try-catch` trong Controller:** Đã có `asyncHandler` lo.
2. **KHÔNG dùng `res.status(200).json(...)` thủ công:** Dùng class `OK` hoặc `CREATED`.
3. **KHÔNG hardcode string:** Tất cả thông báo, status, magic number phải đưa vào `src/constants`.
4. **KHÔNG viết logic trong Controller:** Controller chỉ nhận request và trả response. Logic ném hết sang `Service`.

---

### 🛠 QUY TRÌNH CODE 1 TÍNH NĂNG MỚI (VÍ DỤ: ORDER)

Khi anh em làm module mới (ví dụ Order, Auth...), hãy tạo file theo thứ tự này:

### **Bước 1: Khai báo Constants**

Tạo file `src/constants/order.constant.js` (hoặc viết vào file tương ứng).

JavaScript

`module.exports = {
  ORDER_MESSAGE: {
    SUCCESS: 'Đặt hàng thành công',
    FAIL: 'Thất bại',
  }
};`

*(Nhớ export ra ở `src/constants/index.js`)*

### **Bước 2: Viết Validation (Joi)**

Tạo file `src/validations/order.validation.js`. Định nghĩa schema cho `body`, `query` hoặc `params`.

### **Bước 3: Viết Service (Logic nằm ở đây)**

Tạo file `src/services/order.service.js`.

- Ném lỗi dùng: `throw new BadRequestError(...)`.
- Trả về data thuần (Object/Array).

### **Bước 4: Viết Controller (Dùng khuôn mẫu này)**

Tạo file `src/controllers/order.controller.js`.

JavaScript

`const { OK } = require('../core/success.response');
const asyncHandler = require('../utils/asyncHandler');
const OrderService = require('../services/order.service');
const CONST = require('../constants');

class OrderController {
  // Bọc bằng asyncHandler
  static create = asyncHandler(async (req, res) => {
    // Gọi Service
    const result = await OrderService.create(req.body);
    
    // Trả về bằng Class chuẩn
    new OK({
      message: CONST.ORDER.MESSAGE.SUCCESS,
      data: result
    }).send(res);
  });
}`

### **Bước 5: Khai báo Route**

Tạo file `src/routes/order.route.js`.

JavaScript

`router.post('/', 
    validate(orderValidation.create), // Gắn validate vào
    OrderController.create
);`

---

### 🧩 CẤU TRÚC FILE CHUNG (Đã có sẵn, anh em chỉ việc import dùng)

1. **Xử lý lỗi:** `const { BadRequestError, NotFoundError... } = require('../core/error.response');`
2. **Trả về thành công:** `const { OK, CREATED } = require('../core/success.response');`
3. **Bao bọc async:** `const asyncHandler = require('../utils/asyncHandler');`
4. **Middleware Validate:** `const validate = require('../middlewares/validate.middleware');`

---

### ⚠️ HÀNH ĐỘNG NGAY

- Anh em **Pull code nhánh `develop`** về ngay lập tức để lấy Core mới.
- Ai đang code dở Controller cũ thì sửa lại theo mẫu trên trước khi tạo Pull Request.
- **M5 (Frontend):** API giờ sẽ luôn trả về format cố định:JSON
    
    `{
        "statusCode": 200,
        "message": "...",
        "data": { ... }
    }`
    
    Chú ý update lại cách hứng data.