import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiCalendar,
  FiPackage,
  FiSearch,
  FiZap,
  FiCheck,
  FiAlertCircle,
} from 'react-icons/fi';
import * as api from '../services/api';
import { getUserRoleCode } from '../utils/userRole';
import { localDatetimeToISO } from '../utils/datetimeLocal';
import styles from './ShopFlashSaleCampaign.module.css';

function formatPrice(v) {
  return new Intl.NumberFormat('vi-VN').format(v || 0) + ' đ';
}

function validateCampaign(startTime, endTime, selectedCount) {
  const err = {};
  if (!startTime) err.startTime = 'Chọn thời gian bắt đầu';
  if (!endTime) err.endTime = 'Chọn thời gian kết thúc';
  if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
    err.endTime = 'Kết thúc phải sau thời điểm bắt đầu';
  }
  if (!selectedCount) err.products = 'Chọn ít nhất một sản phẩm';
  return err;
}

function ShopFlashSaleCampaign() {
  const navigate = useNavigate();
  const user = api.getUser();
  const userRole = getUserRoleCode(user);
  const isAdmin =
    userRole === 'SHOP_ADMIN' || userRole === 'OWNER' || userRole === 'ADMIN';

  const [campaignName, setCampaignName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [errors, setErrors] = useState({});
  const [failures, setFailures] = useState([]);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login?redirect=/shop/flash-sale/campaign');
  }, [user, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const list = await api.getShopProducts();
      if (!cancelled) {
        setProducts(Array.isArray(list) ? list : []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  const eligible = useMemo(
    () => products.filter((p) => p.isPublished !== false),
    [products],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter((p) => {
      const name = (p.product_name || '').toLowerCase();
      const id = String(p.product_id || '');
      return name.includes(q) || id.includes(q);
    });
  }, [eligible, search]);

  const toggleId = useCallback((id) => {
    const s = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((p) => next.add(String(p.product_id)));
      return next;
    });
  }, [filtered]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFailures([]);
    const errs = validateCampaign(startTime, endTime, selected.size);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});

    const startISO = localDatetimeToISO(startTime);
    const endISO = localDatetimeToISO(endTime);
    if (!startISO || !endISO) {
      setErrors({ startTime: 'Thời gian không hợp lệ' });
      return;
    }

    setSaving(true);
    const result = await api.scheduleFlashSaleBatch([...selected], startISO, endISO);
    setSaving(false);

    if (result.failures?.length) setFailures(result.failures);

    if (result.allSuccess) {
      showToast(
        campaignName.trim()
          ? `Đã tạo chiến dịch "${campaignName.trim()}" — ${result.message}`
          : result.message,
      );
      setTimeout(() => navigate('/shop/products'), 1400);
    } else if (result.ok > 0) {
      showToast(result.message, 'error');
    } else {
      showToast(result.message, 'error');
    }
  };

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.blocked}>
            <p>Bạn không có quyền truy cập trang này.</p>
            <Link to="/account">Quay lại tài khoản</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Đang tải sản phẩm…</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link to="/shop/products" className={styles.backBtn} aria-label="Quay lại">
              <FiArrowLeft size={18} />
            </Link>
            <div>
              <h1 className={styles.title}>Tạo chiến dịch Flash Sale</h1>
              <p className={styles.subtitle}>
                Chọn khung giờ và các sản phẩm — cùng một lịch áp dụng cho tất cả mục đã chọn.
              </p>
            </div>
          </div>
        </header>

        <form onSubmit={handleSubmit}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FiCalendar size={18} /> Thông tin chiến dịch
            </h2>
            <div className={styles.field}>
              <label className={styles.label}>Tên chiến dịch (ghi chú, không gửi server)</label>
              <input
                className={styles.input}
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="VD: Flash Sale cuối tuần"
              />
            </div>
            <div className={styles.row2}>
              <div className={`${styles.field} ${errors.startTime ? styles.fieldError : ''}`}>
                <label className={styles.label}>Bắt đầu</label>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={startTime}
                  onChange={(e) => {
                    setStartTime(e.target.value);
                    setErrors((x) => {
                      const n = { ...x };
                      delete n.startTime;
                      return n;
                    });
                  }}
                />
                {errors.startTime && <div className={styles.error}>{errors.startTime}</div>}
              </div>
              <div className={`${styles.field} ${errors.endTime ? styles.fieldError : ''}`}>
                <label className={styles.label}>Kết thúc</label>
                <input
                  type="datetime-local"
                  className={styles.input}
                  value={endTime}
                  onChange={(e) => {
                    setEndTime(e.target.value);
                    setErrors((x) => {
                      const n = { ...x };
                      delete n.endTime;
                      return n;
                    });
                  }}
                />
                {errors.endTime && <div className={styles.error}>{errors.endTime}</div>}
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>
              <FiPackage size={18} /> Chọn sản phẩm ({selected.size} đã chọn)
            </h2>
            {errors.products && <div className={styles.error}>{errors.products}</div>}
            <div className={styles.toolbar}>
              <div className={`${styles.field} ${styles.search}`} style={{ marginBottom: 0 }}>
                <label className={styles.label} htmlFor="camp-search">
                  <FiSearch size={14} /> Tìm kiếm
                </label>
                <input
                  id="camp-search"
                  className={styles.input}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tên hoặc ID…"
                />
              </div>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={selectAllFiltered}
                disabled={!filtered.length}
              >
                Chọn tất cả (danh sách hiện tại)
              </button>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={clearSelection}
                disabled={!selected.size}
              >
                Bỏ chọn
              </button>
            </div>
            <p className={styles.hint}>
              Chỉ sản phẩm đang hiển thị (đã publish). Sản phẩm ẩn không nằm trong danh sách shop.
            </p>
            <div className={styles.productList}>
              {filtered.length === 0 ? (
                <div className={styles.loading}>Không có sản phẩm phù hợp.</div>
              ) : (
                filtered.map((p) => {
                  const id = String(p.product_id);
                  const on = selected.has(id);
                  let saleCls = styles.badgeNone;
                  let saleLabel = 'Chưa lịch';
                  if (p.saleStatus === 'scheduled') {
                    saleCls = styles.badgeScheduled;
                    saleLabel = 'Đã lịch';
                  } else if (p.saleStatus === 'active') {
                    saleCls = styles.badgeActive;
                    saleLabel = 'Đang sale';
                  }
                  return (
                    <label
                      key={id}
                      className={`${styles.productRow} ${on ? styles.productRowSelected : ''}`}
                    >
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={on}
                        onChange={() => toggleId(id)}
                      />
                      <img
                        className={styles.thumb}
                        src={p.product_thumb || '/placeholder.png'}
                        alt=""
                        onError={(e) => {
                          e.target.style.visibility = 'hidden';
                        }}
                      />
                      <div className={styles.meta}>
                        <p className={styles.name}>{p.product_name || '—'}</p>
                        <p className={styles.price}>
                          {formatPrice(p.product_price)} · Tồn {p.product_quantity ?? '—'}
                        </p>
                      </div>
                      <span className={`${styles.badge} ${saleCls}`}>{saleLabel}</span>
                    </label>
                  );
                })
              )}
            </div>
            {failures.length > 0 && (
              <div className={styles.failures}>
                <strong>Không lên lịch được:</strong>
                <ul>
                  {failures.map((f) => (
                    <li key={f.productId}>
                      ID {f.productId}: {f.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <div className={styles.submitBar}>
            <Link to="/shop/products" className={styles.cancelBtn}>
              Hủy
            </Link>
            <button type="submit" className={styles.submitBtn} disabled={saving}>
              <FiZap size={16} />
              {saving ? 'Đang áp dụng…' : 'Áp dụng lịch Flash Sale'}
            </button>
          </div>
        </form>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
          {toast.type === 'error' ? <FiAlertCircle size={16} /> : <FiCheck size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default ShopFlashSaleCampaign;
