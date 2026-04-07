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

const getActivityLogs = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        method: Joi.string().valid("POST", "PUT", "PATCH", "DELETE").optional(),
    }),
};

module.exports = {
    getUsers,
    banUser,
    assignRoleToUser,
    getActivityLogs,
};
