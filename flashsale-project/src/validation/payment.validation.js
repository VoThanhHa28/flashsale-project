const Joi = require("joi");
const CONST = require("../constants");

const createOrUpdate = {
    body: Joi.object({
        orderId: Joi.string().hex().length(24).required(),
        method: Joi.string()
            .valid(...Object.values(CONST.ORDER.PAYMENT.METHOD))
            .required(),
    }),
};

module.exports = {
    createOrUpdate,
};
