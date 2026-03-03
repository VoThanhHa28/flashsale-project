YÊU CẦU THỐNG NHẤT
I. Cài đặt chung
BƯỚC 1: CÁC QUY ƯỚC KỸ THUẬT (CHỐT CỨNG)
Node.js Version: Thống nhất dùng Node.js 20 LTS “20.20” (bản ổn định mới nhất).
Lý do: Tương thích tốt, hỗ trợ các thư viện mới nhất.
Yêu cầu: Mọi người kiểm tra bằng lệnh node -v. Nếu cũ hơn thì cài lại.
Cổng (Port) mặc định:
Server Backend (Express): 30000
MongoDB: 27017
Redis: 6379
RabbitMQ: 56722 (App connect) & 15672  (Web quản lý).
Prefix API: Tất cả API đều bắt đầu bằng /v1/api  (Ví dụ: v1/api/login thay vì /login).

BƯỚC 2: HỢP ĐỒNG API (API CONTRACT)

Chức năng
Method
URL
Body (Request)
Response (Success - 200/201)
Đăng ký
POST
/v1/api/auth/register
{ "email": "a@gmail.com", "password": "123", "name": "User A" }
{ "code": 201, "message": "Registered!", "metadata": { "user": {...} } }
Đăng nhập
POST
/v1/api/auth/login
{ "email": "a@gmail.com", "password": "123" }
{ "code": 200, "metadata": { "user": {...}, "tokens": { "accessToken": "ey..." } } }




Chức năng
Method
URL
Body (Request)
Response (Success - 200)
Lấy danh sách
GET
/v1/api/product
(Trống)
{ "code": 200, "metadata": [ { "product_id": 1, "product_name": "Iphone 15", "product_price": 20000, "product_thumb": "http://..." } ] }




Chức năng
Method
URL
Body (Request)
Response (Success - 200)
Đặt hàng (Mua)
POST
/v1/api/order
{ "productId": 1, "quantity": 1 } (Gửi kèm Header Authorization: Bearer Token)
{ "code": 200, "message": "Order is processing", "metadata": { "status": "pending" } }



II. Cấu trúc Project (trước mắt là vậy)
flashsale-project/
├── bin/
│   └── www             # File khởi động server
├── src/                # (Tạo mới folder này để gom code lại cho gọn)
│   ├── config/         # Chứa db.js (Kết nối Mongo), rabbitmq.js
│   ├── controllers/    # Xử lý Logic (Nhận req -> gọi Service -> Trả res)
│   ├── models/         # Định nghĩa Schema (User, Product, Order)
│   ├── routes/         # Định nghĩa đường dẫn (GET /login, POST /order)
│   ├── services/       # (Nâng cao) Xử lý logic nghiệp vụ phức tạp
│   └── utils/          # Các hàm phụ trợ
├── app.js              # File cấu hình chính (Middleware)
├── package.json
└── .env                # Biến môi trường

