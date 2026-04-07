'use strict';

module.exports = {
    MESSAGE: {
        GET_ORDERS_SUCCESS: 'Lấy danh sách đơn hàng thành công',
        UPDATE_ORDER_STATUS_SUCCESS: 'Cập nhật trạng thái đơn hàng thành công',
        ORDER_NOT_FOUND: 'Không tìm thấy đơn hàng',
        INVALID_STATUS: 'Trạng thái đơn hàng không hợp lệ',
        INVALID_STATUS_TRANSITION: 'Không thể chuyển trạng thái theo thứ tự này',
        GET_REVENUE_SUCCESS: 'Lấy báo cáo doanh thu thành công',
    },

    // Trạng thái shop được phép cập nhật
    ALLOWED_UPDATE_STATUSES: ['confirmed', 'shipping', 'completed', 'cancelled'],

    REVENUE_DAYS: 7,
    MAX_REVENUE_DAYS: 30,
};
