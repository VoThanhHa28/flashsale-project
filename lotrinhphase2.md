# Lộ trình Phase 2 – Member 5 (Frontend Core)

Tài liệu này tóm tắt nhiệm vụ toàn team và lộ trình chi tiết cho Member 5 (chỉ làm trong thư mục `client`).

---

## 1. Tóm tắt nhiệm vụ mọi thành viên

| Member | Vai trò | Backend | Frontend | Ghi chú |
|--------|--------|---------|----------|--------|
| **M1** | Leader | Đã xong Core, Docker, Redis | — | Review, merge, xử lý conflict. |
| **M2** | Worker & Performance | Worker (RabbitMQ → MongoDB), **Socket.io** (emit `update-stock` khi lưu đơn thành công), K6 load test | — | **M2 ↔ M5:** thống nhất tên event socket (vd: `stock-updated` / `update-stock`) để M5 lắng nghe. |
| **M3** | Product & Admin | API Admin Stats, Update Product (+ sync Redis), Reset Stock | Admin Dashboard, bảng sản phẩm, biểu đồ thống kê | **M3 ↔ M5:** M3 gửi format JSON sản phẩm → M5 hiển thị lên Home. |
| **M4** | Auth & User | GET/PUT `/me`, POST `/change-password`, POST `/seed/users` (1000 user cho M2 test) | Login, Register, User Profile, Change Password | M4 làm auth + UI user; M5 không đụng phần này. |
| **M5** | Frontend Core | **Không** | Landing, Product Detail, Socket client, Countdown, Order flow, Connection status, trạng thái nút Mua | Chỉ code trong `client`. |

---

## 2. M5 cần gì từ ai (Dependencies)

- **Từ M2:** Socket.io đã được tích hợp ở backend; **tên event** khi Worker lưu đơn xong (vd: `update-stock` hoặc `stock-updated`) và **payload** (vd: `{ productId, newStock }`) để M5 cập nhật số lượng real-time.
- **Từ M3:** **Endpoint danh sách sản phẩm** (Landing): URL + method (vd: `GET /v1/api/products`). **Format JSON 1 sản phẩm** (id, tên, giá, ảnh, số lượng, …) để M5 render Home và Product Detail thống nhất.
- **Từ M4:** Không bắt buộc cho luồng “mua hàng” thuần túy, nhưng **đặt hàng** thường cần đăng nhập → M5 cần biết API login/register và cách gửi token (M4 đã làm UI Login/Register).

---

## 3. Lộ trình Phase 2 cho Member 5

Thứ tự dưới đây vừa tận dụng được việc làm song song với M2/M3, vừa không bị block khi API/Socket chưa sẵn (dùng mock/fallback).

---

### Bước 0: Chuẩn bị (làm ngay)

- Pull nhánh `develop`, chạy `docker-compose up` (theo README).
- Trong `client`: cấu trúc lại/tách file cho rõ (services, hooks, components) theo chuẩn “1 file 1 nhiệm vụ, dễ bảo trì”.
- **Hỏi M3:** URL + format JSON list product và 1 product (hoặc dùng tạm API/format hiện có nếu M3 chưa gửi).
- **Hỏi M2:** Tên event socket + format payload khi cập nhật kho (vd: `update-stock`, `{ productId, quantity }`).

---

### Bước 1: Landing Page (ưu tiên cao, ít phụ thuộc)

- **Banner:** Giữ/refactor component Banner hiện tại cho phù hợp Flash Sale (có thể thêm countdown “Sắp mở bán” nếu có giờ G chung).
- **List sản phẩm:**
  - Gọi API list product của M3 (khi có) hoặc fallback API/JSON hiện tại.
  - Map đúng format (productId, name, price, thumb, quantity…) từ JSON M3.
  - UI: grid thẻ sản phẩm, giá, badge “Sắp hết”/“Còn X” nếu có.
- **Chuẩn hóa:** Một service/hook `useProducts()` hoặc `productService` dùng chung cho Home và Product Detail.

*Có thể làm song song với M3; chỉ cần thống nhất format JSON.*

---

### Bước 2: Product Detail (ảnh, giá, countdown, nút Mua)

- **Hiển thị:** Ảnh, tên, giá, mô tả, **số lượng còn lại** (từ API hoặc từ state sau khi nhận socket).
- **Countdown Timer:**
  - Cần nguồn “giờ G” (từ API M3 hoặc config): ví dụ `flashSaleStartAt`, `flashSaleEndAt`.
  - Component countdown: đếm ngược tới giờ mở bán hoặc hết hạn.
  - **Trước giờ G:** Nút “Mua Ngay” **disable, màu xám** (theo README).
