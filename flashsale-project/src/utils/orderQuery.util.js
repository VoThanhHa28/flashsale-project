"use strict";

function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mapFeStatusToMongoMatch(status) {
    if (!status || status === "all") return null;
    const map = {
        pending_payment: { status: "pending" },
        pending_confirm: { status: "confirmed" },
        processing: { status: "confirmed" },
        shipping: { status: "confirmed" },
        completed: { status: { $in: ["completed", "success"] } },
        cancelled: { status: "cancelled" },
        refunded: { status: "failed" },
    };
    return map[status] ?? null;
}

function buildCreatedAtRange(dateFrom, dateTo) {
    const range = {};
    if (dateFrom) range.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo) range.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    return Object.keys(range).length ? range : null;
}

function buildSort(sortKey) {
    switch (sortKey) {
        case "oldest":
            return { createdAt: 1 };
        case "amount_high":
            return { totalPrice: -1, createdAt: -1 };
        case "amount_low":
            return { totalPrice: 1, createdAt: -1 };
        case "newest":
        default:
            return { createdAt: -1 };
    }
}

module.exports = {
    escapeRegex,
    mapFeStatusToMongoMatch,
    buildCreatedAtRange,
    buildSort,
};
