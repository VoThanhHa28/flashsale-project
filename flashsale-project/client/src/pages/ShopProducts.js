import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiPlus, FiEdit2, FiTrash2, FiZap, FiSearch,
  FiPackage, FiArrowLeft, FiClock, FiCheck, FiAlertCircle,
  FiFilter, FiChevronLeft, FiChevronRight, FiX, FiAlertTriangle,
  FiTrendingUp, FiBox, FiRefreshCw,
} from 'react-icons/fi';
import * as api from '../services/api';
import { getUserRoleCode } from '../utils/userRole';
import styles from './ShopProducts.module.css';

const PAGE_SIZE = 8;

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

function getTimeRemaining(endTime) {
  if (!endTime) return null;
  const diff = new Date(endTime) - new Date();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} ngày`;
  }
  return `${hours}h ${minutes}p`;
}

const STATUS_MAP = {
  active: { label: 'Đang diễn ra', color: 'green', icon: <FiZap size={12} /> },
  scheduled: { label: 'Sắp diễn ra', color: 'blue', icon: <FiClock size={12} /> },
  ended: { label: 'Đã kết thúc', color: 'gray', icon: <FiCheck size={12} /> },
  no_sale: { label: 'Chưa đặt lịch', color: 'default', icon: <FiClock size={12} /> },
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'name_asc', label: 'Tên A-Z' },
  { value: 'name_desc', label: 'Tên Z-A' },
  { value: 'price_high', label: 'Giá cao → thấp' },
  { value: 'price_low', label: 'Giá thấp → cao' },
  { value: 'stock_high', label: 'Tồn kho cao' },
  { value: 'stock_low', label: 'Tồn kho thấp' },
];

function StockBar({ quantity, maxQuantity = 100 }) {
  const percent = Math.min((quantity / maxQuantity) * 100, 100);
  let level = 'high';
  if (quantity <= 5) level = 'critical';
  else if (quantity <= 20) level = 'low';
  else if (quantity <= 50) level = 'medium';

  return (
    <div className={styles.stockCell}>
      <div className={styles.stockBar}>
        <div
          className={`${styles.stockFill} ${styles['stock_' + level]}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`${styles.stockNum} ${styles['stockNum_' + level]}`}>
        {quantity}
      </span>
    </div>
  );
}

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, type = 'danger' }) {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={`${styles.modalIcon} ${styles['modalIcon_' + type]}`}>
          {type === 'danger' ? <FiAlertTriangle size={28} /> : <FiZap size={28} />}
        </div>
        <h3 className={styles.modalTitle}>{title}</h3>
        <p className={styles.modalMessage}>{message}</p>
        <div className={styles.modalActions}>
          <button className={styles.modalCancel} onClick={onCancel}>Hủy</button>
          <button
            className={`${styles.modalConfirm} ${styles['modalConfirm_' + type]}`}
            onClick={onConfirm}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className={styles.skeletonRow}>
      <td><div className={styles.skeletonCell}><div className={styles.skeletonThumb} /><div className={styles.skeletonText} /></div></td>
      <td><div className={styles.skeletonPrice} /></td>
      <td><div className={styles.skeletonStock} /></td>
      <td><div className={styles.skeletonBadge} /></td>
      <td><div className={styles.skeletonTime} /></td>
      <td><div className={styles.skeletonActions} /></td>
    </tr>
  );
}

