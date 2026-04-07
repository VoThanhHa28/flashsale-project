const OrderModel = require("../models/order.model");
const PaymentModel = require("../models/payment.model");
const ReservationModel = require("../models/reservation.model");
const { NotFoundError, ForbiddenError, BadRequestError } = require("../core/error.response");
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

    /**
     * Admin: cập nhật trạng thái thanh toán theo orderId (không kiểm tra chủ đơn).
     */
    static async updatePaymentStatusByOrderIdForAdmin(orderId, status) {
        const payment = await PaymentModel.findOne({ orderId });
        if (!payment) {
            throw new NotFoundError(CONST.ADMIN.MESSAGE.PAYMENT_NOT_FOUND);
        }
        payment.status = status;
        await payment.save();
        return { payment: payment.toObject() };
    }

    /**
     * Confirm payment (User thanh toán OK)
     * 
     * Logic:
     *   1. Find Order + verify user owns it
     *   2. Find Payment + verify status = "pending"
     *   3. Update Payment → "paid"
     *   4. Update Order → "success" (đơn xong)
     *   5. Find Reservation linked to Order → update to "completed" (RELEASE lock!)
     *   6. Return updated data
     * 
     * Mục đích: RELEASE lock (ReservationModel status → "completed")
     *   - User có thể order product khác tiếp theo
     */
    static async confirmPayment(userId, orderId) {
        const uid = userId.toString();

        // Step 1: Find Order + verify ownership
        const order = await OrderModel.findById(orderId);
        if (!order) {
            throw new NotFoundError(CONST.ORDER.MESSAGE.ORDER_NOT_FOUND);
        }
        if (String(order.userId) !== uid) {
            throw new ForbiddenError(CONST.ORDER.MESSAGE.ORDER_NOT_OWNED);
        }

        // Step 2: Find Payment
        const payment = await PaymentModel.findOne({ orderId: order._id });
        if (!payment) {
            throw new NotFoundError("Payment not found for this order");
        }
        if (payment.status !== CONST.ORDER.PAYMENT.STATUS.PENDING) {
            throw new BadRequestError(`Payment is already ${payment.status}`);
        }

        // Step 3: Update Payment → "paid"
        payment.status = CONST.ORDER.PAYMENT.STATUS.PAID;
        await payment.save();

        // Step 4: Update Order → "success"
        order.status = CONST.ORDER.STATUS.SUCCESS;
        order.processedAt = new Date();
        await order.save();

        // Step 5: Find Reservation linked to Order → update to "completed" (RELEASE lock!)
        const reservation = await ReservationModel.findOne({
            client_order_id: order.client_order_id,
        });
        if (reservation) {
            await ReservationModel.findByIdAndUpdate(reservation._id, {
                status: "completed",
                note: `Payment confirmed - Order ${order._id}`,
            });
        }

        return {
            order: order.toObject(),
            payment: payment.toObject(),
        };
    }
}


module.exports = PaymentService;
