import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiPackage,
  FiUser,
  FiChevronRight,
  FiLogIn,
  FiLogOut,
  FiMapPin,
  FiSettings,
  FiShield,
  FiHeart,
  FiBell,
} from 'react-icons/fi';
import * as api from '../services/api';
import './Account.css';

/**
 * Trang Account Hub – điểm trung tâm điều hướng tài khoản người dùng.
 * Layout 2 cột (desktop): profile card + stats | menu cards grid.
 */
function Account() {
  const user = api.getUser();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    api.clearAuth();
    navigate('/login');
  }, [navigate]);

  /* ── Guest state ── */
  if (!user) {
    return (
      <div className="acc-page">
        <div className="acc-guest">
          <div className="acc-guest-icon">
            <FiUser size={52} />
          </div>
          <h1 className="acc-guest-title">Chào mừng đến FlashSale!</h1>
          <p className="acc-guest-text">
            Đăng nhập để xem đơn hàng, quản lý hồ sơ và nhiều tính năng khác.
          </p>
          <div className="acc-guest-actions">
            <Link to="/login" className="acc-btn acc-btn--primary">
              <FiLogIn size={16} />
              Đăng nhập
            </Link>
            <Link to="/register" className="acc-btn acc-btn--outline">
              Tạo tài khoản
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.name || user.email || 'Người dùng';
  const userInitial = displayName.trim().charAt(0).toUpperCase();
  const isAdmin = user.role === 'SHOP_ADMIN' || user.usr_role === 'SHOP_ADMIN';

  /** Nhóm menu: Quick Actions */
  const quickItems = [
    {
      to: '/orders',
      icon: <FiPackage size={24} />,
      title: 'Đơn hàng',
      desc: 'Xem & theo dõi đơn',
      color: 'blue',
    },
    {
      to: '/profile',
      icon: <FiUser size={24} />,
      title: 'Hồ sơ',
      desc: 'Cập nhật thông tin',
      color: 'green',
    },
    {
      to: '/addresses',
      icon: <FiMapPin size={24} />,
      title: 'Địa chỉ',
      desc: 'Sổ địa chỉ giao hàng',
      color: 'orange',
    },
    {
      to: '/wishlist',
      icon: <FiHeart size={24} />,
      title: 'Yêu thích',
      desc: 'Sản phẩm đã lưu',
      color: 'pink',
    },
  ];

  /** Nhóm menu: Settings */
  const settingItems = [
    {
      to: '/notifications',
      icon: <FiBell size={20} />,
      title: 'Thông báo',
      desc: 'Quản lý cài đặt thông báo',
    },
    {
      to: '/security',
      icon: <FiShield size={20} />,
      title: 'Bảo mật',
      desc: 'Mật khẩu & xác thực 2 lớp',
    },
    {
      to: '/settings',
      icon: <FiSettings size={20} />,
      title: 'Cài đặt',
      desc: 'Ngôn ngữ, giao diện...',
    },
  ];

  return (
    <div className="acc-page">
      <div className="acc-layout">

        {/* ── CỘT TRÁI: Profile card ── */}
        <aside className="acc-sidebar">
          {/* Hero banner */}
          <div className="acc-hero">
            <div className="acc-hero-blob" aria-hidden="true" />
            <div className="acc-hero-blob acc-hero-blob--2" aria-hidden="true" />

            <div className="acc-avatar-wrap">
              <div className="acc-avatar">
                <span className="acc-avatar-initial">{userInitial}</span>
              </div>
              <div className="acc-avatar-ring" aria-hidden="true" />
            </div>

            <h1 className="acc-name">{displayName}</h1>
            {user.email && user.name && (
              <p className="acc-email">{user.email}</p>
            )}
            <span className={`acc-role ${isAdmin ? 'acc-role--admin' : ''}`}>
              {isAdmin ? '👑 Shop Admin' : '🛍️ Khách hàng'}
            </span>
          </div>

          {/* Quick stats */}
          <div className="acc-stats">
            <div className="acc-stat">
              <span className="acc-stat-num">—</span>
              <span className="acc-stat-label">Đơn hàng</span>
            </div>
            <div className="acc-stat-divider" />
            <div className="acc-stat">
              <span className="acc-stat-num">—</span>
              <span className="acc-stat-label">Điểm thưởng</span>
            </div>
            <div className="acc-stat-divider" />
            <div className="acc-stat">
              <span className="acc-stat-num">—</span>
              <span className="acc-stat-label">Voucher</span>
            </div>
          </div>

          {/* Logout */}
          <button type="button" className="acc-logout" onClick={handleLogout}>
            <FiLogOut size={16} />
            Đăng xuất
          </button>
        </aside>

        {/* ── CỘT PHẢI: Menu ── */}
        <main className="acc-main">

          {/* Quick actions */}
          <section className="acc-section">
            <h2 className="acc-section-title">Tài khoản của tôi</h2>
            <div className="acc-quick-grid">
              {quickItems.map((item) => (
                <Link key={item.to} to={item.to} className={`acc-quick-card acc-quick-card--${item.color}`}>
                  <div className="acc-quick-icon">
                    {item.icon}
                  </div>
                  <span className="acc-quick-title">{item.title}</span>
                  <span className="acc-quick-desc">{item.desc}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* Settings list */}
          <section className="acc-section">
            <h2 className="acc-section-title">Cài đặt & Bảo mật</h2>
            <div className="acc-setting-list">
              {settingItems.map((item) => (
                <Link key={item.to} to={item.to} className="acc-setting-item">
                  <span className="acc-setting-icon">{item.icon}</span>
                  <div className="acc-setting-content">
                    <span className="acc-setting-title">{item.title}</span>
                    <span className="acc-setting-desc">{item.desc}</span>
                  </div>
                  <FiChevronRight className="acc-setting-arrow" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}

export default Account;
