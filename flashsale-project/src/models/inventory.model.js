    "use strict";

const mongoose = require("mongoose");

/**
 * Inventory Model - Tồn kho
 * Tách rời khỏi Product để phục vụ việc trừ kho, đồng bộ với Redis
 *
 * ⚡ KIẾN TRÚC FLASH SALE:
 *   - Source of Truth: Redis (real-time stock)
 *   - Backup: MongoDB tồn kho thực tế (sync từ Redis định kỳ hoặc sau mỗi order)
 *   - stock: số lượng tồn hiện tại (integer)
 *   - reservations: array lưu pending reservations (chưa confirm)
 *   - is_active: flag để soft-delete sản phẩm khỏi Flash Sale
 *
 * KHÔNG CÓ DIRECT API - đồng bộ qua:
 *   - POST /v1/api/inventory/sync (Warm-up trước flash sale)
 *   - Tự động sync sau khi ORDER created (Worker)
 */
const inventorySchema = new mongoose.Schema(
    {
        /**
         * ID sản phẩm liên kết
         */
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Products",
            required: true,
            unique: true,
            index: true,
        },

        /**
         * ID shop (nếu sau này scale lên multi-shop)
         * Tạm: optional, dành cho future use
         */
        shop_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            default: null,
        },

        /**
         * Số lượng tồn kho thực tế
         * Source of Truth: Redis (key: product:{id}:stock)
         * MongoDB lưu backup để sync khi Redis down
         */
        stock: {
            type: Number,
            required: true,
            min: [0, "Số lượng tồn không được âm"],
            validate: {
                validator: (v) => Number.isInteger(v),
                message: "stock phải là số nguyên",
            },
        },

        /**
         * Mảng lưu Reservation IDs chưa confirm
         * Dùng để:
         *   - Query "có bao nhiêu người đang pending cho sản phẩm X"
         *   - Rollback nhanh nếu cần (tuỳ business logic)
         * 
         * Format: [reservation_id_1, reservation_id_2, ...]
         */
        reservations: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "Reservation",
            default: [],
        },

        /**
         * Flag soft-delete
         * true: sản phẩm còn trong Flash Sale
         * false: đã kết thúc Flash Sale, ngừng nhận order
         */
        is_active: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "inventories",
    }
);

/**
 * Index kết hợp: product_id + is_active
 * Dùng để query sản phẩm đang active nhanh chóng
 */
inventorySchema.index({ product_id: 1, is_active: 1 });

module.exports = mongoose.model("Inventory", inventorySchema);
