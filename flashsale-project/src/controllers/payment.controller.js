const PaymentService = require("../services/payment.service");
const asyncHandler = require("../utils/asyncHandler");
const { OK, CREATED } = require("../core/success.response");
const CONST = require("../constants");

class PaymentController {
    static create = asyncHandler(async (req, res) => {
        const { payment, updated } = await PaymentService.recordPayment(req.userId, req.body);

        if (updated) {
            new OK({
                message: CONST.ORDER.MESSAGE.PAYMENT_RECORD_SUCCESS,
                data: payment,
            }).send(res);
            return;
        }

        new CREATED({
            message: CONST.ORDER.MESSAGE.PAYMENT_RECORD_SUCCESS,
            data: payment,
        }).send(res);
    });

    /**
     * POST /v1/api/payments/:orderId/confirm
     * User confirms payment (status: pending → paid)
     * 
     * Logic:
     *   - Update Payment status → "paid"
     *   - Update Order status → "success"
     *   - Update Reservation to "completed" (RELEASE lock!)
     *   - User can now order other products
     */
    static confirmPayment = asyncHandler(async (req, res) => {
        const { orderId } = req.params;
        const userId = req.user._id;

        const result = await PaymentService.confirmPayment(userId, orderId);

        new OK({
            message: "Payment confirmed successfully",
            data: result,
        }).send(res);
    });
}

module.exports = PaymentController;
