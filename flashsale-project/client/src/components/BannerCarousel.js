import { useState, useEffect } from 'react';
import './BannerCarousel.css';

/**
 * Slides data - sau này thêm field `image` để gắn ảnh thật.
 * Khi có ảnh: render <img src={s.image} /> thay vì gradient background.
 */
const SLIDES = [
  {
    id: 1,
    badge: '⚡ Flash Sale',
    title: 'Giảm sốc đến 50%',
    subtitle: 'Số lượng có hạn — Mua ngay kẻo hết',
    cta: 'Mua ngay',
    gradient: 'linear-gradient(135deg, #c00a27 0%, #6b0016 100%)',
    accent: '#ff6b4d',
    // image: null,  // Gắn URL ảnh vào đây sau
  },
  {
    id: 2,
    badge: '🚚 Miễn phí vận chuyển',
    title: 'Giao hàng toàn quốc',
    subtitle: 'Đơn từ 500K – Giao nhanh 2 giờ nội thành',
    cta: 'Xem ưu đãi',
    gradient: 'linear-gradient(135deg, #0f3460 0%, #c00a27 100%)',
    accent: '#3b82f6',
    // image: null,
  },
  {
    id: 3,
    badge: '🆕 Hàng mới về',
    title: 'iPhone 15 & Galaxy S24',
    subtitle: 'Cập nhật liên tục — Bảo hành chính hãng',
    cta: 'Khám phá',
    gradient: 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)',
    accent: '#60a5fa',
    // image: null,
  },
  {
    id: 4,
    badge: '💳 Trả góp 0%',
    title: 'Trả trước 0Đ',
    subtitle: 'Phụ phí 0Đ — Duyệt nhanh trong 5 phút',
    cta: 'Đăng ký ngay',
    gradient: 'linear-gradient(135deg, #c00a27 0%, #1a1a2e 100%)',
    accent: '#f59e0b',
    // image: null,
  },
];

const INTERVAL_MS = 4500;

function BannerCarousel() {
  const [index, setIndex] = useState(0);

  /* Auto-play logic — giữ nguyên */
  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const goTo = (i) => setIndex(i);
  const prev = () => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setIndex((i) => (i + 1) % SLIDES.length);

  return (
    <section className="banner-carousel" aria-label="Banner quảng cáo">
      <div className="banner-carousel-track">
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            className={`banner-carousel-slide ${i === index ? 'banner-carousel-slide--active' : ''}`}
            style={{ background: s.gradient }}
            aria-hidden={i !== index}
          >
            {/* Decorative diagonal stripes */}
            <div className="banner-carousel-deco" aria-hidden="true" />

            {/* Glowing circle decoration */}
            <div
              className="banner-carousel-glow"
              style={{ background: `radial-gradient(circle, ${s.accent}33 0%, transparent 65%)` }}
              aria-hidden="true"
            />

            {/* Nội dung căn trái */}
            <div className="banner-carousel-content">
              {/* Badge trên tiêu đề */}
              {s.badge && (
                <div className="banner-carousel-badge">{s.badge}</div>
              )}

              <h2 className="banner-carousel-title">{s.title}</h2>
              <p className="banner-carousel-subtitle">{s.subtitle}</p>

              {/* CTA button */}
              {s.cta && (
                <button
                  type="button"
                  className="banner-carousel-cta"
                  tabIndex={i !== index ? -1 : 0}
                >
                  {s.cta} →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Prev / Next buttons */}
      <button
        type="button"
        className="banner-carousel-btn banner-carousel-btn--prev"
        onClick={prev}
        aria-label="Banner trước"
      />
      <button
        type="button"
        className="banner-carousel-btn banner-carousel-btn--next"
        onClick={next}
        aria-label="Banner sau"
      />

      {/* Slide counter + dots */}
      <div className="banner-carousel-footer">
        <div className="banner-carousel-dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`banner-carousel-dot ${i === index ? 'banner-carousel-dot--active' : ''}`}
              onClick={() => goTo(i)}
              aria-label={`Xem banner ${i + 1}`}
              aria-current={i === index}
            />
          ))}
        </div>
        <span className="banner-carousel-counter" aria-live="polite">
          {index + 1} / {SLIDES.length}
        </span>
      </div>

      {/* Progress bar — restart khi index đổi nhờ key */}
      <div className="banner-carousel-progress" aria-hidden="true">
        <div key={index} className="banner-carousel-progress-fill" />
      </div>
    </section>
  );
}

export default BannerCarousel;
