const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { validateGetProductsQuery, validateCreateProduct } = require('../middlewares/product.validation');
const { verifyToken } = require('../middlewares/auth'); 

/**
 * @route   GET /v1/api/products
 * @desc    Lấy danh sách sản phẩm
 * @access  Public
 * @query   page, pageSize, sortBy, sortOrder
 */
router.get('/', validateGetProductsQuery, productController.getProducts);

/**
 * @route   POST /v1/api/products
 * @desc    Tạo sản phẩm mới
 * @access  Public (có thể thêm middleware auth sau)
 */
router.post('/', verifyToken, validateCreateProduct, productController.createProduct);

module.exports = router;