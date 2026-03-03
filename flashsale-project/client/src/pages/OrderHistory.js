import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import OrderCard from '../components/orders/OrderCard';
import FilterBar from '../components/orders/FilterBar';
import OrderSkeleton from '../components/orders/OrderSkeleton';
import Toast from '../components/orders/Toast';
import ConnectionStatus from '../components/ConnectionStatus';
import styles from './OrderHistory.module.css';

const PAGE_SIZE = 6;

/**
 * OrderHistory Page
 * Trang lịch sử đơn hàng.
 *
 * Luồng dữ liệu:
 *   - Mỗi khi `filters` hoặc `currentPage` thay đổi → gọi api.getMyOrders(params)
 *   - api.getMyOrders() nhận toàn bộ params (filter, sort, page, limit)
 *     → mock: tự filter/sort/slice; real API: gửi query string lên BE
 *   - Dùng `pagination` trả về từ API để render nút phân trang và summary count
 *   - Không còn client-side filter/sort/slice trong component này
 */
function OrderHistory() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null); // { page, limit, totalOrders, totalPages }
  const [loading, setLoading] = useState(true);       // initial load
  const [fetching, setFetching] = useState(false);    // filter/page change reload
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    sort: 'newest',
  });
  const [currentPage, setCurrentPage] = useState(1);

  const user = api.getUser();

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/orders');
    }
  }, [user, navigate]);

  /**
   * Gọi API mỗi khi filters hoặc currentPage thay đổi.
   * Dùng cleanup flag `cancelled` để tránh set state sau khi component unmount.
   */
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const run = async () => {
      // Lần đầu load: hiển thị full skeleton; filter/page change: fetching overlay nhẹ
      if (orders.length === 0) {
        setLoading(true);
      } else {
        setFetching(true);
      }
      setError(null);

      try {
        const result = await api.getMyOrders({
          page: currentPage,
          limit: PAGE_SIZE,
          ...filters,
        });

        if (!cancelled) {
          setOrders(result.orders ?? []);
          setPagination(result.pagination ?? null);
        }
      } catch (err) {
        console.error('Lỗi load đơn hàng:', err);
        if (!cancelled) {
          setError(err.message || 'Không tải được danh sách đơn hàng.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFetching(false);
        }
      }
    };

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // reset về trang 1 khi đổi filter
  }, []);

  const handleReset = useCallback(() => {
    setFilters({ search: '', status: 'all', dateFrom: '', dateTo: '', sort: 'newest' });
    setCurrentPage(1);
  }, []);

  const handleCopyCode = useCallback(async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setToast({ message: `Đã copy mã đơn: ${code}` });
    } catch {
      setToast({ message: 'Không thể copy mã đơn' });
    }
  }, []);

  /**
   * Hủy đơn hàng: gọi API, hiển thị toast, refresh danh sách trang hiện tại.
   * Được truyền xuống OrderCard qua prop onCancelOrder.
   */
  const handleCancelOrder = useCallback(async (orderId, orderCode) => {
    const result = await api.cancelOrder(orderId);
    if (result.success) {
      setToast({ message: `Đã hủy đơn #${orderCode} thành công` });
      // Refresh lại trang hiện tại để phản ánh trạng thái mới
      setFilters((prev) => ({ ...prev }));
    } else {
      setToast({ message: result.message || 'Không thể hủy đơn hàng. Vui lòng thử lại.' });
    }
  }, []);

  if (!user) return null;

  const totalPages = pagination?.totalPages ?? 1;
  const totalOrders = pagination?.totalOrders ?? 0;
  // Vị trí đơn đầu / cuối trên trang hiện tại
  const rangeStart = totalOrders === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalOrders);

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Lịch sử đơn hàng</h1>
            <p className={styles.subtitle}>Theo dõi tất cả đơn hàng Flash Sale của bạn</p>
          </div>
          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.helpBtn}
              onClick={() => navigate('/support')}
              aria-label="Trợ giúp"
            >
              Trợ giúp
            </button>
            <ConnectionStatus />
          </div>
        </div>

        {/* ── Filter bar ── */}
        <FilterBar filters={filters} onFilterChange={handleFilterChange} onReset={handleReset} />

        {/* ── Summary count (dùng pagination từ API) ── */}
        {!loading && totalOrders > 0 && (
          <p className={styles.summary}>
            Hiển thị <strong>{rangeStart}–{rangeEnd}</strong> / <strong>{totalOrders}</strong> đơn hàng
          </p>
        )}

        {/* ── Nội dung chính ── */}
        {loading ? (
          /* Skeleton cho lần load đầu */
          <div className={styles.list}>
            {Array.from({ length: PAGE_SIZE }).map((_, idx) => (
              <OrderSkeleton key={idx} />
            ))}
          </div>
        ) : error && orders.length === 0 ? (
          /* Lỗi không load được gì */
          <div className={styles.error}>
            <p className={styles.errorText}>{error}</p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => { setError(null); setCurrentPage(1); }}
            >
              Thử lại
            </button>
          </div>
        ) : orders.length === 0 ? (
          /* Không có kết quả */
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📦</div>
            <p className={styles.emptyText}>
              {filters.search || filters.status !== 'all' || filters.dateFrom || filters.dateTo
                ? 'Không tìm thấy đơn hàng phù hợp'
                : 'Bạn chưa có đơn hàng nào'}
            </p>
            <Link to="/" className={styles.emptyLink}>Về trang chủ</Link>
          </div>
        ) : (
          <>
            {/* Danh sách đơn – mờ nhẹ khi đang fetching trang mới / filter mới */}
            <div className={`${styles.list} ${fetching ? styles.listFetching : ''}`}>
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onCopyCode={handleCopyCode}
                  onCancelOrder={handleCancelOrder}
                />
              ))}
            </div>

            {/* ── Phân trang (dùng totalPages từ API) ── */}
            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.paginationBtn}
                  disabled={currentPage === 1 || fetching}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  aria-label="Trang trước"
                >
                  ‹
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    className={`${styles.paginationBtn} ${
                      currentPage === page ? styles.paginationBtnActive : ''
                    }`}
                    disabled={fetching}
                    onClick={() => setCurrentPage(page)}
                    aria-label={`Trang ${page}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  className={styles.paginationBtn}
                  disabled={currentPage === totalPages || fetching}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  aria-label="Trang sau"
                >
                  ›
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {toast && <Toast message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

export default OrderHistory;
