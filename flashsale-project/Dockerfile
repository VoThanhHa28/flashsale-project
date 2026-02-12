# 1. Chọn Base Image nhẹ nhất (Alpine)
FROM node:18-alpine

# 2. Tạo thư mục làm việc trong container
WORKDIR /app

# 3. Copy file package.json trước để tận dụng Cache layer của Docker
COPY package*.json ./

# 4. Cài đặt dependencies
RUN npm install

# 5. Copy toàn bộ code nguồn vào container
COPY . .

# 6. Mở port 3000
EXPOSE 3000

# 7. Lệnh chạy server (Dùng dev để có nodemon nếu cần, hoặc start cho prod)
CMD ["npm", "run", "dev"]