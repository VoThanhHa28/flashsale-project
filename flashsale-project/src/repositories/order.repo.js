const OrderModel = require("../models/order.model");
const OrderDetailRepo = require("./orderDetail.repo");

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

    return { orders: ordersWithDetails, total, page, limit };
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
    return OrderDetailRepo.enrichOrderWithDetails(order);
};

module.exports = {
    findByUserId,
    findByIdAndUserId,
};
