const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { validateGetProductsQuery, validateCreateProduct } = require('../middleware/validation');

/**
 * @route   GET /v1/api/products
 * @desc    Lấy danh sách sản phẩm
 * @access  Public
 * @query   page, pageSize, sortBy, sortOrder
 */
router.get('/products', validateGetProductsQuery, productController.getProducts);

/**
 * @route   POST /v1/api/products
 * @desc    Tạo sản phẩm mới
 * @access  Public (có thể thêm middleware auth sau)
 */
router.post('/products', validateCreateProduct, productController.createProduct);

module.exports = router;