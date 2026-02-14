/**
 * Contract Phase 2 – M5 dùng chung với M2, M3.
 * Khi đổi sang dữ liệu thật chỉ cần đảm bảo backend/Socket trả đúng shape này.
 */

/** Tên event Socket (M2 thống nhất với M5) */
export const SOCKET_EVENTS = {
  UPDATE_STOCK: 'update-stock',
  FLASH_SALE_START: 'flash-sale-start',
};

/**
 * Payload Socket update-stock (M2 emit): 
 * { productId: string, quantity: number }
 * 
 * Payload Socket flash-sale-start (M2 emit khi M3 bấm Kích hoạt ngay): 
 * { productId: string, startTime: Date } hoặc {} (reload nút MUA)
 */
  
  /**
   * GET /v1/api/products – response.data = { products: Product[], pagination: { page, pageSize, total, totalPages } }
   * Product (backend): _id, productName, productThumb, productDescription, productPrice, productQuantity,
   *   product_start_time, product_end_time (Date/ISO), is_published, ...
   */
  
  /**
   * POST /v1/api/auth/login – response.data = { user: { _id, email, name }, accessToken: string }
   */
  
  /**
   * POST /v1/api/order – body: { productId: string, quantity: number, price: number }, header Authorization: Bearer <token>
   */