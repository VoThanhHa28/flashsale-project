const OrderModel = require("../models/order.model");
const PaymentRepo = require("../repositories/payment.repo");
const CONST = require("../constants");
const { NotFoundError, BadRequestError } = require("../core/error.response");

const ALLOWED_METHODS = Object.values(CONST.ORDER.PAYMENT.METHOD);
const ALLOWED_STATUS = [CONST.ORDER.PAYMENT.STATUS.PAID, CONST.ORDER.PAYMENT.STATUS.FAILED, CONST.ORDER.PAYMENT.STATUS.REFUNDED];

class PaymentService {
    /**
     * User chọn / đổi phương thức thanh toán cho đơn của mình.
     */
    static async setPaymentMethodForUser(userId, orderId, method) {
        if (!ALLOWED_METHODS.includes(method)) {
            throw new BadRequestError("Phương thức thanh toán không hợp lệ");
        }

        const order = await OrderModel.findOne({
            _id: orderId,
            userId: userId.toString(),
        }).lean();

        if (!order) {
            throw new NotFoundError(CONST.ORDER.MESSAGE.ORDER_NOT_FOUND);
        }

        const payment = await PaymentRepo.upsertUserPayment(orderId, {
            amount: order.totalPrice,
            method,
        });

        return { payment };
    }

    /**
     * Shop admin cập nhật trạng thái thanh toán (đối soát / webhook giả lập).
     */
    static async setPaymentStatusByAdmin(orderId, status) {
        if (!ALLOWED_STATUS.includes(status)) {
            throw new BadRequestError("Trạng thái thanh toán không hợp lệ");
        }

        const order = await OrderModel.findById(orderId).lean();
        if (!order) {
            throw new NotFoundError(CONST.ORDER.MESSAGE.PAYMENT_ORDER_NOT_FOUND);
        }

        const payment = await PaymentRepo.setStatusByOrderId(orderId, status);
        if (!payment) {
            throw new NotFoundError(CONST.ORDER.MESSAGE.PAYMENT_ORDER_NOT_FOUND);
        }

        return { payment };
    }
}

module.exports = PaymentService;
