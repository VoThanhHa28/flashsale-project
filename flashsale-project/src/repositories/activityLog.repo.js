"use strict";

const ActivityLogModel = require("../models/activityLog.model");

const findPaginated = async ({ page = 1, limit = 20, method }) => {
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(Math.max(1, parseInt(limit, 10)), 100);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (method) {
        filter.method = String(method).toUpperCase();
    }

    const [logs, total] = await Promise.all([
        ActivityLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        ActivityLogModel.countDocuments(filter),
    ]);

    return {
        logs,
        pagination: {
            page: pageNum,
            pageSize: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum) || 0,
        },
    };
};

module.exports = {
    findPaginated,
};
