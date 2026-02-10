const express = require('express');
const router = express.Router();

/**
 * GET users listing
 * GET /users
 */
router.get('/', (req, res) => {
  return res.status(200).json({
    code: 200,
    message: 'Success',
    metadata: {
      message: 'respond with a resource'
    }
  });
});

module.exports = router;
