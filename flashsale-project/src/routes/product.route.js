const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const validate = require('../middlewares/validate.middleware');
const productValidation = require('../validation/product.validation');
const { verifyToken } = require('../middlewares/auth');
const { requireShopAdmin } = require('../middlewares/rbac');

/**
 * @route   GET /v1/api/products/search
 * @desc    Tìm kiếm & lọc sản phẩm theo keyword, khoảng giá, sort
 * @access  Public
 * @query   keyword, price_min, price_max, sort (price_asc|price_desc|newest), page, pageSize
 */
router.get('/search', validate(productValidation.searchProducts), productController.searchProducts);

/**
 * @route   GET /v1/api/products/stats
 * @desc    Lấy thống kê sản phẩm
 * @access  Private (Admin)
 */
router.get('/stats', verifyToken, requireShopAdmin, validate(productValidation.getProductStats), productController.getProductStats);

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

/**
 * @route   PUT /v1/api/products/:id/force-start
 * @desc    Kích hoạt Flash Sale ngay lập tức (Force Start)
 * @access  Private (Admin)
 */
router.put('/:id/force-start', verifyToken, requireShopAdmin, validate(productValidation.forceStartProduct), productController.forceStartProduct);

/**
 * @route   PUT /v1/api/products/:id
 * @desc    Cập nhật sản phẩm
 * @access  Private (Admin)
 */
router.put('/:id', verifyToken, requireShopAdmin, validate(productValidation.updateProduct), productController.updateProduct);

module.exports = router;