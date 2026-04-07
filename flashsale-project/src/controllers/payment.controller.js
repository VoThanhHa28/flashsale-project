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
}

module.exports = PaymentController;
