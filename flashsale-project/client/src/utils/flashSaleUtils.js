/**
 * Utility functions cho Flash Sale logic
 */

/**
 * Tính toán trạng thái Flash Sale dựa trên thời gian hiện tại và giờ G
 * @param {string|Date|null} startTime - Giờ bắt đầu Flash Sale
 * @param {string|Date|null} endTime - Giờ kết thúc Flash Sale
 * @returns {object} { status, timeRemaining, canBuy }
 */
export function getFlashSaleStatus(startTime, endTime) {
    const now = new Date();
    
    // Nếu không có startTime/endTime → coi như không có Flash Sale
    if (!startTime || !endTime) {
      return {
        status: 'no-flash-sale',
        timeRemaining: null,
        canBuy: true,
      };
    }
  
    const start = new Date(startTime);
    const end = new Date(endTime);
  
    // Trước giờ G
    if (now < start) {
      const diff = start - now;
      return {
        status: 'before-start',
        timeRemaining: diff,
        canBuy: false,
      };
    }
  
    // Sau giờ G (đã kết thúc)
    if (now > end) {
      return {
        status: 'ended',
        timeRemaining: null,
        canBuy: false,
      };
    }
  
    // Trong giờ G
    return {
      status: 'active',
      timeRemaining: end - now,
      canBuy: true,
    };
  }
  
  /**
   * Format thời gian còn lại thành object { days, hours, minutes, seconds }
   * @param {number} milliseconds - Số milliseconds còn lại
   * @returns {object}
   */
  export function formatTimeRemaining(milliseconds) {
    if (!milliseconds || milliseconds <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
  
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
  
    return {
      days,
      hours: hours % 24,
      minutes: minutes % 60,
      seconds: seconds % 60,
    };
  }
  
  /**
   * Format thời gian thành string "DD:HH:MM:SS"
   * @param {number} milliseconds - Số milliseconds còn lại
   * @returns {string}
   */
  export function formatTimeString(milliseconds) {
    const { days, hours, minutes, seconds } = formatTimeRemaining(milliseconds);
    
    if (days > 0) {
      return `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }