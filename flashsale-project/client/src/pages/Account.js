import { Link } from 'react-router-dom';
import { FiPackage, FiUser, FiChevronRight, FiLogIn } from 'react-icons/fi';
import * as api from '../services/api';
import './Account.css';

/**
 * Trang Account Hub - điểm trung tâm điều hướng tài khoản người dùng.
 * Hiển thị profile header + menu item links tới các tính năng.
 */
function Account() {
  const user = api.getUser();

  /** Trạng thái chưa đăng nhập */
  if (!user) {
    return (
      <div className="account-page">
        <div className="account-card account-card--guest">
          <div className="account-guest-icon" aria-hidden="true">
            <FiUser size={48} />
          </div>
          <h1 className="account-title">Tài khoản</h1>
          <p className="account-text">
            Bạn chưa đăng nhập. Vui lòng đăng nhập để xem thông tin tài khoản.
          </p>
          <Link to="/login" className="account-link">
            <FiLogIn size={18} />
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    );
  }

  const displayName = user.name || user.email || 'Người dùng';
  /** Lấy chữ cái đầu để làm avatar */
  const userInitial = displayName.trim().charAt(0).toUpperCase();
  const isAdmin = user.role === 'SHOP_ADMIN' || user.usr_role === 'SHOP_ADMIN';

  /** Danh sách menu items */
  const menuItems = [
    {
      to: '/orders',
      icon: <FiPackage size={22} />,
      title: 'Lịch sử đơn hàng',
      desc: 'Xem lại các đơn hàng đã đặt',
      color: 'blue',
    },
    {
      to: '/profile',
      icon: <FiUser size={22} />,
      title: 'Hồ sơ cá nhân',
      desc: 'Sửa thông tin, địa chỉ nhận hàng',
      color: 'green',
    },
  ];

  return (
    <div className="account-page">
      <div className="account-card">
        {/* Profile header với gradient avatar */}
        <div className="account-profile-header">
          {/* Avatar circle với user initial */}
          <div className="account-avatar-wrap" aria-hidden="true">
            <div className="account-avatar">
              <span className="account-avatar-initial">{userInitial}</span>
            </div>
            {/* Ring glow effect */}
            <div className="account-avatar-ring" />
          </div>

          {/* User info */}
          <div className="account-profile-meta">
            <h1 className="account-title">Xin chào, {displayName}!</h1>
            {user.email && user.name && (
              <p className="account-subtitle">{user.email}</p>
            )}
            {/* Role badge */}
            <span className={`account-role-badge ${isAdmin ? 'account-role-badge--admin' : ''}`}>
              {isAdmin ? '👑 Shop Admin' : '🛍️ Khách hàng'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="account-divider" aria-hidden="true" />

        {/* Menu items */}
        <nav className="account-menu" aria-label="Menu tài khoản">
          {menuItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`account-menu-item account-menu-item--${item.color}`}
            >
              {/* Icon với colored background */}
              <span className="account-menu-icon-wrap" aria-hidden="true">
                {item.icon}
              </span>

              <div className="account-menu-content">
                <h3 className="account-menu-title">{item.title}</h3>
                <p className="account-menu-desc">{item.desc}</p>
              </div>

              <FiChevronRight className="account-menu-arrow" aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

export default Account;
