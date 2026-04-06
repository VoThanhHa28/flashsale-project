import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiEdit2, FiTrash2, FiPlus, FiLayers } from 'react-icons/fi';
import * as api from '../services/api';
import { getUserRoleCode } from '../utils/userRole';
import styles from './ShopCategories.module.css';

const EMPTY_FORM = {
  categoryName: '',
  categorySlug: '',
  sortOrder: '0',
};

function ShopCategories() {
  const navigate = useNavigate();
  const user = api.getUser();
  const isShopAdmin = getUserRoleCode(user) === 'SHOP_ADMIN';

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login?redirect=/shop/categories');
  }, [user, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.getCategories();
    setCategories(Array.isArray(res.categories) ? res.categories : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user || !isShopAdmin) return;
    load();
  }, [user, isShopAdmin, load]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = createForm.categoryName.trim();
    if (!name) {
      showToast('Tên danh mục không được để trống', 'error');
      return;
    }
    const body = {
      categoryName: name,
      sortOrder: Number(createForm.sortOrder) || 0,
    };
    const slug = createForm.categorySlug.trim();
    if (slug) body.categorySlug = slug;

    setSaving(true);
    const res = await api.createCategory(body);
    setSaving(false);
    if (res.success) {
      showToast(res.message);
      setCreateForm(EMPTY_FORM);
      load();
    } else {
      showToast(res.message, 'error');
    }
  };

  const openEdit = (c) => {
    setEditRow(c);
    setEditForm({
      categoryName: c.categoryName || '',
      categorySlug: c.categorySlug || '',
      sortOrder: String(c.sortOrder ?? 0),
      isActive: c.isActive !== false,
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editRow || !editForm) return;
    const id = editRow._id;
    const name = editForm.categoryName.trim();
    if (!name) {
      showToast('Tên danh mục không được để trống', 'error');
      return;
    }
    const body = {
      categoryName: name,
      sortOrder: Number(editForm.sortOrder) || 0,
      isActive: editForm.isActive,
    };
    const slug = editForm.categorySlug.trim();
    if (slug) body.categorySlug = slug;

    setSaving(true);
    const res = await api.updateCategory(id, body);
    setSaving(false);
    if (res.success) {
      showToast(res.message);
      setEditRow(null);
      setEditForm(null);
      load();
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Xóa danh mục «${c.categoryName}»? (Ẩn khỏi hệ thống, có thể trùng tên nếu tạo lại sau)`)) return;
    const res = await api.deleteCategory(c._id);
    if (res.success) {
      showToast(res.message);
      load();
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

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link to="/account" className={styles.backBtn} aria-label="Quay lại">
              <FiArrowLeft size={18} />
            </Link>
            <div>
              <h1 className={styles.title}>Quản lý danh mục</h1>
              <p className={styles.subtitle}>
                Tên danh mục nên trùng với <strong>product_category</strong> của sản phẩm để lọc trên trang chủ đúng.
              </p>
            </div>
          </div>
        </header>

        <section className={styles.card}>
          <h2 className={styles.cardTitle}><FiLayers size={18} style={{ verticalAlign: '-3px', marginRight: 8 }} />Thêm danh mục</h2>
          <form onSubmit={handleCreate}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sc-name">Tên hiển thị *</label>
                <input
                  id="sc-name"
                  className={styles.input}
                  value={createForm.categoryName}
                  onChange={(e) => setCreateForm((f) => ({ ...f, categoryName: e.target.value }))}
                  placeholder="VD: Điện thoại"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sc-slug">Slug (tùy chọn)</label>
                <input
                  id="sc-slug"
                  className={styles.input}
                  value={createForm.categorySlug}
                  onChange={(e) => setCreateForm((f) => ({ ...f, categorySlug: e.target.value }))}
                  placeholder="dien-thoai — để trống sẽ tự sinh"
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="sc-order">Thứ tự</label>
                <input
                  id="sc-order"
                  className={styles.input}
                  type="number"
                  min={0}
                  value={createForm.sortOrder}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sortOrder: e.target.value }))}
                />
              </div>
            </div>
            <p className={styles.hint}>API công khai chỉ liệt kê danh mục đang bật <code>isActive</code>.</p>
            <div className={styles.actions}>
              <button type="submit" className={styles.btnPrimary} disabled={saving}>
                <FiPlus size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />
                Tạo danh mục
              </button>
            </div>
          </form>
        </section>

        {loading ? (
          <div className={styles.loading}>Đang tải danh mục…</div>
        ) : categories.length === 0 ? (
          <div className={styles.empty}>
            <p>Chưa có danh mục hoặc backend chưa chạy / chưa seed.</p>
            {!api.isApiConfigured() && (
              <p className={styles.hint}>Cấu hình <code>REACT_APP_API_URL</code> để quản lý qua API.</p>
            )}
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Slug</th>
                  <th>Thứ tự</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c._id}>
                    <td><strong>{c.categoryName}</strong></td>
                    <td className={styles.slug}>{c.categorySlug}</td>
                    <td>{c.sortOrder ?? 0}</td>
                    <td>
                      {c.isActive !== false ? (
                        <span className={styles.badgeOn}>Hoạt động</span>
                      ) : (
                        <span className={styles.badgeOff}>Tắt</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <button type="button" className={styles.iconBtn} title="Sửa" onClick={() => openEdit(c)}>
                          <FiEdit2 size={16} />
                        </button>
                        <button type="button" className={`${styles.iconBtn} ${styles.iconBtnDanger}`} title="Xóa" onClick={() => handleDelete(c)}>
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editRow && editForm && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="edit-cat-title">
          <div className={styles.modal}>
            <h2 id="edit-cat-title" className={styles.modalTitle}>Sửa danh mục</h2>
            <form onSubmit={handleUpdate}>
              <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr' }}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="ed-name">Tên</label>
                  <input
                    id="ed-name"
                    className={styles.input}
                    value={editForm.categoryName}
                    onChange={(e) => setEditForm((f) => ({ ...f, categoryName: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="ed-slug">Slug</label>
                  <input
                    id="ed-slug"
                    className={styles.input}
                    value={editForm.categorySlug}
                    onChange={(e) => setEditForm((f) => ({ ...f, categorySlug: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="ed-order">Thứ tự</label>
                  <input
                    id="ed-order"
                    className={styles.input}
                    type="number"
                    min={0}
                    value={editForm.sortOrder}
                    onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                    />
                    Đang hoạt động
                  </label>
                </div>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnGhost} onClick={() => { setEditRow(null); setEditForm(null); }}>
                  Hủy
                </button>
                <button type="submit" className={styles.btnPrimary} disabled={saving}>Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastErr : styles.toastOk}`} role="status">
          {toast.msg}
        </div>
      )}
    </div>
  );
}

export default ShopCategories;
