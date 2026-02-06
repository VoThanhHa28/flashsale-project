/**
 * Thay thế console.log/console.error
 */

const logger = {
  /**
   * Log thông tin thông thường
   */
  info: (message, ...args) => {
    const timestamp = new Date().toISOString();
    console.log(`[INFO] [${timestamp}] ${message}`, ...args);
  },

  /**
   * Log loi
   */
  error: (message, error = null) => {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR] [${timestamp}] ${message}`);
    if (error) {
      console.error('Error details:', error);
    }
  },
};

module.exports = logger;
