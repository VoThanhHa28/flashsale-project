const express = require('express');
const router = express.Router();

// Import các route con
const orderRouter = require('./order.route');

// const productRouter = require('./product.route'); // Của Member 3
const authRouter = require('./auth.route');
const userRouter = require('./user.route');
const productRouter = require('./product.route');
const seedRouter = require('./seed.route');

// 1. Route kiểm tra Server sống hay chết (Health Check)
router.get('/', (req, res) => {
    return res.status(200).json({
        status: 'success',
        message: 'Server FlashSale is running! 🚀',
    });
});

// 2. Gom các route con lại (Router chính)
// Cấu trúc: router.use('đường_dẫn_chung', file_route_con)

router.use('/v1/api/order', orderRouter); 
// -> Tất cả gì bắt đầu bằng /v1/api/order sẽ chạy vào file order.route.js

// Định nghĩa resource name ở đây
router.use('/v1/api/products', productRouter);

router.use('/v1/api/auth', authRouter);
router.use('/v1/api/users', userRouter);
router.use('/seed', seedRouter);

module.exports = router;