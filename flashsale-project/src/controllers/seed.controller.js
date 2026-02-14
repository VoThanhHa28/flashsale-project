const asyncHandler = require("../utils/asyncHandler");
const SeedService = require("../services/seed.service");
const { SuccessResponse } = require("../core/success.response");

class SeedController {
    /**
     * Tạo nhanh 1000 users với password 123456
     * POST /seed/users
     * Body: { count } // optional, default 1000
     */
    seedUsers = asyncHandler(async (req, res) => {
        const { count = 1000 } = req.body;

        const result = await SeedService.seedUsers(count);

        new SuccessResponse({
            message: `Đã tạo thành công ${result.created} users`,
            metadata: result,
        }).send(res);
    });

    /**
     * Xóa tất cả users test (có email chứa "test")
     * DELETE /seed/users
     */
    cleanupTestUsers = asyncHandler(async (req, res) => {
        const result = await SeedService.cleanupTestUsers();

        new SuccessResponse({
            message: `Đã xóa ${result.deleted} test users`,
            metadata: result,
        }).send(res);
    });
}

module.exports = new SeedController();
