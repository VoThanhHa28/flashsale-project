const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const validate = require('../middlewares/validate.middleware');
const productValidation = require('../validation/product.validation');
const { verifyToken } = require('../middlewares/auth');
const { requireShopAdmin } = require('../middlewares/rbac');

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
 * @access  Private (SHOP_ADMIN only)
 */
router.post('/', verifyToken, requireShopAdmin, validate(productValidation.createProduct), productController.createProduct);

module.exports = router;