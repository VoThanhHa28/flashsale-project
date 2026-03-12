import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import styles from './Report.module.css';

const RANGE_OPTIONS = [
  { value: 7, label: '7 ngày' },
  { value: 14, label: '14 ngày' },
  { value: 30, label: '30 ngày' },
];

function formatPrice(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value || 0) + ' đ';
}

function Report() {
  const navigate = useNavigate();
  const user = api.getUser();
  const userRole = user?.role || user?.usr_role || '';
  // Chủ shop / admin mới xem được trang báo cáo
  const isAdmin =
    userRole === 'SHOP_ADMIN' ||
    userRole === 'OWNER' ||
    userRole === 'ADMIN';

  const [rangeDays, setRangeDays] = useState(7);
  const [data, setData] = useState({ points: [], summary: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login?redirect=/shop/report');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await api.getRevenueReport({ days: rangeDays });
        if (cancelled) return;
        setData(result || { points: [], summary: null });
      } catch (err) {
        if (cancelled) return;
        setError(err.message || 'Không thể tải báo cáo doanh thu.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [rangeDays, isAdmin]);

  const CHART_BAR_MAX_PX = 230;

  const chartInfo = useMemo(() => {
    const points = data.points || [];
    if (!points.length) {
      return { max: 0, annotatedPoints: [] };
    }
    const max = points.reduce((m, p) => (p.totalAmount > m ? p.totalAmount : m), 0);
    const annotatedPoints = points.map((p) => ({
      ...p,
      heightPx: max > 0 && p.totalAmount > 0
        ? Math.max(8, Math.round((p.totalAmount / max) * CHART_BAR_MAX_PX))
        : 0,
    }));
    return { max, annotatedPoints };
  }, [data.points]);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.blocked}>
            <h1>Không có quyền truy cập</h1>
            <p>Trang báo cáo chỉ dành cho tài khoản Shop Admin.</p>
            <Link to="/account" className={styles.backLink}>Về trang tài khoản</Link>
          </div>
        </div>
      </div>
    );
  }

  const summary = data.summary || {
    totalRevenue: 0,
    orderCount: 0,
    avgPerDay: 0,
    maxDay: null,
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Báo cáo doanh thu</h1>
            <p className={styles.subtitle}>
              Tổng quan doanh thu đơn hàng trong {rangeDays} ngày gần nhất (mock data).
            </p>
          </div>
          <Link to="/shop/orders" className={styles.ordersLink}>
            Quản lý đơn hàng
          </Link>
        </header>

        <section className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Tổng doanh thu</span>
            <strong>{formatPrice(summary.totalRevenue)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Số đơn trong kỳ</span>
            <strong>{summary.orderCount}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Doanh thu trung bình / ngày</span>
            <strong>{formatPrice(summary.avgPerDay)}</strong>
          </div>
          <div className={styles.summaryCard}>
            <span className={styles.summaryLabel}>Ngày cao nhất</span>
            <strong>
              {summary.maxDay && summary.maxDay.totalAmount > 0
                ? `${summary.maxDay.label} – ${formatPrice(summary.maxDay.totalAmount)}`
                : '—'}
            </strong>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Biểu đồ doanh thu theo ngày</h2>
              <p className={styles.cardSubtitle}>
                Mỗi cột đại diện cho tổng doanh thu của 1 ngày (bỏ qua đơn đã hủy / hoàn tiền).
              </p>
            </div>
            <div className={styles.rangeSelectWrap}>
              <label htmlFor="range-select" className={styles.rangeLabel}>
                Khoảng thời gian
              </label>
              <select
                id="range-select"
                className={styles.rangeSelect}
                value={rangeDays}
                onChange={(e) => setRangeDays(Number(e.target.value) || 7)}
              >
                {RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          {loading ? (
            <div className={styles.loading}>Đang tải biểu đồ...</div>
          ) : !chartInfo.annotatedPoints.length ? (
            <div className={styles.empty}>
              <p>Chưa có dữ liệu đơn hàng trong khoảng thời gian này.</p>
            </div>
          ) : (
            <div className={styles.chartWrapper}>
              <div className={styles.chartYAxis}>
                <span>{formatPrice(chartInfo.max || 0)}</span>
                <span>0 đ</span>
              </div>
              <div className={styles.chartScroll}>
                <div className={styles.chart}>
                  {chartInfo.annotatedPoints.map((p) => (
                    <div key={p.date} className={styles.bar}>
                      <div
                      className={styles.barInner}
                      style={{ height: `${p.heightPx}px` }}
                        title={`${p.label}: ${formatPrice(p.totalAmount)} (${p.orderCount} đơn)`}
                      />
                      <span className={styles.barLabel}>{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default Report;

