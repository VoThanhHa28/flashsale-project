import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
import { useSocket } from '../contexts/SocketContext';
import BannerCarousel from '../components/BannerCarousel';
import SidebarLeft from '../components/SidebarLeft';
import SidebarRight from '../components/SidebarRight';
import PromoTiles from '../components/PromoTiles';
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
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { productStockUpdates } = useSocket();

  useEffect(() => {
    let cancelled = false;
    
    async function load() {
      try {
        const list = await api.getProductsList();
        if (!cancelled) {
          setProducts(list);
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
  }, []);

  // Update products quantity từ Socket real-time
  useEffect(() => {
    if (!productStockUpdates || productStockUpdates.size === 0) return;

    setProducts(prev => prev.map(p => {
      const updatedQuantity = productStockUpdates.get(String(p.product_id));
      if (updatedQuantity !== undefined) {
        return { ...p, product_quantity: updatedQuantity };
      }
      return p;
    }));
  }, [productStockUpdates]);

  if (loading) {
    return (
      <div className="home home--full">
        <h1 className="home-title">Danh sách sản phẩm</h1>
        <p className="home-loading">Đang tải...</p>
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
            <SidebarLeft />
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
          <h2 className="home-section-title">Sản phẩm nổi bật</h2>
          {products.length === 0 ? (
            <div className="home-empty">
              <p className="home-empty-message">
                Hiện chưa có sản phẩm nào trong hệ thống.
              </p>
              {api.isApiConfigured() && (
                <p className="home-empty-hint">
                  💡 Vui lòng chạy lệnh <code>npm run seed:products</code> để thêm dữ liệu sản phẩm vào database.
                </p>
              )}
            </div>
          ) : (
            <div className="home-grid">
              {products.map((p, index) => {
                const stockBadge = getStockBadge(p.product_quantity);
                return (
                  <Link
                    key={p.product_id}
                    to={`/product/${p.product_id}`}
                    className="home-card"
                  >
                    <div className="home-card-image-wrap">
                      {index < 2 && <span className="home-card-badge">Hot</span>}
                      {stockBadge && (
                        <span className="home-card-badge home-card-badge--stock">
                          {stockBadge}
                        </span>
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