const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const validate = require("../middlewares/validate.middleware");
const paymentValidation = require("../validation/payment.validation");
const PaymentController = require("../controllers/payment.controller");

router.post("/", auth.verifyToken, validate(paymentValidation.createOrUpdate), PaymentController.setMethod);

module.exports = router;
