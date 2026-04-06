const OrderModel = require("../models/order.model");
const PaymentModel = require("../models/payment.model");
const { NotFoundError, ForbiddenError } = require("../core/error.response");
const CONST = require("../constants");

class PaymentService {
    /**
     * Ghi / cập nhật thanh toán cho đơn của chính user (phương thức COD, thẻ, ...).
     * Nếu worker đã tạo Payment (theo orderId), chỉ cập nhật method/status/currency.
     */
    static async recordPayment(userId, payload) {
        const { orderId, method, currency, status } = payload;
        const uid = userId.toString();

        const order = await OrderModel.findById(orderId).lean();
        if (!order) {
            throw new NotFoundError(CONST.ORDER.MESSAGE.ORDER_NOT_FOUND);
        }
        if (String(order.userId) !== uid) {
            throw new ForbiddenError(CONST.ORDER.MESSAGE.ORDER_NOT_OWNED);
        }

        const existing = await PaymentModel.findOne({ orderId: order._id });
        if (existing) {
            existing.method = method;
            if (currency !== undefined && currency !== null && currency !== "") {
                existing.currency = String(currency).toUpperCase();
            }
            if (status) {
                existing.status = status;
            }
            await existing.save();
            return { payment: existing.toObject(), updated: true };
        }

        const created = await PaymentModel.create({
            orderId: order._id,
            amount: order.totalPrice,
            currency: currency ? String(currency).toUpperCase() : CONST.ORDER.PAYMENT.CURRENCY.VND,
            status: status || CONST.ORDER.PAYMENT.STATUS.PENDING,
            method,
        });

        return { payment: created.toObject(), updated: false };
    }
}

module.exports = PaymentService;
