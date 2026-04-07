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

const FE_ORDER_STATUSES = [
    "all",
    "pending_payment",
    "pending_confirm",
    "processing",
    "shipping",
    "completed",
    "cancelled",
    "refunded",
];

const getMyOrders = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(6),
        status: Joi.string().valid(...FE_ORDER_STATUSES).default("all"),
        search: Joi.string().trim().max(200).allow("").default(""),
        sort: Joi.string().valid("newest", "oldest", "amount_high", "amount_low").default("newest"),
        dateFrom: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow("").optional(),
        dateTo: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).allow("").optional(),
    }).options({ convert: true, stripUnknown: true }),
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
