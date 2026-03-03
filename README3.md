YÊU CẦU QUAN TRỌNG: PHẢI CODE CHUẨN CHIA FILE, DỄ ĐỌC, BẢO TRÌ (ĐỌC FILE UPDATE TRONG NOTION ĐỂ HIỂU LÀ NÊN LÀM GÌ), TÔI CODE 1 FILE AE DÙNG CHUNG HẾT, AI CODE CŨNG GỌI ĐC RẤT DỄ MỞ RỘNG VÀ LÀM VIỆC, NÊN AE CODE CÁI NÀO CŨNG CHÚ Ý NÊN LÀM NHƯ VẬY.

TA CODE HỆ THỐNG FLASHSALE CHỨ KO PHẢI BÁN HÀNG NHƯ (TGDĐ) BÌNH THƯỜNG, MEMBER LÀM FE CẦN CHÚ Ý UI NHA.

LÀM UI/UX CHO THẬT TỐT(HỎI CHAT ĐỂ RÕ HƠN) CÁI NÀY


—---------------------------------------------------------------------

PHẦN BỔ SUNG ĐƯỢC GIAO VÀO NGÀY 13/2 (CÓ LOGIC NGHIỆP VỤ VỀ HỆ THỐNG) 
📢 THÔNG BÁO: BỔ SUNG NGHIỆP VỤ FLASH SALE (PHÂN QUYỀN & GIỜ G)
Để đồ án đúng chất Flash Sale (chặn mua trước giờ, Admin kích hoạt nóng), anh em bổ sung ngay các task sau vào phần việc của mình:

1. CẬP NHẬT FILE CONSTANTS CHUNG (LEADER ĐÃ PUSH)
Ai làm: Cả team pull về dùng. File: src/constants/index.js (hoặc access.constants.js / product.constants.js).

JavaScript

module.exports = {
  // ... (giữ cũ)
  
  // 👉 THÊM MỚI: Phân quyền
  ROLE: {
    ADMIN: 'SHOP_ADMIN',  // Chủ shop (Quyền to nhất)
    USER: 'USER',         // Khách hàng
  },

  // 👉 THÊM MỚI: Trạng thái hiển thị
  PRODUCT: {
    STATUS: {
      DRAFT: 'draft',       // Nháp (Lưu tạm)
      PUBLISHED: 'published' // Đã mở bán
    },
    // ... cache ttl cũ
  }
};
👤 MEMBER 4 (AUTH & USER) - "Người gác cổng"
Nhiệm vụ Backend:

Sửa src/models/user.model.js: Thêm field phân quyền.

JavaScript

usr_role: { 
    type: String, 
    enum: ['USER', 'SHOP_ADMIN'], 
    default: 'USER' 
}
Tạo Middleware src/middlewares/rbac.js:

Logic: Check req.user.usr_role. Nếu khác SHOP_ADMIN -> Trả lỗi 403 Forbidden.

Mục đích: Dùng để bảo vệ các API của Admin (Reset kho, Force Start).

Tạo 1 User Admin: Vào MongoDB Compass, sửa tay 1 user bất kỳ thành usr_role: "SHOP_ADMIN" để team dùng test.

👤 MEMBER 3 (PRODUCT & ADMIN) - "Chủ Shop"
Nhiệm vụ Backend:

Sửa src/models/product.model.js: Thêm khung giờ vàng.

JavaScript

product_start_time: { type: Date, required: true }, // Giờ bắt đầu
product_end_time: { type: Date, required: true },   // Giờ kết thúc
is_published: { type: Boolean, default: true },     // Ẩn/Hiện
Update API Tạo/Sửa Sản phẩm:

Cho phép nhận thêm product_start_time và product_end_time từ Body request.

Lưu ý: Validate start_time < end_time.

Nhiệm vụ Frontend (Admin Dashboard):

Form Thêm/Sửa SP: Thêm 2 ô chọn ngày giờ (DateTime Picker) cho start_time và end_time.

Làm nút "KÍCH HOẠT NGAY" (Force Start):

Logic: Khi bấm nút này -> Gọi API Update Product -> Gửi product_start_time = new Date() (Giờ hiện tại).

Mục đích: Để Demo cho Hội đồng xem, bấm là chạy luôn không cần chờ.

👤 MEMBER 5 (FRONTEND USER) - "Đồng hồ đếm ngược"
Nhiệm vụ Frontend (Trang Chi tiết SP):

Logic hiển thị nút MUA:

Lấy now (giờ hiện tại) so sánh với product.start_time.

Nếu now < start_time: Disable nút Mua + Hiện đồng hồ đếm ngược (Countdown).

Nếu now > end_time: Disable nút Mua + Hiện chữ "Đã kết thúc".

