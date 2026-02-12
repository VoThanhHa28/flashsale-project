// validations/product.validation.js
const Joi = require('joi');

// Constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ALLOWED_SORT_FIELDS = [
  'productName',
  'productPrice',
  'productQuantity',
  'createdAt',
  'updatedAt',
];

const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

const getProducts = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number()
      .integer()
      .min(1)
      .max(MAX_PAGE_SIZE)
      .default(DEFAULT_PAGE_SIZE),
    sortBy: Joi.string()
      .valid(...ALLOWED_SORT_FIELDS)
      .default('createdAt'),
    sortOrder: Joi.string()
      .valid(...ALLOWED_SORT_ORDERS)
      .default('asc'),
  }),
};

const createProduct = {
  body: Joi.object({
    productName: Joi.string().trim().min(1).max(200).required(),
    productThumb: Joi.string().trim().required(),
    productDescription: Joi.string().trim().max(2000).required(),
    productPrice: Joi.number().min(0).required(),
    productQuantity: Joi.number().integer().min(0).required(),
  }),
};

module.exports = {
  getProducts,
  createProduct,
};
