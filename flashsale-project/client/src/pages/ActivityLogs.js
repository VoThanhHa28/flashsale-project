import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiList,
  FiRefreshCw,
  FiAlertCircle,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import * as api from '../services/api';
import { getUserRoleCode } from '../utils/userRole';
import styles from './ActivityLogs.module.css';

const PAGE_SIZE = 20;

const METHOD_OPTIONS = [
  { value: '', label: 'Tất cả phương thức' },
  { value: 'POST', label: 'POST (Tạo)' },
  { value: 'PUT', label: 'PUT (Cập nhật)' },
  { value: 'PATCH', label: 'PATCH (Sửa một phần)' },
  { value: 'DELETE', label: 'DELETE (Xóa)' },
];

const ACTION_LABELS = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
};

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function badgeClassForAction(action) {
  if (action === 'create') return styles.badgeCreate;
  if (action === 'delete') return styles.badgeDelete;
  return styles.badgeUpdate;
}

function statusClass(code) {
  if (code >= 200 && code < 300) return styles.statusOk;
  if (code >= 400 && code < 500) return styles.statusWarn;
  if (code >= 500) return styles.statusErr;
  return styles.statusWarn;
}

function bodySnippet(body) {
  if (body == null) return '—';
  try {
    const s = typeof body === 'string' ? body : JSON.stringify(body);
    return s.length > 80 ? `${s.slice(0, 80)}…` : s;
  } catch {
    return '—';
  }
}

function ActivityLogs() {
  const navigate = useNavigate();
  const user = api.getUser();
  const userRole = getUserRoleCode(user);
  const isShopAdmin =
    userRole === 'SHOP_ADMIN' ||
    userRole === 'OWNER' ||
    userRole === 'ADMIN';

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [methodFilter, setMethodFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) navigate('/login?redirect=/shop/logs');
  }, [user, navigate]);

  const load = useCallback(
    async (page = 1, { silent } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError('');
      const res = await api.getActivityLogs({
        page,
        limit: PAGE_SIZE,
        method: methodFilter || undefined,
      });
      if (res.success) {
        setLogs(res.logs);
        setPagination(res.pagination);
      } else {
        setError(res.message || 'Không thể tải nhật ký');
        setLogs([]);
      }
      setLoading(false);
      setRefreshing(false);
    },
    [methodFilter],
  );

  useEffect(() => {
    if (!user || !isShopAdmin) return;
    load(1);
  }, [user, isShopAdmin, load]);

  const totalPages = pagination.totalPages || 1;
  const currentPage = pagination.page || 1;

  const handlePageChange = (next) => {
    if (next < 1 || next > totalPages) return;
    load(next);
  };

  if (!user) return null;

  if (!isShopAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.blocked}>
            <h1>Không có quyền truy cập</h1>
            <p>Trang nhật ký chỉ dành cho quản trị cửa hàng.</p>
            <Link to="/account" className={styles.backLink}>
              Về trang tài khoản
            </Link>
          </div>
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
              <h1 className={styles.title}>Nhật ký hoạt động</h1>
              <p className={styles.subtitle}>
                Ai thao tác gì, trên API nào và thời điểm (POST / PUT / PATCH / DELETE)
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.backBtn}
            onClick={() => load(currentPage, { silent: true })}
            disabled={refreshing}
            title="Làm mới"
            aria-label="Làm mới"
          >
            <FiRefreshCw size={18} className={refreshing ? styles.spinning : ''} />
          </button>
        </header>

        <div className={styles.toolbar}>
          <span className={styles.filterLabel}>Lọc theo:</span>
          <select
            className={styles.filterSelect}
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            aria-label="Lọc theo phương thức HTTP"
          >
            {METHOD_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className={styles.errorBox} role="alert">
            <FiAlertCircle style={{ verticalAlign: 'middle', marginRight: 8 }} />
            {error}
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>Đang tải nhật ký…</div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>
            <FiList size={40} />
            <p>Chưa có bản ghi nào hoặc không khớp bộ lọc.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Hành động</th>
                    <th>Đường dẫn</th>
                    <th>HTTP</th>
                    <th>Body (rút gọn)</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((row) => (
                    <tr key={row._id}>
                      <td className={styles.timeCell}>{formatWhen(row.createdAt)}</td>
                      <td className={styles.userCell}>
                        {row.userEmail ? (
                          <>
                            <span className={styles.userEmail}>{row.userEmail}</span>
                            {row.userId && (
                              <span className={styles.userId}>ID: {row.userId}</span>
                            )}
                          </>
                        ) : row.userId ? (
                          <span className={styles.userEmail}>User: {row.userId}</span>
                        ) : (
                          <span className={styles.guestLabel}>Chưa đăng nhập / không xác định</span>
                        )}
                      </td>
                      <td className={styles.actionCell}>
                        <div className={styles.badges}>
                          <span
                            className={`${styles.badge} ${badgeClassForAction(row.action)}`}
                          >
                            {ACTION_LABELS[row.action] || row.action}
                          </span>
                          <span className={`${styles.badge} ${styles.badgeMethod}`}>
                            {row.method}
                          </span>
                        </div>
                      </td>
                      <td className={styles.pathCell}>{row.path}</td>
                      <td>
                        <span className={statusClass(row.statusCode)}>{row.statusCode}</span>
                      </td>
                      <td>
                        <span className={styles.bodyPreview} title={bodySnippet(row.body)}>
                          {bodySnippet(row.body)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                aria-label="Trang trước"
              >
                <FiChevronLeft size={20} />
              </button>
              <span className={styles.pageInfo}>
                Trang {currentPage} / {totalPages} · {pagination.total} bản ghi
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                aria-label="Trang sau"
              >
                <FiChevronRight size={20} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ActivityLogs;
