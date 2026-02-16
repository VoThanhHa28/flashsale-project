🚀 BẢNG PHÂN CÔNG CHÍNH THỨC (FULL UI/UX & LOGIC)
Mục tiêu: M5 gánh toàn bộ Frontend. M3 & M4 chia nhau làm Backend API phục vụ M5.
👤 MEMBER 5 (FRONTEND BOSS) - "MẶT TIỀN"
Nhiệm vụ: Code UI cho cả User, Shop và Admin (Mock data trước nếu chưa có API).
. NHÓM USER (SAU KHI MUA HÀNG):
Trang Lịch sử Đơn hàng: (List danh sách đơn đã đặt).
Trang Chi tiết Đơn hàng: (Xem trạng thái vận chuyển, giá tiền).
Trang Hồ sơ Cá nhân (Profile): (Sửa tên, avatar, sổ địa chỉ nhận hàng).
Trang Tìm kiếm & Lọc: (Search keyword, Filter theo giá).
2. NHÓM SHOP OWNER (QUẢN LÝ):
Trang Quản lý Đơn hàng: (Table đơn hàng đổ về -> Nút Duyệt/Hủy).
Trang Báo cáo: (Biểu đồ doanh thu).
3. NHÓM SUPER ADMIN (QUẢN TRỊ):
Trang Quản lý User: (List user toàn sàn -> Nút Khóa tài khoản).
Trang System Health: (Giao diện check trạng thái Server Redis/Mongo).
 PHÂN CÔNG BACKEND (PHỤC VỤ UI MỚI)
Nguyên tắc: Code API trả về JSON chuẩn để M5 ghép vào giao diện.
👤 MEMBER 3 (BACKEND - SHOP & SEARCH)
Chịu trách nhiệm data cho: Tìm kiếm + Shop Owner.
1. API Tìm kiếm & Lọc (Cho màn hình Search):
GET /v1/api/product/search:
Query: keyword (tên SP), price_min, price_max, sort (giá tăng/giảm).
Logic: Dùng Mongo Regex hoặc Text Search.
2. API Quản lý Đơn hàng (Cho màn hình Shop Order):
GET /v1/api/shop/orders: Lấy danh sách đơn hàng của Shop mình.
PATCH /v1/api/shop/orders/:id/status:
Body: { status: 'confirmed' } hoặc { status: 'cancelled' }.
Logic: Update trạng thái đơn trong DB.
3. API Báo cáo (Cho màn hình Dashboard Shop):
GET /v1/api/shop/stats/revenue:
Logic: Aggregate MongoDB tính tổng tiền đơn hàng đã thành công trong 7 ngày qua.

👤 MEMBER 4 (BACKEND - USER & SYSTEM)
Chịu trách nhiệm data cho: Khách hàng cá nhân + Super Admin.
1. API Cá nhân (Cho màn hình Profile):
GET /v1/api/user/me: Lấy thông tin user đang login.
PUT /v1/api/user/me: Update thông tin (Tên, Avatar, Địa chỉ).
2. API Lịch sử mua hàng (Cho màn hình Order History):
GET /v1/api/order/me:
Logic: Tìm trong Collection Orders tất cả đơn có userId trùng với user đang login.
GET /v1/api/order/me/:id: Lấy chi tiết 1 đơn cụ thể.
3. API Quản trị (Cho màn hình Super Admin):
GET /v1/api/admin/users: List toàn bộ User (có phân trang).
PATCH /v1/api/admin/users/:id/ban:
Body: { status: 'inactive' }.
GET /v1/api/admin/health:
Logic: Ping connection tới Redis và Mongo. Trả về { redis: 'ok', mongo: 'ok' }.

👉 Lưu ý quan trọng: M3 và M4 phải thống nhất Format JSON trả về với M5 trước khi code (Ví dụ: tên trường là productName hay product_name) để tránh việc M5 ghép API bị lỗi undefined. Triển khai ngay! 🚀

