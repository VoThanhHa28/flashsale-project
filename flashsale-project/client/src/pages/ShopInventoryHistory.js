import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiRefreshCw,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
  FiTrendingDown,
  FiTrendingUp,
} from 'react-icons/fi';
import * as api from '../services/api';
import { getUserRoleCode } from '../utils/userRole';
import styles from './ShopInventoryHistory.module.css';

const PAGE_SIZE = 20;

const SOURCE_FILTER = [
  { value: '', label: 'Tất cả nguồn' },
  { value: 'redis_claim', label: 'Giữ chỗ (Redis)' },
  { value: 'worker_commit', label: 'Xác nhận đơn' },
  { value: 'rollback', label: 'Hoàn kho' },
];

function formatWhen(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatMoney(v) {
  if (v == null) return '—';
  return new Intl.NumberFormat('vi-VN').format(v) + ' đ';
}

function ShopInventoryHistory() {
  const navigate = useNavigate();
  const user = api.getUser();
  const userRole = getUserRoleCode(user);
  const isAdmin =
    userRole === 'SHOP_ADMIN' ||
    userRole === 'OWNER' ||
    userRole === 'ADMIN';

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [sourceInput, setSourceInput] = useState('');
  const [productIdInput, setProductIdInput] = useState('');
  const [appliedSource, setAppliedSource] = useState('');
  const [appliedProductId, setAppliedProductId] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromMock, setFromMock] = useState(false);
  const [mockErrorHint, setMockErrorHint] = useState('');

  const fetchPage = useCallback(
    async (pageNum) => {
      setLoading(true);
      setError(null);
      const res = await api.getInventoryHistory({
        page: pageNum,
        limit: PAGE_SIZE,
        productId: appliedProductId || undefined,
        source: appliedSource || undefined,
      });
      setLoading(false);
      if (!res.success) {
        setFromMock(false);
        setMockErrorHint('');
        setError(res.message);
        setItems([]);
        return;
      }
      setError(null);
      setFromMock(Boolean(res.fromMock));
      setMockErrorHint(res.mockErrorHint || '');
      setItems(res.items);
      setPagination(res.pagination);
    },
    [appliedProductId, appliedSource],
  );

  useEffect(() => {
    if (!user) navigate('/login?redirect=/shop/inventory-history');
  }, [user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchPage(page);
  }, [isAdmin, page, fetchPage]);

  const onApplyFilters = () => {
    setAppliedSource(sourceInput);
    setAppliedProductId(productIdInput.trim());
    setPage(1);
  };

  const onPageChange = (p) => {
    const max = pagination.totalPages || 1;
    if (p < 1 || p > max) return;
    setPage(p);
  };

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.blocked}>
          <p>Bạn không có quyền xem trang này.</p>
          <Link to="/account">Quay lại tài khoản</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link to="/account" className={styles.backBtn} aria-label="Quay lại">
              <FiArrowLeft size={18} />
            </Link>
            <div>
              <h1 className={styles.title}>Lịch sử nhập / xuất kho</h1>
              <p className={styles.subtitle}>
                Dữ liệu do backend cung cấp (biến động tồn qua Flash Sale / đơn hàng). Bên BE cần triển
                khai endpoint tương ứng.
              </p>
            </div>
          </div>
        </header>

        <p className={styles.apiHint}>
          <strong>API dự kiến:</strong> <code>GET /v1/api/admin/inventory/history</code> — query{' '}
          <code>page</code>, <code>limit</code>, <code>productId?</code>, <code>source?</code>. Response{' '}
          <code>data.items[]</code> + <code>data.pagination</code> (chi tiết trong <code>api.js</code>).
        </p>

        {fromMock && (
          <div className={styles.mockBanner} role="status">
            <strong>Dữ liệu mẫu:</strong> {mockErrorHint ? 'Không gọi được API — đang dùng bản ghi giả để xem layout.' : 'Backend có thể chưa có route — đang dùng bản ghi giả.'} Khi BE khớp
            định dạng, trang sẽ tự hiển thị dữ liệu thật.
            {mockErrorHint ? (
              <div className={styles.mockDetail}>Chi tiết: {mockErrorHint}</div>
            ) : null}
          </div>
        )}

        <div className={styles.toolbar}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Lọc theo nguồn</span>
            <select
              className={styles.filterSelect}
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
            >
              {SOURCE_FILTER.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Mã sản phẩm</span>
            <input
              className={styles.filterInput}
              value={productIdInput}
              onChange={(e) => setProductIdInput(e.target.value)}
              placeholder="ObjectId (để trống = tất cả)"
            />
          </div>
          <button type="button" className={styles.refreshBtn} onClick={onApplyFilters} disabled={loading}>
            <FiRefreshCw size={16} className={loading ? styles.spinning : ''} />
            Áp dụng
          </button>
        </div>

        {error && (
          <div className={styles.errorBox}>
            <FiAlertCircle style={{ verticalAlign: 'middle', marginRight: 6 }} />
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div className={styles.loading}>Đang tải…</div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>
            {fromMock
              ? 'Không có dòng nào khớp bộ lọc trên dữ liệu mẫu — thử bỏ lọc hoặc đổi điều kiện.'
              : 'Chưa có bản ghi từ server.'}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Hướng</th>
                  <th>Nghiệp vụ</th>
                  <th>Sản phẩm</th>
                  <th>SL</th>
                  <th>Đơn giá</th>
                  <th>Tồn sau</th>
                  <th>Đơn / User</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id || `${row.productId}-${row.createdAt}`}>
                    <td className={styles.timeCell}>{formatWhen(row.createdAt)}</td>
                    <td>
                      {row.direction === 'in' ? (
                        <span className={`${styles.badge} ${styles.badgeIn}`}>
                          <FiTrendingUp size={12} style={{ marginRight: 4 }} />
                          Nhập
                        </span>
                      ) : (
                        <span className={`${styles.badge} ${styles.badgeOut}`}>
                          <FiTrendingDown size={12} style={{ marginRight: 4 }} />
                          Xuất
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${styles.badgeSource}`}>
                        {row.sourceLabel || row.source || '—'}
                      </span>
                      {row.kindLabel ? (
                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', marginTop: 4 }}>
                          {row.kindLabel}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.productName || '—'}</div>
                      <div className={styles.mono}>{row.productId}</div>
                    </td>
                    <td className={styles.num}>{row.quantity ?? '—'}</td>
                    <td className={styles.num}>{formatMoney(row.price)}</td>
                    <td className={styles.num}>
                      {row.remainingStockAfter != null ? row.remainingStockAfter : '—'}
                    </td>
                    <td>
                      {row.orderId ? (
                        <div className={styles.mono}>Đơn: {row.orderId}</div>
                      ) : (
                        <span style={{ color: 'var(--color-text-tertiary)', fontSize: 12 }}>—</span>
                      )}
                      {row.userId ? (
                        <div className={styles.mono} style={{ marginTop: 4 }}>
                          User: {row.userId}
                        </div>
                      ) : null}
                      {row.note ? (
                        <div style={{ fontSize: 11, marginTop: 4, color: '#b45309' }}>{row.note}</div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page <= 1 || loading}
              onClick={() => onPageChange(page - 1)}
              aria-label="Trang trước"
            >
              <FiChevronLeft size={20} />
            </button>
            <span className={styles.pageInfo}>
              Trang {page} / {pagination.totalPages} · {pagination.total} bản ghi
            </span>
            <button
              type="button"
              className={styles.pageBtn}
              disabled={page >= pagination.totalPages || loading}
              onClick={() => onPageChange(page + 1)}
              aria-label="Trang sau"
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShopInventoryHistory;
