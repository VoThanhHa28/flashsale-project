import { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLock, FiCheck, FiAlertCircle } from 'react-icons/fi';
import * as api from '../services/api';
import styles from './ChangePassword.module.css';

/**
 * Trang Đổi mật khẩu – /change-password
 *
 * Form: mật khẩu hiện tại, mật khẩu mới, xác nhận mật khẩu mới.
 * Gọi api.changePassword(oldPassword, newPassword).
 */
function ChangePassword() {
  const navigate = useNavigate();
  const user = api.getUser();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user) navigate('/login?redirect=/change-password');
  }, [user, navigate]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const validate = useCallback(() => {
    if (!oldPassword.trim()) {
      setError('Vui lòng nhập mật khẩu hiện tại.');
      return false;
    }
    if (!newPassword.trim()) {
      setError('Vui lòng nhập mật khẩu mới.');
      return false;
    }
    if (newPassword.length < 6 || newPassword.length > 100) {
      setError('Mật khẩu mới phải từ 6 đến 100 ký tự.');
      return false;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu mới và xác nhận không trùng khớp.');
      return false;
    }
    if (oldPassword === newPassword) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return false;
    }
    setError('');
    return true;
  }, [oldPassword, newPassword, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');
    try {
      const result = await api.changePassword(oldPassword, newPassword);
      if (result.success) {
        setToast({ type: 'success', message: result.message });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => navigate('/account'), 1500);
      } else {
        setError(result.message || 'Không thể đổi mật khẩu.');
      }
    } catch (err) {
      setError(err?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.nav}>
          <button type="button" className={styles.backBtn} onClick={() => navigate(-1)}>
            <FiArrowLeft size={15} />
            Quay lại
          </button>
          <span className={styles.breadcrumb}>
            <Link to="/account">Tài khoản</Link>
            <span className={styles.sep}>/</span>
            Đổi mật khẩu
          </span>
        </div>

        <div className={styles.card}>
          <h1 className={styles.title}>Đổi mật khẩu</h1>
          <p className={styles.subtitle}>Nhập mật khẩu hiện tại và mật khẩu mới để bảo mật tài khoản.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <div className={styles.errorBox} role="alert">
                <FiAlertCircle size={16} />
                {error}
              </div>
            )}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="old-password">
                <FiLock size={14} />
                Mật khẩu hiện tại
                <span className={styles.required}>*</span>
              </label>
              <input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className={styles.input}
                placeholder="Nhập mật khẩu hiện tại"
                autoComplete="current-password"
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-password">
                <FiLock size={14} />
                Mật khẩu mới
                <span className={styles.required}>*</span>
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={styles.input}
                placeholder="6–100 ký tự"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirm-password">
                <FiLock size={14} />
                Xác nhận mật khẩu mới
                <span className={styles.required}>*</span>
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.input}
                placeholder="Nhập lại mật khẩu mới"
                autoComplete="new-password"
                disabled={loading}
              />
            </div>

            <div className={styles.actions}>
              <Link to="/account" className={styles.cancelLink}>Hủy</Link>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? (
                  <>
                    <span className={styles.spinner} />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <FiCheck size={14} />
                    Đổi mật khẩu
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`} role="alert">
          <FiCheck size={14} />
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default ChangePassword;
