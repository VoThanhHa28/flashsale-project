"use strict";

const mongoose = require("mongoose");
const { ACTIVITY_LOG } = require("../constants");

/**
 * ActivityLog – tự động ghi mỗi khi có request PUT / PATCH / DELETE.
 * Không cần UI, chỉ để "khoe" logic hệ thống với hội đồng.
 * Middleware activityLog.middleware.js sẽ ghi vào collection này sau khi response gửi xong.
 */
const activityLogSchema = new mongoose.Schema(
    {
        userId: {
            type: String,
            default: null,
            index: true,
        },
        userEmail: {
            type: String,
            default: null,
        },
        method: {
            type: String,
            enum: ACTIVITY_LOG.LOG_METHODS,
            required: true,
        },
        path: {
            type: String,
            required: true,
        },
        action: {
            type: String,
            enum: Object.values(ACTIVITY_LOG.ACTION),
            required: true,
        },
        statusCode: {
            type: Number,
            required: true,
        },
        ip: {
            type: String,
            default: null,
        },
        userAgent: {
            type: String,
            default: null,
        },
        body: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: "activity_logs",
    },
);

// Index để query nhanh theo user và thời gian
activityLogSchema.index({ userId: 1, createdAt: -1 });
activityLogSchema.index({ path: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

const ActivityLogModel = mongoose.model("ActivityLog", activityLogSchema);

module.exports = ActivityLogModel;
