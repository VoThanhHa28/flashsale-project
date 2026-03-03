import { Link } from 'react-router-dom';
import './PromoTiles.css';

/**
 * PromoTiles - 3 ô quảng cáo nhỏ dưới banner.
 * Mỗi tile là một chủ đề khuyến mãi, sau này có thể thêm field `image`.
 */
const TILES = [
  {
    id: 1,
    emoji: '🎁',
    subtitle: 'Quà Tặng',
    title: 'Ông bà, Cha mẹ',
    color: '#c00a27',
    shadow: 'rgba(192, 10, 39, 0.35)',
    to: '/',
  },
  {
    id: 2,
    emoji: '🎒',
    subtitle: 'Quà Tặng',
    title: 'Con, Em',
    color: '#0d7d4a',
    shadow: 'rgba(13, 125, 74, 0.35)',
    to: '/',
  },
  {
    id: 3,
    emoji: '💝',
    subtitle: 'Quà Tặng',
    title: 'Người ấy',
    color: '#6b2d5c',
    shadow: 'rgba(107, 45, 92, 0.35)',
    to: '/',
  },
];

function PromoTiles() {
  return (
    <div className="promo-tiles">
      {TILES.map((t) => (
        <Link
          key={t.id}
          to={t.to}
          className="promo-tile"
          style={{
            '--tile-color': t.color,
            '--tile-shadow': t.shadow,
          }}
        >
          {/* Decorative circle background */}
          <div className="promo-tile-circle" aria-hidden="true" />

          <div className="promo-tile-inner">
            {/* Emoji icon */}
            <span className="promo-tile-emoji" aria-hidden="true">{t.emoji}</span>

            <div className="promo-tile-text">
              <span className="promo-tile-subtitle">{t.subtitle}</span>
              <span className="promo-tile-title">{t.title}</span>
            </div>

            <span className="promo-tile-cta">XEM NGAY →</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default PromoTiles;
