"use strict";

const ActivityLogModel = require("../models/activityLog.model");
const CONST = require("../constants");

/**
 * Danh sách field nhạy cảm cần xóa trước khi ghi vào DB.
 */
const SENSITIVE_FIELDS = ["password", "oldPassword", "newPassword", "confirmPassword", "token", "refreshToken"];

/**
 * Xóa các field nhạy cảm khỏi body trước khi lưu log.
 */
function sanitizeBody(body) {
    if (!body || typeof body !== "object") return null;
    const sanitized = { ...body };
    SENSITIVE_FIELDS.forEach((field) => {
        if (field in sanitized) sanitized[field] = "[HIDDEN]";
    });
    return sanitized;
}

/**
 * Map HTTP method → action string để lưu vào log.
 */
function resolveAction(method) {
    if (method === "DELETE") return CONST.ACTIVITY_LOG.ACTION.DELETE;
    if (method === "POST") return CONST.ACTIVITY_LOG.ACTION.CREATE;
    return CONST.ACTIVITY_LOG.ACTION.UPDATE; // PUT, PATCH
}

/**
 * activityLogMiddleware
 *
 * - Log các method: POST, PUT, PATCH, DELETE.
 * - Ghi log SAU KHI response gửi xong (res.on('finish')) → không block request.
 * - Dùng fire-and-forget (không await) → lỗi ghi log không crash app.
 */
const activityLogMiddleware = (req, res, next) => {
    const method = req.method?.toUpperCase();
    if (!CONST.ACTIVITY_LOG.LOG_METHODS.includes(method)) return next();

    res.on("finish", () => {
        const userId = req.user?._id?.toString() ?? null;
        const userEmail = req.user?.email ?? null;

        ActivityLogModel.create({
            userId,
            userEmail,
            method,
            path: req.originalUrl || req.path,
            action: resolveAction(method),
            statusCode: res.statusCode,
            ip: req.ip || req.headers["x-forwarded-for"] || null,
            userAgent: req.headers["user-agent"] || null,
            body: sanitizeBody(req.body),
        }).catch((err) => {
            console.error(CONST.ACTIVITY_LOG.MESSAGE.LOG_FAILED, err.message);
        });
    });

    next();
};

module.exports = activityLogMiddleware;
