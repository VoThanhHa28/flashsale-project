import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiSearch, FiArrowLeft, FiShield, FiCheck, FiAlertCircle,
  FiChevronLeft, FiChevronRight,
} from 'react-icons/fi';
import * as api from '../services/api';
import { getUserRoleCode } from '../utils/userRole';
import styles from './AdminUsers.module.css';

const PAGE_SIZE = 10;

function roleIdFromUser(u) {
  const r = u?.usr_role;
  if (!r) return '';
  if (typeof r === 'object' && r._id != null) return String(r._id);
  return String(r);
}

function ShopPermissions() {
  const navigate = useNavigate();
  const user = api.getUser();
  const isShopAdmin = getUserRoleCode(user) === 'SHOP_ADMIN';

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [rolesError, setRolesError] = useState('');
  const [search, setSearch] = useState('');
  const [assigningId, setAssigningId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login?redirect=/shop/permissions');
  }, [user, navigate]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    const [usersRes, rolesRes] = await Promise.all([
      api.getAdminUsers({ page: p, limit: PAGE_SIZE }),
      api.getAdminRoles(),
    ]);
    if (usersRes.success) {
      setUsers(usersRes.users);
      setTotal(usersRes.total);
      setPage(usersRes.page);
    }
    if (rolesRes.success) {
      setRoles(rolesRes.roles);
      setRolesError('');
    } else {
      setRoles([]);
      setRolesError(rolesRes.message || 'Không tải được danh sách vai trò.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user || !isShopAdmin) return;
    load(1);
  }, [user, isShopAdmin, load]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRoleChange = async (targetUserId, currentRoleId, newRoleId) => {
    if (!newRoleId || newRoleId === currentRoleId) return;
    if (
      !window.confirm(
      'Đổi vai trò cho tài khoản này?\nNgười dùng cần đăng nhập lại (hoặc gọi /me) để client nhận role mới.')
    ) {
      return;
    }
    setAssigningId(targetUserId);
    const res = await api.assignUserRole(targetUserId, newRoleId);
    setAssigningId(null);
    if (res.success) {
      showToast(res.message);
      load(page);
    } else {
      showToast(res.message, 'error');
    }
  };

  if (!user) return null;
  if (!isShopAdmin) {
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

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const q = search.toLowerCase().trim();
  const filtered = q
    ? users.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q)
      )
    : users;
  const currentUserId = user._id || user.id || '';

  const sortedRoles = [...roles].sort((a, b) =>
    String(a.roleCode || '').localeCompare(String(b.roleCode || ''))
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link to="/account" className={styles.backBtn} aria-label="Quay lại">
              <FiArrowLeft size={18} />
            </Link>
            <div>
              <h1 className={styles.title}>Quản lý phân quyền</h1>
              <p className={styles.subtitle}>
                Gán vai trò cho người dùng (ví dụ nâng thành Shop Admin). Đường dẫn API: PATCH /admin/users/:id/role
              </p>
            </div>
          </div>
        </header>

        <p className={styles.permHint}>
          <FiShield size={16} style={{ verticalAlign: '-3px', marginRight: 8 }} />
          Chọn vai trò trong danh sách và xác nhận. Bạn không thể đổi vai trò của chính mình trên bảng này để tránh khóa nhầm.
          <Link to="/shop/users" style={{ marginLeft: 8 }}>(Khóa tài khoản tại Quản lý người dùng)</Link>
        </p>

        {rolesError && (
          <div className={styles.empty} style={{ color: '#b91c1c', padding: '12px' }}>
            <FiAlertCircle size={20} /> {rolesError}
          </div>
        )}

        <div className={styles.toolbar}>
          <div className={styles.searchWrap}>
            <FiSearch size={16} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Tìm theo tên hoặc email (trang hiện tại)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Đang tải...</div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <FiShield size={40} />
            <p>{search ? 'Không tìm thấy người dùng.' : 'Chưa có người dùng nào.'}</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò hiện tại</th>
                    <th>Đổi vai trò</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => {
                    const uid = u._id || u.id || '';
                    const isSelf = String(uid) === String(currentUserId);
                    const isInactive = u.status === 'inactive';
                    const initial = (u.name || u.email || '?').charAt(0).toUpperCase();
                    const roleCode = getUserRoleCode(u);
                    const rid = roleIdFromUser(u);
                    const roleOptions =
                      rid && !sortedRoles.some((r) => String(r._id) === rid)
                        ? [{ _id: rid, roleName: 'Đang gán', roleCode: roleCode || '?' }, ...sortedRoles]
                        : sortedRoles;

                    return (
                      <tr key={uid} className={isInactive ? styles.rowInactive : ''}>
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.avatar}>
                              {u.avatar ? (
                                <img src={u.avatar} alt="" className={styles.avatarImg} />
                              ) : (
                                <span className={styles.avatarInitial}>{initial}</span>
                              )}
                            </div>
                            <div>
                              <span className={styles.userName}>{u.name || '(Chưa đặt tên)'}</span>
                              <span className={styles.userEmail}>{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.roleBadge} ${roleCode === 'SHOP_ADMIN' ? styles.roleAdmin : ''}`}>
                            {roleCode === 'SHOP_ADMIN' ? 'Shop Admin' : roleCode === 'USER' ? 'Khách hàng' : roleCode || '—'}
                          </span>
                          {isInactive && (
                            <span className={styles.bannedLabel} style={{ display: 'block', marginTop: 6 }}>
                              Tài khoản đã khóa
                            </span>
                          )}
                        </td>
                        <td>
                          {isSelf ? (
                            <span className={styles.selfLabel}>Tài khoản của bạn — đổi role qua DB hoặc tài khoản admin khác</span>
                          ) : roleOptions.length === 0 ? (
                            <span className={styles.selfLabel}>Không có danh sách role</span>
                          ) : (
                            <select
                              className={styles.roleSelect}
                              value={rid || String(roleOptions[0]._id)}
                              disabled={isInactive || assigningId === uid}
                              onChange={(e) => handleRoleChange(uid, rid, e.target.value)}
                              aria-label={`Vai trò cho ${u.email}`}
                            >
                              {roleOptions.map((role) => (
                                <option key={role._id} value={role._id}>
                                  {role.roleName || role.roleCode} ({role.roleCode})
                                </option>
                              ))}
                            </select>
                          )}
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
                  type="button"
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}
                >
                  <FiChevronLeft size={16} />
                </button>
                <span className={styles.pageInfo}>
                  Trang {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => load(page + 1)}
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

export default ShopPermissions;
