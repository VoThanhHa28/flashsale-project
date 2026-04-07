import { Link } from 'react-router-dom';
import { FiZap, FiClock, FiPackage, FiLogIn, FiUser, FiChevronRight } from 'react-icons/fi';
import * as api from '../services/api';
import './SidebarRight.css';

/**
 * Flash Sale schedule placeholder - sau này replace bằng real data từ API.
 * Khi BE có API /v1/api/shop/stats/revenue thì fetch và map vào đây.
 */
const FLASH_SALE_SLOTS = [
  { id: 1, time: '10:00', label: 'Đã kết thúc', status: 'done' },
  { id: 2, time: '14:00', label: 'Đang diễn ra', status: 'active' },
  { id: 3, time: '20:00', label: 'Sắp mở bán',  status: 'upcoming' },
];

function SidebarRight() {
  const user  = api.getUser();
  const token = api.getToken();
  const isLoggedIn = Boolean(user && token);

  /** Lấy chữ cái đầu để làm avatar */
  const userInitial = isLoggedIn
    ? (user.name || user.email || 'U').trim().charAt(0).toUpperCase()
    : null;

  return (
    <aside className="sidebar-right">

      {/* ─── Block 1: Tài khoản người dùng ─── */}
      <div className="srb-block srb-block--account">
        {isLoggedIn ? (
          <>
            {/* Avatar + tên */}
            <div className="srb-account-header">
              <div className="srb-avatar">
                <span className="srb-avatar-initial">{userInitial}</span>
                <div className="srb-avatar-ring" aria-hidden="true" />
              </div>
              <div className="srb-account-meta">
                <p className="srb-account-greeting">Xin chào,</p>
                <h3 className="srb-account-name">{user.name || user.email}</h3>
              </div>
            </div>

            {/* Điểm tích lũy + đơn hàng */}
            <div className="srb-stats-row">
              <div className="srb-stat">
                <span className="srb-stat-value">0</span>
                <span className="srb-stat-label">Điểm tích lũy</span>
              </div>
              <div className="srb-stat-sep" aria-hidden="true" />
              <div className="srb-stat">
                <span className="srb-stat-value">0</span>
                <span className="srb-stat-label">Đơn hàng</span>
              </div>
            </div>

            {/* Action buttons */}
            <Link to="/orders" className="srb-action-btn">
              <FiPackage size={14} aria-hidden="true" />
              Đơn hàng của tôi
            </Link>
            <Link to="/account" className="srb-text-link">
              Quản lý tài khoản
              <FiChevronRight size={13} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            {/* Guest */}
            <div className="srb-guest-header">
              <div className="srb-guest-icon" aria-hidden="true">
                <FiUser size={24} />
              </div>
              <div>
                <h3 className="srb-account-name">Chào mừng bạn!</h3>
                <p className="srb-guest-hint">Đăng nhập để không bỏ lỡ Flash Sale</p>
              </div>
            </div>

            <div className="srb-auth-row">
              <Link to="/login" className="srb-action-btn">
                <FiLogIn size={14} aria-hidden="true" />
                Đăng nhập
              </Link>
              <Link to="/register" className="srb-action-btn srb-action-btn--outline">
                Đăng ký
              </Link>
            </div>
          </>
        )}
      </div>

      {/* ─── Block 2: Lịch Flash Sale hôm nay ─── */}
      <div className="srb-block srb-block--flashsale">
        {/* Header */}
        <div className="srb-flash-header">
          <FiZap className="srb-flash-header-icon" aria-hidden="true" />
          <h3 className="srb-flash-header-title">Flash Sale hôm nay</h3>
        </div>

        {/* Schedule slots */}
        <div className="srb-slots">
          {FLASH_SALE_SLOTS.map((slot) => (
            <div key={slot.id} className={`srb-slot srb-slot--${slot.status}`}>
              <div className="srb-slot-time-wrap">
                <FiClock size={11} aria-hidden="true" />
                <span className="srb-slot-time">{slot.time}</span>
              </div>
              <span className={`srb-slot-badge srb-slot-badge--${slot.status}`}>
                {slot.status === 'active' && (
                  <span className="srb-slot-dot" aria-hidden="true" />
                )}
                {slot.label}
              </span>
            </div>
          ))}
        </div>

        <Link to="/" className="srb-text-link srb-text-link--centered">
          Xem tất cả ưu đãi
          <FiChevronRight size={13} aria-hidden="true" />
        </Link>
      </div>

    </aside>
  );
}

export default SidebarRight;
