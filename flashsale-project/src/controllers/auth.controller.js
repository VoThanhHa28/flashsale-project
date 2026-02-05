const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Đăng nhập
 * POST /v1/api/auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        code: 400,
        message: 'Email and password are required',
      });
    }

    // Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: 'Invalid email or password',
      });
    }

    // So sánh password bằng bcrypt.compare
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        code: 401,
        message: 'Invalid email or password',
      });
    }

    // Tạo JWT token (chứa userId)
    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    // Trả response theo yêu cầu: { "token": "...", "userId": "..." }
    return res.status(200).json({
      token,
      userId: user._id.toString(),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

module.exports = {
  login,
};
