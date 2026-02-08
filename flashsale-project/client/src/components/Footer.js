import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-col">
          <h3 className="footer-title">Về chúng tôi</h3>
          <p className="footer-text">
            Flash Sale – Hệ thống bán hàng chịu tải cao. Sản phẩm chính hãng, giao hàng nhanh.
          </p>
        </div>
        <div className="footer-col">
          <h3 className="footer-title">Hỗ trợ</h3>
          <ul className="footer-links">
            <li><Link to="/">Chính sách đổi trả</Link></li>
            <li><Link to="/">Hướng dẫn mua hàng</Link></li>
            <li><Link to="/">Thanh toán</Link></li>
            <li><Link to="/">Vận chuyển</Link></li>
          </ul>
        </div>
        <div className="footer-col">
          <h3 className="footer-title">Liên hệ</h3>
          <ul className="footer-text footer-contact">
            <li>Hotline: 1900 xxxx</li>
            <li>Email: support@flashsale.vn</li>
          </ul>
        </div>
        <div className="footer-col">
          <h3 className="footer-title">Kết nối</h3>
          <div className="footer-social">
            <span className="footer-social-item">Facebook</span>
            <span className="footer-social-item">Zalo</span>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p className="footer-copy">© {new Date().getFullYear()} Flash Sale. Minh họa giao diện – chức năng sẽ bổ sung sau.</p>
      </div>
    </footer>
  );
}

export default Footer;
