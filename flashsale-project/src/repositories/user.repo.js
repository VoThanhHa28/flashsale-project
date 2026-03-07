const User = require('../models/user.model');

const findById = async (id, options = {}) => {
  let query = User.findById(id);
  if (options.includePassword) {
    query = query.select('+password');
  }
  return query.lean();
};

const updateById = async (id, update) => {
  const user = await User.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: true }
  )
    .select('-password')
    .lean();
  return user;
};

const updatePasswordById = async (id, hashedPassword) => {
  await User.findByIdAndUpdate(id, { $set: { password: hashedPassword } });
};

/**
 * Danh sách user phân trang (không trả password).
 * @param {{ page?: number, limit?: number, filter?: object }} options
 */
const findAllPaginated = async (options = {}) => {
  const page = Math.max(1, Number(options.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 10));
  const skip = (page - 1) * limit;
  const filter = options.filter || {};

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
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { status } },
    { new: true, runValidators: true }
  )
    .select('-password')
    .lean();
  return user;
};

module.exports = {
  findById,
  updateById,
  updatePasswordById,
  findAllPaginated,
  updateStatusById,
};
