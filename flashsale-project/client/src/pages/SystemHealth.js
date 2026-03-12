import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiDatabase, FiServer, FiRefreshCw,
  FiCheckCircle, FiXCircle, FiAlertCircle, FiClock,
  FiZap, FiGlobe, FiCpu,
} from 'react-icons/fi';
import * as api from '../services/api';
import styles from './SystemHealth.module.css';

const AUTO_REFRESH_MS = 30_000;
const MAX_HISTORY = 10;

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('vi-VN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatFullTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function responseTimeColor(ms) {
  if (ms <= 100) return 'fast';
  if (ms <= 500) return 'normal';
  return 'slow';
}

function SystemHealth() {
  const navigate = useNavigate();
  const user = api.getUser();
  const isSuperAdmin = !!user?.is_super_admin;

  const [health, setHealth] = useState({ mongo: 'unknown', redis: 'unknown', checkedAt: null, responseTime: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [upStreak, setUpStreak] = useState(0);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (!user) navigate('/login?redirect=/shop/health');
  }, [user, navigate]);

  const check = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setError('');

    const res = await api.getSystemHealth();
    const entry = {
      mongo: res.mongo,
      redis: res.redis,
      responseTime: res.responseTime || 0,
      checkedAt: res.checkedAt,
      success: res.success,
    };

    setHealth(entry);
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));

    if (res.mongo === 'ok' && res.redis === 'ok') {
      setUpStreak((prev) => prev + 1);
    } else {
      setUpStreak(0);
    }

    if (!res.success) {
      setError(res.message || 'Không thể kiểm tra trạng thái hệ thống');
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    check();
    timerRef.current = setInterval(() => check(), AUTO_REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [check]);

  if (!user) return null;
  if (!isSuperAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.blocked}>
            <h1>Không có quyền truy cập</h1>
            <p>Trang này chỉ dành cho Admin.</p>
            <Link to="/account" className={styles.backLink}>Về trang tài khoản</Link>
          </div>
        </div>
      </div>
    );
  }

  const services = [
    {
      key: 'mongo',
      name: 'MongoDB',
      desc: 'Cơ sở dữ liệu chính',
      detail: 'Lưu trữ users, products, orders, transactions',
      icon: <FiDatabase size={28} />,
      status: health.mongo,
      port: '27017',
    },
    {
      key: 'redis',
      name: 'Redis',
      desc: 'In-memory cache',
      detail: 'Stock real-time, flash sale timer, session cache',
      icon: <FiServer size={28} />,
      status: health.redis,
      port: '6379',
    },
  ];

  const allOk = health.mongo === 'ok' && health.redis === 'ok';
  const anyFail = health.mongo === 'fail' || health.redis === 'fail';
  const uptimeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
  const uptimeMin = Math.floor(uptimeSeconds / 60);
  const uptimeSec = uptimeSeconds % 60;

  const avgResponseTime = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + (h.responseTime || 0), 0) / history.length)
    : 0;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link to="/account" className={styles.backBtn}><FiArrowLeft size={18} /></Link>
            <div>
              <h1 className={styles.title}>Trạng thái hệ thống</h1>
              <p className={styles.subtitle}>Giám sát dịch vụ backend real-time</p>
            </div>
          </div>
          <button
            className={styles.refreshBtn}
            onClick={() => check(true)}
            disabled={refreshing || loading}
          >
            <FiRefreshCw size={16} className={refreshing ? styles.spinning : ''} />
            {refreshing ? 'Đang kiểm tra...' : 'Kiểm tra lại'}
          </button>
        </header>

        {/* Overall status banner */}
        <div className={`${styles.banner} ${allOk ? styles.bannerOk : anyFail ? styles.bannerFail : styles.bannerWarn}`}>
          <div className={styles.bannerLeft}>
            {loading ? (
              <span className={styles.bannerText}>Đang kiểm tra trạng thái hệ thống...</span>
            ) : allOk ? (
              <>
                <span className={`${styles.pulseDot} ${styles.pulseOk}`} />
                <span className={styles.bannerText}>Tất cả dịch vụ hoạt động bình thường</span>
              </>
            ) : anyFail ? (
              <>
                <span className={`${styles.pulseDot} ${styles.pulseFail}`} />
                <span className={styles.bannerText}>Có dịch vụ đang gặp sự cố</span>
              </>
            ) : (
              <>
                <FiAlertCircle size={18} />
                <span className={styles.bannerText}>Đang xác định trạng thái...</span>
              </>
            )}
          </div>
          {!loading && health.responseTime > 0 && (
            <span className={styles.bannerPing}>
              <FiZap size={14} />
              {health.responseTime}ms
            </span>
          )}
        </div>

        {error && (
          <div className={styles.errorBar}>
            <FiAlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <FiZap size={18} className={styles.statIcon} />
            <div>
              <span className={styles.statValue}>{health.responseTime || '—'}<small>ms</small></span>
              <span className={styles.statLabel}>Phản hồi</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <FiCpu size={18} className={styles.statIcon} />
            <div>
              <span className={styles.statValue}>{avgResponseTime || '—'}<small>ms</small></span>
              <span className={styles.statLabel}>TB phản hồi</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <FiCheckCircle size={18} className={styles.statIcon} />
            <div>
              <span className={styles.statValue}>{upStreak}</span>
              <span className={styles.statLabel}>Checks OK liên tiếp</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <FiClock size={18} className={styles.statIcon} />
            <div>
              <span className={styles.statValue}>{uptimeMin > 0 ? `${uptimeMin}p ${uptimeSec}s` : `${uptimeSec}s`}</span>
              <span className={styles.statLabel}>Thời gian giám sát</span>
            </div>
          </div>
        </div>

        {/* Service cards */}
        <div className={styles.grid}>
          {services.map((svc) => {
            const isOk = svc.status === 'ok';
            const isFail = svc.status === 'fail';
            return (
              <div key={svc.key} className={`${styles.card} ${isOk ? styles.cardOk : isFail ? styles.cardFail : ''}`}>
                <div className={styles.cardHeader}>
                  <div className={`${styles.cardIcon} ${isOk ? styles.cardIconOk : isFail ? styles.cardIconFail : ''}`}>
                    {svc.icon}
                  </div>
                  <span className={`${styles.pulseDot} ${styles.pulseSm} ${isOk ? styles.pulseOk : isFail ? styles.pulseFail : styles.pulseWarn}`} />
                </div>
                <h2 className={styles.cardName}>{svc.name}</h2>
                <p className={styles.cardDesc}>{svc.desc}</p>
                <div className={styles.cardMeta}>
                  <div className={styles.metaRow}>
                    <FiGlobe size={12} />
                    <span>localhost:{svc.port}</span>
                  </div>
                  <div className={styles.metaRow}>
                    <FiCpu size={12} />
                    <span>{svc.detail}</span>
                  </div>
                </div>
                <div className={styles.cardFooter}>
                  <div className={`${styles.statusChip} ${isOk ? styles.chipOk : isFail ? styles.chipFail : styles.chipWarn}`}>
                    {isOk ? <FiCheckCircle size={14} /> : isFail ? <FiXCircle size={14} /> : <FiAlertCircle size={14} />}
                    {isOk ? 'Hoạt động' : isFail ? 'Lỗi kết nối' : 'Không xác định'}
                  </div>
                  {health.responseTime > 0 && (
                    <span className={`${styles.pingBadge} ${styles['ping_' + responseTimeColor(health.responseTime)]}`}>
                      {health.responseTime}ms
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Server info */}
        <div className={styles.infoCard}>
          <h3 className={styles.infoTitle}>Thông tin server</h3>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>API Endpoint</span>
              <span className={styles.infoValue}>{api.getApiUrl() || 'localhost'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Tần suất kiểm tra</span>
              <span className={styles.infoValue}>Mỗi 30 giây</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Số lần đã kiểm tra</span>
              <span className={styles.infoValue}>{history.length}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Kiểm tra lần cuối</span>
              <span className={styles.infoValue}>{formatTime(health.checkedAt)}</span>
            </div>
          </div>
        </div>

        {/* History log */}
        {history.length > 1 && (
          <div className={styles.historyCard}>
            <h3 className={styles.historyTitle}>
              <FiClock size={16} />
              Lịch sử kiểm tra
            </h3>
            <div className={styles.historyList}>
              {history.map((h, i) => {
                const ok = h.mongo === 'ok' && h.redis === 'ok';
                return (
                  <div key={i} className={styles.historyRow}>
                    <span className={`${styles.historyDot} ${ok ? styles.historyDotOk : styles.historyDotFail}`} />
                    <span className={styles.historyTime}>{formatFullTime(h.checkedAt)}</span>
                    <span className={styles.historyServices}>
                      <span className={h.mongo === 'ok' ? styles.historyOk : styles.historyFail}>Mongo</span>
                      <span className={h.redis === 'ok' ? styles.historyOk : styles.historyFail}>Redis</span>
                    </span>
                    <span className={`${styles.historyPing} ${styles['ping_' + responseTimeColor(h.responseTime)]}`}>
                      {h.responseTime}ms
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={styles.footer}>
          <FiClock size={14} />
          <span>Tự động cập nhật mỗi 30 giây</span>
        </div>
      </div>
    </div>
  );
}

export default SystemHealth;
