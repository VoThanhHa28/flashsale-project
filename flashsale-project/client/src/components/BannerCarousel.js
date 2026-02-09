import { useState, useEffect } from 'react';
import './BannerCarousel.css';

const SLIDES = [
  {
    id: 1,
    title: 'Flash Sale 50%',
    subtitle: 'Ưu đãi sốc – Số lượng có hạn',
    gradient: 'linear-gradient(135deg, #c00a27 0%, #8b0618 100%)',
  },
  {
    id: 2,
    title: 'Giao hàng miễn phí',
    subtitle: 'Đơn từ 500K – Toàn quốc',
    gradient: 'linear-gradient(135deg, #0f3460 0%, #c00a27 100%)',
  },
  {
    id: 3,
    title: 'Sản phẩm mới',
    subtitle: 'iPhone 15, Samsung S24 – Cập nhật liên tục',
    gradient: 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)',
  },
  {
    id: 4,
    title: 'Trả góp 0%',
    subtitle: 'Trả trước 0Đ – Phụ phí 0Đ',
    gradient: 'linear-gradient(135deg, #c00a27 0%, #1a1a2e 100%)',
  },
];

const INTERVAL_MS = 4500;

function BannerCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(t);
  }, []);

  const goTo = (i) => setIndex(i);
  const prev = () => setIndex((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  const next = () => setIndex((i) => (i + 1) % SLIDES.length);

  const slide = SLIDES[index];

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
            <div className="banner-carousel-content">
              <h2 className="banner-carousel-title">{s.title}</h2>
              <p className="banner-carousel-subtitle">{s.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
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
    </section>
  );
}

export default BannerCarousel;
