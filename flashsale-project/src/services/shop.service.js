'use strict';

const { NotFoundError } = require('../core/error.response');
const CONST = require('../constants');
const ShopRepo = require('../repositories/shop.repo');

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
        const order = await ShopRepo.findOrderById(orderId);
        if (!order) throw new NotFoundError(CONST.SHOP.MESSAGE.ORDER_NOT_FOUND);

        const updated = await ShopRepo.updateOrderStatus(orderId, status);
        return updated;
    }

    static async getRevenueStats() {
        const dailyRevenue = await ShopRepo.getRevenueLast7Days(CONST.SHOP.REVENUE_DAYS);

        const totalRevenue = dailyRevenue.reduce((sum, d) => sum + d.totalRevenue, 0);
        const totalOrders = dailyRevenue.reduce((sum, d) => sum + d.totalOrders, 0);

        return {
            period: `${CONST.SHOP.REVENUE_DAYS} ngày gần nhất`,
            totalRevenue,
            totalOrders,
            daily: dailyRevenue,
        };
    }
}

module.exports = ShopService;
