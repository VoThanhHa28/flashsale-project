import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { useCart } from '../contexts/CartContext';
import './Cart.css';

function formatPrice(price) {
  if (price == null || Number.isNaN(Number(price))) return '';
  return (
    new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(Number(price)) + ' ₫'
  );
}

function Cart() {
  const navigate = useNavigate();
  const { cart, loading, refreshCart } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const token = api.getToken();
  const items = Array.isArray(cart?.items) ? cart.items : [];

  const handleQty = async (productId, raw) => {
    const q = Math.max(1, Math.floor(Number(raw)) || 1);
    setError('');
    try {
      await api.updateCartItem(productId, q);
      await refreshCart();
    } catch (err) {
      setError(err.message || 'Không cập nhật được số lượng.');
    }
  };

  const handleRemove = async (productId) => {
    setError('');
    try {
      await api.removeCartItem(productId);
      await refreshCart();
    } catch (err) {
      setError(err.message || 'Không xóa được sản phẩm.');
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setError('');
    setMessage('');
    setCheckoutLoading(true);
    try {
      const list = [...items];
      for (const it of list) {
        await api.createOrder(it.productId, it.quantity, it.price);
        await api.removeCartItem(it.productId);
      }
      await refreshCart();
      setMessage('Đặt hàng thành công. Bạn có thể xem đơn trong Tài khoản.');
      setTimeout(() => navigate('/orders'), 1200);
    } catch (err) {
      setError(err.message || 'Thanh toán thất bại. Vui lòng thử lại.');
      await refreshCart();
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!api.isApiConfigured()) {
    return (
      <div className="cart-page">
        <div className="cart-card">
          <h1 className="cart-title">Giỏ hàng của tôi</h1>
          <p className="cart-text">Chưa cấu hình API. Không thể tải giỏ hàng.</p>
          <Link to="/" className="cart-back-link">← Về trang chủ</Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="cart-page">
        <div className="cart-card">
          <h1 className="cart-title">Giỏ hàng của tôi</h1>
          <p className="cart-text">Vui lòng đăng nhập để xem giỏ hàng.</p>
          <Link to={`/login?redirect=${encodeURIComponent('/cart')}`} className="cart-btn-primary">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-card cart-card--wide">
        <h1 className="cart-title">Giỏ hàng của tôi</h1>

        {loading && items.length === 0 && (
          <p className="cart-text">Đang tải…</p>
        )}

        {error && <p className="cart-error" role="alert">{error}</p>}
        {message && <p className="cart-success" role="status">{message}</p>}

        {!loading && items.length === 0 && (
          <p className="cart-text">Giỏ hàng của bạn đang trống.</p>
        )}

        {items.length > 0 && (
          <>
            <ul className="cart-lines">
              {items.map((it) => (
                <li key={it.productId} className="cart-line">
                  <div className="cart-line-media">
                    {it.productThumb ? (
                      <img src={it.productThumb} alt="" className="cart-line-img" />
                    ) : (
                      <div className="cart-line-img cart-line-img--ph" />
                    )}
                    <div className="cart-line-info">
                      <p className="cart-line-name">{it.productName}</p>
                      <p className="cart-line-price">{formatPrice(it.price)}</p>
                    </div>
                  </div>
                  <div className="cart-line-actions">
                    <label className="cart-line-qty-label">
                      SL
                      <input
                        type="number"
                        min={1}
                        className="cart-line-qty"
                        key={`${it.productId}-${it.quantity}`}
                        defaultValue={it.quantity}
                        onBlur={(e) => handleQty(it.productId, e.target.value)}
                        disabled={checkoutLoading}
                      />
                    </label>
                    <p className="cart-line-subtotal">
                      {formatPrice(it.price * it.quantity)}
                    </p>
                    <button
                      type="button"
                      className="cart-line-remove"
                      onClick={() => handleRemove(it.productId)}
                      disabled={checkoutLoading}
                    >
                      Xóa
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="cart-summary">
              <p className="cart-total">
                Tổng cộng: <strong>{formatPrice(cart?.totalAmount ?? 0)}</strong>
              </p>
              <p className="cart-checkout-hint">
                Mỗi sản phẩm tạo một đơn hàng riêng (theo luồng thanh toán hiện tại).
              </p>
              <button
                type="button"
                className="cart-btn-checkout"
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? 'Đang xử lý…' : 'Thanh toán'}
              </button>
            </div>
          </>
        )}

        <Link to="/" className="cart-back-link">← Tiếp tục mua sắm</Link>
      </div>
    </div>
  );
}

export default Cart;
