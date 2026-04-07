import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { getFlashSaleStatus } from '../utils/flashSaleUtils';
import CountdownTimer from '../components/CountdownTimer';
import OrderResultModal from '../components/OrderResultModal';
import { useOrderResult } from '../hooks/useOrderResult';
import './ProductDetail.css';
import { useSocket } from '../contexts/SocketContext';
import { useCart } from '../contexts/CartContext';

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(price) + ' ₫';
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [flashSaleStatus, setFlashSaleStatus] = useState(null);
  const {
    orderResult,
    setOrderResult,
    orderResultMessage,
    setOrderResultMessage,
    orderSubmitting,
    setOrderSubmitting,
    orderError,
    setOrderError,
    orderSuccess,
    setOrderSuccess,
    resetOrderResult,
  } = useOrderResult();
  const { productStockUpdates, socket, connectionStatus, systemError } = useSocket();
  const { refreshCart } = useCart();
  const [addToCartLoading, setAddToCartLoading] = useState(false);
  const prevConnectionStatusRef = useRef(undefined);
  const successModalCloseRef = useRef(null);
  const errorModalCloseRef = useRef(null);
  const loginModalFirstRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        let found = await api.getProductById(id);
        if (found && !cancelled) {
          setProduct(found);
          const list = await api.getProductsList();
          if (!cancelled) {
            const related = list
              .filter((p) => String(p.product_id) !== String(id))
              .slice(0, 4);
            setRelatedProducts(related);
          }
          return;
        }
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

  // 4b.4: Reset kết quả đơn hàng khi đổi sản phẩm hoặc vào lại trang
  useEffect(() => {
    resetOrderResult();
  }, [id, resetOrderResult]);

  // 5.3 Accessibility: focus vào nút đầu tiên khi mở modal
  useEffect(() => {
    if (orderResult === 'success') successModalCloseRef.current?.focus();
  }, [orderResult]);
  useEffect(() => {
    if (orderResult === 'error') errorModalCloseRef.current?.focus();
  }, [orderResult]);
  useEffect(() => {
    if (showLoginModal) loginModalFirstRef.current?.focus();
  }, [showLoginModal]);

  // Update Flash Sale status mỗi giây
  useEffect(() => {
    if (!product) return;

    function updateStatus() {
      const status = getFlashSaleStatus(
        product.product_start_time,
        product.product_end_time
      );
      setFlashSaleStatus(status);
    }

    updateStatus();
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, [product]);

  // Update product quantity từ Socket real-time
  useEffect(() => {
    if (!product || !productStockUpdates) return;

    const updatedQuantity = productStockUpdates.get(String(product.product_id));
    if (updatedQuantity !== undefined) {
      setProduct(prev => ({
        ...prev,
        product_quantity: updatedQuantity,
      }));
    }
  }, [product?.product_id, productStockUpdates]);

  // Case 2: Khi kết nối lại thành công → refetch product để lấy stock mới nhất
  useEffect(() => {
    if (!id) return;
    if (connectionStatus !== 'connected') {
      prevConnectionStatusRef.current = connectionStatus;
      return;
    }
    const prev = prevConnectionStatusRef.current;
    prevConnectionStatusRef.current = connectionStatus;
    if (prev === 'disconnected' || prev === 'reconnecting') {
      api.getProductById(id).then((updated) => {
        if (updated) setProduct(updated);
      });
    }
  }, [connectionStatus, id]);

  // Lắng nghe flash-sale-start event để reload nút MUA
  useEffect(() => {
    if (!product || !socket) return;

    const handleFlashSaleStart = (data) => {
      // Nếu event có productId và match với product hiện tại, reload product
      if (data?.productId && String(data.productId) === String(product.product_id)) {
        // Reload product để lấy start_time mới
        api.getProductById(product.product_id).then((updated) => {
          if (updated) {
            setProduct(updated);
          }
        });
      }
    };

    const unsubscribe = socket.on('flash-sale-start', handleFlashSaleStart);

    return () => {
      unsubscribe();
    };
  }, [product?.product_id, socket]);

  const handleBuyNow = async () => {
    setOrderError('');
    setOrderSuccess('');
    setOrderResult(null);
    setOrderResultMessage('');

    const token = api.getToken();
    if (!token) {
      setShowLoginModal(true);
      return;
    }

    const qty = Math.max(1, Math.floor(Number(quantity)) || 1);
    setOrderSubmitting(true);
    flushSync(() => {}); // Ép React vẽ overlay trước khi gọi API
    try {
      if (api.isApiConfigured()) {
        const price = product.product_price ?? product.productPrice ?? 0;
        const result = await api.createOrder(product.product_id, qty, price);
        const msg = result?.message || 'Đơn hàng đang được xử lý.';
        setOrderSuccess(msg);
        setOrderResult('success');
        setOrderResultMessage(msg);
        // Giữ overlay ít nhất 800ms để user thấy "Đơn hàng đang được xử lý…"
        await new Promise((r) => setTimeout(r, 800));
        return;
      }
      const msg = 'Đơn hàng đang được xử lý. (Chưa kết nối API)';
      setOrderSuccess(msg);
      setOrderResult('success');
      setOrderResultMessage(msg);
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      const msg = err.message || 'Đặt hàng thất bại. Vui lòng thử lại.';
      setOrderError(msg);
      setOrderResult('error');
      setOrderResultMessage(msg);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleAddToCart = async () => {
    setOrderError('');
    setOrderSuccess('');
    const token = api.getToken();
    if (!token) {
      setShowLoginModal(true);
      return;
    }
    if (!api.isApiConfigured()) {
      setOrderError('Chưa cấu hình API.');
      return;
    }
    const qty = Math.max(1, Math.floor(Number(quantity)) || 1);
    setAddToCartLoading(true);
    try {
      await api.addCartItem(product.product_id, qty);
      await refreshCart();
      setOrderSuccess('Đã thêm vào giỏ hàng.');
      navigate('/cart');
    } catch (err) {
      setOrderError(err.message || 'Không thể thêm vào giỏ hàng.');
    } finally {
      setAddToCartLoading(false);
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

  const maxQty = product.product_quantity != null ? Math.max(1, product.product_quantity) : 99;

  // Case 1: Mất kết nối → khóa nút Mua. Case 3: system-error → bảo trì
  const isConnected = connectionStatus === 'connected';
  const maintenanceMode = Boolean(systemError?.message);

  // Tính toán trạng thái nút Mua
  const isSoldOut = product.product_quantity != null && product.product_quantity <= 0;
  const canBuy = flashSaleStatus?.canBuy && !isSoldOut && !orderSubmitting && isConnected && !maintenanceMode;

  // Text và disabled state cho nút Mua
  let buyButtonText = 'MUA NGAY';
  let buyButtonDisabled = !canBuy;

  if (maintenanceMode) {
    buyButtonText = systemError?.message || 'Hệ thống đang bảo trì';
    buyButtonDisabled = true;
  } else if (!isConnected) {
    buyButtonText = 'Mất kết nối – vui lòng chờ';
    buyButtonDisabled = true;
  } else if (orderSubmitting) {
    buyButtonText = 'Đang xử lý...';
  } else if (isSoldOut) {
    buyButtonText = 'SOLD OUT';
  } else if (flashSaleStatus?.status === 'before-start') {
    buyButtonText = 'Chưa đến giờ mở bán';
  } else if (flashSaleStatus?.status === 'ended') {
    buyButtonText = 'Đã kết thúc';
  }

  const flashSaleActive = flashSaleStatus?.status === 'active';
  const showAddToCart =
    flashSaleStatus != null &&
    !flashSaleActive &&
    !isSoldOut &&
    isConnected &&
    !maintenanceMode &&
    api.isApiConfigured() &&
    !addToCartLoading &&
    !orderSubmitting;

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
                <span
                  className={`product-detail-stock-badge ${
                    product.product_quantity <= 5 ? 'product-detail-stock-badge--low' : ''
                  }`}
                  role="status"
                >
                  {product.product_quantity <= 5 && <span className="product-detail-stock-badge-icon" aria-hidden>🔥</span>}
                  Còn {product.product_quantity} sản phẩm
                </span>
              )}
            </div>
            {product.product_description && (
              <p className="product-detail-desc">{product.product_description}</p>
            )}

            {/* Flash Sale: countdown nổi bật + copy gấp/khan hiếm */}
            {(flashSaleStatus?.status === 'before-start' || flashSaleStatus?.status === 'active') && (
              <div className="product-detail-flash-block">
                <span className="product-detail-flash-badge">FLASH SALE</span>
                {flashSaleStatus?.status === 'before-start' && product.product_start_time && (
                  <CountdownTimer
                    targetTime={product.product_start_time}
                    label="Sắp mở bán"
                  />
                )}
                {flashSaleStatus?.status === 'active' && product.product_end_time && (
                  <>
                    <CountdownTimer
                      targetTime={product.product_end_time}
                      label="Kết thúc sau"
                    />
                    {product.product_quantity != null && product.product_quantity <= 0 ? (
                      <p className="product-detail-flash-cta product-detail-flash-cta--soldout">Đã hết hàng.</p>
                    ) : (
                      <p className="product-detail-flash-cta">Số lượng có hạn – Đặt hàng sớm để tránh hết hàng.</p>
                    )}
                  </>
                )}
              </div>
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
                  disabled={buyButtonDisabled}
                />
              </div>
              {orderError && <p className="product-detail-order-error">{orderError}</p>}
              {orderSuccess && <p className="product-detail-order-success">{orderSuccess}</p>}
              {/* 5.1 Gợi ý khi nút Mua bị khóa */}
              {buyButtonDisabled && buyButtonText !== 'MUA NGAY' && (
                <p className="product-detail-buy-hint" role="status">
                  {buyButtonText}
                </p>
              )}
              <div className="product-detail-cta-row">
                {showAddToCart && (
                  <button
                    type="button"
                    className="product-detail-add-cart"
                    onClick={handleAddToCart}
                    disabled={addToCartLoading}
                    aria-label="Thêm sản phẩm vào giỏ hàng"
                  >
                    {addToCartLoading && (
                      <span className="product-detail-buy-spinner product-detail-add-cart-spinner" aria-hidden="true" />
                    )}
                    {addToCartLoading ? 'Đang thêm…' : 'Thêm vào giỏ'}
                  </button>
                )}
                <button
                  type="button"
                  className={`product-detail-buy ${buyButtonDisabled ? 'product-detail-buy--disabled' : ''}`}
                  onClick={handleBuyNow}
                  disabled={buyButtonDisabled}
                  aria-label={buyButtonDisabled ? `${buyButtonText}. Nút tạm khóa.` : 'Mua ngay sản phẩm này'}
                >
                  {orderSubmitting && <span className="product-detail-buy-spinner" aria-hidden="true" />}
                  {buyButtonText}
                </button>
              </div>
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

      {/* 4a.3 Overlay Loading/Queue khi đang gửi đơn */}
      {orderSubmitting && (
        <div
          className="product-detail-order-overlay"
          role="status"
          aria-live="polite"
          aria-label="Đơn hàng đang được xử lý"
        >
          <div className="product-detail-order-overlay-box">
            <div className="product-detail-order-overlay-spinner" aria-hidden="true" />
            <p className="product-detail-order-overlay-text">Đơn hàng đang được xử lý…</p>
            <p className="product-detail-order-overlay-hint">Vui lòng chờ, không đóng trang.</p>
          </div>
        </div>
      )}

      {/* 4b.2 Modal kết quả thành công */}
      {orderResult === 'success' && (
        <OrderResultModal
          variant="success"
          title="Đặt hàng thành công"
          message={orderResultMessage}
          titleId="order-result-success-title"
          descId="order-result-success-desc"
          closeButtonRef={successModalCloseRef}
          onClose={resetOrderResult}
          onPrimary={() => navigate('/')}
          onSecondary={() => navigate('/account')}
          primaryLabel="Về trang chủ"
          secondaryLabel="Xem đơn hàng"
        />
      )}

      {/* 4b.3 Modal kết quả thất bại */}
      {orderResult === 'error' && (
        <OrderResultModal
          variant="error"
          title="Đặt hàng thất bại"
          message={orderResultMessage}
          titleId="order-result-error-title"
          descId="order-result-error-desc"
          closeButtonRef={errorModalCloseRef}
          onClose={resetOrderResult}
          onPrimary={resetOrderResult}
          onSecondary={() => {
            resetOrderResult();
            navigate('/');
          }}
          primaryLabel="Thử lại"
          secondaryLabel="Quay lại"
        />
      )}

      {/* 4a.2 Modal đăng nhập khi bấm Mua Ngay chưa login */}
      {showLoginModal && (
        <div
          className="product-detail-login-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          aria-describedby="login-modal-desc"
        >
          <div className="product-detail-login-modal">
            <h2 id="login-modal-title" className="product-detail-login-modal-title">
              Vui lòng đăng nhập để đặt hàng
            </h2>
            <p id="login-modal-desc" className="product-detail-login-modal-text">
              Bạn cần đăng nhập để thực hiện mua sản phẩm này.
            </p>
            <div className="product-detail-login-modal-actions">
              <button
                ref={loginModalFirstRef}
                type="button"
                className="product-detail-login-modal-btn product-detail-login-modal-btn--primary"
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/product/${id}`)}`, { replace: false })}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className="product-detail-login-modal-btn product-detail-login-modal-btn--secondary"
                onClick={() => setShowLoginModal(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductDetail;