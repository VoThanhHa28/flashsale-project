/**
 * Chuẩn hóa Order data từ API (camelCase hoặc snake_case) sang format dùng trong component
 *
 * API format chuẩn: { statusCode, message, data: { orders: [], pagination: {} } }
 *
 * API có thể trả về:
 * - camelCase: { orderId, orderStatus, orderDate, totalAmount, ... }
 * - snake_case: { order_id, order_status, order_date, total_amount, ... }
 *
 * Component cần:
 *   { id, code, shop, createdAt, status, totalAmount, items[],
 *     holdExpiresAt, shippingAddress, timeline[] }
 */

/**
 * Chuẩn hóa 1 order item (dòng hiển thị trong đơn)
 */
function normalizeOrderItem(raw) {
  if (!raw) return null;
  let productId = raw.productId ?? raw.product_id ?? '';
  if (productId && typeof productId === 'object') {
    productId = productId._id || productId.id || '';
  }
  productId = String(productId || '');
  return {
    productId,
    name: raw.name || raw.productName || raw.product_name || '',
    thumb: raw.thumb || raw.productThumb || raw.product_thumb || raw.imageUrl || '',
    salePrice: Number(raw.salePrice ?? raw.price ?? raw.productPrice ?? raw.sale_price ?? 0),
    quantity: Number(raw.quantity ?? 1) || 1,
  };
}

/** Dòng từ bảng order_details (BE) — ghép tên/ảnh từ product đã populate ở cấp đơn nếu trùng SP */
function normalizeOrderItemFromDetail(detail, orderRoot) {
  if (!detail) return null;
  const pidRaw = detail.productId;
  const pidStr =
    pidRaw && typeof pidRaw === 'object'
      ? String(pidRaw._id || pidRaw.id || '')
      : String(pidRaw || '');
  const rootPop = orderRoot.productId;
  const rootIdStr =
    rootPop && typeof rootPop === 'object'
      ? String(rootPop._id || rootPop.id || '')
      : rootPop != null
        ? String(rootPop)
        : '';
  const pop = rootIdStr && pidStr === rootIdStr && rootPop && typeof rootPop === 'object' ? rootPop : null;
  const shortRef = pidStr.length >= 6 ? pidStr.slice(-6) : pidStr;
  return {
    productId: pidStr,
    name: pop?.productName || (pidStr ? `Sản phẩm ···${shortRef}` : 'Sản phẩm'),
    thumb: pop?.productThumb || '',
    salePrice: Number(detail.unitPrice ?? detail.unit_price ?? orderRoot.price ?? 0),
    quantity: Number(detail.quantity ?? 1) || 1,
  };
}

function buildOrderItems(raw) {
  if (Array.isArray(raw.items) && raw.items.length > 0) {
    return raw.items.map(normalizeOrderItem).filter(Boolean);
  }
  const details = raw.orderDetails || raw.order_details;
  if (Array.isArray(details) && details.length > 0) {
    const fromDetails = details.map((d) => normalizeOrderItemFromDetail(d, raw)).filter(Boolean);
    if (fromDetails.length > 0) return fromDetails;
  }
  const p = raw.productId;
  if (p && typeof p === 'object' && (p.productName != null || p._id)) {
    return [
      normalizeOrderItem({
        productId: p._id || p.id,
        productName: p.productName,
        productThumb: p.productThumb,
        price: raw.price ?? p.productPrice,
        quantity: raw.quantity,
      }),
    ];
  }
  return [];
}

/**
 * Map status từ BE sang format UI
 * BE có thể trả về: pending, confirmed, shipping, delivered, cancelled
 * UI cần: pending_payment, pending_confirm, processing, shipping, completed, cancelled, refunded
 */
function mapStatusToUI(status) {
  const statusMap = {
    pending_payment: 'pending_payment',
    pending: 'processing',
    confirmed: 'pending_confirm',
    processing: 'processing',
    shipping: 'shipping',
    delivered: 'completed',
    completed: 'completed',
    success: 'completed',
    cancelled: 'cancelled',
    refunded: 'refunded',
    failed: 'failed',
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
 * Chuẩn hóa địa chỉ giao hàng
 * BE có thể trả về camelCase hoặc snake_case
 */
function normalizeShippingAddress(raw) {
  if (!raw) return null;
  return {
    fullName: raw.fullName || raw.full_name || raw.name || '',
    phone: raw.phone || raw.phoneNumber || raw.phone_number || '',
    address: raw.address || raw.fullAddress || raw.full_address || '',
  };
}

/**
 * Chuẩn hóa 1 timeline event
 */
function normalizeTimelineEvent(raw) {
  if (!raw) return null;
  return {
    status: mapStatusToUI(raw.status || ''),
    timestamp: raw.timestamp || raw.time || raw.createdAt || '',
    note: raw.note || raw.message || raw.description || '',
  };
}

/** Chuẩn hóa payment từ BE (bảng payments / lean object) — không gửi từ checkout FE */
function normalizePayment(raw) {
  if (!raw || typeof raw !== 'object') {
    return { status: 'pending', method: 'cod', lineLabel: 'Thu hộ' };
  }
  const status = String(raw.status || 'pending').toLowerCase();
  const method = String(raw.method || 'cod').toLowerCase();
  let lineLabel = 'Thu hộ';
  if (status === 'paid') lineLabel = 'Đã trả';
  else if (status === 'failed') lineLabel = 'Thanh toán thất bại';
  else if (status === 'refunded') lineLabel = 'Đã hoàn tiền';
  else if (status === 'pending' && (method === 'cod' || method === '')) lineLabel = 'Thu hộ';
  else if (status === 'pending') lineLabel = 'Chưa thanh toán';
  return { status, method, lineLabel };
}

/** Nhãn một dòng cho trạng thái đơn (UI) — ví dụ Đang giao */
export const ORDER_STATUS_LINE_LABELS = {
  pending_payment: 'Chờ thanh toán',
  pending_confirm: 'Chờ xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  completed: 'Hoàn tất',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
  refunded: 'Hoàn tiền',
};

export function orderStatusLineLabel(uiStatus) {
  if (!uiStatus) return '—';
  return ORDER_STATUS_LINE_LABELS[uiStatus] || String(uiStatus);
}

/**
 * Chuẩn hóa 1 order từ API
 */
export function normalizeOrder(raw) {
  if (!raw) return null;

  const id = raw.id || raw._id || raw.orderId || raw.order_id || '';
  const idStr = id ? String(id) : '';

  return {
    id: idStr,
    code:
      raw.code ||
      raw.orderCode ||
      raw.order_code ||
      (idStr.length >= 8 ? idStr.slice(-8).toUpperCase() : idStr.toUpperCase()),
    shop: normalizeShop(raw.shop || raw.shopInfo || raw.shop_info || null),
    createdAt: raw.createdAt || raw.orderDate || raw.order_date || raw.orderTime || raw.order_time || new Date().toISOString(),
    status: mapStatusToUI(raw.status || raw.orderStatus || raw.order_status || 'pending'),
    totalAmount: raw.totalAmount || raw.total_amount || raw.totalPrice || raw.total_price || 0,
    holdExpiresAt: raw.holdExpiresAt || raw.hold_expires_at || null,
    shippingAddress: normalizeShippingAddress(
      raw.shippingAddress || raw.shipping_address || raw.deliveryAddress || null
    ),
    timeline: Array.isArray(raw.timeline)
      ? raw.timeline.map(normalizeTimelineEvent).filter(Boolean)
      : [],
    items: buildOrderItems(raw),
    payment: normalizePayment(raw.payment),
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
