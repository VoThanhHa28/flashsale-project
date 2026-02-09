# Kết quả Tuần 1 – Flash Sale Client (Member 5)

Tóm tắt những gì đã hoàn thành trong tuần đầu.

---

## 1. Cấu trúc dự án & công nghệ

- **React** + **React Router** (SPA, không reload trang khi chuyển route).
- Cấu trúc thư mục: `src/pages`, `src/components`, `src/services`, `public/data`.
- Chạy: `npm install` → `npm start` → mở http://localhost:3000.

---

## 2. Điều hướng (Router)

- **`/`**, **`/home`** → Trang chủ.
- **`/login`** → Đăng nhập.
- **`/register`** → Đăng ký.
- **`/product/:id`** → Chi tiết sản phẩm (id = mã SP).
- Tất cả trang dùng chung **Layout** (header + footer).

---

## 3. Layout chung

- **TopPromoStrip:** Dải khuyến mãi phía trên (nhiều link).
- **Header:** Logo "Flash Sale", ô tìm kiếm (placeholder), menu: Trang chủ / Đăng nhập / Đăng ký **hoặc** Xin chào + Đăng xuất (khi đã đăng nhập).
- **Footer:** 4 cột (Về chúng tôi, Hỗ trợ, Liên hệ, Kết nối).
- Nội dung từng trang hiển thị giữa header và footer qua **Outlet**.

---

## 4. Trang đã làm

| Trang | Mô tả ngắn |
|-------|------------|
| **Home** | Sidebar trái (danh mục), carousel banner, 3 ô quà tặng, sidebar phải (chào mừng, ưu đãi, thu cũ), lưới "Sản phẩm nổi bật" – mỗi thẻ link tới `/product/:id`. |
| **Login** | Form email + mật khẩu, validate, gọi API đăng nhập (nếu có), lưu token + user, chuyển về trang chủ. |
| **Register** | Form họ tên + email + mật khẩu, validate, gọi API đăng ký (nếu có), chuyển sang trang đăng nhập. |
| **ProductDetail** | Breadcrumb, ảnh + thông tin (tên, giá, tồn kho, mô tả), chọn số lượng, nút **MUA NGAY** (gọi API đặt hàng), block "Sản phẩm liên quan" (4 thẻ). |

---

## 5. Layer API (`src/services/api.js`)

- **Base URL** từ biến môi trường `REACT_APP_API_URL` (khi có backend).
- **Token & user** lưu/đọc trong `localStorage` (getToken, setToken, getUser, setUser, clearAuth).
- **Chuẩn hóa response:** getPayload (metadata/data), getErrorMessage.
- **request():** fetch + tự gắn header `Authorization: Bearer <token>`.
- **Hàm đã dùng:** `login`, `register`, `getProducts`, `getProductsList`, `createOrder`.
- **Fallback:** Chưa cấu hình API thì dùng file `public/data/products.json` cho danh sách sản phẩm.

---

## 6. Data giả

- **`public/data/products.json`:** Cấu trúc giống API (code, metadata, product_id, product_name, product_price, product_thumb, product_description, product_quantity).
- Dùng cho Home và ProductDetail khi chưa bật backend.

---

## 7. Xác thực (Auth)

- Đăng nhập/Đăng ký thành công → lưu token + user vào `localStorage`.
- Layout đọc token/user để hiển thị Đăng nhập/Đăng ký **hoặc** Xin chào + Đăng xuất.
- Đăng xuất → gọi `clearAuth()`, xóa token và user.
- Trang chi tiết: MUA NGAY cần đăng nhập; gửi kèm token trong header khi gọi `createOrder`.

---

## 8. Giao diện & trải nghiệm

- **Màu chủ đạo:** Đỏ (#c00a27), nền trắng/xám.
- **Responsive:** Breakpoint 480, 640, 768, 1024, 1280, 1536px; sidebar ẩn trên mobile; lưới sản phẩm 1–6 cột theo màn hình; nút/form dễ bấm (44–48px).
- **Loading & lỗi:** Mỗi trang có trạng thái loading và hiển thị lỗi từ server (hoặc thông báo mặc định).

---

## 9. Sẵn sàng kết nối backend

- Chỉ cần tạo `.env` với `REACT_APP_API_URL=http://localhost:<port>` (xem `.env.example`).
- Contract API đã dùng: POST login/register, GET product, POST order (kèm Bearer token).
- Chi tiết hợp đồng API và CORS ghi trong **README.md**.

---

## Tóm tắt một dòng

**Tuần 1:** Hoàn thành giao diện React cho Trang chủ, Đăng nhập, Đăng ký, Danh sách sản phẩm, Chi tiết sản phẩm + MUA NGAY; có layer API, data giả, auth qua localStorage và responsive; sẵn sàng nối backend chỉ bằng cấu hình `.env`.
