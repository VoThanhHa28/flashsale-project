import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft, FiSave, FiZap, FiImage, FiAlertCircle,
  FiCheck, FiTag, FiDollarSign, FiBox, FiFileText,
  FiClock, FiLayers,
} from 'react-icons/fi';
import * as api from '../services/api';
import { getUserRoleCode } from '../utils/userRole';
import { toLocalDatetime, localDatetimeToISO } from '../utils/datetimeLocal';
import styles from './ProductForm.module.css';

const EMPTY_FORM = {
  productName: '',
  productThumb: '',
  productDescription: '',
  productPrice: '',
  productQuantity: '',
  productCategory: '',
  productBrand: '',
  startTime: '',
  endTime: '',
  isPublished: true,
};

function validate(f) {
  const err = {};
  if (!f.productName.trim()) err.productName = 'Tên sản phẩm không được trống';
  if (!f.productThumb.trim()) err.productThumb = 'URL ảnh không được trống';
  if (!f.productDescription.trim()) err.productDescription = 'Mô tả không được trống';
  const price = Number(f.productPrice);
  if (!f.productPrice || Number.isNaN(price) || price < 0) err.productPrice = 'Giá phải >= 0';
  const qty = Number(f.productQuantity);
  if (f.productQuantity === '' || Number.isNaN(qty) || qty < 0) err.productQuantity = 'Số lượng phải >= 0';
  if (!f.startTime) err.startTime = 'Thời gian bắt đầu là bắt buộc';
  if (!f.endTime) err.endTime = 'Thời gian kết thúc là bắt buộc';
  if (f.startTime && f.endTime && new Date(f.endTime) <= new Date(f.startTime)) {
    err.endTime = 'Kết thúc phải sau bắt đầu';
  }
  return err;
}

