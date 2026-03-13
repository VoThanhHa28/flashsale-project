const express = require("express");
const router = express.Router();

const OrderController = require("../controllers/order.controller");
const validate = require("../middlewares/validate.middleware");
const auth = require("../middlewares/auth");
const orderValidation = require("../validation/order.validation");

// Tạo đơn hàng (user đã đăng nhập)
router.post(
    "/",
    auth.verifyToken, // 1️⃣ xác thực JWT
    validate(orderValidation.create), // 2️⃣ validate body
    OrderController.placeOrder, // 3️⃣ business
);

// Route cho load testing (không cần auth, không cần validate)
router.post("/test", OrderController.placeOrder);

// Lịch sử đơn hàng
// router.get(
//   '/history',
//   auth.verifyToken,
//   OrderController.getHistory
// );

// Lịch sử đơn hàng của user (auth) – GET /me, GET /me/:id
router.get("/me", auth.verifyToken, validate(orderValidation.getMyOrders), OrderController.getMyOrders);
router.get("/me/:id", auth.verifyToken, validate(orderValidation.getMyOrderById), OrderController.getMyOrderById);

// Hủy đơn hàng (chỉ được hủy khi status = pending)
router.patch("/me/:id/cancel", auth.verifyToken, OrderController.cancelOrder);

module.exports = router;
