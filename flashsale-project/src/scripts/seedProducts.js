/**
 * Script tạo dữ liệu sản phẩm giả để test
 * Chạy: npm run seed:products
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/product.model');
const connectDB = require('../config/db');

// Dữ liệu sản phẩm giả
const FAKE_PRODUCTS = [
  {
    productName: 'iPhone 15',
    productThumb: 'https://example.com/images/iphone15.jpg',
    productDescription: 'Apple iPhone 15 128GB - Điện thoại thông minh cao cấp với chip A17 Pro, camera 48MP, màn hình Super Retina XDR 6.1 inch',
    productPrice: 20000000,
    productQuantity: 10,
  },
  {
    productName: 'iPhone 15 Pro',
    productThumb: 'https://example.com/images/iphone15pro.jpg',
    productDescription: 'Apple iPhone 15 Pro 256GB - Flagship với chip A17 Pro, camera 48MP Pro, màn hình ProMotion 120Hz, khung titan',
    productPrice: 28000000,
    productQuantity: 8,
  },
  {
    productName: 'Samsung Galaxy S24',
    productThumb: 'https://example.com/images/galaxy-s24.jpg',
    productDescription: 'Samsung Galaxy S24 256GB - Điện thoại Android flagship với chip Snapdragon 8 Gen 3, camera 50MP, màn hình Dynamic AMOLED 2X',
    productPrice: 18000000,
    productQuantity: 15,
  },
  {
    productName: 'Samsung Galaxy S24 Ultra',
    productThumb: 'https://example.com/images/galaxy-s24-ultra.jpg',
    productDescription: 'Samsung Galaxy S24 Ultra 512GB - Flagship cao cấp với bút S Pen, camera 200MP, màn hình 6.8 inch, chip Snapdragon 8 Gen 3',
    productPrice: 32000000,
    productQuantity: 5,
  },
  {
    productName: 'Xiaomi 14',
    productThumb: 'https://example.com/images/xiaomi14.jpg',
    productDescription: 'Xiaomi 14 256GB - Điện thoại Android với chip Snapdragon 8 Gen 3, camera Leica 50MP, màn hình AMOLED 6.36 inch',
    productPrice: 15000000,
    productQuantity: 20,
  },
  {
    productName: 'Oppo Find X7',
    productThumb: 'https://example.com/images/oppo-find-x7.jpg',
    productDescription: 'Oppo Find X7 256GB - Flagship với chip MediaTek Dimensity 9300, camera Hasselblad 50MP, sạc nhanh 100W',
    productPrice: 16000000,
    productQuantity: 12,
  },
  {
    productName: 'Vivo X100 Pro',
    productThumb: 'https://example.com/images/vivo-x100-pro.jpg',
    productDescription: 'Vivo X100 Pro 512GB - Flagship với chip MediaTek Dimensity 9300, camera Zeiss 50MP, màn hình AMOLED 6.78 inch',
    productPrice: 22000000,
    productQuantity: 7,
  },
  {
    productName: 'Realme GT 5 Pro',
    productThumb: 'https://example.com/images/realme-gt5-pro.jpg',
    productDescription: 'Realme GT 5 Pro 256GB - Flagship với chip Snapdragon 8 Gen 3, camera Sony IMX890 50MP, sạc nhanh 100W',
    productPrice: 14000000,
    productQuantity: 18,
  },
  {
    productName: 'Google Pixel 8 Pro',
    productThumb: 'https://example.com/images/pixel8-pro.jpg',
    productDescription: 'Google Pixel 8 Pro 256GB - Flagship Android với chip Tensor G3, camera 50MP với Magic Eraser, màn hình LTPO OLED',
    productPrice: 24000000,
    productQuantity: 6,
  },
  {
    productName: 'Asus ROG Phone 7',
    productThumb: 'https://example.com/images/rog-phone7.jpg',
    productDescription: 'Asus ROG Phone 7 512GB - Điện thoại gaming với chip Snapdragon 8 Gen 2, màn hình AMOLED 165Hz, hệ thống làm mát AirTrigger',
    productPrice: 19000000,
    productQuantity: 9,
  },
];

/**
 * Seed products vào database
 */
async function seedProducts() {
  try {
    console.log('🔍 Bắt đầu seed dữ liệu sản phẩm...\n');

    // Kết nối database
    await connectDB();

    // Xóa tất cả sản phẩm cũ (optional - có thể comment nếu muốn giữ lại)
    const deletedCount = await Product.deleteMany({});
    console.log(`🗑️  Đã xóa ${deletedCount.deletedCount} sản phẩm cũ\n`);

    // Tạo sản phẩm mới
    console.log(`📦 Đang tạo ${FAKE_PRODUCTS.length} sản phẩm...\n`);
    const products = await Product.insertMany(FAKE_PRODUCTS);

    console.log('✅ Đã tạo thành công các sản phẩm:\n');
    products.forEach((product, index) => {
      console.log(`${index + 1}. ${product.productName} - ${product.productPrice.toLocaleString('vi-VN')} VNĐ - SL: ${product.productQuantity}`);
    });

    console.log(`\n✅ Tổng cộng: ${products.length} sản phẩm đã được tạo`);
    console.log('✅ Seed dữ liệu hoàn tất!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi seed dữ liệu:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Chạy seed
seedProducts();