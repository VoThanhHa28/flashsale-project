const Joi = require("joi");

const createTransaction = {
    body: Joi.object({
        productId: Joi.string().required().messages({
            "any.required": "productId là bắt buộc",
        }),
        quantityChange: Joi.number().integer().required().messages({
            "any.required": "quantityChange là bắt buộc",
            "number.base": "quantityChange phải là số",
        }),
        type: Joi.string()
            .valid("import", "export", "adjustment")
            .optional()
            .default("import"),
        reason: Joi.string().max(500).optional(),
        referenceId: Joi.string().optional(),
        notes: Joi.string().optional(),
    }),
};

const updateStatus = {
    body: Joi.object({
        status: Joi.string().valid("pending", "confirmed", "rejected").required(),
    }),
};

// Query validation for history endpoints
const queryParams = {
    query: Joi.object({
        page: Joi.number().integer().min(1).default(1).optional(),
        pageSize: Joi.number().integer().min(1).max(100).default(20).optional(),
    }).unknown(true), // Allow other query params
};

module.exports = {
    createTransaction,
    updateStatus,
    queryParams,
};
