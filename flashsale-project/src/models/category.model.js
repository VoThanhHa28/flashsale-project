const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    categoryName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    categorySlug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: 0,
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
    collection: 'categories',
  }
);

categorySchema.index({ isActive: 1, sortOrder: 1, categoryName: 1 });

module.exports = mongoose.model('Category', categorySchema);