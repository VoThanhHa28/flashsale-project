const Joi = require('joi');

const register = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .trim()
      .lowercase()
      .required(),

    password: Joi.string()
      .min(8)
      .max(100)
      .pattern(/[A-Z]/)
      .pattern(/[a-z]/)
      .pattern(/[0-9]/)
      .pattern(/[!@#$%^&*]/)
      .required(),

    name: Joi.string()
      .min(2)
      .max(100)
      .optional(),
  }),
};

const login = {
  body: Joi.object({
    email: Joi.string().email().trim().lowercase().required(),
    password: Joi.string().required(),
  }),
};

module.exports = {
  register,
  login,
};
