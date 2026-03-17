const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const validate = require("../middlewares/validate.middleware");
const { verifyToken } = require("../middlewares/auth");
const { requireShopAdmin, requireAdmin } = require("../middlewares/rbac");
const adminValidation = require("../validation/admin.validation");

/**
 * Admin Routes
 * Prefix: /admin
 *
 * Phân quyền:
 * - ADMIN: Quyền cao nhất, nhưng chỉ quản lý user/role và hệ thống (health, system config,...)
 * - SHOP_ADMIN: Quản lý vận hành shop: flash sale, sản phẩm, đơn hàng shop, một phần user
 */

router.use(verifyToken);

// ============================================================
// SHOP_ADMIN Routes (ADMIN KHÔNG truy cập)
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

// ============================================================
// ADMIN + SHOP_ADMIN chung (QUẢN LÝ USER & SYSTEM)
// Theo yêu cầu: ADMIN không quản lý product/flash-sale,
// nhưng vẫn được quản lý user và health system.
// => Dùng requireAdmin ở các route này.
// ============================================================

/**
 * GET /admin/users - Danh sách user phân trang (ADMIN)
 */
router.get("/users", requireAdmin, validate(adminValidation.getUsers), adminController.getUsers);

/**
 * PATCH /admin/users/:id/ban - Khóa user (status inactive) (ADMIN)
 */
router.patch("/users/:id/ban", requireAdmin, validate(adminValidation.banUser), adminController.banUser);

/**
 * GET /admin/health - Health check Mongo + Redis (ADMIN)
 */
router.get("/health", requireAdmin, adminController.health);

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
