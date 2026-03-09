const ProductService = require('../services/product.service');
const { OK, CREATED } = require('../core/success.response');
const asyncHandler = require('../utils/asyncHandler');
const CONST = require('../constants');

class ProductController {

  // GET /v1/api/products/search
  static searchProducts = asyncHandler(async (req, res) => {
    const result = await ProductService.searchProducts(req.query);
    new OK({
      message: CONST.PRODUCT.MESSAGE.SEARCH_SUCCESS,
      data: result,
    }).send(res);
  });

  // GET /v1/api/products
  static getProducts = asyncHandler(async (req, res) => {
    const result = await ProductService.getAllProducts(req.query);
    new OK({
      message: CONST.PRODUCT.MESSAGE.GET_SUCCESS,
      data: result,
    }).send(res);
  });

  // POST /v1/api/products
  static createProduct = asyncHandler(async (req, res) => {
    const result = await ProductService.createProduct(req.body);
    new CREATED({
      message: CONST.PRODUCT.MESSAGE.CREATE_SUCCESS,
      data: result,
    }).send(res);
  });
  // PUT /v1/api/products/:id
  static updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ProductService.updateProduct(id, req.body);
    new OK({
      message: CONST.PRODUCT.MESSAGE.UPDATE_SUCCESS,
      data: result,
    }).send(res);
  });

  // DELETE /v1/api/products/:id
  static deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ProductService.deleteProduct(id);
    new OK({
      message: CONST.PRODUCT.MESSAGE.DELETE_SUCCESS,
      data: result,
    }).send(res);
  });

  // GET /v1/api/products/stats
  static getProductStats = asyncHandler(async (req, res) => {
    const result = await ProductService.getProductStats();
    new OK({
      message: CONST.PRODUCT.MESSAGE.GET_STATS_SUCCESS,
      data: result,
    }).send(res);
  });

  // PUT /v1/api/products/:id/force-start
  static forceStartProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await ProductService.forceStartProduct(id);
    new OK({
      message: CONST.PRODUCT.MESSAGE.FORCE_START_SUCCESS,
      data: result,
    }).send(res);
  });
}

module.exports = ProductController;