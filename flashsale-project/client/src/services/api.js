/**
 * API layer – base URL, token, parse response.
 * Toàn bộ gọi backend đi qua file này; component chỉ dùng các hàm export.
 */
import { normalizeProduct, normalizeProducts } from '../utils/productShape';
import { normalizeOrder, normalizeOrders, normalizePagination } from '../utils/orderShape';

const BASE_URL = process.env.REACT_APP_API_URL || '';

export function getApiUrl() {
  return BASE_URL;
}

export function isApiConfigured() {
  return Boolean(BASE_URL.trim());
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setUser(user) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/**
 * Trích xuất payload từ response BE.
 * Format chuẩn mới: { statusCode, message, data: { ... } }
 * Format cũ (legacy): { metadata: { ... } }
 * Fallback: trả về toàn bộ res nếu không khớp.
 */
export function getPayload(res) {
  if (res.metadata !== undefined) return res.metadata;
  if (res.data !== undefined) return res.data;
  return res;
}

/** Ánh xạ thông báo lỗi tiếng Anh (backend/HTTP) sang tiếng Việt */
const ERROR_MESSAGES_VI = {
  'Internal Server Error': 'Lỗi máy chủ. Vui lòng thử lại sau.',
  'Bad Request': 'Yêu cầu không hợp lệ. Vui lòng thử lại.',
  'Not Found': 'Không tìm thấy.',
  'Unauthorized': 'Vui lòng đăng nhập.',
  'Forbidden': 'Bạn không có quyền thực hiện.',
  'Network Error': 'Không thể kết nối. Vui lòng thử lại.',
  'Failed to fetch': 'Không thể kết nối tới máy chủ. Vui lòng thử lại sau.',
  'The client is closed': 'Kết nối dịch vụ đã đóng. Vui lòng thử lại sau.',
};

function translateErrorToVietnamese(msg) {
  if (!msg || typeof msg !== 'string') return 'Đã xảy ra lỗi. Vui lòng thử lại.';
  const trimmed = msg.trim();
  return ERROR_MESSAGES_VI[trimmed] || ERROR_MESSAGES_VI[trimmed.toLowerCase()] || trimmed;
}

export function getErrorMessage(res) {
  let raw = '';
  if (res && typeof res.message === 'string') raw = res.message;
  else if (res && res.data && typeof res.data.message === 'string') raw = res.data.message;
  return translateErrorToVietnamese(raw || 'Đã xảy ra lỗi. Vui lòng thử lại.');
}

export async function request(url, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
  let res;
  let json = {};

  try {
    res = await fetch(fullUrl, { ...options, headers });
  } catch (networkError) {
    const err = new Error('Không thể kết nối tới máy chủ. Vui lòng thử lại sau.');
    err.isNetworkError = true;
    err.cause = networkError;
    throw err;
  }

  json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const raw =
      (json && typeof json.message === 'string' && json.message) ||
      (json && json.data && typeof json.data.message === 'string' && json.data.message) ||
      res.statusText ||
      '';
    const message = translateErrorToVietnamese(raw || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    const err = new Error(message);
    err.status = res.status;
    err.response = json;

    const isAuthRoute =
      typeof url === 'string' &&
      (url.includes('/v1/api/auth/login') || url.includes('/v1/api/auth/register'));

    if (res.status === 401 && !isAuthRoute) {
      clearAuth();
      window.location.href = '/login';
      return;
    }

    throw err;
  }

  if (json.status === 'error') {
    const message = getErrorMessage(json);
    const err = new Error(message);
    err.response = json;
    throw err;
  }

  return json;
}

/** GET /v1/api/products → mảng sản phẩm đã chuẩn hóa, hoặc null khi lỗi. */
export async function getProducts() {
  if (!isApiConfigured()) return null;

  try {
    const res = await request('/v1/api/products');
    const data = getPayload(res);
    const products = data?.products;
    if (Array.isArray(products)) return normalizeProducts(products);
    return [];
  } catch (err) {
    // Không log khi lỗi mạng (backend chưa chạy) — app sẽ dùng fallback JSON
    if (!err.isNetworkError) {
      console.error('Lỗi gọi API /v1/api/products:', err);
    }
    return null;
  }
}

/** Cache in-memory cho danh sách sản phẩm đầy đủ — giảm gọi backend liên tục (304). TTL 60 giây. */
const PRODUCTS_CACHE_TTL_MS = 60 * 1000;
let productsCache = { data: null, ts: 0 };

/**
 * Lấy danh sách sản phẩm đầy đủ (không filter). Nội bộ dùng cho getProductsList(params).
 * Dùng cache TTL để tránh gọi GET /v1/api/products nhiều lần khi chuyển trang / mount lại.
 */
async function fetchAllProducts() {
  const now = Date.now();
  if (productsCache.data != null && now - productsCache.ts < PRODUCTS_CACHE_TTL_MS) {
    return productsCache.data;
  }

  let list = null;
  try {
    list = await getProducts();
    if (Array.isArray(list)) {
      productsCache = { data: list, ts: Date.now() };
      return list;
    }
  } catch (err) {}

  const res = await fetch('/data/products.json');
  if (!res.ok) throw new Error('Không tải được danh sách sản phẩm.');
  const data = await res.json();
  const payload = data.metadata ?? data.data ?? data;
  const arr = Array.isArray(payload) ? payload : [];
  list = normalizeProducts(arr);
  productsCache = { data: list, ts: Date.now() };
  return list;
}

/**
 * Danh sách sản phẩm: API trước, fallback JSON; luôn trả mảng đã chuẩn hóa.
 * @param {object} [params] - Optional: { keyword, priceMin, priceMax, categories, brands }
 *   - keyword: tìm trong product_name, product_description
 *   - priceMin, priceMax: số (VNĐ)
 *   - categories: mảng string (product_category phải nằm trong mảng)
 *   - brands: mảng string (product_brand phải nằm trong mảng)
 */
export async function getProductsList(params) {
  const list = await fetchAllProducts();
  const hasFilter =
    params &&
    (params.keyword ||
      params.priceMin != null ||
      params.priceMax != null ||
      (Array.isArray(params.categories) && params.categories.length > 0) ||
      (Array.isArray(params.brands) && params.brands.length > 0));
  if (!hasFilter) return list;

  let result = list;
  const keyword = typeof params.keyword === 'string' ? params.keyword.trim().toLowerCase() : '';
  const priceMin = params.priceMin != null ? Number(params.priceMin) : null;
  const priceMax = params.priceMax != null ? Number(params.priceMax) : null;
  const categories = Array.isArray(params.categories) ? params.categories : [];
  const brands = Array.isArray(params.brands) ? params.brands : [];

  if (keyword) {
    result = result.filter((p) => {
      const name = (p.product_name || '').toLowerCase();
      const desc = (p.product_description || '').toLowerCase();
      return name.includes(keyword) || desc.includes(keyword);
    });
  }
  if (categories.length > 0) {
    const set = new Set(categories.map((c) => String(c).trim()).filter(Boolean));
    result = result.filter((p) => set.has(String(p.product_category || '').trim()));
  }
  if (brands.length > 0) {
    const set = new Set(brands.map((b) => String(b).trim()).filter(Boolean));
    result = result.filter((p) => set.has(String(p.product_brand || '').trim()));
  }
  if (priceMin != null && !Number.isNaN(priceMin)) {
    result = result.filter((p) => (p.product_price ?? 0) >= priceMin);
  }
  if (priceMax != null && !Number.isNaN(priceMax)) {
    result = result.filter((p) => (p.product_price ?? 0) <= priceMax);
  }

  return result;
}

/** Chi tiết 1 sản phẩm theo ID (lấy từ list, chuẩn hóa). */
export async function getProductById(id) {
  try {
    const list = await getProductsList();
    const found = list.find((p) => String(p.product_id) === String(id));
    return found ? normalizeProduct(found) : null;
  } catch (err) {
    console.error('Lỗi getProductById:', err);
    return null;
  }
}

/** POST login; token lấy từ payload.accessToken. */
export async function login(email, password) {
  const res = await request('/v1/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const payload = getPayload(res);
  const token = payload?.accessToken || payload?.tokens?.accessToken || payload?.token;
  const user = payload?.user;
  return { token, user, response: res };
}

/**
 * GET /v1/api/auth/me - lấy thông tin user đầy đủ sau login (bao gồm role nếu BE trả về)
 */
export async function getCurrentUser() {
  if (!isApiConfigured()) return null;
  try {
    const res = await request('/v1/api/auth/me');
    const data = getPayload(res);
    // BE có thể trả data.user hoặc trả thẳng object user
    return data?.user ?? data ?? null;
  } catch (err) {
    console.error('Lỗi gọi API /v1/api/auth/me:', err);
    return null;
  }
}

/** POST register. */
export async function register(email, password, name) {
  const res = await request('/v1/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  const payload = getPayload(res);
  return { user: payload?.user || payload, response: res };
}

/** POST order – body { items: [{ productId, quantity }] } (BE lấy giá từ DB). */
export async function createOrder(productId, quantity, price) {
  const res = await request('/v1/api/order', {
    method: 'POST',
    body: JSON.stringify({ items: [{ productId, quantity }] }),
  });
  const payload = getPayload(res);
  return { message: res.message || payload?.message, metadata: payload, response: res };
}

/**
 * GET /v1/api/order/me
 *
 * Nhận params để filter/sort/phân trang – chuẩn bị sẵn cho server-side.
 * Mock mode: tự filter + sort + slice toàn bộ mock data theo params.
 * Real API: gửi params lên BE dưới dạng query string.
 *
 * Params:
 *   page      – trang hiện tại (default 1)
 *   limit     – số đơn mỗi trang (default 6)
 *   status    – lọc trạng thái ('all' = không lọc)
 *   search    – tìm theo mã đơn hoặc tên sản phẩm
 *   sort      – newest | oldest | amount_high | amount_low
 *   dateFrom  – lọc từ ngày (YYYY-MM-DD)
 *   dateTo    – lọc đến ngày (YYYY-MM-DD)
 *
 * Trả về: { orders: Order[], pagination: Pagination }
 */
export async function getMyOrders({
  page = 1,
  limit = 6,
  status = 'all',
  search = '',
  sort = 'newest',
  dateFrom = '',
  dateTo = '',
} = {}) {
  // ============================================
  // ⚠️ TEMPORARY: Dùng mock data, tự mô phỏng server-side filter/sort/pagination
  // TODO: Khi có BE, bỏ comment phần real API bên dưới và xóa phần mock này
  // ============================================
  try {
    const mockData = await import('../data/mockOrders.json');
    // Format: { statusCode, message, data: { orders: [], pagination: {} } }
    let orders = normalizeOrders(mockData.default?.data?.orders ?? []);

    // --- Filter ---
    if (status && status !== 'all') {
      orders = orders.filter((o) => o.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.code.toLowerCase().includes(q) ||
          o.items.some((item) => item.name.toLowerCase().includes(q))
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      orders = orders.filter((o) => new Date(o.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      orders = orders.filter((o) => new Date(o.createdAt) <= to);
    }

    // --- Sort ---
    switch (sort) {
      case 'oldest':
        orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'amount_high':
        orders.sort((a, b) => b.totalAmount - a.totalAmount);
        break;
      case 'amount_low':
        orders.sort((a, b) => a.totalAmount - b.totalAmount);
        break;
      default: // newest
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // --- Pagination ---
    const totalOrders = orders.length;
    const totalPages = Math.max(1, Math.ceil(totalOrders / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * limit;
    const sliced = orders.slice(start, start + limit);

    return {
      orders: sliced,
      pagination: normalizePagination({ page: safePage, limit, totalOrders, totalPages }),
    };
  } catch (err) {
    console.error('Lỗi load mock data:', err);
    return { orders: [], pagination: normalizePagination({ page: 1, limit, totalOrders: 0, totalPages: 1 }) };
  }

  // ============================================
  // TODO: Khi có BE, bỏ comment phần dưới và xóa phần mock ở trên
  // BE nhận: GET /v1/api/order/me?page=1&limit=6&status=all&search=...&sort=newest
  // BE trả về: { statusCode, message, data: { orders: [], pagination: {} } }
  // ============================================
  /*
  if (!isApiConfigured()) return { orders: [], pagination: null };

  try {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', limit);
    if (status && status !== 'all') params.set('status', status);
    if (search) params.set('search', search);
    if (sort) params.set('sort', sort);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);

    const res = await request(`/v1/api/order/me?${params.toString()}`);
    const data = getPayload(res); // trả về res.data = { orders: [], pagination: {} }
    const orders = normalizeOrders(Array.isArray(data?.orders) ? data.orders : []);
    const pagination = normalizePagination(data?.pagination ?? null);
    return { orders, pagination };
  } catch (err) {
    console.error('Lỗi gọi API /v1/api/order/me:', err);
    return { orders: [], pagination: null };
  }
  */
}

/**
 * PATCH /v1/api/order/me/:id/cancel - Huỷ đơn hàng
 *
 * Chỉ áp dụng cho đơn đang ở trạng thái pending_payment hoặc pending_confirm.
 * Mock mode: trả về success ngay (không thay đổi file JSON).
 * Real API: gửi request lên BE, BE trả về đơn đã cập nhật status = 'cancelled'.
 *
 * Trả về: { success: boolean, message: string, order?: Order }
 */
export async function cancelOrder(orderId) {
  // ============================================
  // ⚠️ TEMPORARY: Mock – giả lập hủy thành công
  // TODO: Khi có BE, bỏ comment phần real API bên dưới và xóa phần mock này
  // ============================================
  try {
    // Giả lập network delay
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { success: true, message: 'Đã hủy đơn hàng thành công' };
  } catch (err) {
    console.error('Lỗi hủy đơn:', err);
    return { success: false, message: 'Không thể hủy đơn hàng' };
  }

  // ============================================
  // TODO: Khi có BE, bỏ comment phần dưới và xóa phần mock ở trên
  // BE trả về: { statusCode, message, data: { order: { ...order, status: 'cancelled' } } }
  // ============================================
  /*
  if (!isApiConfigured()) return { success: false, message: 'Chưa cấu hình API' };

  try {
    const res = await request(`/v1/api/order/me/${orderId}/cancel`, { method: 'PATCH' });
    const data = getPayload(res);
    const order = data?.order ? normalizeOrder(data.order) : null;
    return { success: true, message: res.message || 'Đã hủy đơn hàng thành công', order };
  } catch (err) {
    console.error(`Lỗi hủy đơn ${orderId}:`, err);
    return { success: false, message: err.message || 'Không thể hủy đơn hàng' };
  }
  */
}

/**
 * PATCH /v1/api/user/profile – Cập nhật thông tin hồ sơ cá nhân
 *
 * Payload: { name, phone, dob, gender, address?, avatar? }
 * Trả về: { success: boolean, message: string, user?: User }
 *
 * ⚠️ TEMPORARY: Mock – lưu vào localStorage để test UI
 * TODO: Khi có BE, thay bằng real PATCH request
 */
export async function updateProfile(fields) {
  // ============================================
  // ⚠️ TEMPORARY: Mock – cập nhật localStorage ngay lập tức
  // TODO: Khi có BE, bỏ comment phần real API và xóa mock này
  // ============================================
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const current = getUser() || {};
    const updated = { ...current, ...fields };
    setUser(updated);
    return { success: true, message: 'Cập nhật hồ sơ thành công', user: updated };
  } catch (err) {
    console.error('Lỗi cập nhật hồ sơ:', err);
    return { success: false, message: 'Không thể cập nhật hồ sơ' };
  }

  // ============================================
  // TODO: Khi có BE, bỏ comment phần này và xóa phần mock ở trên
  // BE trả về: { statusCode, message, data: { user: { ... } } }
  // ============================================
  /*
  if (!isApiConfigured()) return { success: false, message: 'Chưa cấu hình API' };
  try {
    const res = await request('/v1/api/user/profile', {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
    const data = getPayload(res);
    const user = data?.user ?? data;
    setUser(user);
    return { success: true, message: res.message || 'Cập nhật hồ sơ thành công', user };
  } catch (err) {
    console.error('Lỗi PATCH /v1/api/user/profile:', err);
    return { success: false, message: err.message || 'Không thể cập nhật hồ sơ' };
  }
  */
}

/**
 * POST /v1/api/users/change-password – Đổi mật khẩu
 *
 * Body: { oldPassword, newPassword }
 * Trả về: { success: boolean, message: string }
 *
 * ⚠️ TEMPORARY: Mock – giả lập thành công
 * TODO: Khi có BE, gọi POST /v1/api/users/change-password
 */
export async function changePassword(oldPassword, newPassword) {
  try {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { success: true, message: 'Đổi mật khẩu thành công' };
  } catch (err) {
    console.error('Lỗi đổi mật khẩu:', err);
    return { success: false, message: 'Không thể đổi mật khẩu' };
  }

  /*
  if (!isApiConfigured()) return { success: false, message: 'Chưa cấu hình API' };
  try {
    await request('/v1/api/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    return { success: true, message: 'Đổi mật khẩu thành công' };
  } catch (err) {
    console.error('Lỗi đổi mật khẩu:', err);
    return { success: false, message: err?.message || 'Không thể đổi mật khẩu' };
  }
  */
}

/**
 * GET /v1/api/order/me/:id - Lấy chi tiết 1 đơn hàng cụ thể
 * 
 * ⚠️ TEMPORARY: Đang dùng mock data để test UI
 * TODO: Khi có BE, bỏ comment phần gọi API và xóa phần mock data
 */
export async function getOrderById(orderId) {
  // ============================================
  // ⚠️ TEMPORARY: Dùng mock data để test UI
  // TODO: Khi có BE, bỏ comment phần dưới và xóa phần mock data này
  // ============================================
  try {
    const mockData = await import('../data/mockOrders.json');
    // Format: { statusCode, message, data: { orders: [] } }
    const orders = mockData.default?.data?.orders ?? [];
    const order = orders.find(o => o.id === orderId || o.code === orderId);
    return order ? normalizeOrder(order) : null;
  } catch (err) {
    console.error('Lỗi load mock data:', err);
    return null;
  }

  // ============================================
  // TODO: Khi có BE, bỏ comment phần này và xóa phần mock data ở trên
  // ============================================
  /*
  if (!isApiConfigured()) return null;

  try {
    // BE trả về format: { statusCode, message, data: { order: {} } }
    const res = await request(`/v1/api/order/me/${orderId}`);
    const data = getPayload(res); // getPayload trả về res.data = { order: {} }
    const order = data?.order ?? data;
    return normalizeOrder(order);
  } catch (err) {
    console.error(`Lỗi gọi API /v1/api/order/me/${orderId}:`, err);
    return null;
  }
  */
}

// In-memory cache cho trang quản lý đơn của Shop Owner (chỉ dùng mock UI).
let shopOrdersCache = null;

function toShopStatus(orderStatus) {
  const map = {
    pending_payment: 'pending',
    pending_confirm: 'pending',
    processing: 'processing',
    shipping: 'shipping',
    completed: 'completed',
    cancelled: 'cancelled',
    refunded: 'refunded',
  };
  return map[orderStatus] || 'pending';
}

function fromShopStatus(shopStatus, currentStatus) {
  if (shopStatus === 'cancelled') return 'cancelled';
  if (shopStatus === 'confirmed') return 'processing';
  if (shopStatus === 'pending') return currentStatus || 'pending_confirm';
  return currentStatus || shopStatus;
}

function canApprove(rawStatus) {
  return rawStatus === 'pending_payment' || rawStatus === 'pending_confirm';
}

async function ensureShopOrdersCache() {
  if (Array.isArray(shopOrdersCache)) return shopOrdersCache;
  const mockData = await import('../data/mockOrders.json');
  shopOrdersCache = Array.isArray(mockData.default?.data?.orders)
    ? [...mockData.default.data.orders]
    : [];
  return shopOrdersCache;
}

/**
 * GET /v1/api/shop/orders
 *
 * Params:
 *   page, limit, status(all|pending|processing|shipping|completed|cancelled|refunded),
 *   search (mã đơn / tên khách / tên sản phẩm)
 *
 * Trả về:
 * {
 *   orders: [{ id, code, customerName, customerPhone, itemsCount, totalAmount, status, createdAt, canApprove, canCancel }],
 *   pagination
 * }
 */
export async function getShopOrders({
  page = 1,
  limit = 10,
  status = 'all',
  search = '',
  sort = 'newest',
} = {}) {
  try {
    const rawOrders = await ensureShopOrdersCache();

    let orders = rawOrders.map((raw) => {
      const items = Array.isArray(raw.items) ? raw.items : [];
      const customerName =
        raw.shippingAddress?.fullName ||
        raw.shipping_address?.full_name ||
        'Khách hàng';
      const customerPhone =
        raw.shippingAddress?.phone ||
        raw.shipping_address?.phone ||
        '';
      const currentStatus = raw.status || 'pending_confirm';
      const shopStatus = toShopStatus(currentStatus);
      return {
        id: raw.id || raw._id || '',
        code: raw.code || '',
        customerName,
        customerPhone,
        itemsCount: items.reduce((sum, item) => sum + (item.quantity || 1), 0),
        totalAmount: raw.totalAmount || raw.pricing?.finalTotal || 0,
        status: shopStatus,
        createdAt: raw.createdAt || raw.orderTime || new Date().toISOString(),
        canApprove: canApprove(currentStatus),
        canCancel: canApprove(currentStatus),
      };
    });

    if (status && status !== 'all') {
      orders = orders.filter((order) => order.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      orders = orders.filter(
        (order) =>
          order.code.toLowerCase().includes(q) ||
          order.customerName.toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case 'oldest':
        orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'amount_high':
        orders.sort((a, b) => b.totalAmount - a.totalAmount);
        break;
      case 'amount_low':
        orders.sort((a, b) => a.totalAmount - b.totalAmount);
        break;
      default:
        orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const totalOrders = orders.length;
    const totalPages = Math.max(1, Math.ceil(totalOrders / limit));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * limit;
    const sliced = orders.slice(start, start + limit);

    return {
      orders: sliced,
      pagination: normalizePagination({ page: safePage, limit, totalOrders, totalPages }),
    };
  } catch (err) {
    console.error('Lỗi load mock shop orders:', err);
    return {
      orders: [],
      pagination: normalizePagination({ page: 1, limit, totalOrders: 0, totalPages: 1 }),
    };
  }
}

/**
 * PATCH /v1/api/shop/orders/:id/status
 * Mock: cập nhật cache local để test bảng quản lý đơn.
 */
export async function updateShopOrderStatus(orderId, nextStatus) {
  try {
    const list = await ensureShopOrdersCache();
    const idx = list.findIndex((o) => String(o.id || o._id) === String(orderId));
    if (idx < 0) return { success: false, message: 'Không tìm thấy đơn hàng' };

    const current = list[idx];
    const currentStatus = current.status || 'pending_confirm';
    if (!canApprove(currentStatus)) {
      return { success: false, message: 'Đơn hàng này không thể duyệt/hủy' };
    }

    const updatedStatus = fromShopStatus(nextStatus, currentStatus);
    list[idx] = {
      ...current,
      status: updatedStatus,
      updatedAt: new Date().toISOString(),
    };

    await new Promise((resolve) => setTimeout(resolve, 450));
    const actionLabel = nextStatus === 'cancelled' ? 'hủy' : 'duyệt';
    return { success: true, message: `Đã ${actionLabel} đơn hàng thành công` };
  } catch (err) {
    console.error('Lỗi cập nhật trạng thái đơn shop:', err);
    return { success: false, message: 'Không thể cập nhật trạng thái đơn hàng' };
  }
}