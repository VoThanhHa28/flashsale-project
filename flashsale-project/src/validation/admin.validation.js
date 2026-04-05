const Joi = require('joi');

const getUsers = {
    query: Joi.object({
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
};

const banUser = {
    params: Joi.object({
        id: Joi.string().required(),
    }),
    body: Joi.object({
        status: Joi.string().valid('inactive').required(),
    }),
};

const assignRoleToUser = {
    params: Joi.object({
        id: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        roleId: Joi.string().hex().length(24).required(),
    }),
};

const patchPaymentStatus = {
    params: Joi.object({
        orderId: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        status: Joi.string().valid('paid', 'failed', 'refunded').required(),
    }),
};

module.exports = {
    getUsers,
    banUser,
    assignRoleToUser,
    patchPaymentStatus,
};
