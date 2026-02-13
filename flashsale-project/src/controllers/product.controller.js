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

  // POST /v1/api/products/reset-stock – SHOP_ADMIN only (RBAC)
  static resetStock = asyncHandler(async (req, res) => {
    // TODO: Member 3 / team bổ sung logic reset Redis inventory
    new OK({
      message: CONST.PRODUCT.MESSAGE.RESET_STOCK_SUCCESS,
      data: { note: 'Placeholder – bổ sung logic reset stock' },
    }).send(res);
  });

  // POST /v1/api/products/force-start – SHOP_ADMIN only (RBAC)
  static forceStart = asyncHandler(async (req, res) => {
    // TODO: Member 3 / team bổ sung logic force start flash sale
    new OK({
      message: CONST.PRODUCT.MESSAGE.FORCE_START_SUCCESS,
      data: { note: 'Placeholder – bổ sung logic force start' },
    }).send(res);
  });

  // GET /v1/api/products/admin/stats – SHOP_ADMIN only (RBAC)
  static getAdminStats = asyncHandler(async (req, res) => {
    // TODO: Member 3 / team bổ sung logic thống kê admin
    new OK({
      message: CONST.PRODUCT.MESSAGE.ADMIN_STATS_SUCCESS,
      data: { note: 'Placeholder – bổ sung logic admin stats' },
    }).send(res);
  });
}

module.exports = ProductController;