module.exports = {
    /**
     * Trạng thái giỏ hàng.
     * - active  : đang hoạt động (mặc định)
     * - expired : hết hạn TTL, chờ cleanup (TTL index MongoDB tự xóa)
     */
    STATUS: {
        ACTIVE: 'active',
        EXPIRED: 'expired',
    },

    /**
     * Giới hạn số lượng item tối đa trong giỏ.
     * Flash Sale: flow "Buy Now" → bỏ qua Cart.
     * E-commerce thường: Cart được dùng đầy đủ.
     */
    MAX_ITEMS: 50,

    /** TTL giỏ hàng không hoạt động: 30 ngày (giây) – dùng cho TTL index MongoDB */
    TTL_INACTIVE_SECONDS: 30 * 24 * 60 * 60,

    MESSAGE: {
        CREATED: 'Tạo giỏ hàng thành công',
        UPDATED: 'Cập nhật giỏ hàng thành công',
        NOT_FOUND: 'Giỏ hàng không tồn tại',
        ITEM_NOT_FOUND: 'Sản phẩm không có trong giỏ hàng',
        get MAX_ITEMS_EXCEEDED() { return `Giỏ hàng không được vượt quá ${module.exports.MAX_ITEMS} sản phẩm`; },
        FLASH_SALE_BYPASS: 'Flash Sale dùng luồng Buy Now, không qua giỏ hàng',
    },
};
