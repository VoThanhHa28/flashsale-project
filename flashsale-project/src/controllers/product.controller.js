const ProductService = require('../services/product.service');
const { OK, CREATED } = require('../core/success.response');
const asyncHandler = require('../utils/asyncHandler');
const CONST = require('../constants'); // Import đúng file constant của Product

class ProductController {
  
  // GET /v1/api/products
  static getProducts = asyncHandler(async (req, res) => {
    // Gọi Service, truyền query params vào
    const result = await ProductService.getAllProducts(req.query);

    new OK({
      message: CONST.PRODUCT.MESSAGE.GET_SUCCESS,
      data: result, // Service đã trả về format chuẩn { products, pagination }
    }).send(res);
  });

  // POST /v1/api/products
  static createProduct = asyncHandler(async (req, res) => {
    // Validation (Joi) đã chạy ở Route rồi, ở đây yên tâm nhận data
    const result = await ProductService.createProduct(req.body);

    new CREATED({
      message: CONST.PRODUCT.MESSAGE.CREATE_SUCCESS,
      data: result,
    }).send(res);
  });
}

module.exports = ProductController;