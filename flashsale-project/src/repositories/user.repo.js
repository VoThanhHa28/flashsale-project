const User = require('../models/user.model');

const findById = async (id, options = {}) => {
  let query = User.findOne({ _id: id, is_deleted: false });
  if (options.includePassword) {
    query = query.select('+password');
  }
  return query.populate('usr_role', 'roleCode roleName').lean();
};

const updateById = async (id, update) => {
  const user = await User.findOneAndUpdate(
    { _id: id, is_deleted: false },
    { $set: update },
    { new: true, runValidators: true }
  )
    .select('-password')
    .populate('usr_role', 'roleCode roleName')
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
    User.find(filter).select('-password').populate('usr_role', 'roleCode roleName').sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
    .populate('usr_role', 'roleCode roleName')
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
