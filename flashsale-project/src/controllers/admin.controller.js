const asyncHandler = require("../utils/asyncHandler");
const AdminService = require("../services/admin.service");
const { SuccessResponse } = require("../core/success.response");

class AdminController {
    /**
     * Kích hoạt Flash Sale cho một sản phẩm
     * POST /admin/flash-sale/activate
     * Body: { productId, startTime, endTime }
     */
    activateFlashSale = asyncHandler(async (req, res) => {
        const result = await AdminService.activateFlashSale(req.body);

        new SuccessResponse({
            message: "Flash Sale đã được kích hoạt thành công",
            metadata: result,
        }).send(res);
    });

    /**
     * Kích hoạt nóng Flash Sale (Hot Activation)
     * POST /admin/flash-sale/hot-activate
     * Body: { productId }
     * Kích hoạt ngay lập tức, bắn socket event flash-sale-start
     */
    hotActivateFlashSale = asyncHandler(async (req, res) => {
        const result = await AdminService.hotActivateFlashSale(req.body);

        new SuccessResponse({
            message: "Flash Sale đã được kích hoạt nóng thành công",
            metadata: result,
        }).send(res);
    });
}

module.exports = new AdminController();
