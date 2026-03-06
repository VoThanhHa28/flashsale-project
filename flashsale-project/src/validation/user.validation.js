const Joi = require('joi');

const updateMe = {
  body: Joi.object({
    name: Joi.string().min(1).max(100).trim().optional().allow(''),
    address: Joi.string().max(500).trim().optional().allow(''),
    avatar: Joi.string().uri().optional().allow(''),
  }).min(1),
};

const changePassword = {
  body: Joi.object({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string()
      .min(6)
      .max(100)
      .required(),
  }),
};

module.exports = {
  updateMe,
  changePassword,
};
