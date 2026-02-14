const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const validate = require('../middlewares/validate.middleware');
const userValidation = require('../validation/user.validation');
const { verifyToken } = require('../middlewares/auth');

/**
 * @route   GET /v1/api/users/me
 * @desc    Lấy thông tin user hiện tại
 * @access  Private
 */
router.get('/me', verifyToken, userController.getMe);

/**
 * @route   PUT /v1/api/users/me
 * @desc    Cập nhật profile (name, address) – không sửa role
 * @access  Private
 */
router.put('/me', verifyToken, validate(userValidation.updateMe), userController.updateMe);

/**
 * @route   POST /v1/api/users/change-password
 * @desc    Đổi mật khẩu
 * @access  Private
 */
router.post('/change-password', verifyToken, validate(userValidation.changePassword), userController.changePassword);

module.exports = router;
