import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiPackage,
  FiTruck,
  FiXCircle,
} from 'react-icons/fi';
import * as api from '../services/api';
import { getUserRoleCode } from '../utils/userRole';
import styles from './ShopOrderDetail.module.css';

function formatPrice(value) {
  return new Intl.NumberFormat('vi-VN').format(value || 0) + ' đ';
}

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/** Dựng view từ một dòng bảng /shop/orders (BE chưa có GET chi tiết). */
function detailFromShopListRow(row) {
  const qty = Math.max(1, Number(row.itemsCount) || 1);
  const total = Number(row.totalAmount) || 0;
  const unit = qty ? Math.round(total / qty) : 0;
  const items = [];
  if (row.productName) {
    items.push({
      name: row.productName,
      quantity: qty,
      salePrice: unit,
      thumb: '',
      productId: String(row.id || ''),
    });
  }
  return {
    id: row.id,
    code: row.code,
    status: row.status,
    createdAt: row.createdAt,
    totalAmount: total,
    customerName: row.customerName,
    customerPhone: row.customerPhone || '',
    customerEmail: '',
    items,
    fromListOnly: true,
  };
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Chờ duyệt', icon: <FiClock size={12} />, className: styles.stPending },
    pending_confirm: { label: 'Chờ duyệt', icon: <FiClock size={12} />, className: styles.stPending },
    confirmed: { label: 'Đã xác nhận', icon: <FiCheckCircle size={12} />, className: styles.stProcessing },
    processing: { label: 'Đang xử lý', icon: <FiPackage size={12} />, className: styles.stProcessing },
    shipping: { label: 'Đang giao', icon: <FiTruck size={12} />, className: styles.stShipping },
    completed: { label: 'Hoàn tất', icon: <FiCheckCircle size={12} />, className: styles.stCompleted },
    success: { label: 'Hoàn tất', icon: <FiCheckCircle size={12} />, className: styles.stCompleted },
    failed: { label: 'Thất bại', icon: <FiXCircle size={12} />, className: styles.stCancelled },
    cancelled: { label: 'Đã hủy', icon: <FiXCircle size={12} />, className: styles.stCancelled },
    refunded: { label: 'Hoàn tiền', icon: <FiXCircle size={12} />, className: styles.stRefunded },
  };
  const cfg = map[status] || map.pending;
  return (
    <span className={`${styles.statusBadge} ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function ShopOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = api.getUser();
  const isShopAdmin = getUserRoleCode(user) === 'SHOP_ADMIN';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/shop/orders/${id}`)}`);
    }
  }, [user, navigate, id]);

  useEffect(() => {
    if (!user || !isShopAdmin || !id) return;
    const row = location.state?.shopOrder;
    if (!row || String(row.id) !== String(id)) {
      setError(
        'Chưa có dữ liệu cho đơn này. Hãy vào từ danh sách đơn hàng. (Tải lại trang / liệt kê đầy đủ từng món cần API backend — xem gợi ý trong api.js.)',
      );
      setOrder(null);
    } else {
      setError('');
      setOrder(detailFromShopListRow(row));
    }
    setLoading(false);
  }, [user, isShopAdmin, id, location.state]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAction = async (nextStatus) => {
    if (!order) return;
    setActionBusy(true);
    const result = await api.updateShopOrderStatus(order.id, nextStatus);
    setActionBusy(false);
    setToast(result.message || (result.success ? 'Thành công' : 'Thất bại'));
    if (result.success) {
      const next = ['cancelled', 'confirmed', 'shipping', 'completed'].includes(nextStatus)
        ? nextStatus
        : order.status;
      setOrder((o) => (o ? { ...o, status: next } : null));
    }
  };

  if (!user) return null;

  if (!isShopAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.errorText}>Trang này chỉ dành cho Shop Admin.</p>
          <Link to="/account" className={styles.back}>Về tài khoản</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.muted}>Đang mở…</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <p className={styles.errorText}>{error || 'Không có dữ liệu.'}</p>
          <Link to="/shop/orders" className={styles.back}>
            ← Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const canApprove = order.status === 'pending' || order.status === 'pending_confirm';
  const canMarkShipping = order.status === 'confirmed';
  const canComplete = order.status === 'shipping';
  const canCancel = ['pending', 'pending_confirm', 'confirmed', 'shipping'].includes(order.status);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
          <FiArrowLeft size={16} />
          Quay lại
        </button>

        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Đơn #{order.code}</h1>
            <p className={styles.sub}>Đặt lúc {formatDate(order.createdAt)}</p>
          </div>
          <StatusBadge status={order.status} />
        </header>

        {order.fromListOnly ? (
          <p className={styles.disclaimer}>
            Dòng sản phẩm hiển thị theo thông tin danh sách đơn (một dòng gộp khi chỉ có tên SP chung).
            Danh sách đầy đủ từng món / F5 trang cần team backend bổ sung API chi tiết đơn.
          </p>
        ) : null}

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Khách hàng</h2>
          <p className={styles.row}><strong>Tên:</strong> {order.customerName}</p>
          {order.customerPhone ? (
            <p className={styles.row}><strong>Điện thoại:</strong> {order.customerPhone}</p>
          ) : null}
          {order.customerEmail ? (
            <p className={styles.row}><strong>Email:</strong> {order.customerEmail}</p>
          ) : null}
        </section>

        <section className={styles.card}>
          <h2 className={styles.sectionTitle}>Sản phẩm trong đơn</h2>
          {order.items.length === 0 ? (
            <p className={styles.muted}>Danh sách không có tên sản phẩm — mở lại từ bảng đơn sau khi backend trả đủ trường.</p>
          ) : (
            <ul className={styles.itemList}>
              {order.items.map((item, idx) => (
                <li key={`${item.productId}-${idx}`} className={styles.itemRow}>
                  {item.thumb ? (
                    <img src={item.thumb} alt="" className={styles.thumb} />
                  ) : (
                    <div className={styles.thumbPh} aria-hidden />
                  )}
                  <div className={styles.itemMain}>
                    <span className={styles.itemName}>{item.name || 'Sản phẩm'}</span>
                    <span className={styles.itemMeta}>
                      Đơn giá {formatPrice(item.salePrice)} × {item.quantity}
                    </span>
                  </div>
                  <span className={styles.lineTotal}>{formatPrice(item.salePrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className={styles.totalRow}>
            <span>Tổng cộng</span>
            <strong>{formatPrice(order.totalAmount)}</strong>
          </div>
        </section>

        {(canApprove || canMarkShipping || canComplete || canCancel) && (
          <div className={styles.actions}>
            {canApprove && (
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={actionBusy}
                onClick={() => handleAction('confirmed')}
              >
                Duyệt đơn
              </button>
            )}
            {canMarkShipping && (
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={actionBusy}
                onClick={() => handleAction('shipping')}
              >
                Xác nhận đang giao
              </button>
            )}
            {canComplete && (
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={actionBusy}
                onClick={() => handleAction('completed')}
              >
                Xác nhận hoàn tất
              </button>
            )}
            {canCancel && (
              <button
                type="button"
                className={styles.btnDanger}
                disabled={actionBusy}
                onClick={() => handleAction('cancelled')}
              >
                Hủy đơn
              </button>
            )}
          </div>
        )}

        <Link to="/shop/orders" className={styles.back}>
          ← Danh sách đơn hàng
        </Link>
      </div>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
