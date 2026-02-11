var express = require('express');
var router = express.Router();
const OrderController = require('../controllers/order.controller');

/* GET home page. */
// Test server sống hay chết
router.get('/', (req, res) => {
  res.status(200).json({ 
    message: "Server FlashSale is running!", 
    status: "success" 
  });
});


// API Đặt hàng
// POST http://localhost:3000/v1/api/order
router.post('/v1/api/order', OrderController.placeOrder);

module.exports = router;
