const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

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

module.exports = router;
