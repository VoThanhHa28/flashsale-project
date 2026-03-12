import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiSearch, FiArrowLeft, FiUsers, FiLock,
  FiCheck, FiAlertCircle, FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import * as api from '../services/api';
import styles from './AdminUsers.module.css';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

const ROLE_LABELS = {
  USER: 'Người dùng',
  SHOP_ADMIN: 'Shop Admin',
  ADMIN: 'Admin',
  OWNER: 'Owner',
};

const PAGE_SIZE = 10;

function AdminUsers() {
  const navigate = useNavigate();
  const user = api.getUser();
  const isSuperAdmin = !!user?.is_super_admin;

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [banningId, setBanningId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login?redirect=/shop/users');
  }, [user, navigate]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const res = await api.getAdminUsers({ page: p, limit: PAGE_SIZE });
    if (res.success) {
      setUsers(res.users);
      setTotal(res.total);
      setPage(res.page);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBan = async (userId, userName) => {
    if (!window.confirm(`Khóa tài khoản "${userName}"?\nSau khi khóa, người dùng sẽ không thể đăng nhập.`)) return;
    setBanningId(userId);
    const res = await api.banUser(userId);
    setBanningId(null);
    if (res.success) {
      showToast(res.message);
      load(page);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    load(newPage);
  };

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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const q = search.toLowerCase().trim();
  const filtered = q
    ? users.filter((u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q))
    : users;

  const currentUserId = user._id || user.id || '';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link to="/account" className={styles.backBtn}><FiArrowLeft size={18} /></Link>
            <div>
              <h1 className={styles.title}>Quản lý người dùng</h1>
              <p className={styles.subtitle}>{total} người dùng</p>
            </div>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <FiSearch size={16} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Tìm theo tên hoặc email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Đang tải danh sách người dùng...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <FiUsers size={40} />
            <p>{search ? 'Không tìm thấy người dùng.' : 'Chưa có người dùng nào.'}</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tham gia</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const uid = u._id || u.id || '';
                    const isSelf = String(uid) === String(currentUserId);
                    const isInactive = u.status === 'inactive';
                    const initial = (u.name || u.email || '?').charAt(0).toUpperCase();
                    const roleLabel = ROLE_LABELS[u.usr_role] || u.usr_role || 'USER';

                    return (
                      <tr key={uid} className={isInactive ? styles.rowInactive : ''}>
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.avatar}>
                              {u.avatar
                                ? <img src={u.avatar} alt="" className={styles.avatarImg} />
                                : <span className={styles.avatarInitial}>{initial}</span>}
                            </div>
                            <div>
                              <span className={styles.userName}>{u.name || '(Chưa đặt tên)'}</span>
                              <span className={styles.userEmail}>{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.roleBadge} ${u.usr_role === 'SHOP_ADMIN' ? styles.roleAdmin : ''}`}>
                            {roleLabel}
                          </span>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${isInactive ? styles.statusInactive : styles.statusActive}`}>
                            {isInactive ? 'Đã khóa' : 'Hoạt động'}
                          </span>
                        </td>
                        <td className={styles.dateCell}>{formatDate(u.createdAt)}</td>
                        <td>
                          <div className={styles.actions}>
                            {isSelf ? (
                              <span className={styles.selfLabel}>Bạn</span>
                            ) : isInactive ? (
                              <span className={styles.bannedLabel}>Đã khóa</span>
                            ) : (
                              <button
                                className={styles.banBtn}
                                onClick={() => handleBan(uid, u.name || u.email)}
                                disabled={banningId === uid}
                                title="Khóa tài khoản"
                              >
                                <FiLock size={14} />
                                {banningId === uid ? 'Đang khóa...' : 'Khóa'}
                              </button>
                            )}
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
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <FiChevronLeft size={16} />
                </button>
                <span className={styles.pageInfo}>
                  Trang {page} / {totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(page + 1)}
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
    </div>
  );
}

export default AdminUsers;
