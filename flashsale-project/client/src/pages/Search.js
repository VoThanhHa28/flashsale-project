import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiSearch, FiSliders, FiTag, FiGrid } from 'react-icons/fi';
import * as api from '../services/api';
import { getFlashSaleStatus } from '../utils/flashSaleUtils';
import './Home.css';
import styles from './Search.module.css';

const CATEGORIES = [
  'Điện thoại',
  'Tai nghe',
  'Loa',
  'Phụ kiện',
  'Đồng hồ thông minh',
];

const BRANDS = [
  'Apple',
  'Samsung',
  'Xiaomi',
  'OPPO',
  'Google',
  'OnePlus',
  'Vivo',
  'Sony',
  'JBL',
  'Amazfit',
  'Realme',
  'Redmi',
  'Khác',
];

const PRICE_PRESETS = [
  { value: 'all', label: 'Tất cả', priceMin: null, priceMax: null },
  { value: 'under-1m', label: 'Dưới 1 tr', priceMin: null, priceMax: 1_000_000 },
  { value: '1m-5m', label: '1 – 5 tr', priceMin: 1_000_000, priceMax: 5_000_000 },
  { value: '5m-15m', label: '5 – 15 tr', priceMin: 5_000_000, priceMax: 15_000_000 },
  { value: 'over-15m', label: 'Trên 15 tr', priceMin: 15_000_000, priceMax: null },
];

function formatPrice(price) {
  if (price == null || price === '') return '';
  const n = Number(price);
  if (Number.isNaN(n)) return '';
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(n);
}

function getStockBadge(quantity) {
  if (quantity == null || typeof quantity !== 'number') return null;
  if (quantity === 0) return 'Hết hàng';
  if (quantity < 10) return `Còn ${quantity}`;
  if (quantity < 20) return 'Sắp hết';
  return null;
}

