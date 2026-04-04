'use strict';

const OrderModel = require('../models/order.model');
const OrderDetailRepo = require('./orderDetail.repo');

const findAllOrders = async ({ filter, skip, limit }) => {
    const orders = await OrderModel.find(filter)
        .select('-__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('productId', 'productName productThumb productPrice')
        .lean();
    return OrderDetailRepo.enrichOrdersWithDetails(orders);
};

const countOrders = async (filter) => {
    return await OrderModel.countDocuments(filter);
};

const findOrderById = async (orderId) => {
    const order = await OrderModel.findById(orderId)
        .populate('productId', 'productName productThumb productPrice')
        .lean();
    return OrderDetailRepo.enrichOrderWithDetails(order);
};

const updateOrderStatus = async (orderId, status) => {
    return await OrderModel.findByIdAndUpdate(
        orderId,
        { status },
        { new: true, runValidators: true }
    ).lean();
};

// Aggregate doanh thu N ngày gần nhất (chỉ đơn status = 'success')
const getRevenueLast7Days = async (days) => {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    return await OrderModel.aggregate([
        {
            $match: {
                status: 'success',
                createdAt: { $gte: since },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
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
};

module.exports = {
    findAllOrders,
    countOrders,
    findOrderById,
    updateOrderStatus,
    getRevenueLast7Days,
};
