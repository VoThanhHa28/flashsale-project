const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // An password mac dinh, chi select khi can (login)
    },
    name: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      trim: true,
      default: '',
    },
    usr_role: {
      type: String,
      enum: ['USER', 'SHOP_ADMIN'],
      default: 'USER',
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

module.exports = mongoose.model('User', userSchema);
