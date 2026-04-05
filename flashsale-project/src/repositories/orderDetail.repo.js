const OrderDetail = require("../models/orderDetail.model");

/**
 * @param {import('mongoose').Types.ObjectId|string} orderId
 * @param {Array<{ productId: string, quantity: number, unitPrice: number, lineTotal?: number }>} lines
 */
const insertLines = async (orderId, lines) => {
    if (!lines || !lines.length) return;
    const docs = lines.map((l) => ({
        orderId,
        productId: String(l.productId),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal != null ? l.lineTotal : l.quantity * l.unitPrice,
    }));
    await OrderDetail.insertMany(docs);
};

/**
 * Gắn mảng orderDetails vào từng order (lean).
 * @param {Array<Record<string, unknown>>} orders
 */
const enrichOrdersWithDetails = async (orders) => {
    if (!orders || !orders.length) return orders;
    const ids = orders.map((o) => o._id);
    const details = await OrderDetail.find({ orderId: { $in: ids } })
        .sort({ createdAt: 1 })
        .lean();

    const map = new Map();
    for (const d of details) {
        const k = d.orderId.toString();
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(d);
    }

    return orders.map((o) => ({
        ...o,
        orderDetails: map.get(o._id.toString()) || [],
    }));
};

/**
 * @param {Record<string, unknown>|null} order - lean
 */
const enrichOrderWithDetails = async (order) => {
    if (!order) return null;
    const details = await OrderDetail.find({ orderId: order._id }).sort({ createdAt: 1 }).lean();
    return { ...order, orderDetails: details };
};

module.exports = {
    insertLines,
    enrichOrdersWithDetails,
    enrichOrderWithDetails,
};
