const Joi = require('joi');

const objectId = Joi.string().hex().length(24);

const getCategoryById = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

const createCategory = {
  body: Joi.object({
    categoryName: Joi.string().trim().min(1).max(120).required(),
    categorySlug: Joi.string().trim().min(1).max(160).optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }),
};

const updateCategory = {
  params: Joi.object({
    id: objectId.required(),
  }),
  body: Joi.object({
    categoryName: Joi.string().trim().min(1).max(120).optional(),
    categorySlug: Joi.string().trim().min(1).max(160).optional(),
    sortOrder: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

const deleteCategory = {
  params: Joi.object({
    id: objectId.required(),
  }),
};

module.exports = {
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
