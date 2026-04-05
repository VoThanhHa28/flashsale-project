"use strict";

const mongoose = require("mongoose");
const { RESERVATION_LOG } = require("../constants");

/**
 * ReservationLog – Bảng log "ai đã giành được slot Flash Sale".
 *
 * ⚡ MỤC ĐÍCH KIẾN TRÚC:
 *   - Redis (Lua script) trừ kho ngay tại thời điểm tranh giành → tốc độ cao.
 *   - RabbitMQ giữ lệnh đặt hàng, Worker xử lý bất đồng bộ và lưu Order vào MongoDB.
 *   - Collection này ghi lại toàn bộ vòng đời "giữ chỗ":
 *       1. source='redis_claim'  : Redis đã giảm stock thành công (slot được giữ).
 *       2. source='worker_commit': Worker lưu Order MongoDB thành công → orderId có giá trị.
 *       3. source='rollback'     : Worker thất bại, kho Redis được hoàn lại.
 *
 * Collection này KHÔNG cần UI, dùng để:
 *   - Audit trail: truy vết ai giành slot trong trường hợp có tranh chấp.
 *   - Debug: phát hiện đơn "kẹt" ở redis_claim mà không có worker_commit.
 *   - Demo hội đồng: minh chứng hệ thống ghi nhận đầy đủ luồng Flash Sale.
 */
const reservationLogSchema = new mongoose.Schema(
    {
        /**
         * ID người dùng đặt lệnh. Null nếu không decode được từ orderData.
         */
        userId: {
            type: String,
            default: null,
            index: true,
        },

        /**
         * ID sản phẩm Flash Sale.
         */
        productId: {
            type: String,
            required: true,
            index: true,
        },

        /**
         * Số lượng đã đặt.
         */
        quantity: {
            type: Number,
            required: true,
            min: [1, "Số lượng phải lớn hơn 0"],
        },

        /**
         * Đơn giá tại thời điểm đặt lệnh.
         */
        price: {
            type: Number,
            required: true,
            min: [0, "Giá không được âm"],
        },

        /**
         * Tồn kho còn lại trong Redis NGAY SAU KHI trừ.
         * Phản ánh "đồng bộ trạng thái Redis xuống log".
         * Null nếu không đọc được (Redis lỗi tạm thời).
         */
        remainingStockAfter: {
            type: Number,
            default: null,
        },

        /**
         * ID đơn hàng đã lưu trong MongoDB.
         * Chỉ có giá trị khi source = 'worker_commit'.
         */
        orderId: {
            type: String,
            default: null,
        },

        /**
         * Nguồn gốc log – xem reservationLog.constants.js SOURCE.
         */
        source: {
            type: String,
            enum: Object.values(RESERVATION_LOG.SOURCE),
            required: true,
        },

        /**
         * Ghi chú thêm (ví dụ: lý do rollback, message lỗi).
         */
        note: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "reservation_logs",
    },
);

// Index để truy vấn nhanh theo sản phẩm + thời gian (audit trail phổ biến nhất)
reservationLogSchema.index({ productId: 1, createdAt: -1 });
// Index để tìm nhanh theo user
reservationLogSchema.index({ userId: 1, createdAt: -1 });
// Index để tìm log chưa có orderId (phát hiện đơn "kẹt")
reservationLogSchema.index({ source: 1, orderId: 1 });

const ReservationLogModel = mongoose.model("ReservationLog", reservationLogSchema);

module.exports = ReservationLogModel;
