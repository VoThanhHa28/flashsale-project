const bcrypt = require('bcrypt');
const UserRepo = require('../repositories/user.repo');
const { BadRequestError, NotFoundError } = require('../core/error.response');
const CONST = require('../constants');

const getMe = async (userId) => {
  const user = await UserRepo.findById(userId);
  if (!user) {
    throw new NotFoundError(CONST.USER.MESSAGE.USER_NOT_FOUND);
  }
  return { user };
};

const updateMe = async (userId, payload) => {
  const allowed = { name: payload.name, address: payload.address, avatar: payload.avatar };
  if (allowed.name === undefined) delete allowed.name;
  if (allowed.address === undefined) delete allowed.address;
  if (allowed.avatar === undefined) delete allowed.avatar;
  const user = await UserRepo.updateById(userId, allowed);
  if (!user) {
    throw new NotFoundError(CONST.USER.MESSAGE.USER_NOT_FOUND);
  }
  return { user };
};

const changePassword = async (userId, { oldPassword, newPassword }) => {
  const user = await UserRepo.findById(userId, { includePassword: true });
  if (!user) {
    throw new NotFoundError(CONST.USER.MESSAGE.USER_NOT_FOUND);
  }
  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new BadRequestError(CONST.USER.MESSAGE.OLD_PASSWORD_WRONG);
  }
  const saltRounds = 10;
  const hashed = await bcrypt.hash(newPassword, saltRounds);
  await UserRepo.updatePasswordById(userId, hashed);
  return { message: CONST.USER.MESSAGE.CHANGE_PASSWORD_SUCCESS };
};

module.exports = {
  getMe,
  updateMe,
  changePassword,
};
