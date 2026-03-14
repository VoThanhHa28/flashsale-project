const asyncHandler = require("../utils/asyncHandler");
const AdminService = require("../services/admin.service");
const { SuccessResponse, OK } = require("../core/success.response");
const CONST = require("../constants");

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
            data: result,
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
            data: result,
        }).send(res);
    });

    getUsers = asyncHandler(async (req, res) => {
        const result = await AdminService.getUsers(req.query);
        return new OK({
            message: CONST.ADMIN.MESSAGE.GET_USERS_SUCCESS,
            data: result,
        }).send(res);
    });

    banUser = asyncHandler(async (req, res) => {
        const result = await AdminService.banUser(req.params.id);
        return new OK({
            message: CONST.ADMIN.MESSAGE.BAN_SUCCESS,
            data: result,
        }).send(res);
    });

    health = asyncHandler(async (req, res) => {
        const result = await AdminService.healthCheck();
        return new OK({
            message: CONST.ADMIN.MESSAGE.HEALTH_SUCCESS,
            data: result,
        }).send(res);
    });

    // ============================================================
    // ADMIN Only Controllers
    // ============================================================

    /**
     * Danh sách SHOP_ADMIN
     * GET /admin/shop-admins
     */
    getShopAdmins = asyncHandler(async (req, res) => {
        const result = await AdminService.getShopAdmins(req.query);
        return new OK({
            message: 'Lấy danh sách SHOP_ADMIN thành công',
            data: result,
        }).send(res);
    });

    /**
     * Tạo SHOP_ADMIN mới
     * POST /admin/shop-admins
     */
    createShopAdmin = asyncHandler(async (req, res) => {
        const result = await AdminService.createShopAdmin(req.body);
        return new SuccessResponse({
            message: 'Tạo SHOP_ADMIN thành công',
            data: result,
        }).send(res);
    });

    /**
     * Xóa SHOP_ADMIN
     * DELETE /admin/shop-admins/:id
     */
    deleteShopAdmin = asyncHandler(async (req, res) => {
        const result = await AdminService.deleteShopAdmin(req.params.id);
        return new OK({
            message: 'Xóa SHOP_ADMIN thành công',
            data: result,
        }).send(res);
    });

    /**
     * Thay đổi role của user
     * PATCH /admin/users/:id/role
     */
    changeUserRole = asyncHandler(async (req, res) => {
        const result = await AdminService.changeUserRole(req.params.id, req.body.role);
        return new OK({
            message: 'Thay đổi role thành công',
            data: result,
        }).send(res);
    });
}

module.exports = new AdminController();
