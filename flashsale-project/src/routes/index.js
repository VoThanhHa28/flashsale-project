const express = require('express');
const router = express.Router();

/**
 * GET home page
 * Test server sống hay chết
 * GET /
 */
router.get('/', (req, res) => {
  return res.status(200).json({
    code: 200,
    message: 'Server FlashSale is running!',
    metadata: {
      status: 'success'
    }
  });
});

module.exports = router;