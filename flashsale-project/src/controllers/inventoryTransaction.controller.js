"use strict";

const InventoryTransactionService = require("../services/inventoryTransaction.service");
const { OK, CREATED } = require("../core/success.response");
const asyncHandler = require("../utils/asyncHandler");
const CONST = require("../constants");

class InventoryTransactionController {
    /**
     * POST /v1/api/inventories
     * Admin nhập/xuất kho (tạo transaction)
     */
    static createTransaction = asyncHandler(async (req, res) => {
        const { productId, quantityChange, type, reason, referenceId, notes } = req.body;
        const userId = req.user._id;

        const result = await InventoryTransactionService.createTransaction(userId, {
            productId,
            quantityChange,
            type: type || "import",
            reason,
            referenceId,
            notes,
        });

        return new CREATED({
            message: "Nhập/xuất kho thành công",
            data: result,
        }).send(res);
    });

    /**
     * GET /v1/api/inventories/:productId/total
     * Lấy số lượng tồn kho của 1 sản phẩm (SUM all transactions)
     */
    static getProductTotalQty = asyncHandler(async (req, res) => {
        const { productId } = req.params;

        const result = await InventoryTransactionService.getProductTotalQty(productId);

        return new OK({
            message: "Lấy tổng số lượng kho thành công",
            data: result,
        }).send(res);
    });

    /**
     * GET /v1/api/inventories/:productId/history
     * Lấy lịch sử nhập/xuất cho 1 sản phẩm
     */
    static getProductTransactionHistory = asyncHandler(async (req, res) => {
        const { productId } = req.params;
        const { page, pageSize } = req.query;

        const result = await InventoryTransactionService.getProductTransactionHistory(
            productId,
            { page: parseInt(page) || 1, pageSize: parseInt(pageSize) || 20 }
        );

        return new OK({
            message: "Lấy lịch sử kho thành công",
            data: result,
        }).send(res);
    });

    /**
     * GET /v1/api/inventories/admin/history
     * Lấy toàn bộ lịch sử nhập/xuất của admin
     */
    static getAdminTransactionHistory = asyncHandler(async (req, res) => {
        const userId = req.user._id;
        const { page, pageSize } = req.query;

        const result = await InventoryTransactionService.getAdminTransactionHistory(userId, {
            page: parseInt(page) || 1,
            pageSize: parseInt(pageSize) || 20,
        });

        return new OK({
            message: "Lấy lịch sử nhập/xuất của bạn thành công",
            data: result,
        }).send(res);
    });

    /**
     * PATCH /v1/api/inventories/:transactionId/status
     * Cập nhật trạng thái transaction (admin approval)
     */
    static updateTransactionStatus = asyncHandler(async (req, res) => {
        const { transactionId } = req.params;
        const { status } = req.body;

        const result = await InventoryTransactionService.updateTransactionStatus(
            transactionId,
            status
        );

        return new OK({
            message: "Cập nhật trạng thái thành công",
            data: result,
        }).send(res);
    });
}

module.exports = InventoryTransactionController;
