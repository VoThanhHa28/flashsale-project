const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Kiểm tra MONGO_URI có tồn tại không
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in .env file');
    }

    // Kết nối với các options tốt hơn
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Tự động tạo index
      autoIndex: true,
      // Số lần thử lại kết nối
      maxPoolSize: 10,
      // Thời gian chờ kết nối (milliseconds)
      serverSelectionTimeoutMS: 5000,
      // Thời gian chờ socket (milliseconds)
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Xử lý sự kiện khi mất kết nối
    mongoose.connection.on('error', (err) => {
      console.error(`❌ MongoDB connection error: ${err.message}`);
    });

    // Xử lý sự kiện khi ngắt kết nối
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    // Xử lý khi ứng dụng tắt (Ctrl+C)
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.error('💡 Tips:');
    console.error('   1. Kiểm tra MongoDB đã được cài đặt và đang chạy');
    console.error('   2. Kiểm tra file .env có MONGO_URI không');
    console.error('   3. Kiểm tra MongoDB đang lắng nghe ở port 27017');
    process.exit(1);
  }
};

module.exports = connectDB;