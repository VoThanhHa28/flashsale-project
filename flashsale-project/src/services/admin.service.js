const mongoose = require("mongoose");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const redisClient = require("../config/redis");
const UserRepo = require("../repositories/user.repo");
const ActivityLogRepo = require("../repositories/activityLog.repo");
const { BadRequestError, NotFoundError } = require("../core/error.response");
const { getIO } = require("../config/socket");
const { SOCKET_EVENT, SOCKET_ROOM } = require("../constants/socket.constant");
const OrderService = require("./order.service");
const FlashSaleCampaignService = require("./flashSaleCampaign.service");
const CONST = require("../constants");

class AdminService {
    static async activateFlashSale({ productId, startTime, endTime }) {
        if (!productId) {
            throw new BadRequestError("productId là bắt buộc");
        }

        const { campaign, product } = await FlashSaleCampaignService.upsertSingleProductWindow({
            productId,
            startTime,
            endTime,
        });

        await OrderService.initInventory(productId);

        return {
            productId: product._id,
            productName: product.productName,
            campaignId: campaign._id,
            startTime: campaign.startTime,
            endTime: campaign.endTime,
            quantity: product.productQuantity,
        };
    }

    static async hotActivateFlashSale({ productId, duration = 3600 }) {
        if (!productId) {
            throw new BadRequestError("productId là bắt buộc");
        }

        const { campaign, product } = await FlashSaleCampaignService.hotUpsertSingleProduct({
            productId,
            durationSeconds: duration,
        });

        await OrderService.initInventory(productId);

        try {
            const io = getIO();
            const payload = {
                productId: product._id.toString(),
                productName: product.productName,
                productPrice: product.productPrice,
                productThumb: product.productThumb,
                startTime: campaign.startTime,
                endTime: campaign.endTime,
                quantity: product.productQuantity,
                message: `Flash Sale ${product.productName} đã bắt đầu!`,
            };
            const productRoom = SOCKET_ROOM.PRODUCT(productId);
            io.to(productRoom).emit(SOCKET_EVENT.FLASH_SALE_START, payload);
            io.to(SOCKET_ROOM.ALL_USERS).emit(SOCKET_EVENT.FLASH_SALE_START, payload);
            console.log(`[Admin] ✅ Đã bắn socket event FLASH_SALE_START cho productId: ${productId}`);
        } catch (error) {
            console.error("[Admin] ❌ Lỗi khi bắn socket event:", error.message);
        }

        return {
            productId: product._id,
            productName: product.productName,
            campaignId: campaign._id,
            startTime: campaign.startTime,
            endTime: campaign.endTime,
            quantity: product.productQuantity,
            duration: `${duration} seconds`,
            socketEmitted: true,
        };
    }

    /**
     * Danh sách user phân trang (admin).
     */
    static async getUsers(query = {}) {
        return UserRepo.findAllPaginated({
            page: query.page,
            limit: query.limit,
        });
    }

    /**
     * Khóa user (set status inactive).
     */
    static async banUser(id) {
        const user = await UserRepo.updateStatusById(id, 'inactive');
        if (!user) {
            throw new NotFoundError(CONST.ADMIN.MESSAGE.USER_NOT_FOUND);
        }
        return { user };
    }

    /**
     * Health check: Mongo + Redis.
     */
    static async healthCheck() {
        let mongo = 'fail';
        if (mongoose.connection.readyState === 1) {
            mongo = 'ok';
        }

        let redis = 'fail';
        try {
            await redisClient.ping();
            redis = 'ok';
        } catch (_) {
            // keep redis = 'fail'
        }

        return { mongo, redis };
    }

    static async getRoles() {
        const roles = await Role.find({ is_deleted: false, isActive: true })
            .select("roleCode roleName description isActive")
            .sort({ roleCode: 1 })
            .lean();

        return { roles };
    }

    static async assignRoleToUser(userId, roleId) {
        const [user, role] = await Promise.all([
            User.findOne({ _id: userId, is_deleted: false }),
            Role.findOne({ _id: roleId, is_deleted: false, isActive: true }),
        ]);

        if (!user) {
            throw new NotFoundError(CONST.ADMIN.MESSAGE.USER_NOT_FOUND);
        }

        if (!role) {
            throw new NotFoundError(CONST.ADMIN.MESSAGE.ROLE_NOT_FOUND);
        }

        user.usr_role = role._id;
        await user.save();

        const updatedUser = await User.findById(user._id)
            .select("-password")
            .populate("usr_role", "roleCode roleName")
            .lean();

        return { user: updatedUser };
    }

    static async listFlashSaleCampaigns(query) {
        return FlashSaleCampaignService.listCampaigns({
            page: query.page,
            limit: query.limit,
            includeDeleted: query.includeDeleted,
        });
    }

    static async getFlashSaleCampaign(id) {
        return FlashSaleCampaignService.getCampaignById(id);
    }

    static async createFlashSaleCampaign(body) {
        return FlashSaleCampaignService.createCampaign(body);
    }

    static async updateFlashSaleCampaign(id, body) {
        return FlashSaleCampaignService.updateCampaign(id, body);
    }

    static async deleteFlashSaleCampaign(id) {
        return FlashSaleCampaignService.softDeleteCampaign(id);
    }

    static async getActivityLogs(query = {}) {
        return ActivityLogRepo.findPaginated({
            page: query.page,
            limit: query.limit,
            method: query.method,
        });
    }
}

module.exports = AdminService;
