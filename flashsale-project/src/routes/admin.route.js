const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const validate = require("../middlewares/validate.middleware");
const { verifyToken } = require("../middlewares/auth");
const { requireShopAdmin, requireAdmin } = require("../middlewares/rbac");
const adminValidation = require("../validation/admin.validation");

/**
 * Admin Routes - Quản lý Flash Sale & Hệ thống
 * Prefix: /admin
 * 
 * Phân quyền:
 * - ADMIN: Quyền cao nhất, truy cập được tất cả routes
 * - SHOP_ADMIN: Quản lý shop, flash sale, users
 */

router.use(verifyToken);

// ============================================================
// SHOP_ADMIN Routes (ADMIN cũng có thể truy cập)
// ============================================================

/**
 * Kích hoạt Flash Sale thông thường
 * POST /admin/flash-sale/activate
 * Body: { productId, startTime, endTime }
 */
router.post("/flash-sale/activate", requireShopAdmin, adminController.activateFlashSale);

/**
 * Kích hoạt nóng Flash Sale (Hot Activation)
 * POST /admin/flash-sale/hot-activate
 * Body: { productId, duration } // duration in seconds, default 3600 (1 hour)
 */
router.post("/flash-sale/hot-activate", requireShopAdmin, adminController.hotActivateFlashSale);

/**
 * GET /admin/users - Danh sách user phân trang
 */
router.get("/users", requireShopAdmin, validate(adminValidation.getUsers), adminController.getUsers);

/**
 * PATCH /admin/users/:id/ban - Khóa user (status inactive)
 */
router.patch("/users/:id/ban", requireShopAdmin, validate(adminValidation.banUser), adminController.banUser);

/**
 * GET /admin/health - Health check Mongo + Redis
 */
router.get("/health", requireShopAdmin, adminController.health);

// ============================================================
// ADMIN Only Routes (Chỉ ADMIN mới có quyền truy cập)
// ============================================================

/**
 * GET /admin/shop-admins - Danh sách SHOP_ADMIN
 */
router.get("/shop-admins", requireAdmin, validate(adminValidation.getUsers), adminController.getShopAdmins);

/**
 * POST /admin/shop-admins - Tạo SHOP_ADMIN mới
 */
router.post("/shop-admins", requireAdmin, validate(adminValidation.createShopAdmin), adminController.createShopAdmin);

/**
 * DELETE /admin/shop-admins/:id - Xóa SHOP_ADMIN
 */
router.delete("/shop-admins/:id", requireAdmin, validate(adminValidation.banUser), adminController.deleteShopAdmin);

/**
 * PATCH /admin/users/:id/role - Thay đổi role của user (chỉ ADMIN)
 */
router.patch("/users/:id/role", requireAdmin, validate(adminValidation.changeUserRole), adminController.changeUserRole);

module.exports = router;
