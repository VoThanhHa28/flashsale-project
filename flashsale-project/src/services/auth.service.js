const User = require('../models/user.model');
const Role = require('../models/role.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { 
  ConflictRequestError,
  BadRequestError,
  AuthFailureError 
} = require('../core/error.response');

const CONST = require('../constants');

class AuthService {

  // ================= REGISTER =================
  static async register({ email, password, name }) {
    console.log('REGISTER DB:', User.db.name);

    const holderUser = await User.findOne({ email, is_deleted: false }).lean();

    if (holderUser) {
      throw new ConflictRequestError(CONST.AUTH.MESSAGE.EMAIL_EXISTS);
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const defaultRole = await Role.findOne({ roleCode: CONST.AUTH.USR_ROLE.USER, is_deleted: false }).lean();

    if (!defaultRole) {
      throw new BadRequestError('Chưa seed role USER. Hãy khởi tạo master data trước.');
    }

    const newUser = await User.create({
      name,
      email,
      password: passwordHash,
      usr_role: defaultRole._id
    });

    if (!newUser) {
      throw new BadRequestError(CONST.AUTH.MESSAGE.INTERNAL_ERROR);
    }

    return {
      user: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        usr_role: defaultRole
      }
    };
  }

  // ================= LOGIN =================
  static async login({ email, password }) {
    console.log('LOGIN DB:', User.db.name);
    const user = await User.findOne({ email, is_deleted: false }).select('+password').populate('usr_role', 'roleCode roleName');

    if (!user) {
      throw new AuthFailureError(CONST.AUTH.MESSAGE.INVALID_CREDENTIALS);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new AuthFailureError(CONST.AUTH.MESSAGE.INVALID_CREDENTIALS);
    }

    // Tạo JWT
    const accessToken = jwt.sign(
      {
        userId: user._id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '1d' }
    );

    console.log('Collection:', User.collection.name);

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        usr_role: user.usr_role
      },
      accessToken
    };
  }

  // ================= GET ME =================
  static async getMe(userId) {

    const user = await User.findOne({ _id: userId, is_deleted: false }).select('-password').populate('usr_role', 'roleCode roleName').lean();

    if (!user) {
      throw new BadRequestError(CONST.AUTH.MESSAGE.USER_NOT_FOUND);
    }

    return user;
  }
}

module.exports = AuthService;
