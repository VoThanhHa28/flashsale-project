import { Link } from 'react-router-dom';

export function formatPrice(price) {
  if (price == null || Number.isNaN(Number(price))) return '—';
  return (
    new Intl.NumberFormat('vi-VN', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(Number(price)) + ' ₫'
  );
}

export function CartLineRow({
  item,
  maxStock,
  checkoutLoading,
  onSetQty,
  onRemove,
  readOnly = false,
}) {
  const cap = maxStock != null && Number(maxStock) >= 1 ? Number(maxStock) : null;
  const canInc = cap == null || item.quantity < cap;

  const dec = () => {
    if (readOnly || item.quantity <= 1) return;
    onSetQty(item.productId, item.quantity - 1);
  };

  const inc = () => {
    if (readOnly || !canInc) return;
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
            disabled={readOnly || checkoutLoading || item.quantity <= 1}
            aria-label="Giảm số lượng"
          >
            −
          </button>
          <span className="cart-page-qty-value">{item.quantity}</span>
          <button
            type="button"
            onClick={inc}
            disabled={readOnly || checkoutLoading || !canInc}
            aria-label="Tăng số lượng"
          >
            +
          </button>
        </div>
        <p className="cart-page-subtotal">{formatPrice(item.price * item.quantity)}</p>
        {!readOnly && (
          <button
            type="button"
            className="cart-page-remove"
            onClick={() => onRemove(item.productId)}
            disabled={checkoutLoading}
          >
            Xóa khỏi giỏ
          </button>
        )}
      </div>
    </li>
  );
}
