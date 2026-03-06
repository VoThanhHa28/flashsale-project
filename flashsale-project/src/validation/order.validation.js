const Joi = require("joi");

const create = {
    body: Joi.object({
        items: Joi.array()
            .items(
                Joi.object({
                    productId: Joi.string().required(),
                    quantity: Joi.number().integer().min(1).required(),
                }),
            )
            .min(1)
            .required(),

        note: Joi.string().max(500).optional(),
    }),
};

const getMyOrders = {
    query: Joi.object({
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
};

const getMyOrderById = {
    params: Joi.object({
        id: Joi.string().required(),
    }),
};

module.exports = {
    create,
    getMyOrders,
    getMyOrderById,
};
