"use strict";

const SOCKET_EVENT = {
    // Server → Client Events
    CONNECTION: "connection",
    DISCONNECT: "disconnect",

    // Order Events
    UPDATE_STOCK: "update-stock",
    ORDER_SUCCESS: "order-success",
    ORDER_FAILED: "order-failed",

    // Flash Sale Events
    FLASH_SALE_START: "flash-sale-start",
    FLASH_SALE_END: "flash-sale-end",
    FLASH_SALE_UPDATE: "flash-sale-update",

    // Client → Server Events
    JOIN_PRODUCT_ROOM: "join-product-room",
    LEAVE_PRODUCT_ROOM: "leave-product-room",
    JOIN_FLASH_SALE_ROOM: "join-flash-sale-room",
    LEAVE_FLASH_SALE_ROOM: "leave-flash-sale-room",
};

const SOCKET_ROOM = {
    PRODUCT: (productId) => `product_${productId}`,
    FLASH_SALE: (flashSaleId) => `flash_sale_${flashSaleId}`,
    ALL_USERS: "all_users",
};

const SOCKET_MESSAGE = {
    CONNECTED: "Kết nối Socket.io thành công",
    DISCONNECTED: "Ngắt kết nối Socket.io",
    JOINED_ROOM: "Đã tham gia room",
    LEFT_ROOM: "Đã rời khỏi room",
    EMIT_SUCCESS: "Phát sự kiện thành công",
    EMIT_FAILED: "Phát sự kiện thất bại",
};

module.exports = {
    SOCKET_EVENT,
    SOCKET_ROOM,
    SOCKET_MESSAGE,
};
