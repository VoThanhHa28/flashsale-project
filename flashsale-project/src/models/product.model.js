const mongoose = require('mongoose');

/**
 * Product Schema
 * LÆ°u thÃ´ng tin sáº£n pháº©m trong há»‡ thá»‘ng FlashSale
 */

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [1, 'Product name must be at least 1 character'],
      maxlength: [200, 'Product name cannot exceed 200 characters'],
      validate: {
        validator: function (v) {
          return v && v.trim().length > 0;
        },
        message: 'Product name cannot be empty or whitespace only',
      },
    },
    productThumb: {
      type: String,
      required: [true, 'Product thumbnail URL is required'],
      trim: true,
      validate: {
        // Nới lỏng validate: chỉ cần string không rỗng, không bắt buộc HTTP/HTTPS URL
        validator: function (v) {
          return typeof v === 'string' && v.trim().length > 0;
        },
        message: 'Product thumbnail URL cannot be empty',
      },
    },
    productDescription: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
      minlength: [1, 'Product description must be at least 1 character'],
      maxlength: [2000, 'Product description cannot exceed 2000 characters'],
      validate: {
        validator: function (v) {
          return v && v.trim().length > 0;
        },
        message: 'Product description cannot be empty or whitespace only',
      },
    },
    productPrice: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [0, 'Product price must be greater than or equal to 0'],
      max: [999999999999, 'Product price cannot exceed 999999999999'],
      validate: {
        validator: function (v) {
          return Number.isFinite(v) && v >= 0 && v <= 999999999999;
        },
        message: 'Product price must be a valid number between 0 and 999999999999',
      },
    },
    productQuantity: {
      type: Number,
      required: [true, 'Product quantity is required'],
      min: [0, 'Product quantity must be greater than or equal to 0'],
      max: [999999, 'Product quantity cannot exceed 999999'],
      validate: {
        validator: function (v) {
          return Number.isInteger(v) && v >= 0 && v <= 999999;
        },
        message: 'Product quantity must be a non-negative integer between 0 and 999999',
      },
    },
    isPublished: { 
        type: Boolean, 
        default: true, 
        index: true // Đánh index để lọc nhanh sp đang bán
      },
    productStartTime: { 
      type: Date, 
      required: true, 
      default: Date.now, // Mặc định là bán ngay
      index: true // Để sort theo giờ mở bán
    },
    productEndTime: { 
      type: Date, 
      required: true, 
      default: () => new Date(+new Date() + 7*24*60*60*1000) // Mặc định 7 ngày sau hết hạn
    },
  },
  {
    timestamps: true,
    collection: 'products' // Định danh rõ tên Collection
  }
);

// Tạo index để tìm kiếm nhanh hơn
productSchema.index({ productName: 'text' });
productSchema.index({ productPrice: 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ productQuantity: 1 });
productSchema.index({ isPublished: 1, productStartTime: 1 });
const Product = mongoose.model('Product', productSchema);

module.exports = Product;