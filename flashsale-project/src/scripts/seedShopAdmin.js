/**
 * Tạo / nâng cấp user SHOP_ADMIN cho môi trường dev (không production).
 * Chạy: node src/scripts/seedShopAdmin.js
 */

require("dotenv").config();
const path = require("path");
const connectDB = require(path.join(__dirname, "../config/db"));
const SeedService = require(path.join(__dirname, "../services/seed.service"));

(async () => {
    try {
        await connectDB();
        const result = await SeedService.seedShopAdminDev();
        console.log(JSON.stringify(result, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e.message || e);
        process.exit(1);
    }
})();
