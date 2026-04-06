/**
 * Script extend flash sale time cho tất cả products
 * Chạy: node src/scripts/extendFlashSale.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const FlashSaleCampaign = require("../models/flashSaleCampaign.model");
const connectDB = require("../config/db");
const redisClient = require("../config/redis");
const CONST = require("../constants");

async function extendFlashSale() {
    try {
        console.log("⏰ Bắt đầu extend thời gian chiến dịch Flash Sale...\n");

        await connectDB();
        console.log("✅ Đã kết nối MongoDB");

        console.log("✅ Redis sẵn sàng");

        const campaigns = await FlashSaleCampaign.find({ is_deleted: false });
        console.log(`\n📦 Tìm thấy ${campaigns.length} chiến dịch`);

        if (campaigns.length === 0) {
            console.log("⚠️  Không có chiến dịch nào!");
            console.log("💡 Chạy: npm run seed:products");
            return;
        }

        const now = new Date();
        const startTime = now;
        const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        console.log(`\n⏰ Thời gian mới:`);
        console.log(`   Start: ${startTime.toISOString()}`);
        console.log(`   End: ${endTime.toISOString()}`);
        console.log("");

        let updated = 0;
        for (const c of campaigns) {
            c.startTime = startTime;
            c.endTime = endTime;
            c.status = "running";
            await c.save();
            for (const pid of c.productIds) {
                await redisClient.del(CONST.REDIS.PRODUCT_INFO(String(pid)));
            }
            updated++;
            console.log(`✅ [${updated}/${campaigns.length}] ${c.campaignName}`);
        }

        console.log("\n🎉 HOÀN THÀNH!");
        console.log(`✅ Đã cập nhật ${updated} chiến dịch`);
        console.log(`⏰ Kết thúc dự kiến: ${endTime.toLocaleString("vi-VN")}`);
        console.log("\n💡 Giờ có thể tạo order mới (sản phẩm trong chiến dịch)!");
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
