/**
 * HomeProductSkeleton - Skeleton loading placeholder cho product cards.
 * Hiển thị animated shimmer cards khi đang fetch danh sách sản phẩm,
 * thay thế text "Đang tải..." để tránh layout shift và cải thiện UX.
 */
import styles from './HomeProductSkeleton.module.css';

function HomeProductSkeleton({ count = 8 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={styles.card}
          aria-hidden="true"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          {/* Skeleton image area */}
          <div className={styles.image} />

          {/* Skeleton text lines */}
          <div className={styles.body}>
            <div className={styles.line} />
            <div className={`${styles.line} ${styles.lineShort}`} />
          </div>
        </div>
      ))}
    </>
  );
}

export default HomeProductSkeleton;
