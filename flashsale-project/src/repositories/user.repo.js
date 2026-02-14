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

module.exports = {
  findById,
  updateById,
  updatePasswordById,
};
