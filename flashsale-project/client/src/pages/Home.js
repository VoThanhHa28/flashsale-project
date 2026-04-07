import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiZap, FiClock, FiLayers } from 'react-icons/fi';
import * as api from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import { getFlashSaleStatus } from '../utils/flashSaleUtils';
import BannerCarousel from '../components/BannerCarousel';
import SidebarLeft from '../components/SidebarLeft';
import SidebarRight from '../components/SidebarRight';
import PromoTiles from '../components/PromoTiles';
import HomeProductSkeleton from '../components/HomeProductSkeleton';
import './Home.css';

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price) + ' ₫';
}

/**
 * Trả về text badge theo số lượng còn (cho Flash Sale).
 * quantity undefined/null → không hiện badge.
 * 0 → "Hết hàng", 1-9 → "Còn X", 10-19 → "Sắp hết", >= 20 → null (không badge).
 */
function getStockBadge(quantity) {
  if (quantity == null || typeof quantity !== 'number') return null;
  if (quantity === 0) return 'Hết hàng';
  if (quantity < 10) return `Còn ${quantity}`;
  if (quantity < 20) return 'Sắp hết';
  return null;
}

function Home() {
  const [allProducts, setAllProducts] = useState([]);
  const [apiCategories, setApiCategories] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { productStockUpdates } = useSocket();

  const loadData = useCallback(async () => {
    const [list, catRes] = await Promise.all([
      api.getProductsList(),
      api.getCategories(),
    ]);
    return { list, catRes };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { list, catRes } = await loadData();
        if (!cancelled) {
          setAllProducts(list);
          if (catRes.success && Array.isArray(catRes.categories) && catRes.categories.length > 0) {
            setApiCategories(catRes.categories);
          } else {
            setApiCategories([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Không tải được danh sách sản phẩm.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [loadData]);

  // Update products quantity từ Socket real-time
  useEffect(() => {
    if (!productStockUpdates || productStockUpdates.size === 0) return;

    setAllProducts((prev) =>
      prev.map((p) => {
        const updatedQuantity = productStockUpdates.get(String(p.product_id));
        if (updatedQuantity !== undefined) {
          return { ...p, product_quantity: updatedQuantity };
        }
        return p;
      })
    );
  }, [productStockUpdates]);

  /** Chip danh mục: ưu tiên API; không có thì gom từ product_category */
  const categoryChips = useMemo(() => {
    if (apiCategories.length > 0) {
      return [...apiCategories].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || String(a.categoryName).localeCompare(String(b.categoryName), 'vi')
      );
    }
    const seen = new Map();
    allProducts.forEach((p) => {
      const n = String(p.product_category || '').trim();
      if (n) seen.set(n, { _id: n, categoryName: n });
    });
    return Array.from(seen.values()).sort((a, b) =>
      String(a.categoryName).localeCompare(String(b.categoryName), 'vi')
    );
  }, [apiCategories, allProducts]);

  const products = useMemo(() => {
    if (!categoryFilter) return allProducts;
    return allProducts.filter(
      (p) => String(p.product_category || '').trim() === categoryFilter
    );
  }, [allProducts, categoryFilter]);

  // Tính xem có Flash Sale đang diễn ra hay không (chỉ cho UI section header)
  const hasActiveFlashSale = useMemo(
    () => products.some(p => getFlashSaleStatus(p.product_start_time, p.product_end_time).status === 'active'),
    [products]
  );

  // Loading state: hiển thị banner + skeleton grid thay vì text "Đang tải..."
  if (loading) {
    return (
      <div className="home">
        <section className="home-top">
          <div className="home-top-inner">
            <div className="home-sidebar-left"><SidebarLeft categories={apiCategories} /></div>
            <div className="home-center"><BannerCarousel /><PromoTiles /></div>
            <div className="home-sidebar-right"><SidebarRight /></div>
          </div>
        </section>
        <section className="home-products">
          <div className="home-products-inner">
            <div className="home-section-header">
              <div className="home-section-title-group">
                <FiZap className="home-section-title-icon" aria-hidden="true" />
                <h2 className="home-section-title">Sản phẩm nổi bật</h2>
              </div>
            </div>
            {/* Skeleton cards thay vì "Đang tải..." */}
            <div className="home-grid">
              <HomeProductSkeleton count={8} />
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home home--full">
        <h1 className="home-title">Danh sách sản phẩm</h1>
        <p className="home-error">{error}</p>
      </div>
    );
  }

  return (
    <div className="home">
      <section className="home-top">
        <div className="home-top-inner">
          <div className="home-sidebar-left">
            <SidebarLeft categories={apiCategories} />
          </div>
          <div className="home-center">
            <BannerCarousel />
            <PromoTiles />
          </div>
          <div className="home-sidebar-right">
            <SidebarRight />
          </div>
        </div>
      </section>
      <section className="home-products">
        <div className="home-products-inner">
          {/* Section header với Flash Sale branding */}
          <div className="home-section-header">
            <div className="home-section-title-group">
              <FiZap className="home-section-title-icon" aria-hidden="true" />
              <h2 className="home-section-title">
                {hasActiveFlashSale ? 'Flash Sale Đang Diễn Ra' : 'Sản phẩm nổi bật'}
              </h2>
              {/* Live badge khi có flash sale đang diễn ra */}
              {hasActiveFlashSale && (
                <span className="home-section-live-badge" aria-label="Đang diễn ra">
                  <span className="home-section-live-dot" aria-hidden="true" />
                  LIVE
                </span>
              )}
            </div>
            {products.length > 0 && (
              <span className="home-section-count">{products.length} sản phẩm</span>
            )}
          </div>

          {products.length === 0 ? (
            <div className="home-empty">
              <p className="home-empty-message">
                {allProducts.length === 0
                  ? 'Hiện chưa có sản phẩm nào trong hệ thống.'
                  : categoryFilter
                    ? `Không có sản phẩm nào trong danh mục «${categoryFilter}».`
                    : 'Không có sản phẩm hiển thị.'}
              </p>
              {allProducts.length === 0 && api.isApiConfigured() && (
                <p className="home-empty-hint">
                  💡 Vui lòng chạy lệnh <code>npm run seed:products</code> để thêm dữ liệu sản phẩm vào database.
                </p>
              )}
            </div>
          ) : (
            <div className="home-grid">
              {products.map((p, index) => {
                const stockBadge = getStockBadge(p.product_quantity);
                // Tính flash sale status cho từng sản phẩm (chỉ dùng cho UI badge)
                const saleStatus = getFlashSaleStatus(p.product_start_time, p.product_end_time);
                const isFlashActive = saleStatus.status === 'active';
                const isFlashUpcoming = saleStatus.status === 'before-start';

                return (
                  <Link
                    key={p.product_id}
                    to={`/product/${p.product_id}`}
                    className={`home-card${isFlashActive ? ' home-card--flash-active' : ''}`}
                    style={{ animationDelay: `${Math.min(index, 9) * 55}ms` }}
                  >
                    <div className="home-card-image-wrap">
                      {/* Badge ưu tiên: Flash > Hot */}
                      {isFlashActive ? (
                        <span className="home-card-badge home-card-badge--flash">
                          ⚡ SALE
                        </span>
                      ) : isFlashUpcoming ? (
                        <span className="home-card-badge home-card-badge--upcoming">
                          <FiClock size={10} /> SẮP MỞ
                        </span>
                      ) : (
                        index < 2 && <span className="home-card-badge">Hot</span>
                      )}

                      {/* Stock badge - góc phải */}
                      {stockBadge && (
                        <span className="home-card-badge home-card-badge--stock">
                          {stockBadge}
                        </span>
                      )}

                      {/* Shimmer overlay khi flash sale đang diễn ra */}
                      {isFlashActive && (
                        <div className="home-card-flash-overlay" aria-hidden="true" />
                      )}

                      <img
                        src={p.product_thumb}
                        alt={p.product_name}
                        className="home-card-image"
                      />
                    </div>

                    <div className="home-card-body">
                      <h2 className="home-card-name">{p.product_name}</h2>
                      <p className="home-card-price">{formatPrice(p.product_price)}</p>

                      {/* Flash sale indicator tag dưới giá */}
                      {isFlashActive && (
                        <div className="home-card-sale-tag">
                          <span className="home-card-sale-dot" aria-hidden="true" />
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
        </div>
      </section>
    </div>
  );
}

export default Home;