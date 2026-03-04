import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCopy,
  FiClock,
  FiCheck,
  FiX,
  FiPackage,
  FiTruck,
  FiAlertCircle,
  FiRotateCcw,
  FiChevronRight,
  FiShoppingBag,
  FiTrash2,
} from 'react-icons/fi';
import styles from './OrderCard.module.css';

/**
 * Cấu hình trạng thái đơn hàng: icon, màu nhãn, bước stepper tương ứng
 * step: 1=Đặt hàng, 2=Xử lý, 3=Đang giao, 4=Hoàn tất, -1=Đã huỷ
 */
const STATUS_CONFIG = {
  pending_payment: { label: 'Chờ thanh toán', Icon: FiClock,       step: 1 },
  pending_confirm: { label: 'Chờ xác nhận',   Icon: FiAlertCircle, step: 1 },
  processing:      { label: 'Đang xử lý',      Icon: FiPackage,     step: 2 },
  shipping:        { label: 'Đang giao hàng',  Icon: FiTruck,       step: 3 },
  completed:       { label: 'Hoàn tất',         Icon: FiCheck,       step: 4 },
  cancelled:       { label: 'Đã hủy',           Icon: FiX,           step: -1 },
  refunded:        { label: 'Hoàn tiền',        Icon: FiRotateCcw,   step: -1 },
};

/** 4 bước chính trong hành trình đơn hàng */
const ORDER_STEPS = ['Đặt hàng', 'Xử lý', 'Đang giao', 'Hoàn tất'];

/**
 * OrderCard Component
 * Hiển thị thông tin một đơn hàng với:
 * - Left accent bar màu theo trạng thái
 * - Progress stepper 4 bước (ẩn khi huỷ/hoàn tiền)
 * - Countdown cho đơn chờ thanh toán/xác nhận
 * - Nút "Hủy đơn" với confirm inline cho đơn cancellable
 * - Actions nằm ngang ở footer
 */
