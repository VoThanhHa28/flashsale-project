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
 * @access  Private – SHOP_ADMIN only (RBAC)
 */
router.post('/', verifyToken, requireShopAdmin, validate(productValidation.createProduct), productController.createProduct);

/**
 * @route   POST /v1/api/products/reset-stock
 * @desc    Reset tồn kho (Redis) – Admin only
 * @access  Private – SHOP_ADMIN only (RBAC)
 */
router.post('/reset-stock', verifyToken, requireShopAdmin, productController.resetStock);

/**
 * @route   POST /v1/api/products/force-start
 * @desc    Force start flash sale – Admin only
 * @access  Private – SHOP_ADMIN only (RBAC)
 */
router.post('/force-start', verifyToken, requireShopAdmin, productController.forceStart);

/**
 * @route   GET /v1/api/products/admin/stats
 * @desc    Thống kê admin – Admin only
 * @access  Private – SHOP_ADMIN only (RBAC)
 */
router.get('/admin/stats', verifyToken, requireShopAdmin, productController.getAdminStats);

module.exports = router;