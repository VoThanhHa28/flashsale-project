import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiClock, FiSearch, FiTruck, FiXCircle } from 'react-icons/fi';
import * as api from '../services/api';
import styles from './ShopOrders.module.css';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'processing', label: 'Đang xử lý' },
  { value: 'shipping', label: 'Đang giao' },
  { value: 'completed', label: 'Hoàn tất' },
  { value: 'cancelled', label: 'Đã hủy' },
  { value: 'refunded', label: 'Hoàn tiền' },
];

function formatDate(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatPrice(value) {
  return new Intl.NumberFormat('vi-VN').format(value || 0) + ' đ';
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Chờ duyệt', icon: <FiClock size={12} />, className: styles.statusPending },
    processing: { label: 'Đang xử lý', icon: <FiCheckCircle size={12} />, className: styles.statusProcessing },
    shipping: { label: 'Đang giao', icon: <FiTruck size={12} />, className: styles.statusShipping },
    completed: { label: 'Hoàn tất', icon: <FiCheckCircle size={12} />, className: styles.statusCompleted },
    cancelled: { label: 'Đã hủy', icon: <FiXCircle size={12} />, className: styles.statusCancelled },
    refunded: { label: 'Hoàn tiền', icon: <FiXCircle size={12} />, className: styles.statusRefunded },
  };
  const cfg = map[status] || map.pending;
  return (
    <span className={`${styles.statusBadge} ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function ShopOrders() {
  const navigate = useNavigate();
  const user = api.getUser();
  const isShopAdmin = user?.usr_role === 'SHOP_ADMIN' || user?.role === 'SHOP_ADMIN';

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterSort, setFilterSort] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const hasFetchedRef = useRef(false);
  const prevPageRef = useRef(currentPage);
  const prevStatusRef = useRef(filterStatus);

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/shop/orders');
      return;
    }

    let cancelled = false;

    const fetchOrders = async (isInitial) => {
      if (isInitial) setLoading(true);
      else setFetching(true);
      setError('');

      try {
        const result = await api.getShopOrders({
          page: currentPage,
          limit: PAGE_SIZE,
          status: filterStatus,
        });
        if (!cancelled) {
          setOrders(result.orders || []);
          setPagination(result.pagination || null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Không thể tải danh sách đơn hàng.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFetching(false);
        }
      }
    };

    const pageChanged = prevPageRef.current !== currentPage;
    const statusChanged = prevStatusRef.current !== filterStatus;
    prevPageRef.current = currentPage;
    prevStatusRef.current = filterStatus;

    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchOrders(true);
    } else if (pageChanged || statusChanged) {
      fetchOrders(false);
    }

    return () => {
      cancelled = true;
    };
  }, [user, navigate, currentPage, filterStatus]);

  const loadOrders = async () => {
    setFetching(true);
    setError('');
    try {
      const result = await api.getShopOrders({
        page: currentPage,
        limit: PAGE_SIZE,
        status: filterStatus,
      });
      setOrders(result.orders || []);
      setPagination(result.pagination || null);
    } catch (err) {
      setError(err.message || 'Không thể tải danh sách đơn hàng.');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleAction = async (orderId, nextStatus) => {
    const result = await api.updateShopOrderStatus(orderId, nextStatus);
    if (!result.success) {
      setToast(result.message || 'Thao tác thất bại');
      return;
    }
    setToast(result.message);
    await loadOrders();
  };

  const handleRefresh = () => {
    loadOrders();
  };

  const totalOrders = pagination?.totalOrders || 0;
  const totalPages = pagination?.totalPages || 1;
  const start = totalOrders === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const end = Math.min(currentPage * PAGE_SIZE, totalOrders);

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.status === 'pending').length;
    const processing = orders.filter((o) => o.status === 'processing').length;
    const shipping = orders.filter((o) => o.status === 'shipping').length;
    return { pending, processing, shipping };
  }, [orders]);

  if (!user) return null;

  if (!isShopAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.blocked}>
            <h1>Không có quyền truy cập</h1>
            <p>Trang này chỉ dành cho tài khoản Shop Admin.</p>
            <Link to="/account" className={styles.backLink}>Về trang tài khoản</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Quản lý đơn hàng</h1>
            <p className={styles.subtitle}>Bảng theo dõi và xử lý đơn cho Shop Owner</p>
          </div>
          <Link to="/account" className={styles.backLink}>Về tài khoản</Link>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}><span className={styles.statLabel}>Chờ duyệt</span><strong>{stats.pending}</strong></div>
          <div className={styles.statCard}><span className={styles.statLabel}>Đang xử lý</span><strong>{stats.processing}</strong></div>
          <div className={styles.statCard}><span className={styles.statLabel}>Đang giao</span><strong>{stats.shipping}</strong></div>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              value={filterSearch}
              placeholder="Tìm theo mã đơn hoặc tên khách..."
              onChange={(e) => {
                setFilterSearch(e.target.value);
              }}
            />
          </div>

          <select
            className={styles.select}
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            className={styles.select}
            value={filterSort}
            onChange={(e) => {
              setFilterSort(e.target.value);
            }}
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="amount_high">Giá trị cao nhất</option>
            <option value="amount_low">Giá trị thấp nhất</option>
          </select>

          <button type="button" className={styles.refreshBtn} onClick={handleRefresh} disabled={fetching}>
            Làm mới
          </button>
        </div>

        {!loading && (
          <p className={styles.summary}>Hiển thị <strong>{start}-{end}</strong> / <strong>{totalOrders}</strong> đơn hàng</p>
        )}

        {loading ? (
          <div className={styles.loading}>Đang tải danh sách đơn hàng...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Sản phẩm</th>
                  <th>Giá trị</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody className={fetching ? styles.bodyFetching : ''}>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className={styles.empty}>Không có đơn hàng phù hợp.</div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td className={styles.code}>{order.code}</td>
                      <td>
                        <div className={styles.customerName}>{order.customerName}</div>
                        <div className={styles.customerPhone}>{order.customerPhone || '--'}</div>
                      </td>
                      <td>{order.itemsCount} sản phẩm</td>
                      <td className={styles.amount}>{formatPrice(order.totalAmount)}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>{formatDate(order.createdAt)}</td>
                      <td>
                        <div className={styles.actions}>
                          {order.canApprove && (
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.approveBtn}`}
                              onClick={() => handleAction(order.id, 'confirmed')}
                            >
                              Duyệt
                            </button>
                          )}
                          {order.canCancel && (
                            <button
                              type="button"
                              className={`${styles.actionBtn} ${styles.cancelBtn}`}
                              onClick={() => handleAction(order.id, 'cancelled')}
                            >
                              Hủy
                            </button>
                          )}
                          {!order.canApprove && !order.canCancel && (
                            <span className={styles.noAction}>Đã xử lý</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              disabled={currentPage === 1 || fetching}
              onClick={() => setCurrentPage((prev) => prev - 1)}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                className={currentPage === page ? styles.pageActive : ''}
                disabled={fetching}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages || fetching}
              onClick={() => setCurrentPage((prev) => prev + 1)}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}

export default ShopOrders;
