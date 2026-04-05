const asyncHandler = require("../utils/asyncHandler");
const { OK } = require("../core/success.response");
const CONST = require("../constants");
const PaymentService = require("../services/payment.service");

class PaymentController {
    static setMethod = asyncHandler(async (req, res) => {
        const { orderId, method } = req.body;
        const result = await PaymentService.setPaymentMethodForUser(req.user._id, orderId, method);
        return new OK({
            message: CONST.ORDER.MESSAGE.PAYMENT_METHOD_UPDATED,
            data: result,
        }).send(res);
    });
}

module.exports = PaymentController;
