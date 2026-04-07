'use strict';

const Joi = require('joi');
const CONST = require('../constants');

const getOrders = {
    query: Joi.object({
        status: Joi.string()
            .valid('pending', 'confirmed', 'shipping', 'completed', 'success', 'failed', 'cancelled', 'processing', 'refunded')
            .optional(),
        page: Joi.number().integer().min(1).default(1),
        pageSize: Joi.number().integer().min(1).max(100).default(20),
    }),
};

const updateOrderStatus = {
    params: Joi.object({
        id: Joi.string().required(),
    }),
    body: Joi.object({
        status: Joi.string()
            .valid('confirmed', 'shipping', 'completed', 'cancelled')
            .required()
            .messages({
                'any.only': 'Trạng thái chỉ được là confirmed, shipping, completed hoặc cancelled',
                'any.required': 'Trạng thái là bắt buộc',
            }),
    }),
};

const getRevenueStats = {
    query: Joi.object({
        days: Joi.number()
            .integer()
            .min(1)
            .max(CONST.SHOP.MAX_REVENUE_DAYS)
            .default(CONST.SHOP.REVENUE_DAYS),
    }),
};

module.exports = {
    getOrders,
    updateOrderStatus,
    getRevenueStats,
};
