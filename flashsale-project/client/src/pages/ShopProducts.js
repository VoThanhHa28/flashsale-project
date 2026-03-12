import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiPlus, FiEdit2, FiTrash2, FiZap, FiSearch,
  FiPackage, FiArrowLeft, FiClock, FiCheck, FiAlertCircle,
} from 'react-icons/fi';
import * as api from '../services/api';
import styles from './ShopProducts.module.css';

function formatPrice(v) {
  return new Intl.NumberFormat('vi-VN').format(v || 0) + ' đ';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_MAP = {
  active: { label: 'Đang diễn ra', color: 'green', icon: <FiZap size={12} /> },
  scheduled: { label: 'Sắp diễn ra', color: 'blue', icon: <FiClock size={12} /> },
  ended: { label: 'Đã kết thúc', color: 'gray', icon: <FiCheck size={12} /> },
  no_sale: { label: 'Chưa đặt lịch', color: 'default', icon: <FiClock size={12} /> },
};

function ShopProducts() {
  const navigate = useNavigate();
  const user = api.getUser();
  const userRole = user?.role || user?.usr_role || '';
  const isAdmin = userRole === 'SHOP_ADMIN' || userRole === 'OWNER' || userRole === 'ADMIN';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login?redirect=/shop/products');
  }, [user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await api.getShopProducts();
    setProducts(list);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Xóa sản phẩm "${name}"?`)) return;
    const res = await api.deleteProduct(id);
    if (res.success) {
      showToast(res.message);
      load();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleForceStart = async (id, name) => {
    if (!window.confirm(`Kích hoạt Flash Sale ngay cho "${name}"? (1 giờ)`)) return;
    const res = await api.hotActivateFlashSale(id, 3600);
    if (res.success) {
      showToast(res.message);
      load();
    } else {
      showToast(res.message, 'error');
    }
  };

  if (!user) return null;
  if (!isAdmin) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.blocked}>
            <h1>Không có quyền truy cập</h1>
            <p>Trang này chỉ dành cho Shop Admin.</p>
            <Link to="/account" className={styles.backLink}>Về trang tài khoản</Link>
          </div>
        </div>
      </div>
    );
  }

  const q = search.toLowerCase().trim();
  const filtered = q
    ? products.filter((p) =>
        (p.product_name || '').toLowerCase().includes(q) ||
        String(p.product_id).includes(q))
    : products;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link to="/account" className={styles.backBtn}><FiArrowLeft size={18} /></Link>
            <div>
              <h1 className={styles.title}>Quản lý sản phẩm</h1>
              <p className={styles.subtitle}>{products.length} sản phẩm</p>
            </div>
          </div>
          <Link to="/shop/products/new" className={styles.addBtn}>
            <FiPlus size={16} /> Thêm sản phẩm
          </Link>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <FiSearch size={16} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Tìm theo tên hoặc ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Đang tải danh sách sản phẩm...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <FiPackage size={40} />
            <p>{search ? 'Không tìm thấy sản phẩm.' : 'Chưa có sản phẩm nào.'}</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Giá</th>
                  <th>Kho</th>
                  <th>Flash Sale</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = STATUS_MAP[p.saleStatus] || STATUS_MAP.no_sale;
                  return (
                    <tr key={p.product_id}>
                      <td>
                        <div className={styles.productCell}>
                          <img
                            src={p.product_thumb}
                            alt=""
                            className={styles.thumb}
                            onError={(e) => { e.target.src = 'https://via.placeholder.com/48'; }}
                          />
                          <div>
                            <span className={styles.productName}>{p.product_name}</span>
                            <span className={styles.productId}>#{p.product_id}</span>
                          </div>
                        </div>
                      </td>
                      <td className={styles.priceCell}>{formatPrice(p.product_price)}</td>
                      <td>{p.product_quantity}</td>
                      <td>
                        <span className={`${styles.badge} ${styles['badge_' + st.color]}`}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td className={styles.timeCell}>
                        <span>{formatDate(p.product_start_time)}</span>
                        <span className={styles.timeSep}>→</span>
                        <span>{formatDate(p.product_end_time)}</span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <Link
                            to={`/shop/products/${p.product_id}/edit`}
                            className={styles.actionBtn}
                            title="Sửa"
                          >
                            <FiEdit2 size={14} />
                          </Link>
                          {p.saleStatus !== 'active' && (
                            <button
                              className={`${styles.actionBtn} ${styles.actionForce}`}
                              title="Kích hoạt ngay"
                              onClick={() => handleForceStart(p.product_id, p.product_name)}
                            >
                              <FiZap size={14} />
                            </button>
                          )}
                          <button
                            className={`${styles.actionBtn} ${styles.actionDelete}`}
                            title="Xóa"
                            onClick={() => handleDelete(p.product_id, p.product_name)}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

export default ShopProducts;
