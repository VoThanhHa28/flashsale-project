import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCopy,
  FiClock,
  FiCheck,
  FiX,
  FiPackage,
  FiTruck,
  FiAlertCircle,
  FiRotateCcw,
  FiShoppingBag,
  FiMapPin,
  FiPhone,
  FiUser,
  FiTrash2,
} from 'react-icons/fi';
import * as api from '../services/api';
import styles from './OrderDetail.module.css';

/**
 * Cấu hình trạng thái: icon + màu accent – dùng chung cho badge và timeline
 */
const STATUS_CONFIG = {
  pending_payment: { label: 'Chờ thanh toán', Icon: FiClock       },
  pending_confirm: { label: 'Chờ xác nhận',   Icon: FiAlertCircle },
  processing:      { label: 'Đang xử lý',      Icon: FiPackage     },
  shipping:        { label: 'Đang giao hàng',  Icon: FiTruck       },
  completed:       { label: 'Hoàn tất',         Icon: FiCheck       },
  cancelled:       { label: 'Đã hủy',           Icon: FiX           },
  refunded:        { label: 'Hoàn tiền',        Icon: FiRotateCcw   },
};

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN', { style: 'decimal', maximumFractionDigits: 0 }).format(price) + ' ₫';

const formatDate = (dateString) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateString));

/**
 * Skeleton loader cho trang chi tiết
 */
function OrderDetailSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={`${styles.skLine} ${styles.skTitle}`} />
      <div className={styles.skCard}>
        {[1, 2, 3].map((i) => <div key={i} className={`${styles.skLine} ${styles.skMed}`} />)}
      </div>
      <div className={styles.skCard}>
        {[1, 2].map((i) => <div key={i} className={styles.skItem} />)}
      </div>
    </div>
  );
}

/**
 * OrderDetail Page
 * Route: /orders/:id
 *
 * Hiển thị đầy đủ thông tin 1 đơn hàng:
 *   - Header: mã đơn + status badge
 *   - Timeline dọc: lịch sử các trạng thái
 *   - Danh sách sản phẩm
 *   - Địa chỉ giao hàng
 *   - Tổng tiền + actions (hủy đơn nếu cancellable)
 */
