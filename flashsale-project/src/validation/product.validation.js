// validations/product.validation.js
const Joi = require('joi');

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
    isPublished: Joi.boolean().default(true),
  }),
};

const updateProduct = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
  body: Joi.object({
    productName: Joi.string().trim().min(1).max(200),
    productThumb: Joi.string().trim(),
    productDescription: Joi.string().trim().max(2000),
    productPrice: Joi.number().min(0),
    productQuantity: Joi.number().integer().min(0),
    isPublished: Joi.boolean(),
  }),
};

const searchProducts = {
  query: Joi.object({
    keyword: Joi.string().trim().max(200).allow('').default(''),
    price_min: Joi.number().min(0).default(0),
    price_max: Joi.number().min(0).default(0)
      .messages({
        'number.min': 'Giá tối đa phải lớn hơn hoặc bằng 0',
      }),
    sort: Joi.string()
      .valid('price_asc', 'price_desc', 'newest')
      .default('newest'),
    page: Joi.number().integer().min(1).default(1),
    pageSize: Joi.number().integer().min(1).max(100).default(20),
  }),
};

const getProductStats = {};

const forceStartProduct = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

const deleteProduct = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  searchProducts,
  getProductStats,
  forceStartProduct,
  deleteProduct,
};