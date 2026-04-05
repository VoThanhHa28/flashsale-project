"use strict";

const mongoose = require("mongoose");

/**
 * Tồn kho tách khỏi Product (số lượng + địa chỉ kho).
 * Không có API riêng — đồng bộ qua ProductService / OrderService / worker.
 */
const inventorySchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            unique: true,
            index: true,
        },
        quantityOnHand: {
            type: Number,
            required: true,
            min: [0, "Số lượng tồn không được âm"],
            validate: {
                validator: (v) => Number.isInteger(v),
                message: "quantityOnHand phải là số nguyên",
            },
        },
        warehouseAddress: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        timestamps: true,
        collection: "inventories",
    },
);

module.exports = mongoose.model("Inventory", inventorySchema);
