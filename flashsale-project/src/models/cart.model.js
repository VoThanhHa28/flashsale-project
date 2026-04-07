"use strict";

const mongoose = require("mongoose");
const { CART } = require("../constants");

/**
 * Cart Model – Giỏ hàng người dùng.
 *
 * ⚡ LƯU Ý KIẾN TRÚC – Flash Sale vs E-commerce thường:
 *   - Flow Flash Sale hiện tại: User bấm "Mua ngay" (Buy Now) → đặt lệnh trực tiếp
 *     → đi qua Redis lock → RabbitMQ → Worker. KHÔNG qua Cart để tối ưu tốc độ,
 *     tránh thêm round-trip DB trong thời điểm tải cao.
 *   - Model Cart này thiết kế sẵn cho nghiệp vụ e-commerce thông thường
 *     (thêm vào giỏ, xem giỏ, thanh toán nhiều sản phẩm cùng lúc).
 *   - Nếu mở rộng sau Flash Sale: mount cartRouter vào routes/index.js
 *     và implement CartService / CartController theo đúng quy trình 4-STEP.
 *
 * TTL: MongoDB TTL index tự xóa cart không hoạt động sau 30 ngày.
 */

/**
 * Schema cho từng item trong giỏ hàng.
 * Cache productName / productThumb để hiển thị nhanh mà không cần join.
 */
const cartItemSchema = new mongoose.Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        productName: {
            type: String,
            required: true,
            trim: true,
        },
        productThumb: {
            type: String,
            trim: true,
            default: "",
        },
        price: {
            type: Number,
            required: true,
            min: [0, "Giá không được âm"],
        },
        quantity: {
            type: Number,
            required: true,
            min: [1, "Số lượng phải lớn hơn 0"],
            default: 1,
        },
        addedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { _id: false },
);

const cartSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },
        items: {
            type: [cartItemSchema],
            default: [],
            validate: {
                validator: function (items) {
                    return items.length <= CART.MAX_ITEMS;
                },
                message: CART.MESSAGE.MAX_ITEMS_EXCEEDED,
            },
        },
        status: {
            type: String,
            enum: Object.values(CART.STATUS),
            default: CART.STATUS.ACTIVE,
        },
        /**
         * TTL index: MongoDB tự xóa document khi vượt quá thời điểm này.
         * Mỗi lần user tương tác với giỏ → cập nhật lại expiresAt.
         */
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + CART.TTL_INACTIVE_SECONDS * 1000),
        },
    },
    {
        timestamps: true,
        collection: "carts",
    },
);

// TTL index: MongoDB tự xóa document khi expiresAt đã qua
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual: tổng tiền giỏ hàng (tính từ items hiện có)
cartSchema.virtual("totalAmount").get(function () {
    return this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
});

// Virtual: tổng số lượng sản phẩm (kể cả trùng)
cartSchema.virtual("totalQuantity").get(function () {
    return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Static: tìm cart của user (trả null nếu không tồn tại)
cartSchema.statics.findByUserId = function (userId) {
    return this.findOne({ userId }).populate("items.productId", "productName productThumb productPrice isPublished");
};

// Method: làm mới TTL (gọi mỗi khi user tương tác với giỏ)
cartSchema.methods.refreshExpiry = function () {
    this.expiresAt = new Date(Date.now() + CART.TTL_INACTIVE_SECONDS * 1000);
};

const CartModel = mongoose.model("Cart", cartSchema);

module.exports = CartModel;
