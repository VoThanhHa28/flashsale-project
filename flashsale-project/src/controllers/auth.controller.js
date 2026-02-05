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

    // ========== VALIDATION ĐẦY ĐỦ ==========
    
    // 1. Kiểm tra email và password không được để trống
    if (!email || !password) {
      return res.status(400).json({
        code: 400,
        message: 'Email and password are required',
      });
    }

    // 2. Kiểm tra email và password phải là string
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        code: 400,
        message: 'Email and password must be strings',
      });
    }

    // 3. Trim và normalize email (lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    // 4. Kiểm tra email sau trim không được rỗng
    if (!normalizedEmail) {
      return res.status(400).json({
        code: 400,
        message: 'Email cannot be empty',
      });
    }

    // 5. Kiểm tra password sau trim không được rỗng
    if (!trimmedPassword) {
      return res.status(400).json({
        code: 400,
        message: 'Password cannot be empty',
      });
    }

    // 6. Kiểm tra email format hợp lệ (regex validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        code: 400,
        message: 'Invalid email format',
      });
    }

    // 7. Kiểm tra email độ dài tối đa 255 ký tự
    if (normalizedEmail.length > 255) {
      return res.status(400).json({
        code: 400,
        message: 'Email must not exceed 255 characters',
      });
    }

    // ========== XỬ LÝ LOGIN ==========

    // Tìm user theo email đã normalize
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        code: 401,
        message: 'Invalid email or password',
      });
    }

    // So sánh password bằng bcrypt.compare (sử dụng password đã trim)
    const isPasswordValid = await bcrypt.compare(trimmedPassword, user.password);
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

/**
 * Lấy thông tin user hiện tại (API bảo mật - cần JWT)
 * GET /v1/api/auth/me
 */
const getMe = async (req, res) => {
  try {
    // req.user đã được gắn từ middleware verifyToken
    const user = req.user;

    return res.status(200).json({
      code: 200,
      message: 'Success',
      metadata: {
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
    console.error('GetMe error:', error);
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
  getMe,
};
