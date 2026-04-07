"use strict";

const mongoose = require("mongoose");

/**
 * InventoryTransaction Model
 * Mỗi lần nhập/xuất kho = 1 record
 * Total qty = SUM(quantityChange) where product_id matches
 *
 * ⚡ KIẾN TRÚC:
 *   - Mỗi transaction độc lập (import/export/adjustment)
 *   - quantityChange: có thể âm (xuất/trả) hoặc dương (nhập)
 *   - Lịch sử toàn bộ import/xuất (audit trail)
 *   - Admin dùng để quản lý, user thấy TOTAL qty trên product detail
 */
const inventoryTransactionSchema = new mongoose.Schema(
    {
        /**
         * ID sản phẩm
         */
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Products",
            required: true,
            index: true,
        },

        /**
         * Loại transaction: 'import' | 'export' | 'adjustment'
         */
        type: {
            type: String,
            enum: ["import", "export", "adjustment"],
            default: "import",
            index: true,
        },

        /**
         * Số lượng thay đổi (có thể âm hoặc dương)
         * + import: +10
         * - export: -5
         * - adjustment: -2 (correct over-count)
         */
        quantityChange: {
            type: Number,
            required: true,
            validate: {
                validator: function (v) {
                    return Number.isInteger(v);
                },
                message: "quantityChange phải là số nguyên",
            },
        },

        /**
         * Lý do transaction
         * "Nhập hàng từ nhà cung cấp ABC"
         * "Khách hàng trả lại vì lỗi"
         */
        reason: {
            type: String,
            default: "",
            maxlength: 500,
        },

        /**
         * Reference ID (invoice, RMA, PO, etc.)
         * Để trace back document gốc
         */
        referenceId: {
            type: String,
            default: null,
        },

        /**
         * User thực hiện transaction (admin)
         * Optional: Nếu null thì là system auto-create (seed, initial setup)
         */
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        /**
         * Ghi chú thêm
         */
        notes: {
            type: String,
            default: "",
        },

        /**
         * Status: 'pending' | 'confirmed' | 'rejected'
         * Cho phép workflow approval nếu cần
         */
        status: {
            type: String,
            enum: ["pending", "confirmed", "rejected"],
            default: "confirmed",
        },
    },
    {
        timestamps: true,
        collection: "inventory_transactions",
    }
);

/**
 * Index: product_id + createdAt
 * Query "công ty nhập X lần bao nhiêu" nhanh
 */
inventoryTransactionSchema.index({ product_id: 1, createdAt: -1 });

/**
 * Index: createdBy + createdAt
 * Query "admin X nhập hàng bao nhiêu lần"
 */
inventoryTransactionSchema.index({ createdBy: 1, createdAt: -1 });

/**
 * Index: status
 * Query pending approvals
 */
inventoryTransactionSchema.index({ status: 1 });

module.exports = mongoose.model("InventoryTransaction", inventoryTransactionSchema);
