"use strict";

const mongoose = require("mongoose");

/**
 * Dòng chi tiết đơn hàng (snapshot giá & SL tại thời điểm mua).
 * Không có API riêng — insert cùng lúc tạo Order (worker / service).
 */
const orderDetailSchema = new mongoose.Schema(
    {
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true,
        },
        productId: {
            type: String,
            ref: "Product",
            required: true,
            index: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Số lượng phải lớn hơn 0"],
        },
        unitPrice: {
            type: Number,
            required: true,
            min: [0, "Đơn giá không được âm"],
        },
        lineTotal: {
            type: Number,
            required: true,
            min: [0, "Thành tiền dòng không được âm"],
        },
    },
    {
        timestamps: true,
        collection: "order_details",
    },
);

orderDetailSchema.index({ orderId: 1, createdAt: 1 });

module.exports = mongoose.model("OrderDetail", orderDetailSchema);
