'use strict';

const Joi = require('joi');

const getOrders = {
    query: Joi.object({
        status: Joi.string()
            .valid('pending', 'confirmed', 'completed', 'success', 'failed', 'cancelled')
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
            .valid('confirmed', 'cancelled')
            .required()
            .messages({
                'any.only': 'Trạng thái chỉ được là confirmed hoặc cancelled',
                'any.required': 'Trạng thái là bắt buộc',
            }),
    }),
};

module.exports = {
    getOrders,
    updateOrderStatus,
};
