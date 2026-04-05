const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema(
  {
    roleCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    roleName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'roles',
  }
);

roleSchema.index({ roleCode: 1, isActive: 1 });

module.exports = mongoose.model('Role', roleSchema);