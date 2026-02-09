require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const connectDB = require('./src/config/db');
connectDB(); // Gọi hàm kết nối ngay

const indexRouter = require('./src/routes/index');
const usersRouter = require('./src/routes/users');
const productRouter = require('./src/routes/product.route');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/v1/api', productRouter);

module.exports = app;
