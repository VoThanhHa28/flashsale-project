const Joi = require("joi");

const initiateCheckout = {
    body: Joi.object({
        productId: Joi.string().required().messages({
            "any.required": "productId is required",
        }),
        quantity: Joi.number().integer().min(1).required().messages({
            "any.required": "quantity is required",
            "number.base": "quantity must be a number",
            "number.min": "quantity must be at least 1",
        }),
        client_order_id: Joi.string().optional().messages({
            "string.base": "client_order_id must be a string (optional, auto-generated if not provided)",
        }),
    }),
};

const confirmCheckout = {
    body: Joi.object({
        // Address, phone, etc. - optional basic validation
        // Let order validation handle details
        address: Joi.string().optional(),
        phone: Joi.string().optional(),
        notes: Joi.string().optional(),
    }).unknown(true), // Allow extra fields for flexibility
};

module.exports = {
    initiateCheckout,
    confirmCheckout,
};
