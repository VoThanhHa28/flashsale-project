module.exports = {
    PRODUCT_STOCK: (id) => `product:${id}:stock`,
    PRODUCT_INFO: (id) => `product:${id}:info`,
    CART: (userId) => `cart:${userId}`,
};
