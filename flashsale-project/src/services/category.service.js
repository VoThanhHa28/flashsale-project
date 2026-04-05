const Category = require('../models/category.model');

class CategoryService {
  static async listCategories() {
    return Category.find({ is_deleted: false, isActive: true })
      .sort({ sortOrder: 1, categoryName: 1 })
      .lean();
  }
}

module.exports = CategoryService;