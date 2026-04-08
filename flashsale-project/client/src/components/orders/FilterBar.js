import { useMemo } from 'react';
import { FiSearch, FiX } from 'react-icons/fi';
import styles from './FilterBar.module.css';

/**
 * FilterBar Component
 * Filter và sort cho danh sách đơn hàng.
 * Layout: hàng 1 = status tab chips, hàng 2 = search + sort + date range
 */
function FilterBar({ filters, onFilterChange, onReset }) {
  const statusOptions = [
    { value: 'all', label: 'Tất cả' },
    { value: 'pending_payment', label: 'Chờ thanh toán' },
    { value: 'pending_confirm', label: 'Đang chuẩn bị' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'shipping', label: 'Đang giao' },
    { value: 'completed', label: 'Hoàn tất' },
    { value: 'cancelled', label: 'Đã hủy' },
    { value: 'refunded', label: 'Hoàn tiền' },
  ];

  const sortOptions = [
    { value: 'newest', label: 'Mới nhất' },
    { value: 'oldest', label: 'Cũ nhất' },
    { value: 'amount_high', label: 'Giá trị cao' },
    { value: 'amount_low', label: 'Giá trị thấp' },
  ];

  const quickDateOptions = [
    { label: '7 ngày', days: 7 },
    { label: '30 ngày', days: 30 },
    { label: '3 tháng', days: 90 },
  ];

  const hasActiveFilters = useMemo(() => {
    return (
      filters.search ||
      filters.status !== 'all' ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.sort !== 'newest'
    );
  }, [filters]);

  const handleQuickDate = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    onFilterChange({
      ...filters,
      dateFrom: from.toISOString().split('T')[0],
      dateTo: to.toISOString().split('T')[0],
    });
  };

  return (
    <div className={styles.filterBar}>
      {/* Hàng 1: Status tab chips – scrollable ngang trên mobile */}
      <div className={styles.statusTabs} role="tablist" aria-label="Lọc theo trạng thái">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={filters.status === opt.value}
            className={`${styles.statusTab} ${
              filters.status === opt.value ? styles.statusTabActive : ''
            }`}
            onClick={() => onFilterChange({ ...filters, status: opt.value })}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Hàng 2: Search + Sort + Date range */}
      <div className={styles.controlsRow}>
        {/* Search với icon và nút clear */}
        <div className={styles.searchWrapper}>
          <FiSearch className={styles.searchIcon} size={15} aria-hidden="true" />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm theo mã đơn hoặc tên sản phẩm..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            aria-label="Tìm kiếm đơn hàng"
          />
          {filters.search && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => onFilterChange({ ...filters, search: '' })}
              aria-label="Xóa tìm kiếm"
            >
              <FiX size={12} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className={styles.selectWrapper}>
          <label htmlFor="sort-filter" className={styles.label}>
            Sắp xếp
          </label>
          <select
            id="sort-filter"
            className={styles.select}
            value={filters.sort || 'newest'}
            onChange={(e) => onFilterChange({ ...filters, sort: e.target.value })}
            aria-label="Sắp xếp đơn hàng"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div className={styles.dateWrapper}>
          <label htmlFor="date-from" className={styles.label}>
            Từ ngày
          </label>
          <input
            id="date-from"
            type="date"
            className={styles.dateInput}
            value={filters.dateFrom || ''}
            onChange={(e) => onFilterChange({ ...filters, dateFrom: e.target.value })}
            aria-label="Chọn ngày bắt đầu"
          />
        </div>

        {/* Date to */}
        <div className={styles.dateWrapper}>
          <label htmlFor="date-to" className={styles.label}>
            Đến ngày
          </label>
          <input
            id="date-to"
            type="date"
            className={styles.dateInput}
            value={filters.dateTo || ''}
            onChange={(e) => onFilterChange({ ...filters, dateTo: e.target.value })}
            aria-label="Chọn ngày kết thúc"
          />
        </div>

        {/* Quick date chips */}
        <div className={styles.quickDates}>
          {quickDateOptions.map((opt) => (
            <button
              key={opt.days}
              type="button"
              className={styles.quickChip}
              onClick={() => handleQuickDate(opt.days)}
              aria-label={`Lọc đơn hàng ${opt.label} qua`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Reset – chỉ hiện khi có filter đang active */}
        {hasActiveFilters && (
          <button
            type="button"
            className={styles.resetBtn}
            onClick={onReset}
            aria-label="Reset tất cả bộ lọc"
          >
            <FiX size={13} />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

export default FilterBar;
