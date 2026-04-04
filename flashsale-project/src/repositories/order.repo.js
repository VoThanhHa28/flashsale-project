const OrderModel = require("../models/order.model");
const OrderDetailRepo = require("./orderDetail.repo");
const PaymentRepo = require("./payment.repo");

/**
 * Danh sách đơn hàng của user (phân trang).
 * @param {string} userId - ID user (string).
 * @param {{ page?: number, limit?: number }} options - page (1-based), limit.
 */
const findByUserId = async (userId, options = {}) => {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    const query = OrderModel.findByUserId(userId, { limit, skip });
    const [orders, total] = await Promise.all([
        query.lean().exec(),
        OrderModel.countDocuments({ userId }),
    ]);

    const ordersWithDetails = await OrderDetailRepo.enrichOrdersWithDetails(orders);
    const ordersWithPayment = await PaymentRepo.enrichOrdersWithPayment(ordersWithDetails);

    return { orders: ordersWithPayment, total, page, limit };
};

/**
 * Lấy 1 đơn theo id và userId. Nếu không thuộc user → null.
 * @param {string} orderId - ID đơn hàng.
 * @param {string} userId - ID user (string).
 */
const findByIdAndUserId = async (orderId, userId) => {
    const order = await OrderModel.findOne({
        _id: orderId,
        userId: userId.toString(),
    })
        .populate("productId", "name price imageUrl")
        .lean();
    const withDetails = await OrderDetailRepo.enrichOrderWithDetails(order);
    return PaymentRepo.enrichOrderWithPayment(withDetails);
};

module.exports = {
    findByUserId,
    findByIdAndUserId,
};
