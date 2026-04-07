"use strict";

function isFlashSaleWindowActive(product) {
    if (!product) return false;
    const now = Date.now();
    const start = product.productStartTime ? new Date(product.productStartTime).getTime() : NaN;
    const end = product.productEndTime ? new Date(product.productEndTime).getTime() : NaN;
    if (!Number.isFinite(start) || !Number.isFinite(end)) return false;
    return now >= start && now <= end;
}

module.exports = { isFlashSaleWindowActive };
