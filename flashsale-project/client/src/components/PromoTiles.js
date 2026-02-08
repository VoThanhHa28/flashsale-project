import { Link } from 'react-router-dom';
import './PromoTiles.css';

const TILES = [
  { id: 1, title: 'Ông bà, Cha mẹ', subtitle: 'Quà Tặng', color: '#c00a27', to: '/' },
  { id: 2, title: 'Con, Em', subtitle: 'Quà Tặng', color: '#0d7d4a', to: '/' },
  { id: 3, title: 'Người ấy', subtitle: 'Quà Tặng', color: '#6b2d5c', to: '/' },
];

function PromoTiles() {
  return (
    <div className="promo-tiles">
      {TILES.map((t) => (
        <Link key={t.id} to={t.to} className="promo-tile" style={{ '--tile-color': t.color }}>
          <div className="promo-tile-inner">
            <span className="promo-tile-subtitle">{t.subtitle}</span>
            <span className="promo-tile-title">{t.title}</span>
            <span className="promo-tile-cta">XEM NGAY</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default PromoTiles;
