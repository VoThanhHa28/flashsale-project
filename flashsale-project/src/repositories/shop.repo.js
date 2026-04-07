'use strict';

const OrderModel = require('../models/order.model');
const OrderDetailRepo = require('./orderDetail.repo');
const PaymentRepo = require('./payment.repo');

const findAllOrders = async ({ filter, skip, limit }) => {
    const orders = await OrderModel.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('productId', 'productName productThumb productPrice')
        .lean();
    const withDetails = await OrderDetailRepo.enrichOrdersWithDetails(orders);
    return PaymentRepo.enrichOrdersWithPayment(withDetails);
};

const countOrders = async (filter) => {
    return await OrderModel.countDocuments(filter);
};

const findOrderById = async (orderId) => {
    const order = await OrderModel.findById(orderId)
        .populate('productId', 'productName productThumb productPrice')
        .lean();
    const withDetails = await OrderDetailRepo.enrichOrderWithDetails(order);
    return PaymentRepo.enrichOrderWithPayment(withDetails);
};

const updateOrderStatus = async (orderId, status) => {
    return await OrderModel.findByIdAndUpdate(
        orderId,
        { status },
        { new: true, runValidators: true }
    ).lean();
};

// Aggregate doanh thu N ngày gần nhất (chỉ đơn status = 'success')
const getRevenueLastDays = async (days) => {
    const totalDays = Math.max(1, parseInt(days, 10) || 1);
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (totalDays - 1));

    const rows = await OrderModel.aggregate([
        {
            $match: {
                status: 'success',
                createdAt: { $gte: since },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' },
                },
                totalRevenue: { $sum: '$totalPrice' },
                totalOrders: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                date: '$_id',
                totalRevenue: 1,
                totalOrders: 1,
            },
        },
    ]);

    const revenueByDate = new Map(
        rows.map((row) => [row.date, { totalRevenue: row.totalRevenue || 0, totalOrders: row.totalOrders || 0 }])
    );

    const daily = [];
    for (let index = 0; index < totalDays; index += 1) {
        const current = new Date(since);
        current.setUTCDate(since.getUTCDate() + index);
        const date = current.toISOString().slice(0, 10);
        const item = revenueByDate.get(date) || { totalRevenue: 0, totalOrders: 0 };

        daily.push({
            date,
            totalRevenue: item.totalRevenue,
            totalOrders: item.totalOrders,
        });
    }

    return daily;
};

module.exports = {
    findAllOrders,
    countOrders,
    findOrderById,
    updateOrderStatus,
    getRevenueLastDays,
};
