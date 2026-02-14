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
  'productStartTime',
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
    startTime: Joi.date().iso().required()
      .messages({
        'date.base': 'Thời gian bắt đầu phải là định dạng ngày hợp lệ',
        'any.required': 'Thời gian bắt đầu là bắt buộc'
      }),
    endTime: Joi.date().iso().required()
      .greater(Joi.ref('startTime'))
      .messages({
        'date.base': 'Thời gian kết thúc phải là định dạng ngày hợp lệ',
        'any.required': 'Thời gian kết thúc là bắt buộc',
        'date.greater': 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu'
      }),
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
    startTime: Joi.date().iso(),
    endTime: Joi.date().iso(),
    isPublished: Joi.boolean(),
  }).custom((value, helpers) => {
    if (value.startTime && value.endTime) {
      const start = new Date(value.startTime);
      const end = new Date(value.endTime);
      if (start >= end) {
        return helpers.error('custom.startTimeMustBeLessThanEndTime');
      }
    }
    return value;
  }).messages({
    'custom.startTimeMustBeLessThanEndTime': 'Thời gian kết thúc phải lớn hơn thời gian bắt đầu'
  }),
};

const getProductStats = {};

const forceStartProduct = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  getProductStats,
  forceStartProduct,
};