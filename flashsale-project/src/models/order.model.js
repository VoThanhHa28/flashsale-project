const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        productId: {
            type: String,
            required: true,
            index: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        status: {
            type: String,
            enum: ["Pending", "Success", "Failed", "Cancelled"],
            default: "Pending",
            index: true,
        },
        totalPrice: {
            type: Number,
            default: 0,
        },
        errorMessage: {
            type: String,
            default: null,
        },
        processedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true, // Tự động tạo createdAt và updatedAt
        collection: "orders",
    },
);

// Index compound cho query hiệu quả
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

const OrderModel = mongoose.model("Order", orderSchema);

module.exports = OrderModel;
