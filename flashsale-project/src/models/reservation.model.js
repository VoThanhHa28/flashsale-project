"use strict";

const mongoose = require("mongoose");

/**
 * Reservation Model
 * Lưu trữ thông tin giữ chỗ / pending state cho Flash Sale
 *
 * ⚡ MỤC ĐÍCH:
 *   - Ghi nhận người dùng đã vượt qua Redis Lua script (slot được giữ)
 *   - Track trạng thái: pending → confirmed/failed
 *   - TTL Index tự động xóa sau 30 phút nếu chưa processed
 *
 * LUỒNG:
 *   1. Client POST /order → Redis trừ stock thành công → create Reservation(pending)
 *   2. Push RabbitMQ, return response 200 ngay
 *   3. Worker lấy message → update Reservation(confirmed) khi Order created
 *   4. Nếu Worker fail → update Reservation(failed) → DLQ
 *   5. Sau 30 phút không confirm → TTL tự xóa (clean up)
 */
const reservationSchema = new mongoose.Schema(
    {
        /**
         * ID người dùng đặt lệnh
         */
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
            index: true,
        },

        /**
         * ID sản phẩm được giữ chỗ
         */
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Products",
            required: true,
            index: true,
        },

        /**
         * Idempotency key - chống trùng request
         * Nếu client gửi 2 request với cùng client_order_id → chỉ process 1 lần
         * Format: UUID (v4)
         */
        client_order_id: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        /**
         * Số lượng được giữ chỗ
         */
        quantity: {
            type: Number,
            required: true,
            min: [1, "Số lượng phải lớn hơn 0"],
            validate: {
                validator: (v) => Number.isInteger(v),
                message: "quantity phải là số nguyên",
            },
        },

        /**
         * Trạng thái giữ chỗ:
         * - pending: Redis đã trừ, chờ Worker xử lý
         * - confirmed: Worker đã tạo Order thành công
         * - failed: Worker xử lý thất bại, hoàn kho
         */
        status: {
            type: String,
            enum: ["pending", "confirmed", "failed"],
            default: "pending",
            index: true,
        },

        /**
         * Thời gian hết hạn (TTL Index)
         * Mặc định: 30 phút từ khi tạo
         * Nếu quá 30 phút chưa confirm → MongoDB tự xóa
         */
        expire_at: {
            type: Date,
            default: () => new Date(Date.now() + 30 * 60 * 1000),
            index: true,
        },

        /**
         * Ghi chú (optional)
         * Dùng để lưu lý do fail nếu status = 'failed'
         */
        note: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "reservations",
    }
);

/**
 * TTL Index - MongoDB tự xóa document khi expire_at < hiện tại
 * expireAfterSeconds: 0 = xóa ngay khi expire_at qua
 */
reservationSchema.index({ expire_at: 1 }, { expireAfterSeconds: 0 });

/**
 * Index kết hợp: user_id + status + createdAt
 * Dùng để query "đơn pending của user" nhanh chóng
 */
reservationSchema.index({ user_id: 1, status: 1, createdAt: -1 });

/**
 * Index: product_id + status
 * Dùng để query "số lượng pending cho sản phẩm X"
 */
reservationSchema.index({ product_id: 1, status: 1 });

module.exports = mongoose.model("Reservation", reservationSchema);