function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const user = api.getUser();
  const userRole = getUserRoleCode(user);
  const isAdmin = userRole === 'SHOP_ADMIN' || userRole === 'OWNER' || userRole === 'ADMIN';

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [originalProduct, setOriginalProduct] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login?redirect=/shop/products');
  }, [user, navigate]);

  useEffect(() => {
    if (!isEdit || !isAdmin) return;
    let cancelled = false;
    (async () => {
      const list = await api.getShopProducts();
      if (cancelled) return;
      const p = list.find((item) => String(item.product_id) === String(id));
      if (!p) {
        setLoading(false);
        return;
      }
      setOriginalProduct(p);
      setForm({
        productName: p.product_name || '',
        productThumb: p.product_thumb || '',
        productDescription: p.product_description || '',
        productPrice: p.product_price != null ? String(p.product_price) : '',
        productQuantity: p.product_quantity != null ? String(p.product_quantity) : '',
        productCategory: p.product_category || '',
        productBrand: p.product_brand || '',
        startTime: toLocalDatetime(p.product_start_time),
        endTime: toLocalDatetime(p.product_end_time),
        isPublished: p.isPublished !== false,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, isEdit, isAdmin]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleChange = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    const startISO = localDatetimeToISO(form.startTime);
    const endISO = localDatetimeToISO(form.endTime);
    const payload = {
      productName: form.productName,
      productThumb: form.productThumb,
      productDescription: form.productDescription,
      productPrice: Number(form.productPrice) || 0,
      productQuantity: Number(form.productQuantity) || 0,
      isPublished: form.isPublished,
      startTime: startISO,
      endTime: endISO,
    };

    const res = isEdit
      ? await api.updateProduct(id, payload)
      : await api.createProduct(payload);

    if (res.success && startISO && endISO) {
      const productId = isEdit ? id : res.product?.product_id;
      if (productId) {
        await api.scheduleFlashSale(productId, startISO, endISO);
      }
    }

    setSaving(false);
    if (res.success) {
      showToast(res.message);
      setTimeout(() => navigate('/shop/products'), 1200);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleForceStart = async () => {
    if (!window.confirm('Kích hoạt Flash Sale ngay bây giờ? (Thời lượng mặc định: 1 giờ)')) return;
    setSaving(true);
    const res = await api.hotActivateFlashSale(id, 3600);
    setSaving(false);
    if (res.success) {
      showToast(res.message);
      if (res.product) {
        setForm((prev) => ({
          ...prev,
          startTime: toLocalDatetime(res.product.product_start_time),
          endTime: toLocalDatetime(res.product.product_end_time),
        }));
        setOriginalProduct(res.product);
      }
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
            <Link to="/account" className={styles.backLink}>Về trang tài khoản</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>Đang tải thông tin sản phẩm...</div>
        </div>
      </div>
    );
  }

  if (isEdit && !originalProduct && !loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.blocked}>
            <h1>Không tìm thấy sản phẩm</h1>
            <Link to="/shop/products" className={styles.backLink}>Quay lại danh sách</Link>
          </div>
        </div>
      </div>
    );
  }

  const now = new Date();
  const startDate = form.startTime ? new Date(form.startTime) : null;
  const endDate = form.endTime ? new Date(form.endTime) : null;
  let saleStatus = 'no_sale';
  if (startDate && endDate) {
    if (now < startDate) saleStatus = 'scheduled';
    else if (now >= startDate && now <= endDate) saleStatus = 'active';
    else saleStatus = 'ended';
  }
  const canForceStart = isEdit && saleStatus !== 'active';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <Link to="/shop/products" className={styles.backBtn}><FiArrowLeft size={18} /></Link>
            <h1 className={styles.title}>{isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h1>
          </div>
          <div className={styles.headerActions}>
            {canForceStart && (
              <button
                type="button"
                className={styles.forceBtn}
                onClick={handleForceStart}
                disabled={saving}
              >
                <FiZap size={16} /> KÍCH HOẠT NGAY
              </button>
            )}
          </div>
        </header>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.cardGrid}>
            {/* Left column: basic info */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Thông tin cơ bản</h2>

              <Field label="Tên sản phẩm" icon={<FiTag />} error={errors.productName}>
                <input
                  className={styles.input}
                  value={form.productName}
                  onChange={(e) => handleChange('productName', e.target.value)}
                  placeholder="VD: iPhone 15 Pro Max"
                />
              </Field>

              <Field label="URL ảnh sản phẩm" icon={<FiImage />} error={errors.productThumb}>
                <input
                  className={styles.input}
                  value={form.productThumb}
                  onChange={(e) => handleChange('productThumb', e.target.value)}
                  placeholder="https://..."
                />
              </Field>

              {form.productThumb && (
                <div className={styles.thumbPreview}>
                  <img
                    src={form.productThumb}
                    alt="Preview"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              )}

              <Field label="Mô tả" icon={<FiFileText />} error={errors.productDescription}>
                <textarea
                  className={`${styles.input} ${styles.textarea}`}
                  value={form.productDescription}
                  onChange={(e) => handleChange('productDescription', e.target.value)}
                  rows={4}
                  placeholder="Mô tả chi tiết sản phẩm..."
                />
              </Field>

              <div className={styles.row2}>
                <Field label="Danh mục" icon={<FiLayers />}>
                  <input
                    className={styles.input}
                    value={form.productCategory}
                    onChange={(e) => handleChange('productCategory', e.target.value)}
                    placeholder="VD: Điện thoại"
                  />
                </Field>
                <Field label="Thương hiệu" icon={<FiTag />}>
                  <input
                    className={styles.input}
                    value={form.productBrand}
                    onChange={(e) => handleChange('productBrand', e.target.value)}
                    placeholder="VD: Apple"
                  />
                </Field>
              </div>

              <div className={styles.row2}>
                <Field label="Giá (VNĐ)" icon={<FiDollarSign />} error={errors.productPrice}>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    value={form.productPrice}
                    onChange={(e) => handleChange('productPrice', e.target.value)}
                    placeholder="0"
                  />
                </Field>
                <Field label="Số lượng" icon={<FiBox />} error={errors.productQuantity}>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    value={form.productQuantity}
                    onChange={(e) => handleChange('productQuantity', e.target.value)}
                    placeholder="0"
                  />
                </Field>
              </div>
            </section>

            {/* Right column: flash sale time */}
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>
                <FiClock size={18} /> Lịch Flash Sale
              </h2>

              {saleStatus !== 'no_sale' && (
                <div className={`${styles.saleBanner} ${styles['saleBanner_' + saleStatus]}`}>
                  {saleStatus === 'active' && <><FiZap /> Flash Sale đang diễn ra</>}
                  {saleStatus === 'scheduled' && <><FiClock /> Flash Sale đã lên lịch</>}
                  {saleStatus === 'ended' && <><FiCheck /> Flash Sale đã kết thúc</>}
                </div>
              )}

              <Field label="Thời gian bắt đầu" icon={<FiClock />} error={errors.startTime}>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) => handleChange('startTime', e.target.value)}
                />
              </Field>

              <Field label="Thời gian kết thúc" icon={<FiClock />} error={errors.endTime}>
                <input
                  className={styles.input}
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) => handleChange('endTime', e.target.value)}
                />
              </Field>

              {canForceStart && (
                <button
                  type="button"
                  className={styles.forceBtnLarge}
                  onClick={handleForceStart}
                  disabled={saving}
                >
                  <FiZap size={20} />
                  <div>
                    <strong>KÍCH HOẠT NGAY</strong>
                    <span>Bắt đầu Flash Sale ngay lập tức (start = bây giờ)</span>
                  </div>
                </button>
              )}

              <div className={styles.publishWrap}>
                <label className={styles.publishLabel}>
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => handleChange('isPublished', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span>Hiển thị sản phẩm (Published)</span>
                </label>
              </div>
            </section>
          </div>

          {/* Submit */}
          <div className={styles.submitBar}>
            <Link to="/shop/products" className={styles.cancelBtn}>Hủy</Link>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              {saving ? 'Đang lưu...' : <><FiSave size={16} /> {isEdit ? 'Cập nhật' : 'Tạo sản phẩm'}</>}
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

function Field({ label, icon, error, children }) {
  return (
    <div className={`${styles.field} ${error ? styles.fieldError : ''}`}>
      <label className={styles.label}>
        {icon && <span className={styles.labelIcon}>{icon}</span>}
        {label}
      </label>
      {children}
      {error && <span className={styles.error}><FiAlertCircle size={12} /> {error}</span>}
    </div>
  );
}

export default ProductForm;
