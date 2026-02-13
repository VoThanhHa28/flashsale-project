import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import * as api from '../services/api';
import './ProductDetail.css';

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price) + ' ₫';
}

function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Ưu tiên dùng API chi tiết sản phẩm
        let found = await api.getProductById(id);
        if (found && !cancelled) {
          setProduct(found);
          // Lấy danh sách để hiển thị sản phẩm liên quan
          const list = await api.getProductsList();
          if (!cancelled) {
            const related = list
              .filter((p) => String(p.product_id) !== String(id))
              .slice(0, 4);
            setRelatedProducts(related);
          }
          return;
        }
        // Fallback: dùng danh sách và tìm
        const list = await api.getProductsList();
        if (cancelled) return;
        found = list.find((p) => String(p.product_id) === String(id));
        setProduct(found || null);
        const related = list
          .filter((p) => String(p.product_id) !== String(id))
          .slice(0, 4);
        setRelatedProducts(related);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không tải được thông tin sản phẩm.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const handleBuyNow = async () => {
    setOrderError('');
    setOrderSuccess('');

    const token = api.getToken();
    if (!token) {
      setOrderError('Vui lòng đăng nhập để đặt hàng.');
      return;
    }

    const qty = Math.max(1, Math.floor(Number(quantity)) || 1);
    setOrderSubmitting(true);
    try {
      if (api.isApiConfigured()) {
        const price = product.product_price ?? product.productPrice ?? 0;
        await api.createOrder(product.product_id, qty, price);
        setOrderSuccess('Đơn hàng đang được xử lý.');
        return;
      }
      // DEV ONLY – remove when backend ready (m sẽ tự thêm lại sau khi t merge auth vào)
      setOrderSuccess('Đơn hàng đang được xử lý. (Chưa kết nối API)');
    } catch (err) {
      setOrderError(err.message || 'Đặt hàng thất bại. Vui lòng thử lại.');
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleQuantityChange = (e) => {
    const v = parseInt(e.target.value, 10);
    if (!Number.isNaN(v) && v >= 1) setQuantity(v);
  };

  if (loading) {
    return (
      <div className="product-detail product-detail--state">
        <p className="product-detail-loading">Đang tải...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="product-detail product-detail--state">
        <p className="product-detail-error">{error}</p>
        <Link to="/" className="product-detail-back">← Về trang chủ</Link>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail product-detail--state">
        <p className="product-detail-notfound">Không tìm thấy sản phẩm.</p>
        <Link to="/" className="product-detail-back">← Về trang chủ</Link>
      </div>
    );
  }

  const qty = Math.max(1, Math.floor(Number(quantity)) || 1);
  const maxQty = product.product_quantity != null ? Math.max(1, product.product_quantity) : 99;

  return (
    <div className="product-detail">
      <div className="product-detail-main">
        <nav className="product-detail-breadcrumb" aria-label="Breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span className="product-detail-breadcrumb-sep">/</span>
          <Link to="/">Sản phẩm</Link>
          <span className="product-detail-breadcrumb-sep">/</span>
          <span className="product-detail-breadcrumb-current">{product.product_name}</span>
        </nav>
        <div className="product-detail-grid">
          <div className="product-detail-image-wrap">
            <img
              src={product.product_thumb}
              alt={product.product_name}
              className="product-detail-image"
            />
          </div>
          <div className="product-detail-info">
            <h1 className="product-detail-name">{product.product_name}</h1>
            <div className="product-detail-price-block">
              <span className="product-detail-price">{formatPrice(product.product_price)}</span>
              {product.product_quantity != null && (
                <span className="product-detail-stock">Còn lại: {product.product_quantity} sản phẩm</span>
              )}
            </div>
            {product.product_description && (
              <p className="product-detail-desc">{product.product_description}</p>
            )}
            <div className="product-detail-actions">
              <div className="product-detail-quantity">
                <label htmlFor="product-quantity">Số lượng</label>
                <input
                  id="product-quantity"
                  type="number"
                  min={1}
                  max={maxQty}
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="product-detail-quantity-input"
                />
              </div>
              {orderError && <p className="product-detail-order-error">{orderError}</p>}
              {orderSuccess && <p className="product-detail-order-success">{orderSuccess}</p>}
              <button
                type="button"
                className="product-detail-buy"
                onClick={handleBuyNow}
                disabled={orderSubmitting}
              >
                {orderSubmitting ? 'Đang xử lý...' : 'MUA NGAY'}
              </button>
              <Link to="/" className="product-detail-back">← Quay lại danh sách</Link>
            </div>
          </div>
        </div>
      </div>
      {relatedProducts.length > 0 && (
        <section className="product-detail-related">
          <div className="product-detail-related-inner">
            <h2 className="product-detail-related-title">Sản phẩm liên quan</h2>
            <div className="product-detail-related-grid">
              {relatedProducts.map((p) => (
                <Link
                  key={p.product_id}
                  to={`/product/${p.product_id}`}
                  className="product-detail-related-card"
                >
                  <div className="product-detail-related-image-wrap">
                    <img src={p.product_thumb} alt={p.product_name} />
                  </div>
                  <div className="product-detail-related-body">
                    <p className="product-detail-related-name">{p.product_name}</p>
                    <p className="product-detail-related-price">{formatPrice(p.product_price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default ProductDetail;
