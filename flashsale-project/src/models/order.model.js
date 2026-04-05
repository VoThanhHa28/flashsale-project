"use strict";

const mongoose = require("mongoose");
const { STATUS: ORDER_STATUS } = require("../constants/order.constants");

const orderSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            ref: "User",
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
        price: {
            type: Number,
            required: true,
            min: [0, "Giá không được âm"],
        },
        totalPrice: {
            type: Number,
            required: true,
            default: 0,
        },
        status: {
            type: String,
            enum: Object.values(ORDER_STATUS),
            default: ORDER_STATUS.PENDING,
            index: true,
        },
        orderTime: {
            type: Date,
            required: true,
            default: Date.now,
        },
        processedAt: {
            type: Date,
            default: null,
        },
        errorMessage: {
            type: String,
            default: null,
        },
        /**
         * client_order_id (Idempotency Key)
         * Link tới Reservation.client_order_id để chống duplicate order
         * 
         * LUỒNG:
         * 1. Client → client_order_id = UUID
         * 2. Controller → create Reservation(client_order_id)
         * 3. RabbitMQ payload → client_order_id
         * 4. Worker → check Order.findOne({client_order_id}) đã exist?
         *            Nếu exist → bỏ qua (idempotency)
         *            Nếu không → create Order với client_order_id
         */
        client_order_id: {
            type: String,
            sparse: true, // Allow null, nhưng unique nếu có value
            unique: true, // Chống duplicate
            index: true,
        },
    },
    {
        timestamps: true,
        collection: "orders",
    },
);

// Index compound cho query hiệu quả
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ productId: 1, status: 1 });
orderSchema.index({ orderTime: 1 });

// Virtual field: Tính độ trễ xử lý
orderSchema.virtual("processingDelay").get(function () {
    if (this.processedAt && this.orderTime) {
        return this.processedAt.getTime() - new Date(this.orderTime).getTime();
    }
    return null;
});

// Method: Tính tổng tiền
orderSchema.methods.calculateTotalPrice = function () {
    this.totalPrice = this.quantity * this.price;
    return this.totalPrice;
};

// Static method: Tìm đơn hàng theo user
orderSchema.statics.findByUserId = function (userId, options = {}) {
    const { limit = 10, skip = 0, status } = options;

    const query = { userId };
    if (status) query.status = status;

    return this.find(query).sort({ createdAt: -1 }).limit(limit).skip(skip).populate("productId", "name price imageUrl");
};

// Static method: Thống kê đơn hàng theo sản phẩm
orderSchema.statics.getProductStats = function (productId) {
    return this.aggregate([
        { $match: { productId: mongoose.Types.ObjectId(productId) } },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalQuantity: { $sum: "$quantity" },
                totalRevenue: { $sum: "$totalPrice" },
            },
        },
    ]);
};

// Middleware: Tự động tính totalPrice trước khi save
orderSchema.pre("save", function () {
    if (this.quantity && this.price) {
        this.totalPrice = this.quantity * this.price;
    }
});

// Middleware: Log khi tạo đơn hàng
orderSchema.post("save", function (doc) {
    console.log(`[OrderModel] Đã lưu đơn hàng: ${doc._id}`);
});

const OrderModel = mongoose.model("Order", orderSchema);

module.exports = OrderModel;
