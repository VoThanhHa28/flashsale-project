module.exports = {
    STATUS: {
        PENDING: "pending",
        CONFIRMED: "confirmed",
        COMPLETED: "completed",
        SUCCESS: "success",
        FAILED: "failed",
        CANCELLED: "cancelled",
    },

    /** Thanh toán: tạo cùng Order (worker) + cập nhật phương thức qua POST /v1/api/payments */
    PAYMENT: {
        STATUS: {
            PENDING: "pending",
            PAID: "paid",
            FAILED: "failed",
            REFUNDED: "refunded",
        },
        METHOD: {
            COD: "cod",
            CREDIT_CARD: "credit_card",
            BANK_TRANSFER: "bank_transfer",
            MOMO: "momo",
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
        CANCEL_ORDER_NOT_ALLOWED: "Chỉ có thể hủy đơn hàng đang chờ xử lý",
        PAYMENT_RECORD_SUCCESS: "Lưu thông tin thanh toán thành công",
    },
};
