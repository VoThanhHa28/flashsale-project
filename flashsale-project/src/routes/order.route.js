const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/order.controller');

// Định nghĩa route con
// URL thực tế sẽ là: POST /v1/api/order/ (vì được ghép từ index.js)
router.post('/', OrderController.placeOrder);

// Ví dụ sau này thêm: Lấy lịch sử đơn hàng
// router.get('/history', OrderController.getHistory); 
// -> URL: GET /v1/api/order/history

module.exports = router;