const express = require("express");
const router = express.Router();

const CheckoutController = require("../controllers/checkout.controller");
const { verifyToken } = require("../middlewares/auth");
const validate = require("../middlewares/validate.middleware");
const checkoutValidation = require("../validation/checkout.validation");

// POST /v1/api/checkout
// Initiate checkout - lock inventory for 5 min countdown
router.post(
    "/",
    verifyToken,
    validate(checkoutValidation.initiateCheckout),
    CheckoutController.initiateCheckout
);

// GET /v1/api/checkout/:reservationId
// Get checkout status + remaining time (countdown timer data)
router.get(
    "/:reservationId",
    verifyToken,
    CheckoutController.getCheckoutStatus
);

// POST /v1/api/checkout/:reservationId/confirm
// Confirm checkout + create order before timeout
router.post(
    "/:reservationId/confirm",
    verifyToken,
    validate(checkoutValidation.confirmCheckout),
    CheckoutController.confirmCheckout
);

module.exports = router;
