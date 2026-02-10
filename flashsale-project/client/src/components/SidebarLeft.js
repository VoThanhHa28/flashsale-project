import { Link } from 'react-router-dom';
import './SidebarLeft.css';

const CATEGORIES = [
  { id: 'phone', label: 'Điện thoại, Tablet', icon: '📱' },
  { id: 'laptop', label: 'Laptop', icon: '💻' },
  { id: 'audio', label: 'Âm thanh, Mic thu âm', icon: '🎧' },
  { id: 'watch', label: 'Đồng hồ, Camera', icon: '⌚' },
  { id: 'home', label: 'Đồ gia dụng, Làm đẹp', icon: '🏠' },
  { id: 'accessory', label: 'Phụ kiện', icon: '🔌' },
  { id: 'pc', label: 'PC, Màn hình, Máy in', icon: '🖥️' },
  { id: 'tv', label: 'Tivi, Điện máy', icon: '📺' },
  { id: 'trade', label: 'Thu cũ đổi mới', icon: '🔄' },
  { id: 'used', label: 'Hàng cũ', icon: '📦' },
  { id: 'sale', label: 'Khuyến mãi', icon: '🏷️' },
  { id: 'news', label: 'Tin công nghệ', icon: '📰' },
];

function SidebarLeft() {
  return (
    <aside className="sidebar-left">
      <ul className="sidebar-left-list">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <Link to="/" className="sidebar-left-item">
              <span className="sidebar-left-icon">{c.icon}</span>
              <span className="sidebar-left-label">{c.label}</span>
              <span className="sidebar-left-arrow">›</span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default SidebarLeft;
