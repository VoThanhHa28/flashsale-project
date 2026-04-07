"use strict";

const InventoryTransactionModel = require("../models/inventoryTransaction.model");
const UserModel = require("../models/user.model"); // Ensure User schema is registered for populate

class InventoryTransactionRepo {
    /**
     * Create new transaction
     */
    static async create(data) {
        return await InventoryTransactionModel.create(data);
    }

    /**
     * Get all transactions for a product
     */
    static async findByProductId(productId, query = {}) {
        const { page = 1, pageSize = 20, type, status } = query;
        const skip = (page - 1) * pageSize;

        const filter = { product_id: productId };
        if (type) filter.type = type;
        if (status) filter.status = status;

        const [transactions, totalCount] = await Promise.all([
            InventoryTransactionModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .populate("createdBy", "name email")
                .lean(),
            InventoryTransactionModel.countDocuments(filter),
        ]);

        return {
            transactions,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
            currentPage: page,
        };
    }

    /**
     * Get total quantity for a product (SUM all confirmed transactions)
     */
    static async getTotalQty(productId) {
        const mongoose = require('mongoose');
        const result = await InventoryTransactionModel.aggregate([
            {
                $match: {
                    product_id: new mongoose.Types.ObjectId(productId),
                    status: "confirmed",
                },
            },
            {
                $group: {
                    _id: null,
                    totalQty: { $sum: "$quantityChange" },
                },
            },
        ]);

        return result.length > 0 ? result[0].totalQty : 0;
    }

    /**
     * Get transactions by user (admin)
     */
    static async findByCreatedBy(userId, query = {}) {
        const { page = 1, pageSize = 20 } = query;
        const skip = (page - 1) * pageSize;

        const [transactions, totalCount] = await Promise.all([
            InventoryTransactionModel.find({ createdBy: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .populate("product_id", "productName productThumb")
                .lean(),
            InventoryTransactionModel.countDocuments({ createdBy: userId }),
        ]);

        return {
            transactions,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
            currentPage: page,
        };
    }

    /**
     * Update transaction status
     */
    static async updateStatus(transactionId, status) {
        return await InventoryTransactionModel.findByIdAndUpdate(
            transactionId,
            { status },
            { new: true }
        );
    }

    /**
     * Delete transaction (soft or hard)
     */
    static async delete(transactionId) {
        return await InventoryTransactionModel.findByIdAndRemove(transactionId);
    }
}

module.exports = InventoryTransactionRepo;
