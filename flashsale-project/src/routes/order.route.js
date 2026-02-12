const express = require('express');
const router = express.Router();

const OrderController = require('../controllers/order.controller');
const validate = require('../middlewares/validate.middleware');
const auth = require('../middlewares/auth');
const orderValidation = require('../validation/order.validation');

// Tạo đơn hàng (user đã đăng nhập)
router.post(
  '/',
  auth.verifyToken,                  // 1️⃣ xác thực JWT
  validate(orderValidation.create),  // 2️⃣ validate body
  OrderController.placeOrder         // 3️⃣ business
);

// Lịch sử đơn hàng
// router.get(
//   '/history',
//   auth.verifyToken,
//   OrderController.getHistory
// );

module.exports = router;