Nếu trong khung giờ: Enable nút Mua (Sáng màu lên).

👤 MEMBER 2 (WORKER & SOCKET) - "Loa Phát Thanh"
Nhiệm vụ Real-time:

Socket Event:

Phối hợp với M3. Khi M3 bấm nút "KÍCH HOẠT NGAY" (API update thành công) -> Server bắn socket event flash-sale-start xuống Client.

Mục đích: Để M5 nhận sự kiện này và tự động reload lại nút MUA (User không cần F5 trang).

👤 MEMBER 1 (LEADER) - "Trọng tài"
Nhiệm vụ (Tui tự làm phần này - Đã xong logic):

Đã thêm logic check giờ G trong InventoryService (Redis).

Nếu User cố tình hack gọi API mua trước giờ G -> Backend sẽ trả lỗi 400 Bad Request







—---------------------------------------------------------------------------------------
🚀 KẾ HOẠCH TRIỂN KHAI PHASE 2: PHÂN TÁN LỰC LƯỢNG (DECENTRALIZED)
Tình trạng:

Leader (M1): Đã hoàn tất Core, Docker, Redis Sync. Code đã nằm trên nhánh develop.

Yêu cầu: Các member tự chủ động liên lạc phối hợp API, không chờ Leader nhắc việc.

1. PHÂN CÔNG NHIỆM VỤ (ĐÃ CẮT GIẢM UI CHO M5)
👤 MEMBER 2 (WORKER & PERFORMANCE) - "Trùm Xử Lý"
Nhiệm vụ nặng về Logic & Real-time.

Worker (Backend):

Hoàn thiện src/workers/order.worker.js.

Nhận message từ RabbitMQ -> Lưu đơn hàng vào MongoDB.

Data: Lấy mẫu JSON từ Leader đã gửi.

Socket.io (Backend):

Cài thư viện socket.io.

Khi Worker lưu đơn thành công -> Bắn sự kiện update-stock xuống Client để trừ số lượng real-time.

Load Test (Testing):

Viết script K6 giả lập 1000 request bắn vào API Order.

@Member2: Khi làm Worker, format tin nhắn JSON từ RabbitMQ (order-queue) gửi sang sẽ như này nhé. dựa vào đây để tạo đơn hàng:
JSON
{
  "userId": "65b2...",
  "productId": "65b3...",
  "quantity": 1,
  "price": 20000000,
  "orderTime": "2024-02-12T..."
}


👤 MEMBER 4 (AUTH & USER FULL-STACK) - "Quản lý User A-Z"
Nhiệm vụ: Backend Auth + Gánh phần UI liên quan đến User.

Backend:

API GET /me, PUT /me (Update Profile), POST /change-password.

Seed Data: Viết API POST /seed/users tạo nhanh 1000 user (pass: 123456) để M2 dùng test tải.

Frontend (Gánh cho M5):

Code màn hình Login / Register.

Code màn hình User Profile (Form sửa tên, địa chỉ).

Code màn hình Change Password.

👤 MEMBER 3 (PRODUCT & ADMIN FULL-STACK) - "Quản trị hệ thống"
Nhiệm vụ: Backend Product + Gánh phần UI Admin.

Backend:

API Admin Stats (Doanh thu).

API Update Product (Lưu ý: Gọi hàm InventoryService.updateStock sau khi sửa DB).

API Reset Stock (Set kho về 100 để demo).

Frontend (Gánh cho M5):

Code trang Admin Dashboard (Giao diện quản lý).

Code bảng Danh sách sản phẩm (Table view).

Code biểu đồ thống kê chi tiết và đẹp mắt.

👤 MEMBER 5 (FRONTEND CORE) - "Trải nghiệm mua hàng"
Nhiệm vụ: Chỉ tập trung vào luồng mua hàng phức tạp nhất.
QUAN TRỌNG: Trạng thái "Mất kết nối" (Connection Status):
Vì Flash Sale dùng Socket.io, nếu mạng user lag -> Phải hiện cái icon đỏ "Đang kết nối lại..." (Reconnecting). Nếu không user tưởng server sập.
Nút "Mua" bị Disable:
Trước giờ G: Disable (Xám màu).
Hết hàng: Disable (Ghi chữ "Sold Out").
Đang trong hàng chờ: Loading spinner.

Frontend:

Landing Page: Banner, List sản phẩm (Gọi API M3).

Product Detail:

Hiển thị ảnh, giá.

Socket Client: Lắng nghe sự kiện update-stock từ M2 để số lượng tự nhảy.

Countdown Timer.

Order Flow:

Xử lý nút "Mua Ngay".

Màn hình "Loading/Queue" (Chờ kết quả).

Màn hình "Thành công/Thất bại".

