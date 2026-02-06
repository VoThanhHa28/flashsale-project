const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../libs/logger');

/**
 * Validate password policy
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.trim().length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

/**
 * Normalize email (trim + lowercase)
 */
const normalizeEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return '';
  }
  return email.trim().toLowerCase();
};

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
        status: 'error',
        message: 'Email and password are required',
      });
    }

    // Normalize email
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Email cannot be empty',
      });
    }

    // Validate password policy
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        status: 'error',
        message: passwordValidation.message,
      });
    }

    // Kiểm tra email đã tồn tại chưa (email unique) - Race condition safe
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already exists',
      });
    }

    // Hash password bằng bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password.trim(), saltRounds);

    // Tạo user mới
    const user = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      name: name ? name.trim() : '',
    });

    // Trả response theo format chuẩn (không trả password)
    return res.status(201).json({
      status: 'success',
      message: 'Registered successfully',
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
        },
      },
    });
  } catch (error) {
    // Log chi tiết lỗi server-side
    logger.error('Register error:', error);

    // Xử lý lỗi duplicate key (email unique) - Race condition safe
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Email already exists',
      });
    }

    // KHONG leak error.message ra client
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
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
        status: 'error',
        message: 'Email and password are required',
      });
    }

    // Normalize email khi login (giống hệt register)
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Email cannot be empty',
      });
    }

    // Select password khi login (vì password có select: false)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      // Khong leak thong tin - tra cung message cho ca email/password sai
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // So sánh password bằng bcrypt.compare
    const isPasswordValid = await bcrypt.compare(password.trim(), user.password);
    if (!isPasswordValid) {
      // Khong leak thong tin - tra cung message cho ca email/password sai
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password',
      });
    }

    // JWT_SECRET đã được check ở app start (fail fast)
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is missing');
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }

    // Tạo JWT token (chứa userId)
    const token = jwt.sign(
      { userId: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Trả response theo format chuẩn
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
        },
        token,
      },
    });
  } catch (error) {
    // Log chi tiết lỗi server-side
    logger.error('Login error:', error);

    // KHONG leak error.message ra client
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * Lấy thông tin user hiện tại (API bảo mật - cần JWT)
 * GET /v1/api/auth/me
 */
const getMe = async (req, res) => {
  try {
    // req.user đã được gắn từ middleware verifyToken
    const user = req.user;

    return res.status(200).json({
      status: 'success',
      message: 'Success',
      data: {
        user: {
          _id: user._id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    });
  } catch (error) {
    // Log chi tiết lỗi server-side
    logger.error('GetMe error:', error);

    // KHONG leak error.message ra client
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
