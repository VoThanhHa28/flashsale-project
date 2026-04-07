import { useState, useCallback, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiShoppingCart } from 'react-icons/fi';
import * as api from '../services/api';
import TopPromoStrip from './TopPromoStrip';
import Footer from './Footer';
import { useCart } from '../contexts/CartContext';
import './Layout.css';

/** Cấu hình animation cho page transitions */
const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
};

function formatPrice(price) {
  if (price == null || Number.isNaN(Number(price))) return '';
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(Number(price)) + ' ₫';
}

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useCart();
  const user = api.getUser();
  const token = api.getToken();
  const isLoggedIn = Boolean(token || user);

  /** State cho search input */
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [hasInteractedWithSearch, setHasInteractedWithSearch] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  /** Khi vào /search?keyword=xxx thì sync ô search với URL */
  useEffect(() => {
    if (location.pathname === '/search') {
      const params = new URLSearchParams(location.search);
      const q = params.get('keyword') || '';
      setSearchValue(q);
    }
  }, [location.pathname, location.search]);

  /** Gợi ý sản phẩm dạng dropdown ngay dưới thanh search (mọi trang) */
  useEffect(() => {
    // Không tự mở dropdown cho tới khi user thực sự tương tác và đang focus vào ô search
    if (!hasInteractedWithSearch || !isSearchFocused) {
      setSuggestionsOpen(false);
      return;
    }

    const q = searchValue.trim();
    if (!q) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      return;
    }

    let cancelled = false;
    const id = setTimeout(async () => {
      try {
        const list = await api.getProductsList({ keyword: q });
        if (cancelled) return;
        setSuggestions(Array.isArray(list) ? list.slice(0, 5) : []);
        setSuggestionsOpen(true);
      } catch {
        if (cancelled) return;
        setSuggestions([]);
        setSuggestionsOpen(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [searchValue, location.pathname, hasInteractedWithSearch, isSearchFocused]);

  /** Click ra ngoài thanh search → ẩn dropdown gợi ý */
  useEffect(() => {
    if (!suggestionsOpen) return;

    const handleClickOutside = (e) => {
      const target = e.target;
      if (
        target &&
        typeof target.closest === 'function' &&
        target.closest('.layout-search-wrap')
      ) {
        return;
      }
      setSuggestionsOpen(false);
    };

    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [suggestionsOpen]);

  const handleLogout = () => {
    api.clearAuth();
    navigate('/', { replace: true });
  };

  /** Navigate tới /search khi nhấn Enter trong search bar */
  const handleSearchKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && searchValue.trim()) {
        navigate(`/search?keyword=${encodeURIComponent(searchValue.trim())}`);
        setSearchValue('');
        setSuggestionsOpen(false);
      }
      if (e.key === 'Escape') {
        setSuggestionsOpen(false);
      }
    },
    [navigate, searchValue]
  );

  /** Bấm icon search hoặc button → cũng navigate */
  const handleSearchSubmit = useCallback(() => {
    if (searchValue.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
      setSuggestionsOpen(false);
    }
  }, [navigate, searchValue]);

  const displayName = user?.name || user?.email || 'User';
  const userInitial = (user?.name || user?.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="layout">
      <TopPromoStrip />

      <header className="layout-header">
        {/* Logo */}
        <Link to="/" className="layout-logo">
          ⚡ Flash Sale
        </Link>

        {/* Search bar + dropdown gợi ý sản phẩm */}
        <div className="layout-search-wrap">
          <FiSearch
            className="layout-search-icon"
            aria-hidden="true"
            onClick={handleSearchSubmit}
            style={{ cursor: 'pointer' }}
          />
          <input
            type="search"
            className="layout-search"
            placeholder="Tìm sản phẩm..."
            aria-label="Tìm sản phẩm"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              if (!hasInteractedWithSearch) setHasInteractedWithSearch(true);
            }}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => {
              setIsSearchFocused(true);
              if (!hasInteractedWithSearch) {
                setHasInteractedWithSearch(true);
              }
              const q = searchValue.trim();
              if (!q) return;
              if (suggestions.length > 0) {
                setSuggestionsOpen(true);
              }
            }}
            onBlur={() => {
              setIsSearchFocused(false);
            }}
          />
          {/* Submit button khi có text */}
          {searchValue.trim() && (
            <button
              type="button"
              className="layout-search-btn"
              onClick={handleSearchSubmit}
              aria-label="Tìm kiếm"
            >
              Tìm
            </button>
          )}

          {/* Dropdown gợi ý sản phẩm – hiển thị ở mọi trang */}
          {suggestionsOpen && suggestions.length > 0 && (
              <div className="layout-search-dropdown" role="listbox">
                {suggestions.map((p) => (
                  <Link
                    key={p.product_id}
                    to={`/product/${p.product_id}`}
                    className="layout-search-dropdown-item"
                    onClick={() => {
                      setSuggestionsOpen(false);
                      setSearchValue('');
                    }}
                  >
                    <span className="layout-search-dropdown-name">
                      {p.product_name}
                    </span>
                    <span className="layout-search-dropdown-price">
                      {formatPrice(p.product_price)}
                    </span>
                  </Link>
                ))}
                <button
                  type="button"
                  className="layout-search-dropdown-more"
                  onClick={() => {
                    if (searchValue.trim()) {
                      navigate(
                        `/search?keyword=${encodeURIComponent(
                          searchValue.trim()
                        )}`
                      );
                      setSuggestionsOpen(false);
                      setSearchValue('');
                    }
                  }}
                >
                  Xem tất cả kết quả
                </button>
              </div>
            )}
        </div>

        {/* Navigation */}
        <nav className="layout-nav">
          {isLoggedIn ? (
            <>
              <div className="layout-cart-wrap">
                <button
                  type="button"
                  className="layout-link layout-cart-link layout-cart-trigger"
                  aria-label="Đi tới giỏ hàng"
                  onClick={() => navigate('/cart')}
                >
                  <span className="layout-cart-icon-wrap">
                    <FiShoppingCart size={20} />
                    {itemCount > 0 && (
                      <span className="layout-cart-badge">{itemCount > 99 ? '99+' : itemCount}</span>
                    )}
                  </span>
                  <span className="layout-cart-label">Giỏ hàng</span>
                </button>
              </div>

              {/* User chip */}
              <button
                type="button"
                className="layout-user-chip"
                onClick={() => navigate('/account')}
              >
                <span className="layout-user-avatar">{userInitial}</span>
                <span className="layout-user-name">{displayName}</span>
              </button>

              {/* Logout */}
              <button
                type="button"
                className="layout-logout"
                onClick={handleLogout}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="layout-link">Đăng nhập</Link>
              <Link to="/register" className="layout-link layout-link--register">Đăng ký</Link>
            </>
          )}
        </nav>
      </header>

      {/* Main content với page transition animation */}
      <main className="layout-main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={PAGE_TRANSITION.initial}
            animate={PAGE_TRANSITION.animate}
            exit={PAGE_TRANSITION.exit}
            transition={PAGE_TRANSITION.transition}
            style={{ width: '100%' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

export default Layout;
