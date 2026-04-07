import { Link } from 'react-router-dom';
import { FiGrid, FiZap, FiChevronRight } from 'react-icons/fi';
import './SidebarLeft.css';

const FALLBACK_CATEGORIES = [
  { id: 'phone',     label: 'Điện thoại, Tablet',    icon: '📱' },
  { id: 'laptop',    label: 'Laptop',                 icon: '💻' },
  { id: 'audio',     label: 'Âm thanh, Mic thu âm',  icon: '🎧' },
  { id: 'watch',     label: 'Đồng hồ, Camera',        icon: '⌚' },
  { id: 'home',      label: 'Đồ gia dụng, Làm đẹp',  icon: '🏠' },
  { id: 'accessory', label: 'Phụ kiện',               icon: '🔌' },
  { id: 'pc',        label: 'PC, Màn hình, Máy in',   icon: '🖥️' },
  { id: 'tv',        label: 'Tivi, Điện máy',          icon: '📺' },
  { id: 'trade',     label: 'Thu cũ đổi mới',          icon: '🔄' },
  { id: 'used',      label: 'Hàng cũ',                 icon: '📦' },
  { id: 'sale',      label: 'Khuyến mãi',               icon: '🏷️' },
  { id: 'news',      label: 'Tin công nghệ',            icon: '📰' },
];

function mapCategoryIcon(name = '') {
  const n = String(name).toLowerCase();
  if (n.includes('điện thoại') || n.includes('tablet')) return '📱';
  if (n.includes('laptop') || n.includes('macbook')) return '💻';
  if (n.includes('âm thanh') || n.includes('tai nghe')) return '🎧';
  if (n.includes('đồng hồ') || n.includes('camera')) return '⌚';
  if (n.includes('gia dụng') || n.includes('làm đẹp')) return '🏠';
  if (n.includes('phụ kiện')) return '🔌';
  if (n.includes('pc') || n.includes('màn hình') || n.includes('máy in')) return '🖥️';
  if (n.includes('tivi') || n.includes('điện máy')) return '📺';
  if (n.includes('khuyến mãi')) return '🏷️';
  return '📦';
}

function SidebarLeft({ categories = [] }) {
  const navCategories = Array.isArray(categories) && categories.length > 0
    ? categories.map((c, idx) => ({
        id: String(c._id || c.id || c.categoryName || idx),
        label: c.categoryName || c.name || 'Danh mục',
        icon: mapCategoryIcon(c.categoryName || c.name || ''),
      }))
    : FALLBACK_CATEGORIES;

  return (
    <aside className="sidebar-left">
      {/* Header danh mục */}
      <div className="sidebar-left-header">
        <FiGrid className="sidebar-left-header-icon" aria-hidden="true" />
        <span className="sidebar-left-header-title">Danh mục sản phẩm</span>
      </div>

      {/* Flash Sale link nổi bật - đặt đầu danh sách */}
      <Link to="/" className="sidebar-left-flash-link">
        <span className="sidebar-left-flash-icon-wrap" aria-hidden="true">
          <FiZap />
        </span>
        <span className="sidebar-left-flash-label">Flash Sale</span>
        <span className="sidebar-left-flash-badge">
          <span className="sidebar-left-flash-dot" aria-hidden="true" />
          LIVE
        </span>
      </Link>

      {/* Đường kẻ phân cách */}
      <div className="sidebar-left-divider" aria-hidden="true" />

      {/* Danh mục thông thường */}
      <ul className="sidebar-left-list">
        {navCategories.map((c) => (
          <li key={c.id}>
            <Link to="/" className="sidebar-left-item">
              <span className="sidebar-left-icon">{c.icon}</span>
              <span className="sidebar-left-label">{c.label}</span>
              <FiChevronRight className="sidebar-left-arrow" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default SidebarLeft;
