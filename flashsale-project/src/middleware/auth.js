const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

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
        code: 401,
        message: 'Unauthorized - No token provided',
      });
    }

    // Extract token (bỏ "Bearer " prefix)
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        code: 401,
        message: 'Unauthorized - Invalid token format',
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    // Tìm user từ token
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: 'Unauthorized - User not found',
      });
    }

    // Gắn user vào request để dùng ở các route tiếp theo
    req.user = user;
    req.userId = decoded.userId;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        code: 401,
        message: 'Unauthorized - Invalid token',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        message: 'Unauthorized - Token expired',
      });
    }
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      code: 500,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  verifyToken,
};
