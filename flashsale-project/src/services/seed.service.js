const bcrypt = require('bcrypt');
const User = require('../models/user.model');
const CONST = require('../constants');

const seedUsers = async (count = CONST.SEED.SEED_COUNT) => {
  // Xóa user cũ (nếu có) để seed lại từ đầu
  const emailPattern = /^user\d+@test\.com$/;
  const deleteResult = await User.deleteMany({ email: emailPattern });
  console.log(`Đã xóa ${deleteResult.deletedCount} user cũ`);

  // Hash password một lần cho tất cả user (password mặc định: 123456)
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(CONST.SEED.DEFAULT_PASSWORD, saltRounds);

  // Tạo array user (không await từng vòng lặp)
  const users = [];
  for (let i = 1; i <= count; i++) {
    users.push({
      email: `${CONST.SEED.EMAIL_PREFIX}${i}${CONST.SEED.EMAIL_DOMAIN}`,
      password: hashedPassword, // Dùng chung password đã hash
      name: `User ${i}`,
      usr_role: 'USER', // Mặc định USER
    });
  }

  console.log(`Đang insert ${users.length} users...`);

  // InsertMany một lần (batch insert)
  try {
    const result = await User.insertMany(users, { ordered: false });
    console.log(`Insert thành công: ${result.length} users`);
    return {
      count: result.length,
      message: `Đã tạo ${result.length} users thành công`,
    };
  } catch (error) {
    console.error('InsertMany error:', error);
    // Nếu có lỗi duplicate hoặc lỗi khác, vẫn trả về số lượng đã insert được
    if (error.result && error.result.insertedCount !== undefined) {
      console.log(`Inserted count: ${error.result.insertedCount}`);
      return {
        count: error.result.insertedCount,
        message: `Đã tạo ${error.result.insertedCount} users thành công${error.writeErrors ? ` (có ${error.writeErrors.length} lỗi)` : ''}`,
      };
    }
    // Nếu không có insertedCount, throw error để error middleware xử lý
    console.error('Full error:', JSON.stringify(error, null, 2));
    throw error;
  }
};

module.exports = {
  seedUsers,
};
