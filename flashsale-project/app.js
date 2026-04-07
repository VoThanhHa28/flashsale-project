require("dotenv").config();

console.log("🔥 SERVER RELOADED AT", new Date().toISOString());

// JWT_SECRET - Fail fast khi start
if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is required in environment variables");
}
const cors = require("cors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const app = express();
const connectDB = require("./src/config/db");
const OrderService = require("./src/services/order.service");
const SeedService = require("./src/services/seed.service");
const errorMiddleware = require("./src/middlewares/error.middleware");

// Route tổng (Gom lại cho gọn app.js)
const rootRouter = require("./src/routes/index");

// CORS configuration - Cho phép frontend kết nối
// Hỗ trợ cả port 3000 và 3001 để tránh conflict
const allowedOrigins = [process.env.FRONTEND_URL || "http://localhost:3001", "http://localhost:3000", "http://localhost:3001"];

app.use(
    cors({
        origin: function (origin, callback) {
            // Cho phép requests không có origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(null, true); // Cho phép tất cả trong development
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

// 1. Kết nối DB & Init Redis
// Lưu ý: connectDB là async, nên logic init phải nằm trong .then()
connectDB().then(() => {
    // Chỉ nạp kho khi DB đã kết nối thành công
    OrderService.initInventory().catch((error) => {
        console.warn('⚠️  Lỗi initInventory (Redis may be down):', error.message);
        // Don't crash - server can continue without Redis for Inventories/Checkout features
    });
    SeedService.seedMasterData().catch((error) => {
        console.error("[Seed] Khởi tạo master data thất bại:", error.message);
    });
});

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// 2. Setup Routes (Nên gom hết vào file routes/index.js như đã bàn)
// Thay vì app.use từng cái lẻ tẻ, hãy dùng 1 dòng này:
app.use("/", rootRouter);
// (Trong file routes/index.js bạn sẽ khai báo: router.use('/v1/api', productRouter), router.use('/v1/api', orderRouter)...)

setInterval(() => {
    OrderService.expireStalePaymentHolds().catch((err) => {
        console.warn("[OrderService] expireStalePaymentHolds failed:", err.message);
    });
}, 30 * 1000);

app.use(errorMiddleware);

module.exports = app;
