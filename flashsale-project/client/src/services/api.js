/**
 * API layer – base URL, token, parse response (metadata/data).
 * Khi có backend: thêm REACT_APP_API_URL vào .env (vd: http://localhost:3000)
 */

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
 * Chuẩn hóa payload từ response (backend trả { status, data: ... } hoặc { code, metadata: ... }).
 * Hỗ trợ cả 2 format để tương thích.
 */
export function getPayload(res) {
  // Hỗ trợ format mới: { code, metadata }
  if (res.metadata !== undefined) return res.metadata;
  // Hỗ trợ format cũ: { status, data }
  if (res.data !== undefined) return res.data;
  // Fallback: trả về chính response nếu không có data/metadata
  return res;
}

/**
 * Lấy message lỗi từ response (status, message, hoặc data.message).
 */
export function getErrorMessage(res) {
  if (res && typeof res.message === 'string') return res.message;
  if (res && res.data && typeof res.data.message === 'string') return res.data.message;
  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

/**
 * Gọi fetch với JSON body và optional Authorization header.
 */
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
    // Lỗi network (backend tắt, CORS, timeout, ...).
    // Ném ra Error với message chuẩn để UI hiển thị.
    const err = new Error('Không thể kết nối tới máy chủ. Vui lòng thử lại sau.');
    err.isNetworkError = true;
    err.cause = networkError;
    throw err;
  }

  json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = getErrorMessage(json) || res.statusText;
    const err = new Error(message);
    err.status = res.status;
    err.response = json;

    // Nếu là 401 nhưng KHÔNG phải login/register → auto logout + redirect.
    // Các màn đăng nhập / đăng ký sẽ tự xử lý 401 để hiển thị message.
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

/**
 * GET /v1/api/product – danh sách sản phẩm.
 * Nếu chưa cấu hình API thì trả về null để caller dùng fallback (JSON).
 */
export async function getProducts() {
  if (!isApiConfigured()) return null;

  try {
    const res = await request('/v1/api/product');
    const list = getPayload(res);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    // Nếu là lỗi network hoặc server down, cho phép fallback sang JSON tĩnh.
    // Log ra console để tiện debug, nhưng không làm vỡ UI.
    // eslint-disable-next-line no-console
    console.error('Lỗi gọi API /v1/api/product:', err);
    return null;
  }
}

/**
 * Lấy danh sách sản phẩm: dùng API nếu đã cấu hình, không thì fetch JSON.
 */
export async function getProductsList() {
  try {
    const list = await getProducts();
    // Nếu API trả về list (kể cả rỗng) thì dùng luôn.
    if (Array.isArray(list)) return list;
  } catch (err) {
    // Đã log ở getProducts, không cần log thêm.
  }

  // Fallback: fetch JSON giả (có thể dùng metadata hoặc data)
  const res = await fetch('/data/products.json');
  if (!res.ok) throw new Error('Không tải được danh sách sản phẩm.');
  const data = await res.json();
  // File JSON giả có thể dùng metadata hoặc data
  const payload = data.metadata ?? data.data ?? data;
  return Array.isArray(payload) ? payload : [];
}

/**
 * GET /v1/api/product/:id – lấy chi tiết sản phẩm theo ID.
 * Nếu chưa cấu hình API thì trả về null để caller dùng fallback (JSON).
 */
export async function getProductById(id) {
  if (!isApiConfigured()) return null;

  try {
    const res = await request(`/v1/api/product/${id}`);
    const product = getPayload(res);
    return product || null;
  } catch (err) {
    // Nếu backend không kết nối được (hoặc lỗi mạng), cho phép fallback sang JSON tĩnh ở tầng gọi (ProductDetail).
    // eslint-disable-next-line no-console
    console.error(`Lỗi gọi API /v1/api/product/${id}:`, err);
    return null;
  }
}

/**
 * POST /v1/api/auth/login – body { email, password }.
 */
export async function login(email, password) {
  const res = await request('/v1/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const payload = getPayload(res);
  // Hỗ trợ cả 2 format: tokens.accessToken (spec mới) và token (format hiện tại)
  const token = payload?.tokens?.accessToken || payload?.token;
  const user = payload?.user;
  return { token, user, response: res };
}

/**
 * POST /v1/api/auth/register – body { email, password, name }.
 */
export async function register(email, password, name) {
  const res = await request('/v1/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
  const payload = getPayload(res);
  return { user: payload?.user || payload, response: res };
}

/**
 * POST /v1/api/order – body { productId, quantity }, cần Authorization.
 */
export async function createOrder(productId, quantity) {
  const res = await request('/v1/api/order', {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
  const payload = getPayload(res);
  return { message: res.message || payload?.message, metadata: payload, response: res };
}