👤 MEMBER 1 (LEADER) - "Reviewer"
Hỗ trợ Merge code.

Giải quyết conflict nếu có.

2. QUY TRÌNH PHỐI HỢP (GIAO TIẾP NGANG HÀNG)
Để không cần Leader đứng giữa, các bạn tuân thủ:

M4 (User) 🤝 M2 (Test):

M4 làm xong API Seed User -> Báo M2 chạy API đó để lấy 1000 user test K6.

M2 (Socket) 🤝 M5 (Frontend):

M2 quy ước tên sự kiện socket (ví dụ: stock-updated) -> Báo M5 để M5 code Frontend lắng nghe đúng tên đó.

M3 (Product) 🤝 M5 (Frontend):

M3 gửi format JSON sản phẩm -> M5 hiển thị lên Home.

3. ACTION NGAY
Bước 1: Cả team Pull code develop (đã có Docker + Core xịn của Leader).

Bước 2: Chạy docker-compose up.

Bước 3: Chia nhau code theo danh sách trên. Ai xong phần nào tự tạo Pull Request.








1. CÁC VAI TRÒ (ROLES) TRONG HỆ THỐNG
Chúng ta cần 2 role cơ bản, không cần phức tạp hóa:
🅰️ ADMIN (Shop Owner) - Người cầm trịch
Quyền hạn:
Tạo sản phẩm Flash Sale (Set giá gốc 20tr -> giá sale 10tr).
Set kho (Inventory): Ví dụ 100 cái.
Set giờ G (Time): Ví dụ: Mở bán lúc 10:00, kết thúc 10:30.
Quyền "Thần thánh" (Cho demo): Nút "Bắt đầu ngay" (Force Start) - để khi thầy hỏi thì bấm phát chạy luôn, không cần chờ đúng giờ.
Reset Kho: Để demo lại từ đầu.
🅱️ USER (Customer) - Người săn sale
Quyền hạn:
Xem sản phẩm.
Chờ đếm ngược.
Đặt mua (Giới hạn: Mỗi người chỉ được mua 1 cái để tránh đầu cơ).

2. QUY TRÌNH VẬN HÀNH (WORKFLOW) - TỪ A ĐẾN Z
Đây là kịch bản chuẩn bạn cần gửi cho Team:
Giai đoạn 1: Thiết lập (Admin làm trước giờ G)
Admin đăng nhập trang Dashboard.
Tạo sản phẩm: "iPhone 15 Pro Max".
Set thông số quan trọng:
price: 1.000 (Giá tượng trưng).
stock: 100 (Số lượng trong kho Redis & DB).
startTime: 2026-02-14T09:00:00 (Ngày mai).
endTime: 2026-02-14T09:30:00.
Backend (M3 & M1): Khi lưu sản phẩm, Code phải:
Lưu vào MongoDB.
Đồng thời: Set key Redis product:xxx:stock = 100. (Quan trọng).
Giai đoạn 2: Chờ đợi (User vào xem trước giờ G)
User vào trang chi tiết sản phẩm.
Frontend (M5):
So sánh: CurrentTime < StartTime.
Hành động: Disable nút MUA. Hiện đồng hồ đếm ngược (Countdown).
UI: "Sắp mở bán lúc 9:00".
Giai đoạn 3: GIỜ G ĐIỂM (The Flash Sale)
Có 2 cách kích hoạt:
Cách 1 (Tự động): Đồng hồ điểm 9:00:00.
Cách 2 (Thủ công - Demo): Admin bấm nút "Start Now" -> Backend update startTime thành hiện tại -> Socket báo Frontend mở nút.
Diễn biến lúc này:
Frontend (M5): Nút MUA sáng lên (Enable).
User: Bấm MUA điên cuồng.
Backend (M1):
Check 1: Còn hàng không? (Redis > 0).
Check 2: Đang trong giờ mở bán không? (Now >= StartTime && Now <= EndTime).
Check 3: User này mua chưa? (Check Redis Set bought_users:productId - Advanced, nếu chưa kịp thì bỏ qua).
Xử lý:
Redis trừ tồn kho (Lua Script).
Đẩy đơn vào RabbitMQ.
Trả về: "Đang xử lý đơn hàng...".
Giai đoạn 4: Kết thúc (Hết hàng hoặc Hết giờ)
Hết hàng: Redis về 0.
API trả về lỗi: 400 Bad Request - Out of Stock.
Frontend nhận lỗi -> Disable nút Mua -> Hiện chữ "SOLD OUT".
Hết giờ: CurrentTime > EndTime.
API trả về lỗi: 400 Bad Request - Flash Sale Ended.
Frontend -> Disable nút Mua -> Hiện chữ "Đã kết thúc".




