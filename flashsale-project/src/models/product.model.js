const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    product_id: {
      type: Number,
      required: true,
      unique: true,
    },
    product_name: {
      type: String,
      required: true,
      trim: true,
    },
    product_price: {
      type: Number,
      required: true,
      min: 0,
    },
    product_thumb: {
      type: String,
      required: true,
    },
    product_description: {
      type: String,
      trim: true,
    },
    product_quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Tạo index cho product_id để tối ưu query
productSchema.index({ product_id: 1 });

module.exports = mongoose.model('Product', productSchema);
