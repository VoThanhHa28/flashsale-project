const User = require('../models/user.model');
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

    const holderUser = await User.findOne({ email }).lean();

    if (holderUser) {
      throw new ConflictRequestError(CONST.AUTH.MESSAGE.EMAIL_EXISTS);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      password: passwordHash
    });

    if (!newUser) {
      throw new BadRequestError(CONST.AUTH.MESSAGE.INTERNAL_ERROR);
    }

    return {
      user: {
        _id: newUser._id,
        email: newUser.email,
        name: newUser.name
      }
    };
  }

  // ================= LOGIN =================
  static async login({ email, password }) {
    console.log('LOGIN DB:', User.db.name);
    const user = await User.findOne({ email }).select('+password');

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
        name: user.name
      },
      accessToken
    };
  }

  // ================= GET ME =================
  static async getMe(userId) {

    const user = await User.findById(userId).select('-password').lean();

    if (!user) {
      throw new BadRequestError(CONST.AUTH.MESSAGE.USER_NOT_FOUND);
    }

    return user;
  }
}

module.exports = AuthService;
