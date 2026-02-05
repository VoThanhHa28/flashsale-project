const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

/**
 * Đăng ký user mới
 * POST /v1/api/auth/register
 */
const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        code: 400,
        message: 'Email and password are required',
      });
    }

    // Kiểm tra email đã tồn tại chưa (email unique)
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        code: 409,
        message: 'Email already exists',
      });
    }

    // Hash password bằng bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Tạo user mới
    const user = await User.create({
      email,
      password: hashedPassword,
      name: name || '',
    });

    // Trả response theo API Contract (không trả password)
    return res.status(201).json({
      code: 201,
      message: 'Registered!',
      metadata: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    
    // Xử lý lỗi duplicate key (email unique)
    if (error.code === 11000) {
      return res.status(409).json({
        code: 409,
        message: 'Email already exists',
      });
    }
    
    return res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: error.message,
    });
  }
};

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
  register,
  login,
};
