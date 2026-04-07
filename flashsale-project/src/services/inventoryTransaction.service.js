"use strict";

const InventoryTransactionRepo = require("../repositories/inventoryTransaction.repo");
const { BadRequestError, NotFoundError } = require("../core/error.response");
const CONST = require("../constants");
const ProductModel = require("../models/product.model");
const ReservationModel = require("../models/reservation.model");

class InventoryTransactionService {
    /**
     * Create import/export transaction
     */
    static async createTransaction(userId, data) {
        const { productId, quantityChange, type = "import", reason, referenceId, notes } = data;

        // Validate product exists
        const product = await ProductModel.findById(productId);
        if (!product) {
            throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
        }

        // Create transaction
        const transaction = await InventoryTransactionRepo.create({
            product_id: productId,
            type,
            quantityChange,
            reason,
            referenceId,
            createdBy: userId,
            notes,
            status: "confirmed", // Auto-confirm for now (can add approval workflow later)
        });

        // Return with product info
        return {
            transaction: await transaction.populate("createdBy", "name email"),
            product: product,
        };
    }

    /**
     * Get product total quantity (SUM of all transactions)
     * Including: totalQty, reserved (pending reservations), available (totalQty - reserved)
     */
    static async getProductTotalQty(productId) {
        // Validate product exists
        const product = await ProductModel.findById(productId);
        if (!product) {
            throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
        }

        const totalQty = await InventoryTransactionRepo.getTotalQty(productId);

        // Get reserved quantity from pending reservations
        const reservedResult = await ReservationModel.aggregate([
            {
                $match: {
                    product_id: new (require("mongoose").Types.ObjectId)(productId),
                    status: "pending",
                },
            },
            {
                $group: {
                    _id: null,
                    reservedQty: { $sum: "$quantity" },
                },
            },
        ]);

        const reserved = reservedResult.length > 0 ? reservedResult[0].reservedQty : 0;
        const available = Math.max(0, totalQty - reserved);

        return {
            productId,
            productName: product.productName,
            totalQty: Math.max(0, totalQty),
            reserved,
            available,
        };
    }

    /**
     * Get transaction history for a product
     */
    static async getProductTransactionHistory(productId, query) {
        // Validate product exists
        const product = await ProductModel.findById(productId);
        if (!product) {
            throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
        }

        const result = await InventoryTransactionRepo.findByProductId(productId, query);

        return {
            productName: product.productName,
            ...result,
        };
    }

    /**
     * Get admin's transaction history
     */
    static async getAdminTransactionHistory(userId, query) {
        return await InventoryTransactionRepo.findByCreatedBy(userId, query);
    }

    /**
     * Update transaction (approval/rejection)
     */
    static async updateTransactionStatus(transactionId, status) {
        const validStatuses = ["pending", "confirmed", "rejected"];
        if (!validStatuses.includes(status)) {
            throw new BadRequestError("Invalid status");
        }

        return await InventoryTransactionRepo.updateStatus(transactionId, status);
    }
}

module.exports = InventoryTransactionService;
