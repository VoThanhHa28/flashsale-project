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

module.exports = {
    getUsers,
    banUser,
};
