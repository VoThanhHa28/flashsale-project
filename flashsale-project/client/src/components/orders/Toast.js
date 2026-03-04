import { useEffect } from 'react';
import styles from './Toast.module.css';

/**
 * Toast Component
 * Hiển thị thông báo copy thành công
 */
function Toast({ message, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={styles.toast} role="alert" aria-live="polite">
      <span className={styles.icon}>✓</span>
      <span className={styles.message}>{message}</span>
    </div>
  );
}

export default Toast;
