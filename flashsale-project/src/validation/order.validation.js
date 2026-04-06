const Joi = require("joi");

const create = {
    body: Joi.object({
        // Format 1: items array (preferred)
        items: Joi.array()
            .items(
                Joi.object({
                    productId: Joi.string().required(),
                    quantity: Joi.number().integer().min(1).required(),
                }),
            )
            .min(1)
            .optional(),

        // Format 2: productId/quantity at root (backward compatibility for flash sale)
        productId: Joi.string().when('items', {
            is: Joi.exist(),
            then: Joi.forbidden(),
            otherwise: Joi.required(),
        }),
        quantity: Joi.number().integer().min(1).when('items', {
            is: Joi.exist(),
            then: Joi.forbidden(),
            otherwise: Joi.required(),
        }),
        client_order_id: Joi.string().optional(),

        note: Joi.string().max(500).optional(),
    }).xor('items', 'productId'), // Either items OR productId, not both
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
