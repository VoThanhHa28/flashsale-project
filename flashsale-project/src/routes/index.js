const express = require("express");
const router = express.Router();

// Import các route con
const orderRouter = require("./order.route");
const authRouter = require("./auth.route");
const productRouter = require("./product.route");
const adminRouter = require("./admin.route");
const seedRouter = require("./seed.route");
const userRouter = require("./user.route");
const shopRouter = require("./shop.route");
const categoryRouter = require("./category.route");
// Hồng sửa – route nội bộ để Worker gọi Main App emit system-error khi Redis chết (Case 3)
const internalRouter = require("./internal.route");
const activityLogMiddleware = require("../middlewares/activityLog.middleware");

// Đăng ký schema Mongoose để collection xuất hiện trong MongoDB khi app khởi động
// (Cart dùng kiến trúc Buy Now cho Flash Sale; model này chuẩn bị sẵn cho e-commerce mở rộng)
require("../models/cart.model");
require("../models/reservationLog.model");
require("../models/flashSaleCampaign.model");

// Ghi log tự động mọi request PUT / PATCH / DELETE vào collection activity_logs
router.use(activityLogMiddleware);

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
//router.use('/v1/api/users', userRouter);

// Hồng sửa – mount route internal để Worker gọi emit system-error (Case 3, Redis down)
router.use("/internal", internalRouter);
router.use("/v1/api/users", userRouter);

// Shop routes (M3)
router.use("/v1/api/shop", shopRouter);

// Master data: categories cho dropdown frontend
router.use("/v1/api/categories", categoryRouter);

module.exports = router;
