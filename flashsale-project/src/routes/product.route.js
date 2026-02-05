const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { validateGetProductsQuery, validateCreateProduct } = require('../middleware/validation');

/**
 * @route   GET /v1/api/products
 * @desc    Láº¥y danh sÃ¡ch sáº£n pháº©m
 * @access  Public
 * @query   page, pageSize, sortBy, sortOrder
 */
router.get('/products', validateGetProductsQuery, productController.getProducts);

/**
 * @route   POST /v1/api/products
 * @desc    Táº¡o sáº£n pháº©m má»›i
 * @access  Public (cÃ³ thá»ƒ thÃªm middleware auth sau)
 */
router.post('/products', validateCreateProduct, productController.createProduct);

module.exports = router;