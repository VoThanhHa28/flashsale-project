'use strict';

const Product = require('../models/product.model');

/**
 * Tìm kiếm sản phẩm theo keyword, khoảng giá, sort
 * Chỉ chứa lệnh DB - không chứa business logic
 */
const searchProducts = async ({ filter, sort, skip, limit }) => {
    return await Product.find(filter)
        .select('-__v')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
};

/**
 * Đếm tổng số sản phẩm khớp với filter (dùng cho pagination)
 */
const countSearchProducts = async (filter) => {
    return await Product.countDocuments(filter);
};

module.exports = {
    searchProducts,
    countSearchProducts,
};
