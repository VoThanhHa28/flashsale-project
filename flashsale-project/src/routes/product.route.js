const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

/**
 * @route   GET /v1/api/product
 * @desc    Lấy danh sách tất cả sản phẩm
 * @access  Public
 */
router.get('/', productController.getProducts);

/**
 * @route   GET /v1/api/product/:id
 * @desc    Lấy chi tiết sản phẩm theo ID
 * @access  Public
 */
router.get('/:id', productController.getProductById);

module.exports = router;
