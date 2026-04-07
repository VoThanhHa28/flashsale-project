'use strict';

const Product = require('../models/product.model');

const searchProducts = async ({ filter, sort, skip, limit }) => {
    const activeFilter = { ...(filter || {}), is_deleted: false };
    return await Product.find(activeFilter)
        .select('-__v')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
};

const countSearchProducts = async (filter) => {
    const activeFilter = { ...(filter || {}), is_deleted: false };
    return await Product.countDocuments(activeFilter);
};

module.exports = {
    searchProducts,
    countSearchProducts,
};
