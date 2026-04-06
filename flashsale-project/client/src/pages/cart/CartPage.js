import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import './CartPage.css';

function formatPrice(price) {
  if (price == null || Number.isNaN(Number(price))) return '—';
  return (
    new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(Number(price)) + ' ₫'
  );
}

function CartLineRow({
  item,
  maxStock,
  checkoutLoading,
  onSetQty,
  onRemove,
}) {
  const cap = maxStock != null && Number(maxStock) >= 1 ? Number(maxStock) : null;
  const canInc = cap == null || item.quantity < cap;

  const dec = () => {
    if (item.quantity <= 1) return;
    onSetQty(item.productId, item.quantity - 1);
  };

  const inc = () => {
    if (!canInc) return;
    onSetQty(item.productId, item.quantity + 1);
  };

  return (
    <li className="cart-page-line">
      <div className="cart-page-line-main">
        <Link to={`/product/${item.productId}`} className="cart-page-line-img-link">
          {item.productThumb ? (
            <img
              src={item.productThumb}
              alt={item.productName || 'Sản phẩm'}
              className="cart-page-line-img"
            />
          ) : (
            <div className="cart-page-line-img cart-page-line-img--ph" aria-hidden />
          )}
        </Link>
        <div className="cart-page-line-text">
          <h2 className="cart-page-line-title">
            <Link to={`/product/${item.productId}`}>{item.productName || 'Sản phẩm'}</Link>
          </h2>
          <p className="cart-page-line-unit">{formatPrice(item.price)} / sản phẩm</p>
          <p className="cart-page-line-stock">
            {cap != null
              ? `Còn tối đa ${cap} sản phẩm trong kho (trên website).`
              : 'Số lượng có thể điều chỉnh — giới hạn cuối cùng theo tồn kho khi đặt.'}
          </p>
        </div>
      </div>
      <div className="cart-page-line-aside">
        <div className="cart-page-qty" role="group" aria-label="Số lượng">
          <button
            type="button"
            onClick={dec}
            disabled={checkoutLoading || item.quantity <= 1}
            aria-label="Giảm số lượng"
          >
            −
          </button>
          <span className="cart-page-qty-value">{item.quantity}</span>
          <button
            type="button"
            onClick={inc}
            disabled={checkoutLoading || !canInc}
            aria-label="Tăng số lượng"
          >
            +
          </button>
        </div>
        <p className="cart-page-subtotal">{formatPrice(item.price * item.quantity)}</p>
        <button
          type="button"
          className="cart-page-remove"
          onClick={() => onRemove(item.productId)}
          disabled={checkoutLoading}
        >
          Xóa khỏi giỏ
        </button>
      </div>
    </li>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, loading, refreshCart } = useCart();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [stockById, setStockById] = useState({});

  const token = api.getToken();
  const items = Array.isArray(cart?.items) ? cart.items : [];

  const itemsSignature = useMemo(
    () => items.map((i) => `${i.productId}:${i.quantity}`).join('|'),
    [items],
  );

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

  const handleCheckout = async () => {
    if (items.length === 0) return;
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
            <h1>Giỏ hàng</h1>
            <p>Chưa cấu hình API — không thể tải giỏ hàng.</p>
          </div>
          <Link to="/" className="cart-page-back">
            ← Về trang chủ
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
            <span>Giỏ hàng</span>
          </nav>
          <div className="cart-page-head">
            <h1>Giỏ hàng</h1>
            <p>Đăng nhập để xem và quản lý sản phẩm đã chọn.</p>
          </div>
          <div className="cart-page-guest-actions">
            <Link to={`/login?redirect=${encodeURIComponent('/cart')}`} className="cart-page-btn-primary">
              Đăng nhập
            </Link>
            <Link to="/register" className="cart-page-back" style={{ marginTop: 0 }}>
              Tạo tài khoản
            </Link>
          </div>
          <Link to="/" className="cart-page-back">
            ← Tiếp tục mua sắm
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
        <span>Giỏ hàng</span>
      </nav>

      <header className="cart-page-head">
        <h1>Giỏ hàng của bạn</h1>
        <p>
          Kiểm tra sản phẩm và số lượng trước khi thanh toán. Giá và tồn kho lấy theo dữ liệu tại thời điểm
          thao tác.
        </p>
      </header>

      <div className="cart-page-panel">
        {loading && items.length === 0 && (
          <p className="cart-page-muted">Đang tải giỏ hàng…</p>
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

        {!loading && items.length === 0 && (
          <div className="cart-page-empty">
            <p className="cart-page-muted">Giỏ hàng đang trống.</p>
            <Link to="/" className="cart-page-btn-primary">
              Khám phá sản phẩm
            </Link>
          </div>
        )}

        {items.length > 0 && (
          <>
            <ul className="cart-page-lines">
              {items.map((it) => (
                <CartLineRow
                  key={it.productId}
                  item={it}
                  maxStock={stockById[String(it.productId)]}
                  checkoutLoading={checkoutLoading}
                  onSetQty={setLineQty}
                  onRemove={handleRemove}
                />
              ))}
            </ul>

            <div className="cart-page-footer">
              <div className="cart-page-total-row">
                <span className="cart-page-total-label">Tạm tính</span>
                <span className="cart-page-total-value">{formatPrice(cart?.totalAmount ?? 0)}</span>
              </div>
              <p className="cart-page-note">
                Hệ thống tạo <strong>một đơn hàng cho mỗi sản phẩm</strong> trong giỏ (theo API hiện tại).
                Giá thanh toán do server xác nhận khi đặt.
              </p>
              <button
                type="button"
                className="cart-page-checkout"
                onClick={handleCheckout}
                disabled={checkoutLoading}
              >
                {checkoutLoading ? 'Đang xử lý…' : 'Thanh toán'}
              </button>
            </div>
          </>
        )}

        <Link to="/" className="cart-page-back">
          ← Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  );
}
