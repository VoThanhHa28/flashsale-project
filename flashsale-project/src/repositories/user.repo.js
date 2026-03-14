const User = require('../models/user.model');

const findById = async (id, options = {}) => {
  let query = User.findOne({ _id: id, is_deleted: false });
  if (options.includePassword) {
    query = query.select('+password');
  }
  return query.lean();
};

const updateById = async (id, update) => {
  const user = await User.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { $set: update },
    { new: true, runValidators: true }
  )
    .select('-password')
    .lean();
  return user;
};

const updatePasswordById = async (id, hashedPassword) => {
  await User.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { $set: { password: hashedPassword } }
  );
};

/**
 * Danh sách user phân trang (không trả password).
 * @param {{ page?: number, limit?: number, filter?: object }} options
 */
const findAllPaginated = async (options = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
  const skip = (page - 1) * limit;
  const filter = { ...(options.filter || {}), is_deleted: false };

  const [users, total] = await Promise.all([
    User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  return { users, total, page, limit };
};

/**
 * Cập nhật status user (vd inactive để ban).
 */
const updateStatusById = async (id, status) => {
  const user = await User.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { $set: { status } },
    { new: true, runValidators: true }
  )
    .select('-password')
    .lean();
  return user;
};

/**
 * Cập nhật role của user.
 */
const updateRoleById = async (id, role) => {
  const user = await User.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { $set: { usr_role: role } },
    { new: true, runValidators: true }
  )
    .select('-password')
    .lean();
  return user;
};

/**
 * Soft delete user (đặt is_deleted = true).
 */
const softDeleteById = async (id) => {
  const user = await User.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { $set: { is_deleted: true } },
    { new: true }
  )
    .select('-password')
    .lean();
  return user;
};

/**
 * Tìm user theo email.
 */
const findByEmail = async (email) => {
  return User.findOne({ email, is_deleted: false }).select('-password').lean();
};

/**
 * Tạo user mới.
 */
const create = async (userData) => {
  const user = await User.create(userData);
  const { password, ...userWithoutPassword } = user.toObject();
  return userWithoutPassword;
};

module.exports = {
  findById,
  updateById,
  updatePasswordById,
  findAllPaginated,
  updateStatusById,
  updateRoleById,
  softDeleteById,
  findByEmail,
  create,
};
