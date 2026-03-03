import { useState, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiSearch, FiShoppingCart } from 'react-icons/fi';
import * as api from '../services/api';
import TopPromoStrip from './TopPromoStrip';
import Footer from './Footer';
import './Layout.css';

/** Cấu hình animation cho page transitions */
const PAGE_TRANSITION = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
  transition: { duration: 0.24, ease: [0.4, 0, 0.2, 1] },
};

function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = api.getUser();
  const token = api.getToken();
  const isLoggedIn = Boolean(token || user);

  /** State cho search input */
  const [searchValue, setSearchValue] = useState('');

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
      }
    },
    [navigate, searchValue]
  );

  /** Bấm icon search hoặc button → cũng navigate */
  const handleSearchSubmit = useCallback(() => {
    if (searchValue.trim()) {
      navigate(`/search?keyword=${encodeURIComponent(searchValue.trim())}`);
      setSearchValue('');
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

        {/* Search bar - Đã được làm functional */}
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
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleSearchKeyDown}
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
        </div>

        {/* Navigation */}
        <nav className="layout-nav">
          {isLoggedIn ? (
            <>
              {/* Cart link */}
              <Link to="/cart" className="layout-link layout-cart-link" aria-label="Giỏ hàng">
                <FiShoppingCart size={20} />
                <span className="layout-cart-label">Giỏ hàng</span>
              </Link>

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
