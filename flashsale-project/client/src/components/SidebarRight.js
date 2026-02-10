import { Link } from 'react-router-dom';
import './SidebarRight.css';

function SidebarRight() {
  return (
    <aside className="sidebar-right">
      <div className="sidebar-right-block">
        <h3 className="sidebar-right-title">
          <span className="sidebar-right-logo">🎁</span>
          Chào mừng bạn đến với Flash Sale
        </h3>
        <p className="sidebar-right-text">
          Đăng nhập để không bỏ lỡ ưu đãi hấp dẫn.
        </p>
        <div className="sidebar-right-actions">
          <Link to="/login" className="sidebar-right-btn">Đăng nhập</Link>
          <Link to="/register" className="sidebar-right-btn">Đăng ký</Link>
        </div>
        <Link to="/" className="sidebar-right-link">Xem ưu đãi thành viên ›</Link>
      </div>

      <div className="sidebar-right-block">
        <h3 className="sidebar-right-title">Ưu đãi cho giáo dục</h3>
        <ul className="sidebar-right-offers">
          <li><span className="sidebar-right-offer-icon">🎓</span> Đăng ký nhận ưu đãi</li>
          <li><span className="sidebar-right-offer-icon">🎓</span> Tựu trường – Máy mới lên đời</li>
          <li><span className="sidebar-right-offer-icon">💻</span> Laptop giảm thêm đến 500K</li>
        </ul>
      </div>

      <div className="sidebar-right-block">
        <h3 className="sidebar-right-title">Thu cũ lên đời giá hời</h3>
        <ul className="sidebar-right-offers">
          <li><span className="sidebar-right-offer-icon">🔄</span> iPhone trợ giá đến 3 triệu</li>
          <li><span className="sidebar-right-offer-icon">🔄</span> Samsung trợ giá đến 4 triệu</li>
          <li><span className="sidebar-right-offer-icon">🔄</span> Laptop trợ giá đến 4 triệu</li>
        </ul>
      </div>
    </aside>
  );
}

export default SidebarRight;
