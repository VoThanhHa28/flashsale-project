/**
 * Tạo / cập nhật tài khoản Shop Admin (SHOP_ADMIN).
 * Chạy: npm run seed:admin
 *
 * Cần MongoDB + đã có role SHOP_ADMIN (khởi động app một lần để seedMasterData hoặc seed roles).
 *
 * Mật khẩu có thể ghi đè bằng biến môi trường SEED_SHOP_ADMIN_PASSWORD (khuyến nghị cho CI).
 */
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const connectDB = require("../config/db");
const CONST = require("../constants");

const EMAIL = "adminlam@gmail.com";
const NAME = "Admin Lam";
const PASSWORD = process.env.SEED_SHOP_ADMIN_PASSWORD || "Caotunglam040424@";

async function main() {
    try {
        await connectDB();

        const shopAdminRole = await Role.findOne({
            roleCode: CONST.AUTH.USR_ROLE.SHOP_ADMIN,
            is_deleted: false,
        }).lean();

        if (!shopAdminRole) {
            console.error("❌ Không tìm thấy role SHOP_ADMIN. Hãy chạy server một lần (seed master data) hoặc tạo role trong collection roles.");
            process.exit(1);
        }

        const passwordHash = await bcrypt.hash(PASSWORD, 10);

        const existing = await User.findOne({ email: EMAIL.toLowerCase(), is_deleted: false });

        if (existing) {
            existing.password = passwordHash;
            existing.usr_role = shopAdminRole._id;
            existing.name = NAME;
            await existing.save();
            console.log(`✅ Đã cập nhật tài khoản Shop Admin: ${EMAIL}`);
        } else {
            await User.create({
                email: EMAIL.toLowerCase(),
                password: passwordHash,
                name: NAME,
                usr_role: shopAdminRole._id,
            });
            console.log(`✅ Đã tạo tài khoản Shop Admin: ${EMAIL}`);
        }

        console.log("   Role: SHOP_ADMIN");
        console.log("   Đăng nhập bằng email + mật khẩu vừa seed.");
    } catch (err) {
        console.error("❌ Lỗi:", err.message);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

main();
