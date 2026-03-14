const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Product = require("../models/product.model");
const redisClient = require("../config/redis");
const UserRepo = require("../repositories/user.repo");
const { BadRequestError, NotFoundError, ConflictRequestError } = require("../core/error.response");
const { getIO } = require("../config/socket");
const { SOCKET_EVENT, SOCKET_ROOM } = require("../constants/socket.constant");
const OrderService = require("./order.service");
const CONST = require("../constants");

class AdminService {
    /**
     * Kích hoạt Flash Sale cho sản phẩm
     * @param {Object} data - { productId, startTime, endTime }
     */
    static async activateFlashSale({ productId, startTime, endTime }) {
        if (!productId) {
            throw new BadRequestError("productId là bắt buộc");
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new NotFoundError("Không tìm thấy sản phẩm");
        }

        // Validate thời gian
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new BadRequestError("Thời gian không hợp lệ");
        }

        if (start >= end) {
            throw new BadRequestError("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc");
        }

        // Cập nhật thời gian flash sale
        product.productStartTime = start;
        product.productEndTime = end;
        await product.save();

        // Khởi tạo inventory trong Redis
        await OrderService.initInventory(productId);

        return {
            productId: product._id,
            productName: product.productName,
            startTime: product.productStartTime,
            endTime: product.productEndTime,
            quantity: product.productQuantity,
        };
    }

    /**
     * Kích hoạt nóng Flash Sale (Hot Activation)
     * Kích hoạt ngay lập tức và bắn socket event
     * @param {Object} data - { productId, duration }
     */
    static async hotActivateFlashSale({ productId, duration = 3600 }) {
        if (!productId) {
            throw new BadRequestError("productId là bắt buộc");
        }

        const product = await Product.findById(productId);
        if (!product) {
            throw new NotFoundError("Không tìm thấy sản phẩm");
        }

        // Kích hoạt ngay lập tức
        const now = new Date();
        const endTime = new Date(now.getTime() + duration * 1000); // duration in seconds

        product.productStartTime = now;
        product.productEndTime = endTime;
        await product.save();

        // Khởi tạo inventory trong Redis
        await OrderService.initInventory(productId);

        // Bắn socket event flash-sale-start
        try {
            const io = getIO();

            // Emit to product room
            const productRoom = SOCKET_ROOM.PRODUCT(productId);
            io.to(productRoom).emit(SOCKET_EVENT.FLASH_SALE_START, {
                productId: product._id.toString(),
                productName: product.productName,
                productPrice: product.productPrice,
                productThumb: product.productThumb,
                startTime: product.productStartTime,
                endTime: product.productEndTime,
                quantity: product.productQuantity,
                message: `Flash Sale ${product.productName} đã bắt đầu!`,
            });

            // Emit to all users
            io.to(SOCKET_ROOM.ALL_USERS).emit(SOCKET_EVENT.FLASH_SALE_START, {
                productId: product._id.toString(),
                productName: product.productName,
                productPrice: product.productPrice,
                productThumb: product.productThumb,
                startTime: product.productStartTime,
                endTime: product.productEndTime,
                quantity: product.productQuantity,
                message: `Flash Sale ${product.productName} đã bắt đầu!`,
            });

            console.log(`[Admin] ✅ Đã bắn socket event FLASH_SALE_START cho productId: ${productId}`);
        } catch (error) {
            console.error("[Admin] ❌ Lỗi khi bắn socket event:", error.message);
            // Không throw error, vì flash sale đã được kích hoạt thành công
        }

        return {
            productId: product._id,
            productName: product.productName,
            startTime: product.productStartTime,
            endTime: product.productEndTime,
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

    // ============================================================
    // ADMIN Only Methods
    // ============================================================

    /**
     * Danh sách SHOP_ADMIN (chỉ ADMIN mới xem được).
     */
    static async getShopAdmins(query = {}) {
        return UserRepo.findAllPaginated({
            page: query.page,
            limit: query.limit,
            filter: { usr_role: CONST.AUTH.USR_ROLE.SHOP_ADMIN },
        });
    }

    /**
     * Tạo SHOP_ADMIN mới (chỉ ADMIN mới tạo được).
     */
    static async createShopAdmin({ email, password, name }) {
        const existingUser = await UserRepo.findByEmail(email);
        if (existingUser) {
            throw new ConflictRequestError(CONST.AUTH.MESSAGE.EMAIL_EXISTS);
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const shopAdmin = await UserRepo.create({
            email,
            password: hashedPassword,
            name,
            usr_role: CONST.AUTH.USR_ROLE.SHOP_ADMIN,
            status: 'active',
        });

        return { user: shopAdmin };
    }

    /**
     * Xóa SHOP_ADMIN (soft delete, chỉ ADMIN mới xóa được).
     */
    static async deleteShopAdmin(id) {
        const user = await UserRepo.findById(id);
        if (!user) {
            throw new NotFoundError(CONST.ADMIN.MESSAGE.USER_NOT_FOUND);
        }

        if (user.usr_role !== CONST.AUTH.USR_ROLE.SHOP_ADMIN) {
            throw new BadRequestError('Chỉ có thể xóa tài khoản SHOP_ADMIN');
        }

        const deletedUser = await UserRepo.softDeleteById(id);
        return { user: deletedUser };
    }

    /**
     * Thay đổi role của user (chỉ ADMIN mới đổi được).
     * Không thể đổi role của ADMIN khác.
     */
    static async changeUserRole(id, newRole) {
        const user = await UserRepo.findById(id);
        if (!user) {
            throw new NotFoundError(CONST.ADMIN.MESSAGE.USER_NOT_FOUND);
        }

        if (user.usr_role === CONST.AUTH.USR_ROLE.ADMIN) {
            throw new BadRequestError('Không thể thay đổi role của ADMIN');
        }

        const validRoles = [
            CONST.AUTH.USR_ROLE.USER,
            CONST.AUTH.USR_ROLE.SHOP_ADMIN,
        ];
        if (!validRoles.includes(newRole)) {
            throw new BadRequestError('Role không hợp lệ');
        }

        const updatedUser = await UserRepo.updateRoleById(id, newRole);
        return { user: updatedUser };
    }
}

module.exports = AdminService;