function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelState, setCancelState] = useState(false); // false | 'confirming' | 'cancelling'
  const [toast, setToast] = useState(null);

  const user = api.getUser();

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/orders/' + id);
      return;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getOrderById(id);
        if (!cancelled) {
          if (data) setOrder(data);
          else setError('Không tìm thấy đơn hàng.');
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không tải được đơn hàng.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id, user, navigate]);

  // Auto-hide toast sau 3s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleCopy = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setToast('Đã copy mã đơn hàng');
    } catch {
      setToast('Không thể copy');
    }
  }, []);

  const handleCancelConfirm = async () => {
    setCancelState('cancelling');
    const result = await api.cancelOrder(order.id);
    if (result.success) {
      setToast(result.message);
      // Cập nhật status local ngay lập tức, không cần reload
      setOrder((prev) => ({ ...prev, status: 'cancelled' }));
    } else {
      setToast(result.message || 'Không thể hủy đơn hàng');
    }
    setCancelState(false);
  };

  if (!user) return null;

  if (loading) return (
    <div className={styles.page}>
      <div className={styles.container}><OrderDetailSkeleton /></div>
    </div>
  );

  if (error || !order) return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <p className={styles.errorText}>{error || 'Không tìm thấy đơn hàng.'}</p>
          <Link to="/orders" className={styles.backBtn}>← Quay lại danh sách</Link>
        </div>
      </div>
    </div>
  );

  const statusConfig = STATUS_CONFIG[order.status] || { label: order.status, Icon: FiAlertCircle };
  const { Icon: StatusIcon } = statusConfig;
  const isCancellable = order.status === 'pending_payment' || order.status === 'pending_confirm';

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
            <FiArrowLeft size={16} />
            Quay lại
          </button>
          <div className={styles.headerMeta}>
            <div className={styles.orderCodeRow}>
              <span className={styles.codeLabel}>#{order.code}</span>
              <button
                type="button"
                className={styles.copyBtn}
                onClick={() => handleCopy(order.code)}
                aria-label="Copy mã đơn"
              >
                <FiCopy size={13} />
              </button>
            </div>
            <span className={styles.orderDate}>{formatDate(order.createdAt)}</span>
          </div>
          <div className={`${styles.statusBadge} ${styles[`badge_${order.status}`]}`}>
            <StatusIcon size={13} />
            <span>{statusConfig.label}</span>
          </div>
        </div>

        {/* Shop info */}
        {order.shop?.name && (
          <div className={styles.shopRow}>
            <FiShoppingBag size={13} />
            <span>{order.shop.name}</span>
          </div>
        )}

        {/* ── Timeline dọc ── */}
        {order.timeline && order.timeline.length > 0 && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Lịch sử đơn hàng</h2>
            <div className={styles.timeline}>
              {[...order.timeline].reverse().map((event, idx) => {
                const cfg = STATUS_CONFIG[event.status] || { label: event.status, Icon: FiAlertCircle };
                const { Icon: EventIcon } = cfg;
                const isFirst = idx === 0; // latest = first after reverse
                return (
                  <div key={idx} className={`${styles.timelineItem} ${isFirst ? styles.timelineItemActive : ''}`}>
                    <div className={styles.timelineDotWrap}>
                      <div className={`${styles.timelineDot} ${isFirst ? styles.timelineDotActive : ''}`}>
                        <EventIcon size={12} />
                      </div>
                      {idx < order.timeline.length - 1 && <div className={styles.timelineLine} />}
                    </div>
                    <div className={styles.timelineContent}>
                      <p className={styles.timelineStatus}>{cfg.label}</p>
                      <p className={styles.timelineNote}>{event.note}</p>
                      <span className={styles.timelineTime}>{formatDate(event.timestamp)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Danh sách sản phẩm ── */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Sản phẩm đặt mua</h2>
          <div className={styles.items}>
            {order.items.map((item, idx) => (
              <div key={idx} className={styles.item}>
                <img src={item.thumb} alt={item.name} className={styles.itemImage} />
                <div className={styles.itemInfo}>
                  <p className={styles.itemName}>{item.name}</p>
                  <p className={styles.itemMeta}>
                    <span className={styles.itemQty}>x{item.quantity}</span>
                  </p>
                </div>
                <span className={styles.itemPrice}>{formatPrice(item.salePrice)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Địa chỉ giao hàng ── */}
        {order.shippingAddress && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Địa chỉ giao hàng</h2>
            <div className={styles.addressCard}>
              <div className={styles.addressRow}>
                <FiUser size={14} className={styles.addressIcon} />
                <span className={styles.addressName}>{order.shippingAddress.fullName}</span>
              </div>
              <div className={styles.addressRow}>
                <FiPhone size={14} className={styles.addressIcon} />
                <span>{order.shippingAddress.phone}</span>
              </div>
              <div className={styles.addressRow}>
                <FiMapPin size={14} className={styles.addressIcon} />
                <span>{order.shippingAddress.address}</span>
              </div>
            </div>
          </section>
        )}

        {/* ── Tổng tiền + Actions ── */}
        <section className={`${styles.section} ${styles.summarySection}`}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Tổng tiền thanh toán</span>
            <strong className={styles.summaryAmount}>{formatPrice(order.totalAmount)}</strong>
          </div>

          {/* Confirm hủy inline */}
          {cancelState === 'confirming' && (
            <div className={styles.cancelConfirm}>
              <span>Bạn chắc chắn muốn hủy đơn này?</span>
              <div className={styles.cancelConfirmActions}>
                <button type="button" className={styles.cancelNo} onClick={() => setCancelState(false)}>
                  Không
                </button>
                <button type="button" className={styles.cancelYes} onClick={handleCancelConfirm}>
                  Xác nhận hủy
                </button>
              </div>
            </div>
          )}

          <div className={styles.actions}>
            <Link to="/support" className={styles.supportLink}>Yêu cầu hỗ trợ</Link>

            {isCancellable && cancelState !== 'confirming' && (
              <button
                type="button"
                className={styles.cancelBtn}
                disabled={cancelState === 'cancelling'}
                onClick={() => setCancelState('confirming')}
              >
                <FiTrash2 size={14} />
                {cancelState === 'cancelling' ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div className={styles.toast} role="alert">
          <FiCheck size={14} />
          {toast}
        </div>
      )}
    </div>
  );
}

export default OrderDetail;
