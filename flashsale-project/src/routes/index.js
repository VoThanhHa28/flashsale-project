const express = require("express");
const router = express.Router();

// Import các route con
const orderRouter = require("./order.route");
const authRouter = require("./auth.route");
const productRouter = require("./product.route");
const adminRouter = require("./admin.route");
const seedRouter = require("./seed.route");
const userRouter = require("./user.route");

// 1. Route kiểm tra Server sống hay chết (Health Check)
router.get("/", (req, res) => {
    return res.status(200).json({
        status: "success",
        message: "Server FlashSale is running! 🚀",
    });
});

// 2. Gom các route con lại (Router chính)
// Cấu trúc: router.use('đường_dẫn_chung', file_route_con)

router.use("/v1/api/order", orderRouter);
// -> Tất cả gì bắt đầu bằng /v1/api/order sẽ chạy vào file order.route.js

// Route cho K6 test (không cần /v1 prefix)
router.use("/api/orders", orderRouter);

// Định nghĩa resource name ở đây
router.use("/v1/api/products", productRouter);

router.use("/v1/api/auth", authRouter);

// Admin routes
router.use("/v1/api/admin", adminRouter);

// Seed routes (chỉ dùng trong development/testing)
router.use("/v1/api/seed", seedRouter);
router.use('/v1/api/users', userRouter);

module.exports = router;
