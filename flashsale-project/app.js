require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

// Import đúng chuẩn
const connectDB = require('./src/config/db');
const InventoryService = require('./src/services/inventory.service'); // Nhớ import cái này

// Route tổng (Gom lại cho gọn app.js)
const rootRouter = require('./src/routes/index'); 

const app = express();

// 1. Kết nối DB & Init Redis
// Lưu ý: connectDB là async, nên logic init phải nằm trong .then()
connectDB().then(() => {
    // Chỉ nạp kho khi DB đã kết nối thành công
    InventoryService.initInventory();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// 2. Setup Routes (Nên gom hết vào file routes/index.js như đã bàn)
// Thay vì app.use từng cái lẻ tẻ, hãy dùng 1 dòng này:
app.use('/', rootRouter); 
// (Trong file routes/index.js bạn sẽ khai báo: router.use('/v1/api', productRouter), router.use('/v1/api', orderRouter)...)

module.exports = app;
