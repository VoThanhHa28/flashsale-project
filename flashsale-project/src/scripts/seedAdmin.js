/**
 * Script tạo tài khoản ADMIN (Super Admin)
 * Chạy: npm run seed:admin
 * Email: admin@flashsale.com
 * Password: Admin@123456
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const connectDB = require("../config/db");

const ADMIN_EMAIL = "admin@flashsale.com";
const ADMIN_PASSWORD = "Admin@123456";
const ADMIN_NAME = "Super Admin";

/**
 * Tạo tài khoản ADMIN
 */
const seedAdmin = async () => {
    try {
        console.log("🚀 Bắt đầu tạo tài khoản ADMIN...");

        await connectDB();
        console.log("✅ Đã kết nối MongoDB");

        const existingAdmin = await User.findOne({ 
            email: ADMIN_EMAIL, 
            is_deleted: false 
        });

        if (existingAdmin) {
            if (existingAdmin.usr_role === "ADMIN") {
                console.log("ℹ️  Tài khoản ADMIN đã tồn tại");
                console.log(`   Email: ${existingAdmin.email}`);
                console.log(`   Role: ${existingAdmin.usr_role}`);
            } else {
                console.log(`⚠️  Email ${ADMIN_EMAIL} đã tồn tại với role: ${existingAdmin.usr_role}`);
                console.log("🔄 Đang cập nhật role thành ADMIN...");
                
                existingAdmin.usr_role = "ADMIN";
                await existingAdmin.save();
                
                console.log("✅ Đã cập nhật role thành ADMIN");
            }
        } else {
            console.log("🔐 Đang hash password...");
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

            const admin = await User.create({
                email: ADMIN_EMAIL,
                password: hashedPassword,
                name: ADMIN_NAME,
                usr_role: "ADMIN",
                status: "active",
            });

            console.log("\n🎉 TẠO ADMIN THÀNH CÔNG!");
            console.log(`   ID: ${admin._id}`);
            console.log(`   Email: ${admin.email}`);
            console.log(`   Name: ${admin.name}`);
            console.log(`   Role: ${admin.usr_role}`);
        }

        console.log("\n💡 Thông tin đăng nhập:");
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log("\n📌 Quyền của ADMIN:");
        console.log("   - Tất cả quyền của SHOP_ADMIN");
        console.log("   - Quản lý SHOP_ADMIN (tạo/xóa)");
        console.log("   - Thay đổi role của users");

    } catch (error) {
        console.error("❌ Lỗi khi tạo ADMIN:", error.message);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log("\n👋 Đã đóng kết nối MongoDB");
        process.exit(0);
    }
};

/**
 * Xóa tài khoản ADMIN
 */
const deleteAdmin = async () => {
    try {
        console.log("🗑️  Bắt đầu xóa tài khoản ADMIN...");

        await connectDB();
        console.log("✅ Đã kết nối MongoDB");

        const result = await User.deleteOne({ email: ADMIN_EMAIL });

        if (result.deletedCount > 0) {
            console.log("✅ Đã xóa tài khoản ADMIN");
        } else {
            console.log("ℹ️  Không tìm thấy tài khoản ADMIN để xóa");
        }

    } catch (error) {
        console.error("❌ Lỗi khi xóa ADMIN:", error.message);
        throw error;
    } finally {
        await mongoose.connection.close();
        console.log("\n👋 Đã đóng kết nối MongoDB");
        process.exit(0);
    }
};

const command = process.argv[2];

if (command === "delete") {
    deleteAdmin();
} else {
    seedAdmin();
}
