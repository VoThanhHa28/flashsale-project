import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { CartLineRow, formatPrice } from '../cart/CartLineRow';
import '../cart/CartPage.css';
import './CheckoutPage.css';

const CHECKOUT_LIMIT_MS = 5 * 60 * 1000;

function formatCountdown(remainingMs) {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, loading, refreshCart } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [stockById, setStockById] = useState({});
  const deadlineRef = useRef(Date.now() + CHECKOUT_LIMIT_MS);
  const [remainingMs, setRemainingMs] = useState(CHECKOUT_LIMIT_MS);

  const token = api.getToken();
  const items = useMemo(
    () => (Array.isArray(cart?.items) ? cart.items : []),
    [cart?.items],
  );

  const itemsSignature = useMemo(
    () => items.map((i) => `${i.productId}:${i.quantity}`).join('|'),
    [items],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemainingMs(Math.max(0, deadlineRef.current - Date.now()));
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!token || items.length === 0) {
      setStockById({});
      return;
    }
    (async () => {
      const list = await api.getProductsList();
      if (cancelled) return;
      const m = {};
      for (const p of list || []) {
        m[String(p.product_id)] = p.product_quantity;
      }
      setStockById(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, items.length, itemsSignature]);

  useEffect(() => {
    if (!loading && token && items.length === 0 && !checkoutLoading) {
      navigate('/cart', { replace: true });
    }
  }, [loading, token, items.length, checkoutLoading, navigate]);

  const setLineQty = useCallback(
    async (productId, nextQty) => {
      const q = Math.max(1, Math.floor(Number(nextQty)) || 1);
      setError('');
      try {
        await api.updateCartItem(productId, q);
        await refreshCart();
      } catch (err) {
        setError(err.message || 'Không cập nhật được số lượng.');
      }
    },
    [refreshCart],
  );

  const handleRemove = useCallback(
    async (productId) => {
      setError('');
      try {
        await api.removeCartItem(productId);
        await refreshCart();
      } catch (err) {
        setError(err.message || 'Không xóa được sản phẩm.');
      }
    },
    [refreshCart],
  );

  const timeExpired = remainingMs <= 0;
  const countdownLabel = formatCountdown(remainingMs);

  const handleConfirmPayment = async () => {
    if (items.length === 0 || timeExpired) return;
    setError('');
    setMessage('');
    setCheckoutLoading(true);
    const list = [...items];
    const failures = [];
    let ok = 0;
    try {
      for (const it of list) {
        try {
          await api.createOrder(it.productId, it.quantity, it.price);
          await api.removeCartItem(it.productId);
          ok += 1;
        } catch (err) {
          failures.push(`${it.productName || it.productId}: ${err.message || 'Lỗi'}`);
        }
      }
      await refreshCart();

      if (failures.length === 0) {
        setMessage('Đặt hàng thành công. Bạn có thể xem đơn trong mục Đơn hàng.');
        setTimeout(() => navigate('/orders'), 1200);
      } else if (ok === 0) {
        setError(failures.join(' '));
      } else {
        setError(
          `Đã tạo ${ok} đơn. ${failures.length} dòng chưa xong: ${failures.join(' ')}`,
        );
      }
    } catch (err) {
      setError(err.message || 'Thanh toán thất bại. Vui lòng thử lại.');
      await refreshCart();
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!api.isApiConfigured()) {
    return (
      <div className="cart-page-root">
        <div className="cart-page-panel">
          <div className="cart-page-head">
            <h1>Thanh toán</h1>
            <p>Chưa cấu hình API — không thể tiếp tục.</p>
          </div>
          <Link to="/cart" className="cart-page-back">
            ← Quay lại giỏ hàng
          </Link>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="cart-page-root">
        <div className="cart-page-panel">
          <nav className="cart-page-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span className="cart-page-breadcrumb-sep">/</span>
            <Link to="/cart">Giỏ hàng</Link>
            <span className="cart-page-breadcrumb-sep">/</span>
            <span>Thanh toán</span>
          </nav>
          <div className="cart-page-head">
            <h1>Thanh toán</h1>
            <p>Đăng nhập để hoàn tất đơn hàng.</p>
          </div>
          <Link to={`/login?redirect=${encodeURIComponent('/checkout')}`} className="cart-page-btn-primary">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page-root">
      <nav className="cart-page-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span className="cart-page-breadcrumb-sep">/</span>
        <Link to="/cart">Giỏ hàng</Link>
        <span className="cart-page-breadcrumb-sep">/</span>
        <span>Thanh toán</span>
      </nav>

      <header className="cart-page-head">
        <h1>Thanh toán</h1>
        <p>Xác nhận đơn hàng và hoàn tất trong thời gian cho phép.</p>
      </header>

      <div
        className={`checkout-countdown ${timeExpired ? 'checkout-countdown--expired' : ''} ${remainingMs > 0 && remainingMs <= 60_000 ? 'checkout-countdown--warn' : ''}`}
        role="timer"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="checkout-countdown-icon" aria-hidden="true">⏱</span>
        {timeExpired ? (
          <span>Hết thời gian thanh toán. Vui lòng quay lại giỏ hàng và thử lại.</span>
        ) : (
          <span>
            Bạn còn <strong className="checkout-countdown-digits">{countdownLabel}</strong> để hoàn tất
            thanh toán.
          </span>
        )}
      </div>

      <div className="cart-page-panel">
        {loading && items.length === 0 && (
          <p className="cart-page-muted">Đang tải…</p>
        )}

        {error && (
          <p className="cart-page-alert cart-page-alert--error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="cart-page-alert cart-page-alert--success" role="status">
            {message}
          </p>
        )}

        {items.length > 0 && (
          <>
            <ul className="cart-page-lines">
              {items.map((it) => (
                <CartLineRow
                  key={it.productId}
                  item={it}
                  maxStock={stockById[String(it.productId)]}
                  checkoutLoading={checkoutLoading || timeExpired}
                  onSetQty={setLineQty}
                  onRemove={handleRemove}
                  readOnly={timeExpired}
                />
              ))}
            </ul>

            <div className="cart-page-footer">
              <div className="cart-page-total-row">
                <span className="cart-page-total-label">Tạm tính</span>
                <span className="cart-page-total-value">{formatPrice(cart?.totalAmount ?? 0)}</span>
              </div>
              <p className="cart-page-note">
                Hệ thống tạo <strong>một đơn hàng cho mỗi sản phẩm</strong> trong giỏ. Giá cuối do server xác
                nhận khi đặt.
              </p>
              <button
                type="button"
                className="cart-page-checkout"
                onClick={handleConfirmPayment}
                disabled={checkoutLoading || timeExpired || items.length === 0}
              >
                {checkoutLoading ? 'Đang xử lý…' : timeExpired ? 'Hết thời gian' : 'Xác nhận thanh toán'}
              </button>
            </div>
          </>
        )}

        <Link to="/cart" className="cart-page-back">
          ← Quay lại giỏ hàng
        </Link>
      </div>
    </div>
  );
}
