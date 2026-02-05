# FLASHSALE PROJECT - HIGH CONCURRENCY SYSTEM

Dự án môn học: Hệ thống bán hàng chịu tải cao (Flash Sale).

## BAN ĐẦU CHƯA CÓ GÌ THÌ BỌN MÀY SẼ LÀM
Clone: git clone ...

Vào nhánh chung: git checkout develop

Tạo nhánh riêng: git checkout -b feature/login (ví dụ vậy).

Code & Push: Code xong -> git push origin feature/login.

Tạo PR (MR): Lên Github tạo Pull Request từ feature/login vào develop.

Tao: Review code -> Merge vào develop.

## 1. Yêu cầu môi trường
- Node.js: v20 LTS trở lên.
- Docker & Docker Desktop: Phải cài đặt và đang chạy.
- VS Code.

## 2. Cài đặt & Chạy dự án (Onboarding)

### Bước 1: Clone code
git clone https://github.com/VoThanhHa28/flashsale-project
cd flashsale-project

### Bước 2: Cài thư viện
npm install

### Bước 3: Bật hạ tầng (DB, Redis, Queue)
docker-compose up -d
# Chờ 1 chút, sau đó kiểm tra:
# - Vào http://localhost:15672 (User: guest / Pass: guest) -> Ra RabbitMQ là OK.

### Bước 4: Chạy Server
Code hằng ngày:
npm run dev

Demo / quay video / nộp:
npm start

# Nếu hiện "Server running on port 3000" là thành công.

## 3. Quy tắc Git (NGHIÊM TÚC THỰC HIỆN)
- Nhánh chính: `main` (Chỉ chứa code sạch để demo).
- Nhánh phát triển: `develop` (Mọi người merge vào đây).
- Nhánh cá nhân:
    - `feature/auth` (Member 4)
    - `feature/product` (Member 3)
    - `feature/worker` (Member 2)
    - `frontend/ui` (Member 5)
### QUY TRÌNH 3 BƯỚC KHI CODE:
# 1. Chuyển về nhánh develop và cập nhật code mới nhất từ trên mạng về (để tránh lệch code)
git checkout develop
git pull origin develop

# 2. Tạo nhánh mới để làm việc (Ví dụ Member 4 làm Login)
git checkout -b feature/login

# ... (Ngồi code chán chê xong xuôi) ...

# 3. Lưu code và đẩy lên Github
git add .
git commit -m "Done api login"
git push origin feature/login

- SAU ĐÓ Member làm xong thì vào trang Github của dự án, sẽ thấy nút màu xanh "Compare & pull request".

Bấm vào đó.

Chọn Base: develop (Mũi tên hướng vào develop) <- Compare: feature/login.

Bấm Create pull request.

- RỒi CUỐI CÙNG tao sẽ review và merge

## 4. API Documentation
Xem file GG Docs chung trong nhóm Zalo.
