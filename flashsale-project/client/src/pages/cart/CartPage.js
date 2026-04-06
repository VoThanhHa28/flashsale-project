import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../../services/api';
import { useCart } from '../../contexts/CartContext';
import { CartLineRow, formatPrice } from './CartLineRow';
import './CartPage.css';

export default function CartPage() {
  const navigate = useNavigate();
  const { cart, loading, refreshCart } = useCart();
  const [error, setError] = useState('');
  const [stockById, setStockById] = useState({});

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
                  checkoutLoading={false}
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
                Bấm tiếp để sang bước thanh toán. Bạn sẽ có <strong>5 phút</strong> để hoàn tất trên màn hình
                thanh toán.
              </p>
              <button
                type="button"
                className="cart-page-checkout"
                onClick={() => navigate('/checkout')}
              >
                Thanh toán
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
