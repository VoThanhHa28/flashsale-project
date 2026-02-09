import { Link } from 'react-router-dom';
import './TopPromoStrip.css';

const PROMOS = [
  { id: 1, text: 'iPhone 17 Trọn Tết, Vẹn Tinh Hoa', to: '/' },
  { id: 2, text: 'Galaxy A56 – Galaxy mới, Tết mới', to: '/' },
  { id: 3, text: 'Mua Laptop giảm thêm 5% tối đa 1 triệu', to: '/' },
  { id: 4, text: 'Redmi Note 15 Series – Bền vô đối', to: '/' },
];

function TopPromoStrip() {
  return (
    <div className="top-promo-strip">
      <div className="top-promo-inner">
        {PROMOS.map((p) => (
          <Link key={p.id} to={p.to} className="top-promo-link">
            {p.text}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default TopPromoStrip;
