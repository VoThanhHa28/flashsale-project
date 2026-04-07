"use strict";

const CheckoutService = require("../services/checkout.service");
const { OK, CREATED } = require("../core/success.response");
const asyncHandler = require("../utils/asyncHandler");
const CONST = require("../constants");
const { randomUUID } = require("crypto");

class CheckoutController {
    /**
     * POST /v1/api/checkout
     * Initiate checkout - lock inventory for 5 min countdown
     * Body: { productId, quantity, client_order_id? }
     * client_order_id is optional - auto-generated if not provided
     */
    static initiateCheckout = asyncHandler(async (req, res) => {
        const { productId, quantity, client_order_id } = req.body;
        const userId = req.user._id;

        // Auto-generate client_order_id if not provided (idempotency key)
        const idempotencyKey = client_order_id || randomUUID();

        const result = await CheckoutService.initiateCheckout(
            userId,
            productId,
            quantity,
            idempotencyKey
        );

        return new CREATED({
            message: "Checkout initialized - 5 min countdown started",
            data: result,
        }).send(res);
    });

    /**
     * GET /v1/api/checkout/:reservationId
     * Get checkout status + remaining time (countdown)
     */
    static getCheckoutStatus = asyncHandler(async (req, res) => {
        const { reservationId } = req.params;

        const result = await CheckoutService.getCheckoutStatus(reservationId);

        return new OK({
            message: "Checkout status retrieved",
            data: result,
        }).send(res);
    });

    /**
     * POST /v1/api/checkout/:reservationId/confirm
     * Confirm checkout + create order before 5 min expires
     * Body: { address, phone, etc. }
     */
    static confirmCheckout = asyncHandler(async (req, res) => {
        const { reservationId } = req.params;
        const userId = req.user._id;
        const orderData = req.body;

        const result = await CheckoutService.confirmCheckout(userId, reservationId, orderData);

        return new CREATED({
            message: "Order created from checkout",
            data: result,
        }).send(res);
    });
}

module.exports = CheckoutController;
