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
