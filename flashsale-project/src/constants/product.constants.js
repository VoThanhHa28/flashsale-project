module.exports = {
  // 1. TRẠNG THÁI SẢN PHẨM (Admin dùng)
  STATUS: {
    DRAFT: 'draft',
    PUBLISHED: 'published',
    HIDDEN: 'hidden',
  },

  // 2. CÁC TRƯỜNG CHO PHÉP SORT
  SORT_FIELDS: [
    'productName',
    'productPrice',
    'productQuantity',
    'createdAt',
    'updatedAt',
    'productStartTime',
  ],

  // 3. THÔNG BÁO (Message)
  MESSAGE: {
    CREATE_SUCCESS: 'Tạo sản phẩm thành công',
    GET_SUCCESS: 'Lấy danh sách sản phẩm thành công',
    NOT_FOUND: 'Không tìm thấy sản phẩm',
    UPDATE_SUCCESS: 'Cập nhật sản phẩm thành công',
    DELETE_SUCCESS: 'Xóa sản phẩm thành công',
    NOT_STARTED: 'Rất tiếc! Chương trình Flash Sale chưa bắt đầu.',
    ENDED: 'Chương trình Flash Sale đã kết thúc.',
    OUT_OF_STOCK: 'Sản phẩm đã hết hàng.',
    INVALID_TIME: 'Thời gian mở bán không hợp lệ (Ngày bắt đầu phải nhỏ hơn ngày kết thúc).',
    GET_STATS_SUCCESS: 'Lấy thống kê sản phẩm thành công',
    FORCE_START_SUCCESS: 'Kích hoạt Flash Sale thành công!',
    SEARCH_SUCCESS: 'Tìm kiếm sản phẩm thành công',
  },

  // 4. CẤU HÌNH CACHE (Redis)
  CACHE: {
    TTL_INFO: 604800,  // 7 ngày
    TTL_STOCK: 604800, // 7 ngày
  }
};