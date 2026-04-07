"use strict";

const Joi = require("joi");

const mongoId = Joi.string().hex().length(24).required();

const addItem = {
    body: Joi.object({
        productId: mongoId,
        quantity: Joi.number().integer().min(1).max(999999).required(),
    }),
};

const updateItem = {
    params: Joi.object({
        productId: mongoId,
    }),
    body: Joi.object({
        quantity: Joi.number().integer().min(1).max(999999).required(),
    }),
};

const removeItem = {
    params: Joi.object({
        productId: mongoId,
    }),
};

module.exports = {
    addItem,
    updateItem,
    removeItem,
};
