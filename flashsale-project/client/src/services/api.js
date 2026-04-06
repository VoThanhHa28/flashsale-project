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

/**
 * Mock mode: khi BE chưa sẵn sàng, dùng mock data tĩnh.
 * Chuyển sang real API: set REACT_APP_USE_MOCK=false trong .env
 * Mặc định: nếu không có BE URL → mock; nếu có URL → real.
 */
export function isMockMode() {
  const flag = process.env.REACT_APP_USE_MOCK;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return !isApiConfigured();
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

/** Cùng một chuỗi localStorage → cùng một object; tránh JSON.parse mỗi render làm useEffect([user]) lặp vô hạn. */
let userCacheRaw = null;
let userCacheParsed = null;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === USER_KEY || e.key === null) {
      userCacheRaw = null;
      userCacheParsed = null;
    }
  });
}

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
    if (raw === userCacheRaw) return userCacheParsed;
    userCacheRaw = raw;
    userCacheParsed = raw ? JSON.parse(raw) : null;
    return userCacheParsed;
  } catch {
    userCacheRaw = null;
    userCacheParsed = null;
    return null;
  }
}

export function setUser(user) {
  if (user) {
    const s = JSON.stringify(user);
    localStorage.setItem(USER_KEY, s);
    userCacheRaw = s;
    userCacheParsed = user;
  } else {
    localStorage.removeItem(USER_KEY);
    userCacheRaw = null;
    userCacheParsed = null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  userCacheRaw = null;
  userCacheParsed = null;
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

/** Cache in-memory cho danh sách sản phẩm đầy đủ — giảm gọi backend liên tục (304). TTL 10 giây. */
const PRODUCTS_CACHE_TTL_MS = 10 * 1000;
let productsCache = { data: null, ts: 0 };

/**
 * Lấy danh sách sản phẩm đầy đủ (không filter). Nội bộ dùng cho getProductsList(params).
 * Dùng cache TTL để tránh gọi GET /v1/api/products nhiều lần khi chuyển trang / mount lại.
 * Ưu tiên real API (MongoDB + Redis stock), fallback sang products.json nếu chưa có backend.
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

// =====================================================================
// ============ CATEGORIES (public list + SHOP_ADMIN CRUD) =============
// =====================================================================

/**
 * GET /v1/api/categories — danh mục đang hoạt động (không cần token).
 */
export async function getCategories() {
  if (!isApiConfigured()) {
    return { success: true, categories: [], message: '' };
  }
  try {
    const res = await request('/v1/api/categories');
    const data = getPayload(res);
    const categories = Array.isArray(data)
      ? data
      : Array.isArray(data?.categories)
        ? data.categories
        : [];
    return { success: true, categories, message: res.message || '' };
  } catch (err) {
    return {
      success: false,
      categories: [],
      message: err.message || 'Không tải được danh mục',
    };
  }
}

/** POST /v1/api/categories — Shop Admin */
export async function createCategory(body) {
  try {
    const res = await request('/v1/api/categories', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const data = getPayload(res);
    const category = data?.category ?? data;
    return {
      success: true,
      message: res.message || 'Đã tạo danh mục',
      category: category || null,
    };
  } catch (err) {
    return { success: false, message: err.message || 'Không tạo được danh mục', category: null };
  }
}

/** PUT /v1/api/categories/:id — Shop Admin */
export async function updateCategory(id, body) {
  try {
    const res = await request(`/v1/api/categories/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    const data = getPayload(res);
    const category = data?.category ?? data;
    return {
      success: true,
      message: res.message || 'Đã cập nhật danh mục',
      category: category || null,
    };
  } catch (err) {
    return { success: false, message: err.message || 'Không cập nhật được danh mục', category: null };
  }
}

/** DELETE /v1/api/categories/:id — Shop Admin (soft delete) */
export async function deleteCategory(id) {
  try {
    const res = await request(`/v1/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = getPayload(res);
    const category = data?.category ?? data;
    return {
      success: true,
      message: res.message || 'Đã xóa danh mục',
      category: category || null,
    };
  } catch (err) {
    return { success: false, message: err.message || 'Không xóa được danh mục', category: null };
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
    const data = getPayload(res);
    const orders = normalizeOrders(Array.isArray(data?.orders) ? data.orders : []);
    const pagination = normalizePagination(data?.pagination ?? null);
    return { orders, pagination };
  } catch (err) {
    console.error('Lỗi gọi API /v1/api/order/me:', err);
    return { orders: [], pagination: null };
  }
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
 * PUT /v1/api/users/me – Cập nhật thông tin hồ sơ cá nhân
 *
 * Payload: { name, address, avatar }
 * Trả về: { success: boolean, message: string, user?: User }
 */
export async function updateProfile(fields) {
  if (!isApiConfigured()) return { success: false, message: 'Chưa cấu hình API' };

  try {
    const res = await request('/v1/api/users/me', {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
    const data = getPayload(res);
    const user = data?.user ?? data;
    setUser(user);
    return { success: true, message: res.message || 'Cập nhật hồ sơ thành công', user };
  } catch (err) {
    console.error('Lỗi PUT /v1/api/users/me:', err);
    return { success: false, message: err.message || 'Không thể cập nhật hồ sơ' };
  }
}

/**
 * POST /v1/api/users/change-password – Đổi mật khẩu
 *
 * Body: { oldPassword, newPassword }
 * Trả về: { success: boolean, message: string }
 */
export async function changePassword(oldPassword, newPassword) {
  if (!isApiConfigured()) return { success: false, message: 'Chưa cấu hình API' };

  try {
    const res = await request('/v1/api/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    return { success: true, message: res.message || 'Đổi mật khẩu thành công' };
  } catch (err) {
    console.error('Lỗi đổi mật khẩu:', err);
    return { success: false, message: err?.message || 'Không thể đổi mật khẩu' };
  }
}

/**
 * GET /v1/api/order/me/:id - Lấy chi tiết 1 đơn hàng cụ thể
 */
export async function getOrderById(orderId) {
  if (!isApiConfigured()) return null;

  try {
    const res = await request(`/v1/api/order/me/${orderId}`);
    const data = getPayload(res);
    const order = data?.order ?? data;
    return normalizeOrder(order);
  } catch (err) {
    console.error(`Lỗi gọi API /v1/api/order/me/${orderId}:`, err);
    return null;
  }
}

/**
 * GET /v1/api/shop/orders
 *
 * Params:
 *   page, pageSize, status (pending|confirmed|completed|success|failed|cancelled)
 *
 * Trả về:
 * {
 *   orders: [{ _id, userId, productId, quantity, price, totalPrice, status, orderTime, processedAt }],
 *   pagination: { page, pageSize, total, totalPages }
 * }
 */
export async function getShopOrders({
  page = 1,
  limit = 10,
  status = 'all',
} = {}) {
  if (!isApiConfigured()) {
    return { orders: [], pagination: null };
  }

  try {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('pageSize', limit);
    if (status && status !== 'all') params.set('status', status);

    const res = await request(`/v1/api/shop/orders?${params.toString()}`);
    const data = getPayload(res);

    const rawOrders = Array.isArray(data?.orders) ? data.orders : [];
    const orders = rawOrders.map((raw) => {
      const currentStatus = raw.status || 'pending';
      return {
        id: raw._id || raw.id || '',
        code: raw._id?.slice(-8)?.toUpperCase() || '',
        customerName: raw.userId?.name || raw.customerName || 'Khách hàng',
        customerPhone: raw.userId?.phone || raw.customerPhone || '',
        productName: raw.productId?.productName || '',
        itemsCount: raw.quantity || 1,
        totalAmount: raw.totalPrice || raw.price * raw.quantity || 0,
        status: currentStatus,
        createdAt: raw.orderTime || raw.createdAt || new Date().toISOString(),
        canApprove: currentStatus === 'pending' || currentStatus === 'pending_confirm',
        canCancel: currentStatus === 'pending' || currentStatus === 'pending_confirm',
      };
    });

    const pagination = data?.pagination
      ? normalizePagination({
          page: data.pagination.page,
          limit: data.pagination.pageSize,
          totalOrders: data.pagination.total,
          totalPages: data.pagination.totalPages,
        })
      : null;

    return { orders, pagination };
  } catch (err) {
    console.error('Lỗi gọi API /v1/api/shop/orders:', err);
    return { orders: [], pagination: null };
  }
}

/**
 * PATCH /v1/api/shop/orders/:id/status
 * Body: { status: 'confirmed' | 'cancelled' }
 */
export async function updateShopOrderStatus(orderId, nextStatus) {
  if (!isApiConfigured()) {
    return { success: false, message: 'Chưa cấu hình API' };
  }

  try {
    const res = await request(`/v1/api/shop/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    const actionLabel = nextStatus === 'cancelled' ? 'hủy' : 'duyệt';
    return { success: true, message: res.message || `Đã ${actionLabel} đơn hàng thành công` };
  } catch (err) {
    console.error('Lỗi cập nhật trạng thái đơn shop:', err);
    return { success: false, message: err.message || 'Không thể cập nhật trạng thái đơn hàng' };
  }
}

/**
 * GET /v1/api/shop/stats/revenue
 *
 * BE trả về: { period, totalRevenue, totalOrders, daily: [{ date, totalRevenue, totalOrders }] }
 * FE transform sang: { points: [{ date, label, totalAmount, orderCount }], summary: {...} }
 */
export async function getRevenueReport({ days = 7 } = {}) {
  if (!isApiConfigured()) return EMPTY_REVENUE;

  try {
    const params = new URLSearchParams();
    params.set('days', days);
    const res = await request(`/v1/api/shop/stats/revenue?${params.toString()}`);
    const data = getPayload(res);

    const dailyData = Array.isArray(data?.daily) ? data.daily : [];
    const points = dailyData.map((d) => {
      const dateObj = new Date(d.date || d._id);
      const label = dateObj.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
      return {
        date: d.date || d._id,
        label,
        totalAmount: d.totalRevenue || 0,
        orderCount: d.totalOrders || 0,
      };
    });

    const totalRevenue = data?.totalRevenue ?? points.reduce((sum, p) => sum + p.totalAmount, 0);
    const orderCount = data?.totalOrders ?? points.reduce((sum, p) => sum + p.orderCount, 0);
    const avgPerDay = points.length > 0 ? Math.round(totalRevenue / points.length) : 0;
    const maxPoint = points.reduce(
      (max, p) => (p.totalAmount > max.totalAmount ? p : max),
      { totalAmount: 0, date: null, label: '' }
    );

    return {
      points,
      summary: { totalRevenue, orderCount, avgPerDay, maxDay: maxPoint },
    };
  } catch (err) {
    console.error('Lỗi gọi API /v1/api/shop/stats/revenue:', err);
    return EMPTY_REVENUE;
  }
}

const EMPTY_REVENUE = {
  points: [],
  summary: { totalRevenue: 0, orderCount: 0, avgPerDay: 0, maxDay: null },
};

// =====================================================================
// ============ SHOP PRODUCT MANAGEMENT (CRUD cho SHOP_ADMIN) ==========
// =====================================================================

function invalidateAllCaches() {
  productsCache = { data: null, ts: 0 };
}

function computeSaleStatus(product) {
  const now = new Date();
  const start = product.product_start_time ? new Date(product.product_start_time) : null;
  const end = product.product_end_time ? new Date(product.product_end_time) : null;
  if (!start || !end) return 'no_sale';
  if (now < start) return 'scheduled';
  if (now >= start && now <= end) return 'active';
  return 'ended';
}

/**
 * GET /v1/api/products (admin view) – danh sách tất cả sản phẩm kèm trạng thái flash sale.
 * Gọi real API, normalize, rồi gắn saleStatus.
 */
export async function getShopProducts() {
  try {
    const list = await fetchAllProducts();
    return list.map((p) => ({ ...p, saleStatus: computeSaleStatus(p) }));
  } catch (err) {
    console.error('Lỗi getShopProducts:', err);
    return [];
  }
}

/**
 * POST /v1/api/products – Tạo sản phẩm mới.
 * Body gửi lên BE (camelCase): productName, productThumb, productDescription,
 * productPrice, productQuantity, startTime, endTime, isPublished
 */
export async function createProduct(fields) {
  try {
    const res = await request('/v1/api/products', {
      method: 'POST',
      body: JSON.stringify(fields),
    });
    const data = getPayload(res);
    invalidateAllCaches();
    const product = data ? normalizeProduct(data) : null;
    return { success: true, message: res.message || 'Tạo sản phẩm thành công', product };
  } catch (err) {
    return { success: false, message: err.message || 'Không thể tạo sản phẩm' };
  }
}

/**
 * PUT /v1/api/products/:id – Cập nhật sản phẩm.
 * Backend tự validate, cập nhật MongoDB, đồng bộ Redis stock + info cache.
 */
export async function updateProduct(productId, fields) {
  try {
    const res = await request(`/v1/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
    const data = getPayload(res);
    invalidateAllCaches();
    const product = data ? normalizeProduct(data) : null;
    return { success: true, message: res.message || 'Cập nhật thành công', product };
  } catch (err) {
    return { success: false, message: err.message || 'Không thể cập nhật' };
  }
}

/**
 * PUT /v1/api/products/:id/force-start – Kích hoạt Flash Sale ngay lập tức.
 * BE chỉ set productStartTime = now (không sửa endTime).
 * Nếu endTime đã hết hạn, FE gọi updateProduct set endTime = now + 24h trước,
 * rồi mới gọi force-start.
 */
export async function forceStartProduct(productId) {
  try {
    const now = new Date();
    const newEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const list = await fetchAllProducts();
    const existing = list.find((p) => String(p.product_id) === String(productId));
    const currentEnd = existing?.product_end_time ? new Date(existing.product_end_time) : null;

    if (!currentEnd || currentEnd <= now) {
      await request(`/v1/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify({ endTime: newEnd.toISOString() }),
      });
    }

    const res = await request(`/v1/api/products/${productId}/force-start`, { method: 'PUT' });
    const data = getPayload(res);
    invalidateAllCaches();
    const product = data ? normalizeProduct(data) : null;
    return { success: true, message: res.message || 'Đã kích hoạt Flash Sale!', product };
  } catch (err) {
    return { success: false, message: err.message || 'Không thể kích hoạt' };
  }
}

/**
 * POST /v1/api/admin/flash-sale/hot-activate – Hot Activate: kích hoạt ngay + phát Socket event.
 * Backend set startTime = now, endTime = now + duration, broadcast flash-sale-start qua Socket.IO.
 * Lưu ý: BE trả data rỗng (do dùng SuccessResponse metadata), nên FE tự build product từ params.
 */
export async function hotActivateFlashSale(productId, durationSeconds = 3600) {
  try {
    const now = new Date();
    const endTime = new Date(now.getTime() + durationSeconds * 1000);

    await request('/v1/api/admin/flash-sale/hot-activate', {
      method: 'POST',
      body: JSON.stringify({ productId, duration: durationSeconds }),
    });
    invalidateAllCaches();
    return {
      success: true,
      message: 'Flash Sale đã kích hoạt!',
      product: {
        product_id: productId,
        product_start_time: now.toISOString(),
        product_end_time: endTime.toISOString(),
      },
    };
  } catch (err) {
    return { success: false, message: err.message || 'Không thể kích hoạt' };
  }
}

/**
 * POST /v1/api/admin/flash-sale/activate – Lên lịch Flash Sale (set start/end time + sync Redis).
 * Backend cập nhật productStartTime/productEndTime trong MongoDB
 * và gọi OrderService.initInventory() để đồng bộ stock vào Redis.
 * Lưu ý: BE trả data rỗng, nên FE dùng lại params đã gửi.
 */
export async function scheduleFlashSale(productId, startTime, endTime) {
  try {
    await request('/v1/api/admin/flash-sale/activate', {
      method: 'POST',
      body: JSON.stringify({ productId, startTime, endTime }),
    });
    invalidateAllCaches();
    return {
      success: true,
      message: 'Đã lên lịch Flash Sale!',
      product: {
        product_id: productId,
        product_start_time: startTime,
        product_end_time: endTime,
      },
    };
  } catch (err) {
    return { success: false, message: err.message || 'Không thể lên lịch' };
  }
}

/**
 * DELETE /v1/api/products/:id – Xóa mềm sản phẩm.
 * Backend set is_deleted = true, stock Redis về 0.
 */
export async function deleteProduct(productId) {
  try {
    await request(`/v1/api/products/${productId}`, { method: 'DELETE' });
    invalidateAllCaches();
    return { success: true, message: 'Đã xóa sản phẩm' };
  } catch (err) {
    return { success: false, message: err.message || 'Không thể xóa' };
  }
}

// =====================================================================
// ============ ADMIN USER MANAGEMENT (SHOP_ADMIN only) ================
// =====================================================================

/**
 * GET /v1/api/admin/users?page=1&limit=10 – Danh sách user phân trang.
 * BE trả về: { statusCode, message, data: { users: [...], total, page, limit } }
 */
export async function getAdminUsers({ page = 1, limit = 10 } = {}) {
  try {
    const params = new URLSearchParams();
    params.set('page', page);
    params.set('limit', limit);
    const res = await request(`/v1/api/admin/users?${params.toString()}`);
    const data = getPayload(res);
    return {
      success: true,
      users: Array.isArray(data?.users) ? data.users : [],
      total: data?.total ?? 0,
      page: data?.page ?? page,
      limit: data?.limit ?? limit,
    };
  } catch (err) {
    return { success: false, users: [], total: 0, page, limit, message: err.message };
  }
}

/**
 * PATCH /v1/api/admin/users/:id/ban – Khóa tài khoản user (set status = inactive).
 * Body: { status: 'inactive' } (BE validation chỉ cho phép 'inactive').
 */
export async function banUser(userId) {
  try {
    const res = await request(`/v1/api/admin/users/${userId}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'inactive' }),
    });
    const data = getPayload(res);
    return { success: true, message: res.message || 'Khóa tài khoản thành công', user: data?.user ?? null };
  } catch (err) {
    return { success: false, message: err.message || 'Không thể khóa tài khoản' };
  }
}

// =====================================================================
// ============ ACTIVITY LOGS (SHOP_ADMIN) ==============================
// =====================================================================

/**
 * GET /v1/api/admin/logs – Nhật ký POST/PUT/PATCH/DELETE (phân trang).
 * Query: page, limit, method (optional: POST | PUT | PATCH | DELETE)
 */
export async function getActivityLogs({ page = 1, limit = 20, method } = {}) {
  try {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (method) params.set('method', method);
    const res = await request(`/v1/api/admin/logs?${params.toString()}`);
    const data = getPayload(res);
    const pg = data?.pagination;
    return {
      success: true,
      message: res.message || '',
      logs: Array.isArray(data?.logs) ? data.logs : [],
      pagination: {
        page: pg?.page ?? page,
        pageSize: pg?.pageSize ?? limit,
        total: pg?.total ?? 0,
        totalPages: pg?.totalPages ?? 0,
      },
    };
  } catch (err) {
    return {
      success: false,
      message: err.message || 'Không thể tải nhật ký',
      logs: [],
      pagination: { page, pageSize: limit, total: 0, totalPages: 0 },
    };
  }
}

// =====================================================================
// ============ SYSTEM HEALTH (SUPER ADMIN only) =======================
// =====================================================================

/**
 * GET /v1/api/admin/health – Kiểm tra trạng thái MongoDB + Redis.
 * BE trả về: { statusCode, message, data: { mongo: 'ok'|'fail', redis: 'ok'|'fail' } }
 */
export async function getSystemHealth() {
  const t0 = performance.now();
  try {
    const res = await request('/v1/api/admin/health');
    const responseTime = Math.round(performance.now() - t0);
    const data = getPayload(res);
    return {
      success: true,
      mongo: data?.mongo ?? 'unknown',
      redis: data?.redis ?? 'unknown',
      responseTime,
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    const responseTime = Math.round(performance.now() - t0);
    return { success: false, mongo: 'fail', redis: 'fail', responseTime, message: err.message, checkedAt: new Date().toISOString() };
  }
}