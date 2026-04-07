# Flash Sale – Client (React)

Giao diện Member 5: Login, Register, Danh sách sản phẩm, Chi tiết sản phẩm + MUA NGAY.

---

## Chạy

```bash
npm install
npm start
```

Mở http://localhost:3000.

---

## Thay đổi đã làm

- **Router:** `/`, `/login`, `/register`, `/product/:id` (React Router).
- **Layout:** Header chung (Trang chủ, Đăng nhập/Đăng ký hoặc Xin chào + Đăng xuất).
- **Trang:** Login, Register, Home (danh sách SP), ProductDetail (chi tiết + số lượng + MUA NGAY).
- **Data giả:** `public/data/products.json` (cấu trúc trùng API: `code`, `metadata`, `product_id`, `product_name`, `product_price`, `product_thumb`, ...).
- **Layer API:** `src/services/api.js` – base URL, token, `getPayload`/`getErrorMessage`, `request()`, `login`, `register`, `getProducts`/`getProductsList`, `createOrder`.
- **Auth:** Token + user lưu `localStorage`; Layout đọc để hiện/ẩn Đăng nhập, Đăng xuất.
- **Responsive:** Form, grid, nút 44–48px; xử lý lỗi/loading trên từng trang.

---

## Kết nối backend – cần lưu ý

### 1. Cấu hình

- Trong thư mục `client/` tạo file **`.env`** (xem `.env.example`):
  ```env
  REACT_APP_API_URL=http://localhost:3000
  ```
- Đổi port nếu backend chạy port khác (vd: 30000). Sau khi sửa `.env` cần chạy lại `npm start`.

### 2. Hợp đồng API (đã dùng trong code)

| Chức năng   | Method | URL                        | Body / Header |
|------------|--------|----------------------------|----------------|
| Đăng ký    | POST   | `/v1/api/auth/register`    | `{ email, password, name }` |
| Đăng nhập  | POST   | `/v1/api/auth/login`      | `{ email, password }` |
| Danh sách SP | GET  | `/v1/api/product`         | — |
| Đặt hàng   | POST   | `/v1/api/order`           | Body: `{ productId, quantity }`, Header: `Authorization: Bearer <token>` |

### 3. Response backend cần trả

- **Thành công:** Có thể dùng `metadata` hoặc `data` chứa dữ liệu; code đã đọc cả hai qua `getPayload()`.
- **Login:** Trả thêm `metadata.tokens.accessToken` (hoặc `metadata.accessToken`) để client lưu token.
- **Lỗi:** Trả `status: "error"` và `message` (hoặc HTTP 4xx/5xx + body có `message`); client hiển thị `message` cho user.

### 4. Chỗ đã sẵn sàng nối API

- **Login / Register:** Gọi `api.login()` / `api.register()` khi `REACT_APP_API_URL` có giá trị; lưu token + user; hiển thị lỗi từ server.
- **Home:** Dùng `api.getProductsList()` – ưu tiên GET `/v1/api/product`, không có hoặc lỗi thì fallback `public/data/products.json`.
- **ProductDetail:** Lấy sản phẩm từ cùng nguồn với Home; MUA NGAY gọi `api.createOrder(productId, quantity)` với token trong header; hiển thị lỗi/thành công tại chỗ.
- **Layout:** Đọc `api.getToken()` / `api.getUser()`; Đăng xuất gọi `api.clearAuth()`.

### 5. CORS

- Backend cần bật CORS cho origin của client (vd `http://localhost:3000` khi chạy dev).

---

Chỉ cần đặt `REACT_APP_API_URL` trong `.env` và đảm bảo backend đúng contract trên là có thể kết nối, không cần sửa logic từng trang.

---

## Kiểm tra backend trước khi hoàn thành feature

**Quy tắc:** Trước khi coi một feature là xong, cần kiểm tra lại backend xem có đang chạy và trả đúng API không.

### Checklist nhanh

1. **Backend đang chạy**  
   Server (vd. port 3001) phải chạy; nếu không, client sẽ fallback sang `public/data/products.json` (và có thể không log lỗi mạng).

2. **Gọi đúng endpoint**  
   - `GET /v1/api/products` → trả danh sách sản phẩm (hoặc 304 Not Modified nếu dùng cache).  
   - Các feature dùng auth/order cần kiểm tra thêm `POST /v1/api/auth/login`, `POST /v1/api/order`, v.v.

3. **Kiểm tra bằng script (tùy chọn)**  
   Trong thư mục `client/` chạy:
   ```bash
   npm run check:backend
   ```
   Script sẽ gọi `GET {REACT_APP_API_URL}/v1/api/products` và in kết quả (OK / lỗi). Cần có `.env` với `REACT_APP_API_URL` (vd. `http://localhost:3000`).