- **Nút Mua:**
  - **Hết hàng (quantity ≤ 0):** Disable + chữ **“Sold Out”**.
  - **Đang gửi đơn (trong hàng chờ):** Disable + **loading spinner**.
  - Còn hàng + sau giờ G: enable, bấm gọi API đặt hàng (API Order hiện có hoặc do M2/M3 quy định).

*Có thể làm trước khi Socket sẵn: số lượng lấy từ API, chưa real-time.*

---

### Bước 3: Socket client & Connection status

- **Cài Socket.io-client** trong `client`.
- **Tạo module socket** (vd: `src/services/socket.js` hoặc `src/contexts/SocketContext.js`):
  - Kết nối tới server Socket do M2 cung cấp (URL/port).
  - Lắng nghe event đã thống nhất với M2 (vd: `update-stock`).
  - Cập nhật state (context/store) theo `productId` + số lượng mới.
- **Connection status (bắt buộc theo README):**
  - Khi mất kết nối / đang reconnect: hiện **icon đỏ + text “Đang kết nối lại...”** (Reconnecting) ở header hoặc banner nhỏ, không để user tưởng server sập.
- **Product Detail (và có thể cả Listing):** Dùng state đã được socket cập nhật để hiển thị số lượng real-time (số tự “nhảy” khi có event).

*Phụ thuộc M2: URL Socket, tên event, format payload. Có thể mock event trước khi M2 xong.*

---

### Bước 4: Order flow (Mua Ngay → Loading → Thành công/Thất bại)

- **Bấm “Mua Ngay”:**
  - Kiểm tra đăng nhập (token từ M4); chưa đăng nhập thì redirect Login hoặc bật modal.
  - Gọi API đặt hàng (body theo backend: productId, quantity, price nếu cần).
  - Khi gửi request: chuyển sang trạng thái “đang chờ” (loading/queue).
- **Màn hình Loading/Queue:**
  - Full màn hoặc overlay: “Đơn hàng đang được xử lý…”, spinner, không cho bấm Mua thêm.
- **Màn hình Kết quả:**
  - **Thành công:** Thông báo rõ, có thể nút “Về trang chủ” / “Xem đơn hàng”.
  - **Thất bại:** Hiện message lỗi (hết hàng, lỗi mạng, …), nút “Thử lại” hoặc “Quay lại”.

*Phụ thuộc API Order (đã có từ Phase 1) và có thể cần M4 cho luồng login khi chưa có token.*

---

### Bước 5: Tinh chỉnh UI/UX & tích hợp cuối

- Đồng bộ toàn bộ trạng thái nút Mua (trước G, hết hàng, đang queue, lỗi).
- Đảm bảo Connection status luôn rõ ràng (icon + text Reconnecting).
- Kiểm tra responsive, accessibility (focus, aria), và chuẩn “Flash Sale” (cảm giác gấp, số lượng có hạn, đếm ngược).
- Dọn code: tách component/hook/service rõ ràng, dễ cho người khác gọi và mở rộng.

---

## 4. Timeline gợi ý (theo tuần)

| Tuần | Việc M5 | Phối hợp |
|------|--------|----------|
| **1** | Bước 0 + Bước 1 (Landing: banner, list sản phẩm, gọi API M3 / fallback) | Xin M3 format JSON product; có thể xin M2 tên event socket. |
| **2** | Bước 2 (Product Detail: ảnh, giá, countdown, nút Mua với 3 trạng thái disable) | Confirm với M3 giờ G / endpoint chi tiết sản phẩm nếu có. |
| **3** | Bước 3 (Socket client, Connection status, cập nhật số lượng real-time) | M2 báo URL + event name; test với M2 khi Worker + Socket đã chạy. |
| **4** | Bước 4 (Order flow: Loading/Queue, Thành công/Thất bại) + Bước 5 (chỉnh UI/UX, dọn code) | Test E2E với backend + Socket; chỉnh theo feedback. |

---

## 5. Checklist nhanh cho M5

- [ ] Pull `develop`, chạy Docker.
- [ ] Cấu trúc lại `client`: tách file, service, hook rõ ràng.
- [ ] Hỏi M3: API + format JSON sản phẩm.
- [ ] Hỏi M2: Tên event socket + format payload update-stock.
- [ ] Landing: Banner + list sản phẩm (API M3).
- [ ] Product Detail: ảnh, giá, countdown, nút Mua (disable trước G / Sold Out / Loading).
- [ ] Socket client: kết nối, lắng nghe event, cập nhật số lượng.
- [ ] Connection status: icon đỏ + “Đang kết nối lại...” khi mất kết nối.
- [ ] Order flow: Mua Ngay → Loading/Queue → Thành công/Thất bại.
- [ ] Chỉnh UI/UX Flash Sale, dọn code, tạo PR.
