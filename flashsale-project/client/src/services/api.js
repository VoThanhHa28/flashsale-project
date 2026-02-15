/**
 * API layer – base URL, token, parse response.
 * Toàn bộ gọi backend đi qua file này; component chỉ dùng các hàm export.
 */
import { normalizeProduct, normalizeProducts } from '../utils/productShape';

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
    console.error('Lỗi gọi API /v1/api/products:', err);
    return null;
  }
}

/** Danh sách sản phẩm: API trước, fallback JSON; luôn trả mảng đã chuẩn hóa. */
export async function getProductsList() {
  try {
    const list = await getProducts();
    if (Array.isArray(list)) return list;
  } catch (err) {}

  const res = await fetch('/data/products.json');
  if (!res.ok) throw new Error('Không tải được danh sách sản phẩm.');
  const data = await res.json();
  const payload = data.metadata ?? data.data ?? data;
  const arr = Array.isArray(payload) ? payload : [];
  return normalizeProducts(arr);
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