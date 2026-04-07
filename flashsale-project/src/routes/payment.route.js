const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/auth");
const validate = require("../middlewares/validate.middleware");
const paymentValidation = require("../validation/payment.validation");
const PaymentController = require("../controllers/payment.controller");

/**
 * POST /v1/api/payments — Lưu / cập nhật phương thức thanh toán cho đơn của user
 */
router.post(
    "/",
    verifyToken,
    validate(paymentValidation.createPayment),
    PaymentController.create,
);

/**
 * POST /v1/api/payments/:orderId/confirm — Confirm payment (pending → paid)
 * 
 * Side effects:
 *   - Update Payment status → "paid"
 *   - Update Order status → "success"
 *   - Update Reservation → "completed" (RELEASE lock!)
 */
router.post(
    "/:orderId/confirm",
    verifyToken,
    PaymentController.confirmPayment,
);

module.exports = router;
