import styles from './OrderSkeleton.module.css';

/**
 * OrderSkeleton Component
 * Loading skeleton cho OrderCard
 */
function OrderSkeleton() {
  return (
    <div className={styles.skeleton}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.codeLine} />
          <div className={styles.dateLine} />
        </div>
        <div className={styles.statusBadge} />
      </div>
      <div className={styles.body}>
        <div className={styles.items}>
          <div className={styles.item}>
            <div className={styles.itemImage} />
            <div className={styles.itemInfo}>
              <div className={styles.itemNameLine} />
              <div className={styles.itemPriceLine} />
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          <div className={styles.totalLine} />
          <div className={styles.actionLine} />
        </div>
      </div>
    </div>
  );
}

export default OrderSkeleton;
