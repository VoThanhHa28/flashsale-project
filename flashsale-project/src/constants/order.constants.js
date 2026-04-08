module.exports = {
    CHECKOUT_HOLD_MS: 5 * 60 * 1000,
    STATUS: {
        PENDING_PAYMENT: "pending_payment",
        PENDING: "pending",
        CONFIRMED: "confirmed",
        SHIPPING: "shipping",
        COMPLETED: "completed",
        SUCCESS: "success",
        FAILED: "failed",
        CANCELLED: "cancelled",
    },

    /** Thanh toán — không có API riêng; tạo cùng lúc Order (worker). */
    PAYMENT: {
        STATUS: {
            PENDING: "pending",
            PAID: "paid",
            FAILED: "failed",
            REFUNDED: "refunded",
        },
        METHOD: {
            COD: "cod",
            PREPAID: "prepaid",
        },
        CURRENCY: {
            VND: "VND",
        },
    },

    MESSAGE: {
        PLACE_ORDER_SUCCESS: "Đặt hàng thành công!",
        OUT_OF_STOCK: "Rất tiếc! Sản phẩm đã hết hàng.",
        ORDER_NOT_FOUND: "Không tìm thấy đơn hàng",
        GET_MY_ORDERS_SUCCESS: "Lấy danh sách đơn hàng thành công",
        GET_MY_ORDER_SUCCESS: "Lấy chi tiết đơn hàng thành công",
        ORDER_NOT_OWNED: "Bạn không có quyền xem đơn hàng này",
        CANCEL_ORDER_SUCCESS: "Hủy đơn hàng thành công",
        CANCEL_ORDER_NOT_ALLOWED: "Chỉ có thể hủy đơn hàng chờ thanh toán hoặc chờ xử lý",
        CONFIRM_PAYMENT_SUCCESS: "Xác nhận thanh toán thành công",
        HOLD_EXPIRED: "Đơn giữ chỗ đã hết hạn",
    },
};
