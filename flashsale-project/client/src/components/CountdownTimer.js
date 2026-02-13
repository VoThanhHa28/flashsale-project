import { useState, useEffect } from 'react';
import { formatTimeRemaining, formatTimeString } from '../utils/flashSaleUtils';
import './CountdownTimer.css';

/**
 * CountdownTimer Component
 * Hiển thị đồng hồ đếm ngược đến giờ G hoặc hết hạn Flash Sale
 * @param {string|Date} targetTime - Thời gian đích (startTime hoặc endTime)
 * @param {string} label - Label hiển thị (vd: "Sắp mở bán", "Còn lại")
 */
function CountdownTimer({ targetTime, label = 'Còn lại' }) {
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    if (!targetTime) {
      setTimeRemaining(null);
      return;
    }

    const target = new Date(targetTime);
    
    function updateTimer() {
      const now = new Date();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeRemaining(0);
        return;
      }
      
      setTimeRemaining(diff);
    }

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [targetTime]);

  if (!targetTime || !timeRemaining) {
    return null;
  }

  if (timeRemaining <= 0) {
    return null;
  }

  const { days, hours, minutes, seconds } = formatTimeRemaining(timeRemaining);

  return (
    <div className="countdown-timer">
      <div className="countdown-timer-label">{label}</div>
      <div className="countdown-timer-display">
        {days > 0 && (
          <>
            <div className="countdown-timer-unit">
              <span className="countdown-timer-value">{String(days).padStart(2, '0')}</span>
              <span className="countdown-timer-label-unit">Ngày</span>
            </div>
            <span className="countdown-timer-separator">:</span>
          </>
        )}
        <div className="countdown-timer-unit">
          <span className="countdown-timer-value">{String(hours).padStart(2, '0')}</span>
          <span className="countdown-timer-label-unit">Giờ</span>
        </div>
        <span className="countdown-timer-separator">:</span>
        <div className="countdown-timer-unit">
          <span className="countdown-timer-value">{String(minutes).padStart(2, '0')}</span>
          <span className="countdown-timer-label-unit">Phút</span>
        </div>
        <span className="countdown-timer-separator">:</span>
        <div className="countdown-timer-unit">
          <span className="countdown-timer-value">{String(seconds).padStart(2, '0')}</span>
          <span className="countdown-timer-label-unit">Giây</span>
        </div>
      </div>
    </div>
  );
}

export default CountdownTimer;