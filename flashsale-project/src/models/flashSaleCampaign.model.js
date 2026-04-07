const mongoose = require('mongoose');

const flashSaleCampaignSchema = new mongoose.Schema(
  {
    campaignName: {
      type: String,
      required: true,
      trim: true,
    },
    productIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
      default: [],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length > 0;
        },
        message: 'productIds must be a non-empty array',
      },
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
      validate: {
        validator: function (value) {
          return !this.startTime || value > this.startTime;
        },
        message: 'endTime must be greater than startTime',
      },
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'running', 'ended', 'inactive'],
      default: 'draft',
      index: true,
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
    collection: 'flash_sale_campaigns',
  }
);

flashSaleCampaignSchema.index({ isActive: 1, startTime: 1, endTime: 1 });
flashSaleCampaignSchema.index({ productIds: 1, is_deleted: 1, isActive: 1 });

module.exports = mongoose.model('FlashSaleCampaign', flashSaleCampaignSchema);