/**
 * Chuẩn hóa Order data từ API (camelCase hoặc snake_case) sang format dùng trong component
 *
 * API format chuẩn: { statusCode, message, data: { orders: [], pagination: {} } }
 *
 * API có thể trả về:
 * - camelCase: { orderId, orderStatus, orderDate, totalAmount, ... }
 * - snake_case: { order_id, order_status, order_date, total_amount, ... }
 *
 * Component cần: { id, code, shop, createdAt, status, totalAmount, items[], holdExpiresAt }
 */

/**
 * Chuẩn hóa 1 order item
 */
function normalizeOrderItem(raw) {
  if (!raw) return null;
  return {
    productId: raw.productId || raw.product_id || '',
    name: raw.name || raw.productName || raw.product_name || '',
    thumb: raw.thumb || raw.productThumb || raw.product_thumb || '',
    salePrice: raw.salePrice || raw.price || raw.sale_price || 0,
    quantity: raw.quantity || 1,
  };
}

/**
 * Map status từ BE sang format UI
 * BE có thể trả về: pending, confirmed, shipping, delivered, cancelled
 * UI cần: pending_payment, pending_confirm, processing, shipping, completed, cancelled, refunded
 */
function mapStatusToUI(status) {
  const statusMap = {
    pending: 'pending_payment',
    confirmed: 'pending_confirm',
    processing: 'processing',
    shipping: 'shipping',
    delivered: 'completed',
    completed: 'completed',
    cancelled: 'cancelled',
    refunded: 'refunded',
  };
  return statusMap[status] || status;
}

/**
 * Chuẩn hóa thông tin shop trong order
 * BE trả về: { id, name } hoặc { shopId, shopName } hoặc null
 */
function normalizeShop(raw) {
  if (!raw) return null;
  return {
    id: raw.id || raw._id || raw.shopId || raw.shop_id || '',
    name: raw.name || raw.shopName || raw.shop_name || '',
  };
}

/**
 * Chuẩn hóa 1 order từ API
 */
export function normalizeOrder(raw) {
  if (!raw) return null;

  return {
    id: raw.id || raw._id || raw.orderId || raw.order_id || '',
    code: raw.code || raw.orderCode || raw.order_code || '',
    shop: normalizeShop(raw.shop || raw.shopInfo || raw.shop_info || null),
    createdAt: raw.createdAt || raw.orderDate || raw.order_date || raw.orderTime || raw.order_time || new Date().toISOString(),
    status: mapStatusToUI(raw.status || raw.orderStatus || raw.order_status || 'pending'),
    totalAmount: raw.totalAmount || raw.total_amount || raw.totalPrice || raw.total_price || 0,
    holdExpiresAt: raw.holdExpiresAt || raw.hold_expires_at || null,
    items: Array.isArray(raw.items)
      ? raw.items.map(normalizeOrderItem).filter(Boolean)
      : [],
  };
}

/**
 * Chuẩn hóa thông tin pagination từ API
 * BE trả về: { page, limit, totalOrders, totalPages }
 */
export function normalizePagination(raw) {
  if (!raw) return null;
  return {
    page: raw.page || raw.currentPage || raw.current_page || 1,
    limit: raw.limit || raw.pageSize || raw.page_size || 10,
    totalOrders: raw.totalOrders || raw.total_orders || raw.total || 0,
    totalPages: raw.totalPages || raw.total_pages || 1,
  };
}

/**
 * Chuẩn hóa mảng orders
 */
export function normalizeOrders(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeOrder).filter(Boolean);
}
