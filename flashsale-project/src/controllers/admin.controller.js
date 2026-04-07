const asyncHandler = require("../utils/asyncHandler");
const AdminService = require("../services/admin.service");
const PaymentService = require("../services/payment.service");
const { SuccessResponse, OK, CREATED } = require("../core/success.response");
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

    getRoles = asyncHandler(async (req, res) => {
        const result = await AdminService.getRoles();
        return new OK({
            message: CONST.ADMIN.MESSAGE.GET_ROLES_SUCCESS,
            data: result,
        }).send(res);
    });

    assignRoleToUser = asyncHandler(async (req, res) => {
        const result = await AdminService.assignRoleToUser(req.params.id, req.body.roleId);
        return new OK({
            message: CONST.ADMIN.MESSAGE.ASSIGN_ROLE_SUCCESS,
            data: result,
        }).send(res);
    });

    listFlashSaleCampaigns = asyncHandler(async (req, res) => {
        const result = await AdminService.listFlashSaleCampaigns(req.query);
        return new OK({
            message: CONST.ADMIN.MESSAGE.LIST_CAMPAIGNS_SUCCESS,
            data: result,
        }).send(res);
    });

    getFlashSaleCampaign = asyncHandler(async (req, res) => {
        const campaign = await AdminService.getFlashSaleCampaign(req.params.id);
        return new OK({
            message: CONST.ADMIN.MESSAGE.GET_CAMPAIGN_SUCCESS,
            data: { campaign },
        }).send(res);
    });

    createFlashSaleCampaign = asyncHandler(async (req, res) => {
        const campaign = await AdminService.createFlashSaleCampaign(req.body);
        return new CREATED({
            message: CONST.ADMIN.MESSAGE.CREATE_CAMPAIGN_SUCCESS,
            data: { campaign },
        }).send(res);
    });

    updateFlashSaleCampaign = asyncHandler(async (req, res) => {
        const campaign = await AdminService.updateFlashSaleCampaign(req.params.id, req.body);
        return new OK({
            message: CONST.ADMIN.MESSAGE.UPDATE_CAMPAIGN_SUCCESS,
            data: { campaign },
        }).send(res);
    });

    deleteFlashSaleCampaign = asyncHandler(async (req, res) => {
        const result = await AdminService.deleteFlashSaleCampaign(req.params.id);
        return new OK({
            message: CONST.ADMIN.MESSAGE.DELETE_CAMPAIGN_SUCCESS,
            data: result,
        }).send(res);
    });

    getActivityLogs = asyncHandler(async (req, res) => {
        const result = await AdminService.getActivityLogs(req.query);
        return new OK({
            message: CONST.ADMIN.MESSAGE.GET_LOGS_SUCCESS,
            data: result,
        }).send(res);
    });

    updatePaymentStatus = asyncHandler(async (req, res) => {
        const result = await PaymentService.updatePaymentStatusByOrderIdForAdmin(
            req.params.orderId,
            req.body.status,
        );
        return new OK({
            message: CONST.ADMIN.MESSAGE.PAYMENT_STATUS_UPDATED,
            data: result,
        }).send(res);
    });
}

module.exports = new AdminController();
