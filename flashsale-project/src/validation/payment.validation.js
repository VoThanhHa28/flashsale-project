const Joi = require("joi");
const CONST = require("../constants");

const METHODS = Object.values(CONST.ORDER.PAYMENT.METHOD);
const STATUSES = Object.values(CONST.ORDER.PAYMENT.STATUS);

const createPayment = {
    body: Joi.object({
        orderId: Joi.string().trim().required(),
        method: Joi.string()
            .valid(...METHODS)
            .required()
            .messages({
                "any.only": `method phải là một trong: ${METHODS.join(", ")}`,
            }),
        currency: Joi.string().trim().uppercase().optional(),
        status: Joi.string()
            .valid(...STATUSES)
            .optional(),
    }),
};

/** PATCH /v1/api/admin/payments/:orderId/status — SHOP_ADMIN */
const patchAdminPaymentStatus = {
    params: Joi.object({
        orderId: Joi.string().hex().length(24).required(),
    }),
    body: Joi.object({
        status: Joi.string()
            .valid(...STATUSES)
            .required()
            .messages({
                "any.only": `status phải là một trong: ${STATUSES.join(", ")}`,
            }),
    }),
};

module.exports = {
    createPayment,
    patchAdminPaymentStatus,
};
