/**
 * Script extend flash sale time cho tất cả products
 * Chạy: node src/scripts/extendFlashSale.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/product.model");
const connectDB = require("../config/db");
const redisClient = require("../config/redis");

async function extendFlashSale() {
    try {
        console.log("⏰ Bắt đầu extend flash sale time...\n");

        // Kết nối database
        await connectDB();
        console.log("✅ Đã kết nối MongoDB");

        // Redis đã kết nối tự động qua module
        console.log("✅ Redis sẵn sàng");

        // Lấy tất cả products
        const products = await Product.find({});
        console.log(`\n📦 Tìm thấy ${products.length} products`);

        if (products.length === 0) {
            console.log("⚠️  Không có products nào!");
            console.log("💡 Chạy: npm run seed:products");
            return;
        }

        // Extend time: Start = now, End = now + 24 hours
        const now = new Date();
        const startTime = now;
        const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours

        console.log(`\n⏰ Thời gian mới:`);
        console.log(`   Start: ${startTime.toISOString()}`);
        console.log(`   End: ${endTime.toISOString()}`);
        console.log("");

        // Update tất cả products
        let updated = 0;
        for (const product of products) {
            await Product.findByIdAndUpdate(product._id, {
                productStartTime: startTime,
                productEndTime: endTime,
            });

            // Clear Redis cache cho product này
            const keyInfo = `product:${product._id}:info`;
            await redisClient.del(keyInfo);

            updated++;
            console.log(`✅ [${updated}/${products.length}] Updated: ${product.productName}`);
        }

        console.log("\n🎉 HOÀN THÀNH!");
        console.log(`✅ Đã extend flash sale cho ${updated} products`);
        console.log(`⏰ Flash sale sẽ kéo dài đến: ${endTime.toLocaleString("vi-VN")}`);
        console.log("\n💡 Giờ có thể tạo order mới!");
    } catch (error) {
        console.log("\n❌ Lỗi:", error.message);
    } finally {
        await mongoose.connection.close();
        await redisClient.quit();
        console.log("\n👋 Đã đóng kết nối");
        process.exit(0);
    }
}

extendFlashSale();
