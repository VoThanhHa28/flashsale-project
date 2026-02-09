const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth');

/**
 * @route   POST /v1/api/auth/register
 * @desc    Đăng ký user mới
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /v1/api/auth/login
 * @desc    Đăng nhập
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /v1/api/auth/me
 * @desc    Lấy thông tin user hiện tại (API bảo mật - cần JWT)
 * @access  Private
 */
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
