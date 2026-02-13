const express = require('express');
const router = express.Router();
const seedController = require('../controllers/seed.controller');

/**
 * @route   POST /seed/users
 * @desc    Seed 1000 users cho load test (Member 2 - K6)
 * @access  Public (có thể thêm middleware admin sau nếu cần)
 */
router.post('/users', seedController.seedUsers);

module.exports = router;
