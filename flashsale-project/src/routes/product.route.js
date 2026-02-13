const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const validate = require('../middlewares/validate.middleware');
const productValidation = require('../validation/product.validation');
const { verifyToken } = require('../middlewares/auth'); 

/**
 * @route   GET /v1/api/products
 * @desc    Lấy danh sách sản phẩm
 * @access  Public
 * @query   page, pageSize, sortBy, sortOrder
 */
router.get('/', validate(productValidation.getProducts), productController.getProducts);

/**
 * @route   POST /v1/api/products
 * @desc    Tạo sản phẩm mới
 * @access  Private (Admin)
 */
router.post('/', verifyToken, validate(productValidation.createProduct), productController.createProduct);

/**
 * @route   PUT /v1/api/products/:id
 * @desc    Cập nhật sản phẩm
 * @access  Private (Admin)
 */
router.put('/:id', verifyToken, validate(productValidation.updateProduct), productController.updateProduct);

module.exports = router;