var express = require('express');
var router = express.Router();

/* GET home page. */
// Test server sống hay chết
router.get('/', (req, res) => {
  res.status(200).json({ 
    message: "Server FlashSale is running!", 
    status: "success" 
  });
});

module.exports = router;