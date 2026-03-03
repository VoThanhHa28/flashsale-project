const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
// const { verifyToken } = require('../middlewares/auth');
// const { checkRole } = require('../middlewares/role');

/**
 * Admin Routes - Quản lý Flash Sale
 * Prefix: /admin
 */

// TODO: Thêm middleware authentication và role checking khi cần
// router.use(verifyToken);
// router.use(checkRole('admin'));

/**
 * Kích hoạt Flash Sale thông thường
 * POST /admin/flash-sale/activate
 * Body: { productId, startTime, endTime }
 */
router.post("/flash-sale/activate", adminController.activateFlashSale);

/**
 * Kích hoạt nóng Flash Sale (Hot Activation)
 * POST /admin/flash-sale/hot-activate
 * Body: { productId, duration } // duration in seconds, default 3600 (1 hour)
 */
router.post("/flash-sale/hot-activate", adminController.hotActivateFlashSale);

module.exports = router;