function OrderCard({ order, onCopyCode, onCancelOrder }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  // Trạng thái confirm hủy inline: false | 'confirming' | 'cancelling'
  const [cancelState, setCancelState] = useState(false);

  // Countdown cho pending_payment / pending_confirm
  useEffect(() => {
    if (
      (order.status === 'pending_payment' || order.status === 'pending_confirm') &&
      order.holdExpiresAt
    ) {
      const updateCountdown = () => {
        const now = new Date().getTime();
        const expires = new Date(order.holdExpiresAt).getTime();
        const diff = expires - now;

        if (diff <= 0) {
          setIsExpired(true);
          setTimeLeft(null);
          return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeLeft({ minutes, seconds });
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 1000);
      return () => clearInterval(interval);
    }
  }, [order.status, order.holdExpiresAt]);

  const formatPrice = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'decimal', maximumFractionDigits: 0 }).format(price) +
    ' ₫';

  const formatDate = (dateString) =>
    new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));

  const getSecondaryAction = () => {
    switch (order.status) {
      case 'pending_payment': return { label: 'Thanh toán ngay', disabled: isExpired };
      case 'shipping':        return { label: 'Theo dõi vận chuyển', disabled: false };
      case 'completed':       return { label: 'Mua lại', disabled: false };
      case 'cancelled':
      case 'refunded':        return { label: 'Đặt lại', disabled: false };
      default:                return null;
    }
  };

  // Chỉ pending_payment và pending_confirm mới được phép hủy.
  // Không phụ thuộc isExpired – đơn hết hạn giữ hàng vẫn cần được hủy thủ công.
  const isCancellable =
    order.status === 'pending_payment' || order.status === 'pending_confirm';

  const handleCancelConfirm = async () => {
    if (!onCancelOrder) return;
    setCancelState('cancelling');
    await onCancelOrder(order.id, order.code);
    // Nếu component vẫn còn mount sau khi callback xong, reset state
    setCancelState(false);
  };

  const statusConfig = STATUS_CONFIG[order.status] || {
    label: order.status,
    Icon: FiAlertCircle,
    step: 0,
  };
  const { Icon: StatusIcon, step: currentStep } = statusConfig;
  const isCancelled = order.status === 'cancelled' || order.status === 'refunded';
  const secondaryAction = getSecondaryAction();
  const showCountdown =
    (order.status === 'pending_payment' || order.status === 'pending_confirm') &&
    order.holdExpiresAt &&
    !isExpired &&
    timeLeft;

  return (
    <div className={`${styles.card} ${styles[`status_${order.status}`]}`}>
      {/* Left accent bar – màu dựa vào status class */}
      <div className={styles.accentBar} aria-hidden="true" />

      <div className={styles.inner}>
        {/* ── Header: mã đơn + ngày + badge ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.orderCode}>
              <span className={styles.codeLabel}>#{order.code}</span>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => onCopyCode(order.code)}
                aria-label={`Copy mã đơn ${order.code}`}
              >
                <FiCopy size={13} />
              </button>
            </div>
            <div className={styles.metaRow}>
              <span className={styles.date}>{formatDate(order.createdAt)}</span>
              {/* Shop badge – chỉ hiện khi có thông tin shop */}
              {order.shop?.name && (
                <span className={styles.shopBadge}>
                  <FiShoppingBag size={11} aria-hidden="true" />
                  {order.shop.name}
                </span>
              )}
            </div>
          </div>

          <div className={`${styles.statusBadge} ${styles[`badge_${order.status}`]}`}>
            <StatusIcon size={13} aria-hidden="true" />
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* ── Countdown bar ── */}
        {showCountdown && (
          <div className={styles.countdown}>
            <FiClock size={13} aria-hidden="true" />
            <span>
              Hàng được giữ trong:{' '}
              <strong>
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
              </strong>
            </span>
          </div>
        )}

        {/* ── Progress stepper – ẩn khi huỷ/hoàn tiền ── */}
        {!isCancelled && (
          <div className={styles.stepper} aria-label="Tiến trình đơn hàng">
            {ORDER_STEPS.map((stepLabel, idx) => {
              const stepNum = idx + 1;
              const isDone = currentStep > stepNum;
              const isActive = currentStep === stepNum;
              return (
                <div
                  key={stepNum}
                  className={`${styles.stepItem} ${isDone ? styles.stepItemDone : ''} ${
                    isActive ? styles.stepItemActive : ''
                  }`}
                >
                  {/* Line trước mỗi bước (trừ bước đầu) */}
                  {idx > 0 && (
                    <div
                      className={`${styles.stepConnector} ${
                        currentStep > idx ? styles.stepConnectorDone : ''
                      }`}
                    />
                  )}
                  <div className={styles.stepDot}>
                    {isDone ? <FiCheck size={10} aria-hidden="true" /> : null}
                  </div>
                  <span className={styles.stepLabel}>{stepLabel}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Danh sách sản phẩm ── */}
        <div className={styles.items}>
          {order.items.slice(0, 2).map((item, idx) => (
            <div key={idx} className={styles.item}>
              <img src={item.thumb} alt={item.name} className={styles.itemImage} />
              <div className={styles.itemInfo}>
                <p className={styles.itemName} title={item.name}>
                  {item.name}
                </p>
                <p className={styles.itemMeta}>
                  <span className={styles.itemQty}>x{item.quantity}</span>
                  <span className={styles.itemPrice}>{formatPrice(item.salePrice)}</span>
                </p>
              </div>
            </div>
          ))}
          {order.items.length > 2 && (
            <p className={styles.moreItems}>+{order.items.length - 2} sản phẩm khác</p>
          )}
        </div>

        {/* ── Confirm hủy inline – hiện khi user bấm "Hủy đơn" ── */}
        {cancelState === 'confirming' && (
          <div className={styles.cancelConfirm}>
            <span className={styles.cancelConfirmText}>
              Bạn chắc chắn muốn hủy đơn này?
            </span>
            <div className={styles.cancelConfirmActions}>
              <button
                type="button"
                className={styles.cancelConfirmNo}
                onClick={() => setCancelState(false)}
              >
                Không
              </button>
              <button
                type="button"
                className={styles.cancelConfirmYes}
                onClick={handleCancelConfirm}
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        )}

        {/* ── Footer: tổng tiền + actions ── */}
        <div className={styles.footer}>
          <div className={styles.totalRow}>
            <span className={styles.totalLabel}>Tổng cộng</span>
            <strong className={styles.totalAmount}>{formatPrice(order.totalAmount)}</strong>
          </div>

          <div className={styles.actions}>
            <Link to="/support" className={styles.supportLink}>
              Hỗ trợ
            </Link>

            {/* Nút hủy đơn – chỉ hiện cho trạng thái cancellable */}
            {isCancellable && cancelState !== 'confirming' && (
              <button
                type="button"
                className={styles.cancelBtn}
                disabled={cancelState === 'cancelling'}
                onClick={() => setCancelState('confirming')}
                aria-label={`Hủy đơn hàng ${order.code}`}
              >
                <FiTrash2 size={13} aria-hidden="true" />
                {cancelState === 'cancelling' ? 'Đang hủy...' : 'Hủy đơn'}
              </button>
            )}

            {secondaryAction && cancelState !== 'confirming' && (
              <button
                type="button"
                className={styles.secondaryAction}
                disabled={secondaryAction.disabled}
                aria-label={secondaryAction.label}
              >
                {secondaryAction.label}
              </button>
            )}

            <Link
              to={`/orders/${order.id}`}
              className={styles.primaryAction}
              aria-label={`Xem chi tiết đơn hàng ${order.code}`}
            >
              Chi tiết
              <FiChevronRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderCard;
