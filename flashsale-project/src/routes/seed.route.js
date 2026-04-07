const express = require("express");
const router = express.Router();
const seedController = require("../controllers/seed.controller");

/**
 * Seed Routes - Tạo dữ liệu test
 * Prefix: /seed
 *
 * ⚠️ CHÚ Ý: Các routes này chỉ dùng trong môi trường development/testing
 * Nên tắt hoặc thêm authentication trong production
 */

const rejectProduction = (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
        return res.status(403).json({
            statusCode: 403,
            message: "Seed shop-admin không khả dụng trong production.",
        });
    }
    next();
};

/**
 * Tạo số lượng lớn users để test load
 * POST /seed/users
 * Body: { count } // optional, default 1000
 *
 * Response:
 * {
 *   created: 1000,
 *   defaultPassword: "123456",
 *   emailPattern: "testuser[timestamp]_[1-1000]@flashsale.test"
 * }
 */
router.post("/users", seedController.seedUsers);

/**
 * Seed master data cứng vào DB: roles, categories
 * POST /seed/master-data
 */
router.post("/master-data", seedController.seedMasterData);

/**
 * Tạo hoặc nâng user dev lên SHOP_ADMIN (email/mật khẩu trong response — chỉ dev)
 * POST /seed/shop-admin
 */
router.post("/shop-admin", rejectProduction, seedController.seedShopAdmin);

/**
 * Xóa tất cả test users
 * DELETE /seed/users
 *
 * Response:
 * {
 *   deleted: 1000
 * }
 */
router.delete("/users", seedController.cleanupTestUsers);

module.exports = router;
