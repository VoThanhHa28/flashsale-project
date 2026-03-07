'use strict';

const { OK } = require('../core/success.response');
const asyncHandler = require('../utils/asyncHandler');
const ShopService = require('../services/shop.service');
const CONST = require('../constants');

class ShopController {
    // GET /v1/api/shop/orders
    static getOrders = asyncHandler(async (req, res) => {
        const result = await ShopService.getOrders(req.query);
        new OK({
            message: CONST.SHOP.MESSAGE.GET_ORDERS_SUCCESS,
            data: result,
        }).send(res);
    });

    // PATCH /v1/api/shop/orders/:id/status
    static updateOrderStatus = asyncHandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const result = await ShopService.updateOrderStatus(id, status);
        new OK({
            message: CONST.SHOP.MESSAGE.UPDATE_ORDER_STATUS_SUCCESS,
            data: result,
        }).send(res);
    });

    // GET /v1/api/shop/stats/revenue
    static getRevenueStats = asyncHandler(async (req, res) => {
        const result = await ShopService.getRevenueStats();
        new OK({
            message: CONST.SHOP.MESSAGE.GET_REVENUE_SUCCESS,
            data: result,
        }).send(res);
    });
}

module.exports = ShopController;
