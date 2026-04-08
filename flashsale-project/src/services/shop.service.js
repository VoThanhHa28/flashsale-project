'use strict';

const { NotFoundError, BadRequestError } = require('../core/error.response');
const CONST = require('../constants');
const ShopRepo = require('../repositories/shop.repo');
const { getIO } = require('../config/socket');

class ShopService {
    static async getOrders({ status, page = 1, pageSize = 20 }) {
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.min(Math.max(1, parseInt(pageSize)), 100);
        const skip = (pageNum - 1) * limitNum;

        const filter = {};
        if (status) filter.status = status;

        const [orders, total] = await Promise.all([
            ShopRepo.findAllOrders({ filter, skip, limit: limitNum }),
            ShopRepo.countOrders(filter),
        ]);

        return {
            orders,
            pagination: {
                page: pageNum,
                pageSize: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
            },
        };
    }

    static async updateOrderStatus(orderId, status) {
        if (!CONST.SHOP.ALLOWED_UPDATE_STATUSES.includes(status)) {
            throw new BadRequestError(CONST.SHOP.MESSAGE.INVALID_STATUS);
        }

        const order = await ShopRepo.findOrderById(orderId);
        if (!order) throw new NotFoundError(CONST.SHOP.MESSAGE.ORDER_NOT_FOUND);

        const currentStatus = String(order.status || "");
        const validTransitions = {
            pending: ["confirmed", "cancelled"],
            confirmed: ["shipping", "cancelled"],
            shipping: ["completed", "cancelled"],
            completed: [],
            cancelled: [],
            failed: [],
            success: [],
            pending_payment: [],
        };
        const nextAllowed = validTransitions[currentStatus] || [];
        if (!nextAllowed.includes(status)) {
            throw new BadRequestError(CONST.SHOP.MESSAGE.INVALID_STATUS_TRANSITION);
        }

        const updated = await ShopRepo.updateOrderStatus(orderId, status);

        try {
            const io = getIO();
            const uid = String(order.userId || updated?.userId || '').trim();
            if (uid) {
                const room = CONST.SOCKET.SOCKET_ROOM.USER(uid);
                io.to(room).emit(CONST.SOCKET.SOCKET_EVENT.ORDER_STATUS_UPDATED, {
                    orderId: String(orderId),
                    status,
                    userId: uid,
                });
            }
        } catch (emitErr) {
            console.warn('[ShopService] ORDER_STATUS_UPDATED emit failed:', emitErr.message);
        }

        return updated;
    }

    static async getRevenueStats(days = CONST.SHOP.REVENUE_DAYS) {
        const revenueDays = Math.max(
            1,
            Math.min(CONST.SHOP.MAX_REVENUE_DAYS, parseInt(days, 10) || CONST.SHOP.REVENUE_DAYS)
        );

        const dailyRevenue = await ShopRepo.getRevenueLastDays(revenueDays);

        const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.totalRevenue, 0);
        const totalOrders = dailyRevenue.reduce((sum, d) => sum + d.totalOrders, 0);

        return {
            period: `${revenueDays} ngày gần nhất`,
            totalRevenue,
            totalOrders,
            daily: dailyRevenue,
        };
    }
}

module.exports = ShopService;