III. FIle .env 
CHÉP HẾT CÁC DÒNG DƯỚI ĐÂY VÀO FILE .env (CHƯA CÓ THÌ TẠO NGANG HÀNG FILE DOCKER-COMPOSE.YML
# Cấu hình Server
PORT=3000

# Cấu hình Database (Kết nối vào Docker)
MONGO_URI=mongodb://localhost:27017/flashsale_db

# Cấu hình Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Cấu hình RabbitMQ
RABBITMQ_URI=amqp://localhost:5672


IV. Trách nhiệm và công việc cụ thể
1&&2: Hà, Công
3: Hậu
4: Tồn
5: Hồng
–---------------------------------------------------------------------------------------------
1️⃣ MEMBER 4: AUTHENTICATION (QUAN TRỌNG NHẤT - Cần xong sớm)
Nhiệm vụ: Làm API Đăng ký, Đăng nhập, xác thực JWT.

Git Branch: feature/auth

Cấu trúc Database (User Schema): File src/models/user.model.js

email: String (unique, required)

password: String (required - nhớ hash bằng bcrypt)

name: String

API Specs (Output chuẩn):

POST /v1/api/auth/register -> Body: {email, password, name}

POST /v1/api/auth/login -> Body: {email, password} -> Trả về: { "token": "ey...", "userId": "..." }

Yêu cầu: Viết thêm middleware verifyToken trong src/middleware/auth.js để chặn các route cần bảo mật.

2️⃣ MEMBER 3: PRODUCT MANAGEMENT
Nhiệm vụ: API hiển thị sản phẩm và tạo sản phẩm giả.

Git Branch: feature/product

Cấu trúc Database (Product Schema): File src/models/product.model.js

product_name: String

product_thumb: String (Link ảnh)

product_description: String

product_price: Number

product_quantity: Number (Quan trọng: Để test trừ kho)

API Specs:

GET /v1/api/products -> Trả về danh sách.

POST /v1/api/products -> Tạo sản phẩm (Dùng Postman tạo sẵn 10 cái iPhone 15, Samsung S24... để test).

3️⃣ MEMBER 5: FRONTEND (REACTJS)
Nhiệm vụ: Dựng khung giao diện, chưa cần gọi API thật.

Git Branch: frontend/ui

Yêu cầu:

Tạo trang Login, Register.

Tạo trang Danh sách sản phẩm (Home).

Tạo trang Chi tiết sản phẩm (có nút MUA NGAY to đẹp).

Lưu ý: Tự tạo file data.json giả để hiển thị lên giao diện cho đẹp trước. Khi nào Member 3, 4 xong API thì chỉ cần sửa logic gọi API là xong.

4️⃣ MEMBER 2: WORKER & QUEUE (NGHIÊN CỨU)
Nhiệm vụ: Nghiên cứu RabbitMQ, chưa cần can thiệp vào code chính ngay.

Git Branch: feature/worker

Hành động:

Tạo file src/test_rabbitmq.js (file nháp).

Viết code connect vào RabbitMQ (port 5672).

Thử gửi 1 message "Hello" vào Queue và log ra màn hình xem nhận được chưa.

-> sau đó làm cụ thể hơn:
“Nhiệm vụ cốt lõi: Đảm bảo tin nhắn (đơn hàng) từ bạn đẩy xuống Queue phải được nhận và lưu vào MongoDB an toàn, không bị mất.
Việc 1: Viết module kết nối RabbitMQ
File cần tạo: src/config/rabbitmq.js (hoặc src/dbs/init.rabbitmq.js)
Nội dung:
Dùng thư viện amqplib.
Viết hàm connectToRabbitMQ(): Kết nối đến amqp://localhost.
Viết hàm createChannel(): Tạo kênh giao tiếp.
Yêu cầu: Nếu mất kết nối RabbitMQ, phải có cơ chế log lỗi.
Việc 2: Viết Worker xử lý đơn hàng (Consumer)
File cần tạo: src/workers/order.worker.js
Nội dung:
Kết nối RabbitMQ.
Lắng nghe hàng đợi tên là order_queue.
Khi nhận được tin nhắn (JSON: { userId, productId, quantity }):
Parse JSON ra.
Gọi OrderModel.create(...) để lưu đơn hàng vào MongoDB (với status: 'Success').
Quan trọng: Gọi lệnh channel.ack(msg) để báo cho RabbitMQ biết là "Tao xử lý xong rồi, mày xóa tin nhắn đó đi".
Việc 3: Test độc lập
Tạo một file nháp test_worker.js. Viết đoạn code gửi 10 tin nhắn liên tục vào Queue xem Worker có in ra log "Đã lưu đơn hàng" 10 lần không.
“
PAYLOAD THỐNG NHẤT 
Tên Queue: Đặt tên là order-queue
Cấu trúc tin nhắn (Payload): Khi M1 gửi cho M2, gói tin trông như thế nào?
chốt:
JSON
{
  "userId": "xxx",
  "productId": "yyy",
  "quantity": 1,
  "price": 50000,
  "orderTime": "2026-02-05T..."
}

5️⃣ MEMBER 1 (LEADER): CORE & REVIEW
Nhiệm vụ:

Review Pull Request của Member 3, 4, 5.

Nghiên cứu Redis Lua Script (để xử lý vụ trừ kho không bị âm).

Hỗ trợ anh em fix lỗi Docker/Git.
CỤ THỂ HƠN LÀ:
Nhiệm vụ cốt lõi: Chặn đứng dòng người ồ ạt, chỉ cho những người hợp lệ (còn hàng trong kho) được đi tiếp xuống Queue.

Việc 1: Viết module kết nối Redis (Nâng cao)

File cần tạo: src/config/redis.js (hoặc src/dbs/init.redis.js)

Nội dung:

Dùng thư viện redis.

Viết hàm kết nối.

Mẹo: Cấu hình thêm retryStrategy để nếu Redis rớt mạng thì nó tự kết nối lại.

Việc 2: Vũ khí bí mật - Lua Script (Inventory Service)

Đây là phần khó nhất. Bạn cần viết một đoạn script nhỏ để đảm bảo Atomic (nguyên tử) - nghĩa là 100 người cùng trừ 1 sản phẩm thì kho giảm đúng 100 chứ không bị sai số.

File cần tạo: src/services/inventory.service.js

Logic cần code:

Viết hàm reservationInventory({ productId, quantity, cartId }).

Trong hàm đó, dùng redis.eval(...) để chạy Lua script.

Logic Lua: "Kiểm tra Key kho_hang_iphone. Nếu số lượng > 0 thì trừ đi 1 và trả về 1 (OK). Nếu bằng 0 thì trả về 0 (Hết hàng)".

Việc 3: Viết API Đặt hàng (Controller)

File cần tạo: src/controllers/order.controller.js

Logic:

Nhận request từ Frontend.

Gọi InventoryService (của Việc 2) để trừ kho Redis.

Nếu trừ kho thành công -> Gửi tin nhắn vào RabbitMQ (cho Member 2 xử lý).

Trả về ngay cho User: "Đơn hàng đang xử lý".
⚠️ QUY ƯỚC CHUNG (API RESPONSE STANDARD)
Để Frontend dễ làm việc, tất cả Backend (M3, M4) phải trả về JSON theo mẫu thống nhất này. Cấm trả về mỗi cái string trọc lóc.

✅ Khi Thành Công (Status 200/201):

JSON

{
  "status": "success",
  "message": "Đăng nhập thành công",
  "data": {
     "userId": 1,
     "name": "Hoang"
  }
}
❌ Khi Có Lỗi (Status 400/404/500):

JSON

{
  "status": "error",
  "message": "Email đã tồn tại",
  "stack": "..." (nếu cần debug)
}
🚀 ACTION: Mọi người reply "Đã rõ" để confirm nhận việc. Ai vướng bước Setup môi trường inbox mình teamview ngay tối nay nhé!

GIẢI THÍCH CHO LEADER (Tại sao phải sửa lại như trên?)
Thống nhất Tên trường (Schema): Nếu bạn không chốt product_quantity, Member 3 có thể đặt là inventory, stock, qty... đến lúc Member 1 viết code trừ kho sẽ không biết gọi trường nào -> Sửa lại rất mệt.

Thống nhất API Response: Frontend (M5) rất ghét lúc thì nhận được { user: ... }, lúc thì { data: ... }. Thống nhất mẫu JSON giúp M5 code 1 hàm xử lý chung cho toàn bộ dự án.

Thứ tự ưu tiên: M4 (Auth) quan trọng nhất vì không có User thì không đặt hàng được. Nên push M4 làm sớm.



### CHI TIẾT HƠN NÈ:
👥 Member 3 (Product) & Member 4 (Auth) - Làm Backend (Node.js)
Ví dụ cụ thể cho Member 4 (Làm Auth): Bạn ấy sẽ phải tạo 4 file mới ở 4 folder khác nhau:

src/routes/auth.route.js (Khai báo: POST /login, POST /register)

src/controllers/auth.controller.js (Code: req.body có email không?)

src/services/auth.service.js (Code: Tìm user trong DB, so sánh password, tạo Token)

src/models/user.model.js (Đã có sẵn, chỉ cần viết Schema vào)

(Member 3 làm tương tự, thay chữ auth/user bằng product)


👤 Member 5 (Frontend) - Làm Giao diện (ReactJS)
Bạn này KHÔNG code trong folder src của Backend.

Vị trí: Member 5 sẽ tạo một folder tên là client (hoặc frontend) nằm ngang hàng với folder src và package.json của bạn.

Cách tạo: Bạn (hoặc Member 5) đứng ở thư mục gốc, chạy lệnh:

Bash

npx create-react-app client
Kết quả: Cấu trúc dự án sẽ trông như sau:

Plaintext

flashsale-project/
├── client/             <-- LÃNH ĐỊA CỦA MEMBER 5
│   ├── src/
│   ├── package.json
│   └── ...
├── src/                <-- LÃNH ĐỊA CỦA BACKEND (M1, M2, M3, M4)
├── package.json
└── …

### TÊN NHÁNH (BRANCH) KHI LÀM VIỆC
Khi bắt đầu làm, mỗi người tự tạo nhánh riêng từ develop. Quy tắc đặt tên thống nhất như sau:

Member 3: feature/product (hoặc chi tiết hơn: feature/product-crud)

Member 4: feature/auth (hoặc feature/login-register)

Member 5: feature/frontend-ui (hoặc feature/landing-page)

Member 2: feature/worker-setup

### QUY TẮC VIẾT COMMIT MESSAGE (COMMENT GIT)
Đừng để anh em commit kiểu "fix", "update", "sửa lỗi"... nhìn rất nghiệp dư và khó quản lý. Hãy áp dụng chuẩn Conventional Commits (rất đơn giản, chỉ cần thêm tiền tố):

Cấu trúc: loại: nội dung ngắn gọn

Các loại phổ biến nhất team cần dùng:

feat: (Feature) - Khi làm xong một chức năng mới.

Ví dụ: feat: add login api hoặc feat: design homepage interface

fix: (Fix bug) - Khi sửa lỗi.

Ví dụ: fix: fix mongodb connection error

chore: (Việc lặt vặt) - Khi cài thư viện, sửa file config, không liên quan code chính.

Ví dụ: chore: install dotenv, chore: update readme

docs: (Tài liệu) - Khi viết thêm readme.

Ví dụ: docs: update api document

refactor: (Sửa code cho đẹp) - Không thêm tính năng, không sửa lỗi, chỉ viết lại cho gọn.

Ví dụ: refactor: optimize database query
