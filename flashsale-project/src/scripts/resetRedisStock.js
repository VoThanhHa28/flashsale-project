/**
 * Reset stock Redis từ productQuantity trong MongoDB.
 * Dùng trước khi chạy lại k6 để tránh Redis còn 0 từ lần test trước.
 *
 * Chạy: node src/scripts/resetRedisStock.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("../models/product.model");
const redisClient = require("../config/redis");
const connectDB = require("../config/db");
const CONST = require("../constants");

async function resetRedisStock() {
    try {
        console.log("🔄 Reset Redis stock từ MongoDB...");

        await connectDB();
        console.log("✅ Đã kết nối MongoDB");

        const products = await Product.find({ is_deleted: { $ne: true } })
            .select("_id productName productQuantity")
            .lean();

        if (!products.length) {
            console.log("⚠️  Không có sản phẩm để reset");
            return;
        }

        for (const p of products) {
            const stockKey = CONST.REDIS.PRODUCT_STOCK(p._id.toString());
            const infoKey = CONST.REDIS.PRODUCT_INFO(p._id.toString());
            const qty = Math.max(0, Math.floor(Number(p.productQuantity) || 0));

            await redisClient.set(stockKey, String(qty), { EX: CONST.PRODUCT.CACHE.TTL_STOCK });
            await redisClient.del(infoKey);

            console.log(`✅ ${p.productName}: ${qty}`);
        }

        console.log(`🎉 Hoàn tất! Đã reset ${products.length} sản phẩm.`);
    } catch (error) {
        console.error("❌ Lỗi reset Redis stock:", error.message);
        process.exitCode = 1;
    } finally {
        try {
            await mongoose.connection.close();
        } catch (_) {}
        try {
            await redisClient.quit();
        } catch (_) {}
        process.exit(process.exitCode || 0);
    }
}

resetRedisStock();
