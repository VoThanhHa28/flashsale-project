/**
 * Script tạo 1000 user test để load testing
 * Chạy: npm run seed:users
 * Email pattern: testuser{timestamp}_{1-1000}@flashsale.test
 * Password: 123456 (đã hash)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const connectDB = require("../config/db");

const BATCH_SIZE = 100; // Insert 100 users mỗi lần
const TOTAL_USERS = 1000;
const DEFAULT_PASSWORD = "123456";

/**
 * Tạo dữ liệu users
 */
const seedUsers = async () => {
    try {
        console.log("🚀 Bắt đầu seed users...");

        // Kết nối database
        await connectDB();
        console.log("✅ Đã kết nối MongoDB");

        // Xóa tất cả test users cũ trước
        const deleteResult = await User.deleteMany({
            email: { $regex: /@flashsale\.test$/ },
        });
        console.log(`🗑️  Đã xóa ${deleteResult.deletedCount} test users cũ`);

        // Hash password một lần duy nhất (tối ưu performance)
        console.log("🔐 Đang hash password...");
        const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
        console.log("✅ Password đã được hash");

        // Tạo timestamp để email unique
        const timestamp = Date.now();

        let totalCreated = 0;
        let batch = [];

        console.log(`📦 Bắt đầu tạo ${TOTAL_USERS} users (batch size: ${BATCH_SIZE})...`);

        // Tạo users theo batch
        for (let i = 1; i <= TOTAL_USERS; i++) {
            batch.push({
                email: `testuser${timestamp}_${i}@flashsale.test`,
                password: hashedPassword,
                name: `Test User ${i}`,
            });

            // Khi đủ batch size hoặc là user cuối cùng thì insert
            if (batch.length === BATCH_SIZE || i === TOTAL_USERS) {
                try {
                    const result = await User.insertMany(batch, { ordered: false });
                    totalCreated += result.length;
                    console.log(`✅ Đã tạo ${totalCreated}/${TOTAL_USERS} users...`);
                    batch = []; // Reset batch
                } catch (error) {
                    // Nếu có lỗi duplicate, vẫn tiếp tục
                    if (error.code === 11000) {
                        console.warn(`⚠️  Một số users đã tồn tại, bỏ qua...`);
                        totalCreated += batch.length;
                        batch = [];
                    } else {
                        throw error;
                    }
                }
            }
        }

        console.log("\n🎉 HOÀN THÀNH!");
        console.log(`✅ Đã tạo ${totalCreated} users`);
        console.log(`📧 Email pattern: testuser${timestamp}_{1-${TOTAL_USERS}}@flashsale.test`);
        console.log(`🔑 Password: ${DEFAULT_PASSWORD}`);
        console.log("\n💡 Hướng dẫn sử dụng:");
        console.log(`   - Login với email: testuser${timestamp}_1@flashsale.test`);
        console.log(`   - Password: ${DEFAULT_PASSWORD}`);
        console.log(`   - Có ${totalCreated} users từ _1 đến _${TOTAL_USERS}`);
        console.log("\n🗑️  Xóa test users: npm run seed:users:clean");
    } catch (error) {
        console.error("❌ Lỗi khi seed users:", error);
        throw error;
    } finally {
        // Đóng kết nối
        await mongoose.connection.close();
        console.log("\n👋 Đã đóng kết nối MongoDB");
        process.exit(0);
    }
};

/**
 * Xóa tất cả test users
 */
const cleanupTestUsers = async () => {
    try {
        console.log("🗑️  Bắt đầu xóa test users...");

        // Kết nối database
        await connectDB();
        console.log("✅ Đã kết nối MongoDB");

        // Xóa tất cả users có email kết thúc bằng @flashsale.test
        const result = await User.deleteMany({
            email: { $regex: /@flashsale\.test$/ },
        });

        console.log("\n🎉 HOÀN THÀNH!");
        console.log(`✅ Đã xóa ${result.deletedCount} test users`);
    } catch (error) {
        console.error("❌ Lỗi khi xóa test users:", error);
        throw error;
    } finally {
        // Đóng kết nối
        await mongoose.connection.close();
        console.log("\n👋 Đã đóng kết nối MongoDB");
        process.exit(0);
    }
};

// Chạy script
const command = process.argv[2];

if (command === "clean") {
    cleanupTestUsers();
} else {
    seedUsers();
}