function ShopProducts() {
  const navigate = useNavigate();
  const user = api.getUser();
  const userRole = getUserRoleCode(user);
  const isAdmin = userRole === 'SHOP_ADMIN' || userRole === 'OWNER' || userRole === 'ADMIN';

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false });

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

  const handleDelete = (id, name) => {
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Xóa sản phẩm',
      message: `Bạn có chắc muốn xóa "${name}"? Hành động này không thể hoàn tác.`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        const res = await api.deleteProduct(id);
        if (res.success) {
          showToast(res.message);
          load();
        } else {
          showToast(res.message, 'error');
        }
      },
    });
  };

  const handleForceStart = (id, name) => {
    setConfirmModal({
      isOpen: true,
      type: 'warning',
      title: 'Kích hoạt Flash Sale',
      message: `Kích hoạt Flash Sale ngay cho "${name}"? Thời gian: 1 giờ.`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false });
        const res = await api.hotActivateFlashSale(id, 3600);
        if (res.success) {
          showToast(res.message);
          load();
        } else {
          showToast(res.message, 'error');
        }
      },
    });
  };

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.saleStatus === 'active').length;
    const scheduled = products.filter(p => p.saleStatus === 'scheduled').length;
    const outOfStock = products.filter(p => (p.product_quantity || 0) <= 0).length;
    const lowStock = products.filter(p => p.product_quantity > 0 && p.product_quantity <= 10).length;
    return { total, active, scheduled, outOfStock, lowStock };
  }, [products]);

  const filteredAndSorted = useMemo(() => {
    let result = [...products];

    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(p =>
        (p.product_name || '').toLowerCase().includes(q) ||
        String(p.product_id).includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(p => p.saleStatus === statusFilter);
    }

    if (stockFilter === 'in_stock') {
      result = result.filter(p => p.product_quantity > 10);
    } else if (stockFilter === 'low_stock') {
      result = result.filter(p => p.product_quantity > 0 && p.product_quantity <= 10);
    } else if (stockFilter === 'out_of_stock') {
      result = result.filter(p => (p.product_quantity || 0) <= 0);
    }

    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        break;
      case 'name_asc':
        result.sort((a, b) => (a.product_name || '').localeCompare(b.product_name || ''));
        break;
      case 'name_desc':
        result.sort((a, b) => (b.product_name || '').localeCompare(a.product_name || ''));
        break;
      case 'price_high':
        result.sort((a, b) => (b.product_price || 0) - (a.product_price || 0));
        break;
      case 'price_low':
        result.sort((a, b) => (a.product_price || 0) - (b.product_price || 0));
        break;
      case 'stock_high':
        result.sort((a, b) => (b.product_quantity || 0) - (a.product_quantity || 0));
        break;
      case 'stock_low':
        result.sort((a, b) => (a.product_quantity || 0) - (b.product_quantity || 0));
        break;
      default:
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  }, [products, search, statusFilter, stockFilter, sortBy]);

  const totalPages = Math.ceil(filteredAndSorted.length / PAGE_SIZE);
  const paginatedProducts = filteredAndSorted.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, stockFilter, sortBy]);

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

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link to="/account" className={styles.backBtn}><FiArrowLeft size={18} /></Link>
            <div>
              <h1 className={styles.title}>Quản lý sản phẩm</h1>
              <p className={styles.subtitle}>Quản lý kho hàng và Flash Sale</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.refreshBtn} onClick={load} disabled={loading}>
              <FiRefreshCw size={16} className={loading ? styles.spinning : ''} />
            </button>
            <Link to="/shop/products/new" className={styles.addBtn}>
              <FiPlus size={16} /> Thêm sản phẩm
            </Link>
          </div>
        </header>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIcon_total}`}>
              <FiPackage size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.total}</span>
              <span className={styles.statLabel}>Tổng sản phẩm</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIcon_active}`}>
              <FiZap size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.active}</span>
              <span className={styles.statLabel}>Đang Flash Sale</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIcon_scheduled}`}>
              <FiClock size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.scheduled}</span>
              <span className={styles.statLabel}>Sắp diễn ra</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.statIcon_warning}`}>
              <FiAlertTriangle size={20} />
            </div>
            <div className={styles.statContent}>
              <span className={styles.statValue}>{stats.lowStock + stats.outOfStock}</span>
              <span className={styles.statLabel}>Cần nhập thêm</span>
            </div>
          </div>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <FiSearch size={16} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Tìm theo tên hoặc ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className={styles.clearSearch} onClick={() => setSearch('')}>
                <FiX size={14} />
              </button>
            )}
          </div>

          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <FiFilter size={14} />
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang diễn ra</option>
                <option value="scheduled">Sắp diễn ra</option>
                <option value="ended">Đã kết thúc</option>
                <option value="no_sale">Chưa đặt lịch</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <FiBox size={14} />
              <select
                className={styles.filterSelect}
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
              >
                <option value="all">Tất cả tồn kho</option>
                <option value="in_stock">Còn hàng (&gt;10)</option>
                <option value="low_stock">Sắp hết (≤10)</option>
                <option value="out_of_stock">Hết hàng</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <FiTrendingUp size={14} />
              <select
                className={styles.filterSelect}
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {!loading && filteredAndSorted.length > 0 && (
          <div className={styles.resultInfo}>
            Hiển thị <strong>{(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredAndSorted.length)}</strong> / <strong>{filteredAndSorted.length}</strong> sản phẩm
          </div>
        )}

        {loading ? (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th>Giá</th>
                  <th>Tồn kho</th>
                  <th>Flash Sale</th>
                  <th>Thời gian</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map(i => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className={styles.empty}>
            <FiPackage size={48} />
            <h3>{search || statusFilter !== 'all' || stockFilter !== 'all' ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}</h3>
            <p>{search || statusFilter !== 'all' || stockFilter !== 'all' ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.' : 'Bắt đầu thêm sản phẩm đầu tiên của bạn!'}</p>
            {!search && statusFilter === 'all' && stockFilter === 'all' && (
              <Link to="/shop/products/new" className={styles.emptyBtn}>
                <FiPlus size={16} /> Thêm sản phẩm
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Sản phẩm</th>
                    <th>Giá</th>
                    <th>Tồn kho</th>
                    <th>Flash Sale</th>
                    <th>Thời gian</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((p) => {
                    const st = STATUS_MAP[p.saleStatus] || STATUS_MAP.no_sale;
                    const timeRemaining = p.saleStatus === 'active' ? getTimeRemaining(p.product_end_time) : null;
                    return (
                      <tr key={p.product_id}>
                        <td>
                          <div className={styles.productCell}>
                            <img
                              src={p.product_thumb}
                              alt=""
                              className={styles.thumb}
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/64'; }}
                            />
                            <div className={styles.productInfo}>
                              <span className={styles.productName}>{p.product_name}</span>
                              <span className={styles.productId}>ID: {p.product_id}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className={styles.priceCell}>
                            <span className={styles.currentPrice}>{formatPrice(p.product_price)}</span>
                            {p.original_price && p.original_price > p.product_price && (
                              <>
                                <span className={styles.originalPrice}>{formatPrice(p.original_price)}</span>
                                <span className={styles.discount}>
                                  -{Math.round((1 - p.product_price / p.original_price) * 100)}%
                                </span>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <StockBar quantity={p.product_quantity || 0} />
                        </td>
                        <td>
                          <div className={styles.saleStatus}>
                            <span className={`${styles.badge} ${styles['badge_' + st.color]}`}>
                              {st.icon} {st.label}
                            </span>
                            {timeRemaining && (
                              <span className={styles.countdown}>
                                <FiClock size={10} /> còn {timeRemaining}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className={styles.timeCell}>
                          <div className={styles.timeRange}>
                            <span className={styles.timeLabel}>Bắt đầu:</span>
                            <span>{formatDate(p.product_start_time)}</span>
                          </div>
                          <div className={styles.timeRange}>
                            <span className={styles.timeLabel}>Kết thúc:</span>
                            <span>{formatDate(p.product_end_time)}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <Link
                              to={`/shop/products/${p.product_id}/edit`}
                              className={`${styles.actionBtn} ${styles.actionEdit}`}
                              title="Chỉnh sửa"
                            >
                              <FiEdit2 size={14} />
                            </Link>
                            {p.saleStatus !== 'active' && (
                              <button
                                className={`${styles.actionBtn} ${styles.actionForce}`}
                                title="Kích hoạt Flash Sale ngay"
                                onClick={() => handleForceStart(p.product_id, p.product_name)}
                              >
                                <FiZap size={14} />
                              </button>
                            )}
                            <button
                              className={`${styles.actionBtn} ${styles.actionDelete}`}
                              title="Xóa sản phẩm"
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

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                >
                  <FiChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    className={`${styles.pageBtn} ${currentPage === page ? styles.pageActive : ''}`}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                ))}
                <button
                  className={styles.pageBtn}
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                >
                  <FiChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
          {toast.type === 'error' ? <FiAlertCircle size={16} /> : <FiCheck size={16} />}
          {toast.msg}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ isOpen: false })}
      />
    </div>
  );
}

export default ShopProducts;
