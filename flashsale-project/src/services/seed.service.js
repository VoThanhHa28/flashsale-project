const User = require("../models/user.model");
const Role = require("../models/role.model");
const Category = require("../models/category.model");
const bcrypt = require("bcrypt");
const { BadRequestError } = require("../core/error.response");
const CONST = require("../constants");

class SeedService {
    static async getRoleIdByCode(roleCode) {
        const role = await Role.findOne({ roleCode, is_deleted: false }).lean();

        if (!role) {
            throw new BadRequestError(`Không tìm thấy role ${roleCode}. Hãy seed master data trước.`);
        }

        return role._id;
    }

    static async seedMasterData() {
        const roleSeeds = [
            {
                roleCode: CONST.AUTH.USR_ROLE.USER,
                roleName: "User",
                description: "Người dùng thông thường",
            },
            {
                roleCode: CONST.AUTH.USR_ROLE.SHOP_ADMIN,
                roleName: "Shop Admin",
                description: "Quản trị cửa hàng",
            },
        ];

        const categorySeeds = [
            {
                categoryName: "Điện thoại",
                categorySlug: "dien-thoai",
                sortOrder: 1,
            },
            {
                categoryName: "Laptop",
                categorySlug: "laptop",
                sortOrder: 2,
            },
        ];

        await Promise.all([
            Role.bulkWrite(
                roleSeeds.map((role) => ({
                    updateOne: {
                        filter: { roleCode: role.roleCode },
                        update: { $setOnInsert: role },
                        upsert: true,
                    },
                }))
            ),
            Category.bulkWrite(
                categorySeeds.map((category) => ({
                    updateOne: {
                        filter: { categorySlug: category.categorySlug },
                        update: { $setOnInsert: category },
                        upsert: true,
                    },
                }))
            ),
        ]);

        const [roles, categories] = await Promise.all([
            Role.find({ is_deleted: false }).sort({ roleCode: 1 }).lean(),
            Category.find({ is_deleted: false }).sort({ sortOrder: 1, categoryName: 1 }).lean(),
        ]);

        return {
            roles,
            categories,
        };
    }

    /**
     * Tạo số lượng lớn users để test load
     * @param {Number} count - Số lượng users cần tạo
     */
    static async seedUsers(count = 1000) {
        if (count < 1 || count > 10000) {
            throw new BadRequestError("Số lượng users phải từ 1 đến 10000");
        }

        console.log(`[Seed] Bắt đầu tạo ${count} test users...`);

        // Hash password một lần duy nhất để tăng tốc
        const passwordHash = await bcrypt.hash("123456", 10);
        const defaultRoleId = await this.getRoleIdByCode(CONST.AUTH.USR_ROLE.USER);

        // Tạo batch users
        const users = [];
        const timestamp = Date.now();

        for (let i = 1; i <= count; i++) {
            users.push({
                email: `testuser${timestamp}_${i}@flashsale.test`,
                password: passwordHash,
                name: `Test User ${i}`,
                usr_role: defaultRoleId,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            // Insert theo batch 100 users để tránh quá tải
            if (i % 100 === 0 || i === count) {
                try {
                    await User.insertMany(users, { ordered: false });
                    console.log(`[Seed] Đã tạo ${i}/${count} users...`);
                    users.length = 0; // Clear array
                } catch (error) {
                    // Ignore duplicate errors
                    if (error.code !== 11000) {
                        console.error(`[Seed] Lỗi khi tạo batch ${i}:`, error.message);
                    }
                }
            }
        }

        // Đếm số users đã tạo
        const totalUsers = await User.countDocuments({
            email: { $regex: `testuser${timestamp}_` },
        });

        console.log(`[Seed] ✅ Hoàn thành! Đã tạo ${totalUsers} users`);

        return {
            created: totalUsers,
            defaultPassword: "123456",
            emailPattern: `testuser${timestamp}_[1-${count}]@flashsale.test`,
            timestamp,
        };
    }

    /**
     * Xóa tất cả users test (có email chứa pattern test)
     */
    static async cleanupTestUsers() {
        console.log("[Seed] Bắt đầu xóa test users...");

        const result = await User.deleteMany({
            email: { $regex: /@flashsale\.test$/ },
        });

        console.log(`[Seed] ✅ Đã xóa ${result.deletedCount} test users`);

        return {
            deleted: result.deletedCount,
        };
    }

    /**
     * Lấy danh sách user IDs để test
     * @param {Number} limit - Số lượng user IDs cần lấy
     */
    static async getTestUserIds(limit = 100) {
        const users = await User.find({ email: { $regex: /@flashsale\.test$/ } }, { _id: 1 })
            .limit(limit)
            .lean();

        return users.map((u) => u._id.toString());
    }

    /**
     * Tạo hoặc nâng cấp user dev có role SHOP_ADMIN (Postman / QA).
     * Chặn khi NODE_ENV=production.
     * Mật khẩu mặc định thỏa rule đăng ký: hoa, thường, số, ký tự đặc biệt.
     */
    static async seedShopAdminDev() {
        if (process.env.NODE_ENV === "production") {
            throw new BadRequestError("seed shop-admin không được bật trong production.");
        }

        const adminRoleId = await this.getRoleIdByCode(CONST.AUTH.USR_ROLE.SHOP_ADMIN);
        const email = (process.env.SEED_SHOP_ADMIN_EMAIL || "shopadmin@flashsale.local").toLowerCase().trim();
        const password = process.env.SEED_SHOP_ADMIN_PASSWORD || "DevShop1!";
        const passwordHash = await bcrypt.hash(password, 10);

        const existing = await User.findOne({ email, is_deleted: false });
        if (existing) {
            await User.updateOne(
                { _id: existing._id },
                { $set: { usr_role: adminRoleId, password: passwordHash } },
            );
            return {
                email,
                password,
                role: CONST.AUTH.USR_ROLE.SHOP_ADMIN,
                updated: true,
                hint: "Đăng nhập POST /v1/api/auth/login rồi dùng accessToken cho các API SHOP_ADMIN.",
            };
        }

        await User.create({
            email,
            password: passwordHash,
            name: "Shop Admin (dev seed)",
            usr_role: adminRoleId,
        });

        return {
            email,
            password,
            role: CONST.AUTH.USR_ROLE.SHOP_ADMIN,
            updated: false,
            hint: "Đăng nhập POST /v1/api/auth/login rồi dùng accessToken cho các API SHOP_ADMIN.",
        };
    }
}

module.exports = SeedService;
