'use strict';

const express = require('express');
const router = express.Router();
const ShopController = require('../controllers/shop.controller');
const validate = require('../middlewares/validate.middleware');
const shopValidation = require('../validation/shop.validation');
const { verifyToken } = require('../middlewares/auth');
const { requireShopAdmin } = require('../middlewares/rbac');

/**
 * @route   GET /v1/api/shop/orders
 * @desc    Lấy danh sách đơn hàng của shop (có filter status, phân trang)
 * @access  Private (SHOP_ADMIN)
 */
router.get(
    '/orders',
    verifyToken,
    requireShopAdmin,
    validate(shopValidation.getOrders),
    ShopController.getOrders
);

/**
 * @route   PATCH /v1/api/shop/orders/:id/status
 * @desc    Cập nhật trạng thái đơn hàng (confirmed | cancelled)
 * @access  Private (SHOP_ADMIN)
 */
router.patch(
    '/orders/:id/status',
    verifyToken,
    requireShopAdmin,
    validate(shopValidation.updateOrderStatus),
    ShopController.updateOrderStatus
);

/**
 * @route   GET /v1/api/shop/stats/revenue
 * @desc    Báo cáo doanh thu 7 ngày gần nhất
 * @access  Private (SHOP_ADMIN)
 */
router.get(
    '/stats/revenue',
    verifyToken,
    requireShopAdmin,
    validate(shopValidation.getRevenueStats),
    ShopController.getRevenueStats
);

module.exports = router;
