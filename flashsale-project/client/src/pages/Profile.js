import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiEdit2,
  FiSave,
  FiX,
  FiUser,
  FiMail,
  FiPhone,
  FiCalendar,
  FiShield,
  FiCheck,
  FiCamera,
  FiAlertCircle,
} from 'react-icons/fi';
import * as api from '../services/api';
import styles from './Profile.module.css';

/**
 * Map gender value → display label
 */
const GENDER_OPTIONS = [
  { value: 'male',   label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other',  label: 'Khác' },
];

/**
 * Trích xuất các field hiển thị từ raw user object
 * Hỗ trợ cả camelCase lẫn snake_case từ BE
 */
function extractFields(user) {
  return {
    name:   user.name   || user.usr_name   || '',
    email:  user.email  || user.usr_email  || '',
    phone:  user.phone  || user.usr_phone  || '',
    dob:    user.dob    || user.usr_dob    || '',
    gender: user.gender || user.usr_gender || '',
  };
}

/**
 * Validate các field trước khi submit
 * Trả về object { fieldName: 'error message' } hoặc {} nếu hợp lệ
 */
function validate(fields) {
  const errors = {};
  if (!fields.name.trim()) {
    errors.name = 'Họ tên không được để trống';
  } else if (fields.name.trim().length < 2) {
    errors.name = 'Họ tên phải có ít nhất 2 ký tự';
  }
  if (fields.phone && !/^(0|\+84)[0-9]{9}$/.test(fields.phone.replace(/\s/g, ''))) {
    errors.phone = 'Số điện thoại không hợp lệ (VD: 0901234567)';
  }
  if (fields.dob) {
    const d = new Date(fields.dob);
    const now = new Date();
    if (isNaN(d.getTime())) {
      errors.dob = 'Ngày sinh không hợp lệ';
    } else if (d > now) {
      errors.dob = 'Ngày sinh không thể trong tương lai';
    }
  }
  return errors;
}

/**
 * Profile Page – /profile
 *
 * Tính năng:
 *   - Xem thông tin hồ sơ cá nhân
 *   - Chuyển sang chế độ chỉnh sửa (click "Chỉnh sửa")
 *   - Validate client-side trước khi lưu
 *   - Lưu bằng api.updateProfile() (mock → localStorage)
 *   - Toast thông báo kết quả
 *   - Avatar với chữ cái đầu + placeholder upload ảnh
 */
function Profile() {
  const navigate = useNavigate();
  const user = api.getUser();

  const [fields, setFields]       = useState(() => extractFields(user || {}));
  const [draft, setDraft]         = useState(fields);
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [errors, setErrors]       = useState({});
  const [toast, setToast]         = useState(null);
  const firstInputRef             = useRef(null);

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (!user) navigate('/login?redirect=/profile');
  }, [user, navigate]);

  // Auto-hide toast sau 3s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Focus vào input đầu tiên khi vào edit mode
  useEffect(() => {
    if (editing) firstInputRef.current?.focus();
  }, [editing]);

  const handleEdit = () => {
    setDraft(fields);
    setErrors({});
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(fields);
    setErrors({});
    setEditing(false);
  };

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setDraft((prev) => ({ ...prev, [name]: value }));
    // Xoá error của field đang nhập
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  }, []);

  const handleSave = async () => {
    const errs = validate(draft);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setSaving(true);
    const result = await api.updateProfile(draft);
    setSaving(false);

    if (result.success) {
      setFields(extractFields(result.user));
      setEditing(false);
      setToast({ type: 'success', message: result.message });
    } else {
      setToast({ type: 'error', message: result.message });
    }
  };

  if (!user) return null;

  const displayName = fields.name || user.email || 'Người dùng';
  const userInitial = displayName.trim().charAt(0).toUpperCase();
  const isAdmin = user.role === 'SHOP_ADMIN' || user.usr_role === 'SHOP_ADMIN';
  const genderLabel = GENDER_OPTIONS.find((g) => g.value === fields.gender)?.label || '—';

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* ── Breadcrumb / Back ── */}
        <div className={styles.nav}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
            <FiArrowLeft size={15} />
            Quay lại
          </button>
          <span className={styles.breadcrumb}>
            <Link to="/account">Tài khoản</Link>
            <span className={styles.sep}>/</span>
            Hồ sơ cá nhân
          </span>
        </div>

        <div className={styles.layout}>

          {/* ── CỘT TRÁI: Avatar card ── */}
          <aside className={styles.sidebar}>
            <div className={styles.avatarCard}>
              {/* Avatar */}
              <div className={styles.avatarWrap}>
                <div className={styles.avatar}>
                  <span className={styles.avatarInitial}>{userInitial}</span>
                </div>
                {/* Placeholder upload ảnh */}
                <button
                  type="button"
                  className={styles.avatarUpload}
                  aria-label="Thay đổi ảnh đại diện"
                  title="Thay đổi ảnh (chức năng sắp ra mắt)"
                >
                  <FiCamera size={14} />
                </button>
              </div>

              <h2 className={styles.avatarName}>{displayName}</h2>
              {user.email && <p className={styles.avatarEmail}>{user.email}</p>}

              <span className={`${styles.roleBadge} ${isAdmin ? styles.roleBadgeAdmin : ''}`}>
                {isAdmin ? '👑 Shop Admin' : '🛍️ Khách hàng'}
              </span>

              {/* Thông tin tóm tắt */}
              <div className={styles.sidebarMeta}>
                {fields.phone && (
                  <div className={styles.metaRow}>
                    <FiPhone size={13} />
                    <span>{fields.phone}</span>
                  </div>
                )}
                {fields.gender && (
                  <div className={styles.metaRow}>
                    <FiUser size={13} />
                    <span>{genderLabel}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security hint */}
            <div className={styles.securityCard}>
              <FiShield size={16} className={styles.securityIcon} />
              <p className={styles.securityText}>
                Thông tin cá nhân được mã hóa và bảo vệ theo tiêu chuẩn bảo mật.
              </p>
            </div>
          </aside>

          {/* ── CỘT PHẢI: Form ── */}
          <main className={styles.main}>
            <div className={styles.formCard}>
              {/* Header */}
              <div className={styles.formHeader}>
                <div>
                  <h1 className={styles.formTitle}>Hồ sơ cá nhân</h1>
                  <p className={styles.formSub}>
                    {editing
                      ? 'Chỉnh sửa thông tin của bạn bên dưới'
                      : 'Quản lý thông tin cá nhân của bạn'}
                  </p>
                </div>

                {!editing ? (
                  <button type="button" className={styles.editBtn} onClick={handleEdit}>
                    <FiEdit2 size={14} />
                    Chỉnh sửa
                  </button>
                ) : (
                  <div className={styles.editActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={handleCancel}
                      disabled={saving}
                    >
                      <FiX size={14} />
                      Hủy
                    </button>
                    <button
                      type="button"
                      className={styles.saveBtn}
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className={styles.spinner} />
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <FiSave size={14} />
                          Lưu thay đổi
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className={styles.divider} />

              {/* Form fields */}
              <div className={styles.fields}>

                {/* Họ tên */}
                <div className={`${styles.fieldGroup} ${errors.name ? styles.fieldGroupError : ''}`}>
                  <label className={styles.label} htmlFor="prof-name">
                    <FiUser size={13} />
                    Họ và tên
                    <span className={styles.required}>*</span>
                  </label>
                  {editing ? (
                    <input
                      id="prof-name"
                      ref={firstInputRef}
                      type="text"
                      name="name"
                      value={draft.name}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="Nhập họ và tên"
                      autoComplete="name"
                    />
                  ) : (
                    <div className={styles.value}>{fields.name || <span className={styles.empty}>Chưa cập nhật</span>}</div>
                  )}
                  {errors.name && (
                    <span className={styles.error}>
                      <FiAlertCircle size={12} /> {errors.name}
                    </span>
                  )}
                </div>

                {/* Email – read only */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <FiMail size={13} />
                    Email
                  </label>
                  <div className={`${styles.value} ${styles.valueReadonly}`}>
                    {fields.email || <span className={styles.empty}>—</span>}
                    <span className={styles.readonlyTag}>Không thể thay đổi</span>
                  </div>
                </div>

                {/* Số điện thoại */}
                <div className={`${styles.fieldGroup} ${errors.phone ? styles.fieldGroupError : ''}`}>
                  <label className={styles.label} htmlFor="prof-phone">
                    <FiPhone size={13} />
                    Số điện thoại
                  </label>
                  {editing ? (
                    <input
                      id="prof-phone"
                      type="tel"
                      name="phone"
                      value={draft.phone}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="VD: 0901234567"
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  ) : (
                    <div className={styles.value}>{fields.phone || <span className={styles.empty}>Chưa cập nhật</span>}</div>
                  )}
                  {errors.phone && (
                    <span className={styles.error}>
                      <FiAlertCircle size={12} /> {errors.phone}
                    </span>
                  )}
                </div>

                {/* Ngày sinh */}
                <div className={`${styles.fieldGroup} ${errors.dob ? styles.fieldGroupError : ''}`}>
                  <label className={styles.label} htmlFor="prof-dob">
                    <FiCalendar size={13} />
                    Ngày sinh
                  </label>
                  {editing ? (
                    <input
                      id="prof-dob"
                      type="date"
                      name="dob"
                      value={draft.dob}
                      onChange={handleChange}
                      className={`${styles.input} ${styles.inputDate}`}
                      max={new Date().toISOString().split('T')[0]}
                    />
                  ) : (
                    <div className={styles.value}>
                      {fields.dob
                        ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(fields.dob))
                        : <span className={styles.empty}>Chưa cập nhật</span>
                      }
                    </div>
                  )}
                  {errors.dob && (
                    <span className={styles.error}>
                      <FiAlertCircle size={12} /> {errors.dob}
                    </span>
                  )}
                </div>

                {/* Giới tính */}
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>
                    <FiUser size={13} />
                    Giới tính
                  </label>
                  {editing ? (
                    <div className={styles.radioGroup}>
                      {GENDER_OPTIONS.map((opt) => (
                        <label key={opt.value} className={`${styles.radioLabel} ${draft.gender === opt.value ? styles.radioLabelActive : ''}`}>
                          <input
                            type="radio"
                            name="gender"
                            value={opt.value}
                            checked={draft.gender === opt.value}
                            onChange={handleChange}
                            className={styles.radioInput}
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.value}>{genderLabel !== '—' ? genderLabel : <span className={styles.empty}>Chưa cập nhật</span>}</div>
                  )}
                </div>

              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`} role="alert">
          {toast.type === 'error' ? <FiAlertCircle size={14} /> : <FiCheck size={14} />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default Profile;
