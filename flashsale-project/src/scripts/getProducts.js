/**
 * Script lấy danh sách product IDs từ database
 * Chạy: node src/scripts/getProducts.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/product.model");
const connectDB = require("../config/db");

async function getProducts() {
    try {
        console.log("🔍 Đang kết nối database...");
        await connectDB();
        console.log("✅ Đã kết nối MongoDB");

        const products = await Product.find().lean();

        if (products.length === 0) {
            console.log("");
            console.log("⚠️  Không có sản phẩm nào trong database!");
            console.log("💡 Chạy lệnh sau để seed products:");
            console.log("   npm run seed:products");
            return;
        }

        console.log("");
        console.log(`📦 Tìm thấy ${products.length} sản phẩm:\n`);

        // In danh sách products
        products.forEach((p, index) => {
            console.log(`${index + 1}. ${p.productName}`);
            console.log(`   ID: ${p._id}`);
            console.log(`   Giá: ${p.productPrice.toLocaleString("vi-VN")} VNĐ`);
            console.log(`   Số lượng: ${p.productQuantity}`);
            console.log("");
        });

        // Tạo array cho K6 test
        console.log("📝 Copy dòng sau vào K6 test file (order.load.test.auth.js):");
        console.log("");
        console.log("const PRODUCTS = [");
        products.forEach((p) => {
            console.log(`    { id: "${p._id}", price: ${p.productPrice} }, // ${p.productName}`);
        });
        console.log("];");
    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    } finally {
        await mongoose.connection.close();
        console.log("\n👋 Đã đóng kết nối MongoDB");
        process.exit(0);
    }
}

getProducts();
