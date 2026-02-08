import { Outlet, Link, useNavigate } from 'react-router-dom';
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

  return (
    <div className="layout">
      <TopPromoStrip />
      <header className="layout-header">
        <Link to="/" className="layout-logo">
          Flash Sale
        </Link>
        <div className="layout-search-wrap">
          <input
            type="search"
            className="layout-search"
            placeholder="Tìm sản phẩm..."
            aria-label="Tìm sản phẩm"
            readOnly
          />
        </div>
        <nav className="layout-nav">
          <Link to="/" className="layout-link">Trang chủ</Link>
          {isLoggedIn ? (
            <>
              <span className="layout-user">Xin chào, {displayName}</span>
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
