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

module.exports = {
    create,
};
