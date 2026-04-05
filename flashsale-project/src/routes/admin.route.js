const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const validate = require("../middlewares/validate.middleware");
const { verifyToken } = require("../middlewares/auth");
const { requireShopAdmin } = require("../middlewares/rbac");
const adminValidation = require("../validation/admin.validation");
// const { verifyToken } = require('../middlewares/auth');
// const { checkRole } = require('../middlewares/role');

/**
 * Admin Routes - Quản lý Flash Sale
 * Prefix: /admin
 */

router.use(verifyToken);
router.use(requireShopAdmin);

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

/**
 * GET /admin/users - Danh sách user phân trang (SHOP_ADMIN)
 */
router.get("/users", validate(adminValidation.getUsers), adminController.getUsers);

/**
 * GET /admin/roles - Lấy danh sách role khả dụng
 */
router.get("/roles", adminController.getRoles);

/**
 * PATCH /admin/users/:id/ban - Khóa user (status inactive)
 */
router.patch("/users/:id/ban", validate(adminValidation.banUser), adminController.banUser);

/**
 * PATCH /admin/users/:id/role - Gán role động cho user
 */
router.patch("/users/:id/role", validate(adminValidation.assignRoleToUser), adminController.assignRoleToUser);

/**
 * GET /admin/health - Health check Mongo + Redis
 */
router.get("/health", adminController.health);

/**
 * PATCH /admin/payments/:orderId/status — Cập nhật trạng thái thanh toán (shop admin)
 */
router.patch(
    "/payments/:orderId/status",
    validate(adminValidation.patchPaymentStatus),
    adminController.patchPaymentStatus,
);

module.exports = router;
