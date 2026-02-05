const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

/**
 * @route   POST /v1/api/auth/login
 * @desc    Đăng nhập
 * @access  Public
 */
router.post('/login', authController.login);

module.exports = router;
