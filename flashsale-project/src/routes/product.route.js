const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { validateCreateProduct } = require('../middleware/validation');

/**
 * @route   POST /v1/api/products
 * @desc    Tạo sản phẩm mới
 * @access  Public (có thể thêm middleware auth sau)
 */
router.post('/products', validateCreateProduct, productController.createProduct);

module.exports = router;