function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const keywordFromUrl = searchParams.get('keyword') || '';
  const categoriesFromUrl = searchParams.getAll('category').filter(Boolean);
  const brandsFromUrl = searchParams.getAll('brand').filter(Boolean);
  const priceMinFromUrl = searchParams.get('priceMin');
  const priceMaxFromUrl = searchParams.get('priceMax');

  const [keyword, setKeyword] = useState(keywordFromUrl);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customMin, setCustomMin] = useState(priceMinFromUrl || '');
  const [customMax, setCustomMax] = useState(priceMaxFromUrl || '');

  const priceMin =
    priceMinFromUrl !== null && priceMinFromUrl !== ''
      ? Number(priceMinFromUrl)
      : null;
  const priceMax =
    priceMaxFromUrl !== null && priceMaxFromUrl !== ''
      ? Number(priceMaxFromUrl)
      : null;

  const activePreset = PRICE_PRESETS.find(
    (p) =>
      (p.priceMin == null && priceMin == null) ||
      (p.priceMin === priceMin && p.priceMax === priceMax)
  );

  const categoriesKey = categoriesFromUrl.slice().sort().join(',');
  const brandsKey = brandsFromUrl.slice().sort().join(',');

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await api.getProductsList({
        keyword: keywordFromUrl || undefined,
        categories:
          categoriesFromUrl.length > 0 ? categoriesFromUrl : undefined,
        brands: brandsFromUrl.length > 0 ? brandsFromUrl : undefined,
        priceMin: priceMin ?? undefined,
        priceMax: priceMax ?? undefined,
      });
      setProducts(list);
    } catch (err) {
      setError(err.message || 'Không tải được kết quả.');
    } finally {
      setLoading(false);
    }
  }, [
    keywordFromUrl,
    categoriesKey,
    brandsKey,
    priceMin,
    priceMax,
  ]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    setKeyword(keywordFromUrl);
  }, [keywordFromUrl]);

  useEffect(() => {
    setCustomMin(priceMinFromUrl || '');
    setCustomMax(priceMaxFromUrl || '');
  }, [priceMinFromUrl, priceMaxFromUrl]);

  const updateParams = useCallback(
    (updates) => {
      const next = new URLSearchParams(searchParams);
      if (updates.keyword !== undefined) {
        if (updates.keyword) next.set('keyword', updates.keyword);
        else next.delete('keyword');
      }
      if (updates.categories !== undefined) {
        next.delete('category');
        updates.categories.forEach((c) => next.append('category', c));
      }
      if (updates.brands !== undefined) {
        next.delete('brand');
        updates.brands.forEach((b) => next.append('brand', b));
      }
      if (updates.priceMin !== undefined) {
        if (updates.priceMin !== '' && updates.priceMin != null)
          next.set('priceMin', String(updates.priceMin));
        else next.delete('priceMin');
      }
      if (updates.priceMax !== undefined) {
        if (updates.priceMax !== '' && updates.priceMax != null)
          next.set('priceMax', String(updates.priceMax));
        else next.delete('priceMax');
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleKeywordSubmit = (e) => {
    e.preventDefault();
    updateParams({ keyword: keyword.trim() });
  };

  const toggleCategory = (cat) => {
    const next = categoriesFromUrl.includes(cat)
      ? categoriesFromUrl.filter((c) => c !== cat)
      : [...categoriesFromUrl, cat];
    updateParams({ categories: next });
  };

  const toggleBrand = (brand) => {
    const next = brandsFromUrl.includes(brand)
      ? brandsFromUrl.filter((b) => b !== brand)
      : [...brandsFromUrl, brand];
    updateParams({ brands: next });
  };

  const handlePresetPrice = (preset) => {
    updateParams({
      priceMin: preset.priceMin ?? '',
      priceMax: preset.priceMax ?? '',
    });
  };

  const handleApplyCustomPrice = () => {
    const min = customMin.trim() ? customMin.replace(/\D/g, '') : '';
    const max = customMax.trim() ? customMax.replace(/\D/g, '') : '';
    updateParams({
      priceMin: min ? Number(min) : '',
      priceMax: max ? Number(max) : '',
    });
  };

  const hasActiveFilters =
    keywordFromUrl ||
    categoriesFromUrl.length > 0 ||
    brandsFromUrl.length > 0 ||
    priceMin != null ||
    priceMax != null;

  return (
    <div className={`${styles.page} search-page`}>
      <div className={styles.container}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Bộ lọc</h2>

          <form className={styles.filterBar} onSubmit={handleKeywordSubmit}>
            <div className={styles.searchRow}>
              <div className={styles.searchWrap}>
                <FiSearch
                  className={styles.searchIcon}
                  size={18}
                  aria-hidden="true"
                />
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Tên hoặc mô tả..."
                  aria-label="Từ khóa tìm kiếm"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <button type="submit" className={styles.submitBtn}>
                Tìm
              </button>
            </div>

            <div className={styles.filterSection}>
              <span className={styles.filterSectionLabel}>
                <FiGrid size={14} aria-hidden="true" />
                Danh mục
              </span>
              <div className={styles.chipGroup}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={
                      categoriesFromUrl.includes(cat)
                        ? styles.chipActive
                        : styles.chip
                    }
                    onClick={() => toggleCategory(cat)}
                    aria-pressed={categoriesFromUrl.includes(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <span className={styles.filterSectionLabel}>
                <FiTag size={14} aria-hidden="true" />
                Hãng
              </span>
              <div className={styles.chipGroup}>
                {BRANDS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    className={
                      brandsFromUrl.includes(b) ? styles.chipActive : styles.chip
                    }
                    onClick={() => toggleBrand(b)}
                    aria-pressed={brandsFromUrl.includes(b)}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterSection}>
              <span className={styles.filterSectionLabel}>
                <FiSliders size={14} aria-hidden="true" />
                Khoảng giá
              </span>
              <p className={styles.priceHint}>Chọn nhanh:</p>
              <div className={styles.chipGroup}>
                {PRICE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    className={
                      activePreset?.value === p.value
                        ? styles.chipActive
                        : styles.chip
                    }
                    onClick={() => handlePresetPrice(p)}
                    aria-pressed={activePreset?.value === p.value}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <p className={styles.priceHint}>Hoặc nhập khoảng (₫):</p>
              <div className={styles.priceInputRow}>
                <input
                  type="text"
                  className={styles.priceInput}
                  placeholder="Từ"
                  value={customMin}
                  onChange={(e) =>
                    setCustomMin(e.target.value.replace(/\D/g, ''))
                  }
                  aria-label="Giá tối thiểu"
                />
                <span className={styles.priceInputSep}>–</span>
                <input
                  type="text"
                  className={styles.priceInput}
                  placeholder="Đến"
                  value={customMax}
                  onChange={(e) =>
                    setCustomMax(e.target.value.replace(/\D/g, ''))
                  }
                  aria-label="Giá tối đa"
                />
              </div>
              <button
                type="button"
                className={styles.applyPriceBtn}
                onClick={handleApplyCustomPrice}
              >
                Áp dụng
              </button>
            </div>

            {hasActiveFilters && (
              <p className={styles.activeFilters}>
                Đang lọc
                {keywordFromUrl && ` · "${keywordFromUrl}"`}
                {categoriesFromUrl.length > 0 &&
                  ` · ${categoriesFromUrl.length} danh mục`}
                {brandsFromUrl.length > 0 && ` · ${brandsFromUrl.length} hãng`}
                {((priceMin != null && !Number.isNaN(priceMin)) ||
                  (priceMax != null && !Number.isNaN(priceMax))) && (
                  <span>
                    {' '}
                    · {formatPrice(priceMin) || '…'} –{' '}
                    {formatPrice(priceMax) || '…'} ₫
                  </span>
                )}
              </p>
            )}
          </form>
        </aside>

        <main className={styles.main}>
          <nav className={styles.breadcrumb}>
            <Link to="/">Trang chủ</Link>
            <span className={styles.breadcrumbSep}>/</span>
            <span>Tìm kiếm & Lọc</span>
          </nav>

          <h1 className={styles.title}>Tìm kiếm & Lọc sản phẩm</h1>

          {error && (
            <p className={styles.error}>{error}</p>
          )}

          {loading && products.length === 0 ? (
            <div className={styles.loading}>Đang tải...</div>
          ) : (
            <>
              <p className={styles.resultCount}>
                {loading ? (
                  <span className={styles.loadingInline}>Đang cập nhật… </span>
                ) : null}
                {products.length} kết quả
                {keywordFromUrl && ` cho "${keywordFromUrl}"`}
              </p>

              {loading && products.length > 0 ? (
                <div className={styles.gridLoadingWrap}>
                  <div className={styles.gridLoadingOverlay} aria-hidden="true" />
                  <div className="home-grid">
                    {products.map((p, index) => {
                      const stockBadge = getStockBadge(p.product_quantity);
                      const saleStatus = getFlashSaleStatus(
                        p.product_start_time,
                        p.product_end_time
                      );
                      const isFlashActive = saleStatus.status === 'active';
                      const isFlashUpcoming =
                        saleStatus.status === 'before-start';
                      return (
                        <Link
                          key={p.product_id}
                          to={`/product/${p.product_id}`}
                          className={`home-card${isFlashActive ? ' home-card--flash-active' : ''}`}
                          style={{ animationDelay: `${Math.min(index, 9) * 55}ms` }}
                        >
                          <div className="home-card-image-wrap">
                            {isFlashActive ? (
                              <span className="home-card-badge home-card-badge--flash">⚡ SALE</span>
                            ) : isFlashUpcoming ? (
                              <span className="home-card-badge home-card-badge--upcoming">SẮP MỞ</span>
                            ) : null}
                            {stockBadge && (
                              <span className="home-card-badge home-card-badge--stock">{stockBadge}</span>
                            )}
                            {isFlashActive && <div className="home-card-flash-overlay" aria-hidden="true" />}
                            <img src={p.product_thumb} alt={p.product_name} className="home-card-image" />
                          </div>
                          <div className="home-card-body">
                            <h2 className="home-card-name">{p.product_name}</h2>
                            <p className="home-card-price">
                              {(() => { const s = formatPrice(p.product_price); return s ? `${s} ₫` : '—'; })()}
                            </p>
                            {isFlashActive && (
                              <div className="home-card-sale-tag">
                                <span className="home-card-sale-dot" aria-hidden="true" />
                                Flash Sale đang diễn ra
                              </div>
                            )}
                            {isFlashUpcoming && <div className="home-card-upcoming-tag">Sắp mở bán</div>}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ) : products.length === 0 ? (
                <div className={styles.empty}>
                  <p>
                    Không tìm thấy sản phẩm nào phù hợp. Thử đổi từ khóa, danh
                    mục, hãng hoặc khoảng giá.
                  </p>
                </div>
              ) : (
                <div className="home-grid">
                  {products.map((p, index) => {
                    const stockBadge = getStockBadge(p.product_quantity);
                    const saleStatus = getFlashSaleStatus(
                      p.product_start_time,
                      p.product_end_time
                    );
                    const isFlashActive = saleStatus.status === 'active';
                    const isFlashUpcoming =
                      saleStatus.status === 'before-start';

                    return (
                      <Link
                        key={p.product_id}
                        to={`/product/${p.product_id}`}
                        className={`home-card${
                          isFlashActive ? ' home-card--flash-active' : ''
                        }`}
                        style={{
                          animationDelay: `${Math.min(index, 9) * 55}ms`,
                        }}
                      >
                        <div className="home-card-image-wrap">
                          {isFlashActive ? (
                            <span
                              className="home-card-badge home-card-badge--flash"
                            >
                              ⚡ SALE
                            </span>
                          ) : isFlashUpcoming ? (
                            <span
                              className="home-card-badge home-card-badge--upcoming"
                            >
                              SẮP MỞ
                            </span>
                          ) : null}
                          {stockBadge && (
                            <span
                              className="home-card-badge home-card-badge--stock"
                            >
                              {stockBadge}
                            </span>
                          )}
                          {isFlashActive && (
                            <div
                              className="home-card-flash-overlay"
                              aria-hidden="true"
                            />
                          )}
                          <img
                            src={p.product_thumb}
                            alt={p.product_name}
                            className="home-card-image"
                          />
                        </div>
                        <div className="home-card-body">
                          <h2 className="home-card-name">
                            {p.product_name}
                          </h2>
                          <p className="home-card-price">
                            {(() => {
                              const s = formatPrice(p.product_price);
                              return s ? `${s} ₫` : '—';
                            })()}
                          </p>
                          {isFlashActive && (
                            <div className="home-card-sale-tag">
                              <span
                                className="home-card-sale-dot"
                                aria-hidden="true"
                              />
                              Flash Sale đang diễn ra
                            </div>
                          )}
                          {isFlashUpcoming && (
                            <div className="home-card-upcoming-tag">
                              Sắp mở bán
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default Search;
