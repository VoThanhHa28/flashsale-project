const Payment = require("../models/payment.model");
const CONST = require("../constants");

/**
 * @param {import('mongoose').Types.ObjectId|string} orderId
 * @param {{ amount: number, status?: string, method?: string, currency?: string }} data
 */
/** Tạo payment nếu chưa có (idempotent — không ghi đè nếu user đã tạo trước). */
const insertForOrder = async (orderId, data) => {
    await Payment.findOneAndUpdate(
        { orderId },
        {
            $setOnInsert: {
                orderId,
                amount: data.amount,
                currency: data.currency || CONST.ORDER.PAYMENT.CURRENCY.VND,
                status: data.status || CONST.ORDER.PAYMENT.STATUS.PENDING,
                method: data.method || CONST.ORDER.PAYMENT.METHOD.COD,
            },
        },
        { upsert: true, new: true, runValidators: true },
    );
};

const setMethodByOrderId = async (orderId, method) => {
    return Payment.findOneAndUpdate({ orderId }, { $set: { method } }, { new: true, runValidators: true }).lean();
};

const setStatusByOrderId = async (orderId, status) => {
    return Payment.findOneAndUpdate({ orderId }, { $set: { status } }, { new: true, runValidators: true }).lean();
};

const upsertUserPayment = async (orderId, { amount, method }) => {
    return Payment.findOneAndUpdate(
        { orderId },
        {
            $set: { method },
            $setOnInsert: {
                orderId,
                amount,
                currency: CONST.ORDER.PAYMENT.CURRENCY.VND,
                status: CONST.ORDER.PAYMENT.STATUS.PENDING,
            },
        },
        { upsert: true, new: true, runValidators: true },
    ).lean();
};

/**
 * @param {Array<Record<string, unknown>>} orders - lean
 */
const enrichOrdersWithPayment = async (orders) => {
    if (!orders || !orders.length) return orders;
    const ids = orders.map((o) => o._id);
    const payments = await Payment.find({ orderId: { $in: ids } }).lean();
    const map = new Map(payments.map((p) => [p.orderId.toString(), p]));
    return orders.map((o) => ({
        ...o,
        payment: map.get(o._id.toString()) || null,
    }));
};

/**
 * @param {Record<string, unknown>|null} order - lean
 */
const enrichOrderWithPayment = async (order) => {
    if (!order) return null;
    const payment = await Payment.findOne({ orderId: order._id }).lean();
    return { ...order, payment: payment || null };
};

module.exports = {
    insertForOrder,
    setMethodByOrderId,
    setStatusByOrderId,
    upsertUserPayment,
    enrichOrdersWithPayment,
    enrichOrderWithPayment,
};
