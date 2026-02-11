require('dotenv').config()

// JWT_SECRET - Fail fast khi start
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in environment variables');
}

var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

const connectDB = require('./src/config/db');
connectDB(); // Gọi hàm kết nối ngay

var indexRouter = require('./src/routes/index');
var usersRouter = require('./src/routes/users');
var authRouter = require('./src/routes/auth.route');

var app = express();

// CORS configuration - Cho phép frontend kết nối
// Hỗ trợ cả port 3000 và 3001 để tránh conflict
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3001',
  'http://localhost:3000',
  'http://localhost:3001'
];

app.use(cors({
  origin: function (origin, callback) {
    // Cho phép requests không có origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Cho phép tất cả trong development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/v1/api/auth', authRouter);

module.exports = app;
