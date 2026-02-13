module.exports = {
  // 1. TRẠNG THÁI SẢN PHẨM (Admin dùng)
  STATUS: {
    DRAFT: 'draft',           // Nháp (Lúc Admin mới tạo, chưa bán)
    PUBLISHED: 'published',   // Đang mở bán (User nhìn thấy)
    HIDDEN: 'hidden',         // Tạm ẩn
  },

  // 2. CÁC TRƯỜNG CHO PHÉP SORT (Giữ nguyên)
  SORT_FIELDS: [
    'productName',
    'productPrice',
    'productQuantity',
    'createdAt',
    'updatedAt',
    'product_start_time', // 👉 Thêm cái này để User sort theo giờ G sắp mở
  ],

  // 3. THÔNG BÁO (Message) - Cần thêm bộ Flash Sale
  MESSAGE: {
    // CRUD Basic
    CREATE_SUCCESS: 'Tạo sản phẩm thành công',
    GET_SUCCESS: 'Lấy danh sách sản phẩm thành công',
    NOT_FOUND: 'Không tìm thấy sản phẩm',
    UPDATE_SUCCESS: 'Cập nhật sản phẩm thành công',
    
    // 👉 FLASH SALE ERRORS (Dùng cho InventoryService)
    NOT_STARTED: 'Rất tiếc! Chương trình Flash Sale chưa bắt đầu.',
    ENDED: 'Chương trình Flash Sale đã kết thúc.',
    OUT_OF_STOCK: 'Sản phẩm đã hết hàng.',
    INVALID_TIME: 'Thời gian mở bán không hợp lệ (Ngày bắt đầu phải nhỏ hơn ngày kết thúc).',

    // Admin only (RBAC)
    RESET_STOCK_SUCCESS: 'Reset tồn kho thành công',
    FORCE_START_SUCCESS: 'Force start thành công',
    ADMIN_STATS_SUCCESS: 'Lấy thống kê admin thành công',
  },

  // 4. CẤU HÌNH CACHE (Dùng cho Redis)
  CACHE: {
    TTL_INFO: 604800, // 7 ngày (Time To Live cho thông tin sản phẩm)
    TTL_STOCK: 604800, // 7 ngày (Time To Live cho tồn kho)
  }
};