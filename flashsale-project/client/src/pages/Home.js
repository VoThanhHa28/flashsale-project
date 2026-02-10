import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api';
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

function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const list = await api.getProductsList();
        if (!cancelled) setProducts(list);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không tải được danh sách sản phẩm.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

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
          <div className="home-grid">
            {products.map((p, index) => (
              <Link
                key={p.product_id}
                to={`/product/${p.product_id}`}
                className="home-card"
              >
                <div className="home-card-image-wrap">
                  {index < 2 && <span className="home-card-badge">Hot</span>}
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
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
