/**
 * Modal kết quả đặt hàng (thành công hoặc thất bại).
 * Dùng trong ProductDetail; styles nằm trong ProductDetail.css (class product-detail-result-modal-*).
 */
function OrderResultModal({
  variant,
  title,
  message,
  onClose,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
  closeButtonRef,
  titleId,
  descId,
}) {
  const modClass = variant === 'success' ? 'product-detail-result-modal--success' : 'product-detail-result-modal--error';

  return (
    <div
      className="product-detail-result-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <div className={`product-detail-result-modal ${modClass}`}>
        <button
          ref={closeButtonRef}
          type="button"
          className="product-detail-result-modal-close"
          onClick={onClose}
          aria-label={variant === 'success' ? 'Đóng thông báo' : 'Đóng và thử lại'}
        >
          ×
        </button>
        <h2 id={titleId} className="product-detail-result-modal-title">
          {title}
        </h2>
        <p id={descId} className="product-detail-result-modal-message">
          {message}
        </p>
        <div className="product-detail-result-modal-actions">
          <button
            type="button"
            className="product-detail-result-modal-btn product-detail-result-modal-btn--primary"
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className="product-detail-result-modal-btn product-detail-result-modal-btn--secondary"
            onClick={onSecondary}
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderResultModal;
