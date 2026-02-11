const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logger = require('../libs/logger');

/**
 * Validate email format
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: 'Email không được để trống' };
  }
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return { valid: false, message: 'Email không được để trống' };
  }
  // Email regex pattern - RFC 5322 compliant
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, message: 'Email không đúng định dạng (ví dụ: email@example.com)' };
  }
  // Kiểm tra độ dài email
  if (trimmedEmail.length > 254) {
    return { valid: false, message: 'Email không được vượt quá 254 ký tự' };
  }
  return { valid: true };
};

/**
 * Validate password policy - Mật khẩu phải có:
 * - Ít nhất 8 ký tự
 * - Ít nhất 1 chữ hoa (A-Z)
 * - Ít nhất 1 chữ thường (a-z)
 * - Ít nhất 1 số (0-9)
 * - Ít nhất 1 ký tự đặc biệt
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Mật khẩu không được để trống' };
  }

  const trimmedPassword = password.trim();
  
  // Kiểm tra độ dài tối thiểu
  if (trimmedPassword.length < 8) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 8 ký tự' };
  }

  // Kiểm tra độ dài tối đa
  if (trimmedPassword.length > 100) {
    return { valid: false, message: 'Mật khẩu không được vượt quá 100 ký tự' };
  }

  // Kiểm tra có chữ hoa
  if (!/[A-Z]/.test(trimmedPassword)) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 1 chữ hoa (A-Z)' };
  }

  // Kiểm tra có chữ thường
  if (!/[a-z]/.test(trimmedPassword)) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 1 chữ thường (a-z)' };
  }

  // Kiểm tra có số
  if (!/[0-9]/.test(trimmedPassword)) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 1 số (0-9)' };
  }

  // Kiểm tra có ký tự đặc biệt
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(trimmedPassword)) {
    return { valid: false, message: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt (!@#$%^&*...)' };
  }

  return { valid: true };
};

/**
 * Validate name
 */
const validateName = (name) => {
  if (!name || typeof name !== 'string') {
    return { valid: false, message: 'Họ tên không được để trống' };
  }
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { valid: false, message: 'Họ tên không được để trống' };
  }
  if (trimmedName.length < 2) {
    return { valid: false, message: 'Họ tên phải có ít nhất 2 ký tự' };
  }
  if (trimmedName.length > 100) {
    return { valid: false, message: 'Họ tên không được vượt quá 100 ký tự' };
  }
  // Kiểm tra không chứa ký tự đặc biệt không hợp lệ
  if (!/^[a-zA-ZÀ-ỹ\s]+$/.test(trimmedName)) {
    return { valid: false, message: 'Họ tên chỉ được chứa chữ cái và khoảng trắng' };
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

    // Validation: Kiểm tra các trường bắt buộc
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email và mật khẩu không được để trống',
      });
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        status: 'error',
        message: emailValidation.message,
      });
    }

    // Normalize email
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Email không được để trống',
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

    // Validate name nếu có
    if (name) {
      const nameValidation = validateName(name);
      if (!nameValidation.valid) {
        return res.status(400).json({
          status: 'error',
          message: nameValidation.message,
        });
      }
    }

    // Kiểm tra email đã tồn tại chưa (email unique) - Race condition safe
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.',
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
      message: 'Đăng ký thành công! Vui lòng đăng nhập.',
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
        message: 'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.',
      });
    }

    // KHONG leak error.message ra client
    return res.status(500).json({
      status: 'error',
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
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

    // Validation: Kiểm tra các trường bắt buộc
    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Email và mật khẩu không được để trống',
      });
    }

    // Validate email format
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return res.status(400).json({
        status: 'error',
        message: emailValidation.message,
      });
    }

    // Normalize email khi login (giống hệt register)
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return res.status(400).json({
        status: 'error',
        message: 'Email không được để trống',
      });
    }

    // Kiểm tra password không rỗng
    if (!password.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Mật khẩu không được để trống',
      });
    }

    // Select password khi login (vì password có select: false)
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      // Khong leak thong tin - tra cung message cho ca email/password sai
      return res.status(401).json({
        status: 'error',
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    // So sánh password bằng bcrypt.compare
    const isPasswordValid = await bcrypt.compare(password.trim(), user.password);
    if (!isPasswordValid) {
      // Khong leak thong tin - tra cung message cho ca email/password sai
      return res.status(401).json({
        status: 'error',
        message: 'Email hoặc mật khẩu không đúng',
      });
    }

    // JWT_SECRET đã được check ở app start (fail fast)
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is missing');
      return res.status(500).json({
        status: 'error',
        message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
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
      message: 'Đăng nhập thành công!',
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
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
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
      message: 'Thành công',
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
      message: 'Lỗi hệ thống. Vui lòng thử lại sau.',
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
};
