'use strict';

const Product = require('../models/product.model');

const searchProducts = async ({ filter, sort, skip, limit }) => {
    return await Product.find(filter)
        .select('-__v')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean();
};

const countSearchProducts = async (filter) => {
    return await Product.countDocuments(filter);
};

module.exports = {
    searchProducts,
    countSearchProducts,
};
