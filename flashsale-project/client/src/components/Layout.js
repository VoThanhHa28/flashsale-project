import { Outlet, Link, useNavigate } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';
import * as api from '../services/api';
import TopPromoStrip from './TopPromoStrip';
import Footer from './Footer';
import './Layout.css';

function Layout() {
  const navigate = useNavigate();
  const user = api.getUser();
  const token = api.getToken();
  const isLoggedIn = Boolean(token || user);

  const handleLogout = () => {
    api.clearAuth();
    navigate('/', { replace: true });
  };

  const displayName = user?.name || user?.email || 'User';
  const userInitial = (user?.name || user?.email || 'U').trim().charAt(0).toUpperCase();

  return (
    <div className="layout">
      <TopPromoStrip />
      <header className="layout-header">
        <Link to="/" className="layout-logo">
          Flash Sale
        </Link>
        <div className="layout-search-wrap">
          <FiSearch className="layout-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="layout-search"
            placeholder="Tìm sản phẩm..."
            aria-label="Tìm sản phẩm"
            readOnly
          />
        </div>
        <nav className="layout-nav">
          {isLoggedIn ? (
            <>
              <Link to="/cart" className="layout-link">Giỏ hàng</Link>
              <button
                type="button"
                className="layout-user-chip"
                onClick={() => navigate('/account')}
              >
                <span className="layout-user-avatar">{userInitial}</span>
                <span className="layout-user-name">{displayName}</span>
              </button>
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
              <Link to="/register" className="layout-link">Đăng ký</Link>
            </>
          )}
        </nav>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

export default Layout;
