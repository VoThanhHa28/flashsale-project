const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const logger = require('../libs/logger');

/**
 * Middleware xác thực JWT token
 * Sử dụng cho các API cần bảo mật
 */
const verifyToken = async (req, res, next) => {
  try {
    // Lấy token từ header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - No token provided',
      });
    }

    // Extract token (bỏ "Bearer " prefix)
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - Invalid token format',
      });
    }

    // JWT_SECRET đã được check ở app start (fail fast)
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is missing in middleware');
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm user từ token (password đã được ẩn mặc định)
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - User not found',
      });
    }

    // Gắn user vào request để dùng ở các route tiếp theo
    req.user = user;
    req.userId = decoded.userId;

    next();
  } catch (error) {
    // Log chi tiết lỗi server-side
    logger.error('Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - Token expired',
      });
    }

    // KHONG leak error.message ra client
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

module.exports = {
  verifyToken,
};
