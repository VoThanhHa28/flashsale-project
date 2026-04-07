import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiPackage,
  FiUser,
  FiUsers,
  FiChevronRight,
  FiLogIn,
  FiLogOut,
  // FiMapPin, // (tạm ẩn thẻ Địa chỉ — bật lại khi có /addresses)
  FiSettings,
  FiShield,
  // FiHeart, // (tạm ẩn thẻ Yêu thích — bật lại khi có /wishlist)
  FiBell,
  FiBarChart2,
  FiActivity,
  FiClipboard,
  FiFileText,
  FiLayers,
  FiZap,
  FiTruck,
} from 'react-icons/fi';
import * as api from '../services/api';
import { getUserRoleCode } from '../utils/userRole';
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
  const isShopAdmin = getUserRoleCode(user) === 'SHOP_ADMIN';

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
    /* Tạm ẩn — bật lại khi triển khai sổ địa chỉ / wishlist
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
    */
    ...(isShopAdmin
      ? [
          {
            to: '/shop/orders',
            icon: <FiClipboard size={24} />,
            title: 'Đơn hàng Shop',
            desc: 'Quản lý & duyệt đơn',
            color: 'purple',
          },
          {
            to: '/shop/products',
            icon: <FiPackage size={24} />,
            title: 'Sản phẩm',
            desc: 'Quản lý & Flash Sale',
            color: 'purple',
          },
          {
            to: '/shop/flash-sale/campaign',
            icon: <FiZap size={24} />,
            title: 'Chiến dịch Flash Sale',
            desc: 'Chọn giờ & nhiều sản phẩm',
            color: 'purple',
          },
          {
            to: '/shop/categories',
            icon: <FiLayers size={24} />,
            title: 'Danh mục',
            desc: 'Quản lý danh mục sản phẩm',
            color: 'purple',
          },
          {
            to: '/shop/report',
            icon: <FiBarChart2 size={24} />,
            title: 'Báo cáo',
            desc: 'Biểu đồ doanh thu',
            color: 'purple',
          },
          {
            to: '/shop/logs',
            icon: <FiFileText size={24} />,
            title: 'Nhật ký hoạt động',
            desc: 'Ai vừa làm gì, lúc mấy giờ',
            color: 'purple',
          },
          {
            to: '/shop/inventory-history',
            icon: <FiTruck size={24} />,
            title: 'Nhập / xuất kho',
            desc: 'Lịch sử biến động tồn',
            color: 'purple',
          },
          {
            to: '/shop/permissions',
            icon: <FiShield size={24} />,
            title: 'Phân quyền',
            desc: 'Gán Shop Admin / User',
            color: 'purple',
          },
          {
            to: '/shop/users',
            icon: <FiUsers size={24} />,
            title: 'Người dùng',
            desc: 'Quản lý & khóa tài khoản',
            color: 'purple',
          },
          {
            to: '/shop/health',
            icon: <FiActivity size={24} />,
            title: 'Hệ thống',
            desc: 'Trạng thái Redis & Mongo',
            color: 'purple',
          },
        ]
      : []),
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
      to: '/change-password',
      icon: <FiShield size={20} />,
      title: 'Bảo mật',
      desc: 'Đổi mật khẩu',
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
            <span className={`acc-role ${isShopAdmin ? 'acc-role--admin' : ''}`}>
              {isShopAdmin ? '👑 Shop Admin' : '🛍️ Khách hàng'}
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
