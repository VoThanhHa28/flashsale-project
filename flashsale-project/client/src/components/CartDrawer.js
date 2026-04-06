import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiX } from 'react-icons/fi';
import * as api from '../services/api';
import { useCart } from '../contexts/CartContext';
import './CartDrawer.css';

function formatPrice(price) {
  if (price == null || Number.isNaN(Number(price))) return '';
  return (
    new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(Number(price)) + ' ₫'
  );
}

function CartDrawer() {
  const navigate = useNavigate();
  const { drawerOpen, setDrawerOpen, cart, loading, refreshCart } = useCart();
  const panelRef = useRef(null);
  const closeBtnRef = useRef(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const t = setTimeout(() => closeBtnRef.current?.focus(), 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, setDrawerOpen]);

  const items = Array.isArray(cart?.items) ? cart.items : [];

  const handleQtyChange = async (productId, nextQty) => {
    const q = Math.max(1, Math.floor(Number(nextQty)) || 1);
    try {
      await api.updateCartItem(productId, q);
      await refreshCart();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (productId) => {
    try {
      await api.removeCartItem(productId);
      await refreshCart();
    } catch (err) {
      console.error(err);
    }
  };

  if (!drawerOpen) return null;

  return (
    <div className="cart-drawer-root" aria-hidden={!drawerOpen}>
      <button
        type="button"
        className="cart-drawer-backdrop"
        aria-label="Đóng giỏ hàng"
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        ref={panelRef}
        className="cart-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <div className="cart-drawer-header">
          <h2 id="cart-drawer-title" className="cart-drawer-title">
            Giỏ hàng
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="cart-drawer-close"
            aria-label="Đóng"
            onClick={() => setDrawerOpen(false)}
          >
            <FiX size={22} />
          </button>
        </div>

        <div className="cart-drawer-body">
          {loading && items.length === 0 && (
            <p className="cart-drawer-muted">Đang tải…</p>
          )}
          {!loading && items.length === 0 && (
            <p className="cart-drawer-muted">Giỏ hàng trống.</p>
          )}
          <ul className="cart-drawer-list">
            {items.map((it) => (
              <li key={it.productId} className="cart-drawer-row">
                <div className="cart-drawer-row-main">
                  {it.productThumb ? (
                    <img
                      src={it.productThumb}
                      alt=""
                      className="cart-drawer-thumb"
                    />
                  ) : (
                    <div className="cart-drawer-thumb cart-drawer-thumb--placeholder" />
                  )}
                  <div className="cart-drawer-row-text">
                    <p className="cart-drawer-name">{it.productName}</p>
                    <p className="cart-drawer-price">{formatPrice(it.price)}</p>
                  </div>
                </div>
                <div className="cart-drawer-row-actions">
                  <input
                    type="number"
                    min={1}
                    key={`${it.productId}-${it.quantity}`}
                    defaultValue={it.quantity}
                    className="cart-drawer-qty"
                    onBlur={(e) => handleQtyChange(it.productId, e.target.value)}
                    aria-label={`Số lượng ${it.productName}`}
                  />
                  <button
                    type="button"
                    className="cart-drawer-remove"
                    onClick={() => handleRemove(it.productId)}
                  >
                    Xóa
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="cart-drawer-footer">
          {items.length > 0 && (
            <p className="cart-drawer-total">
              Tạm tính:{' '}
              <strong>{formatPrice(cart?.totalAmount ?? 0)}</strong>
            </p>
          )}
          <Link
            to="/cart"
            className="cart-drawer-link-full"
            onClick={() => setDrawerOpen(false)}
          >
            Giỏ hàng của tôi
          </Link>
          <button
            type="button"
            className="cart-drawer-btn-checkout"
            disabled={items.length === 0}
            onClick={() => {
              setDrawerOpen(false);
              navigate('/cart');
            }}
          >
            Thanh toán
          </button>
        </div>
      </aside>
    </div>
  );
}

export default CartDrawer;
