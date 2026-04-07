const Category = require('../models/category.model');
const { BadRequestError, NotFoundError } = require('../core/error.response');

const toSlug = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

class CategoryService {
  static async listCategories() {
    return Category.find({ is_deleted: false, isActive: true })
      .sort({ sortOrder: 1, categoryName: 1 })
      .lean();
  }

  static async getCategoryById(id) {
    const category = await Category.findOne({ _id: id, is_deleted: false }).lean();
    if (!category) {
      throw new NotFoundError('Không tìm thấy danh mục');
    }
    return { category };
  }

  static async createCategory(payload) {
    const categoryName = payload.categoryName?.trim();
    const categorySlug = payload.categorySlug ? toSlug(payload.categorySlug) : toSlug(categoryName);

    const existed = await Category.findOne({
      is_deleted: false,
      $or: [{ categoryName }, { categorySlug }],
    }).lean();

    if (existed) {
      throw new BadRequestError('Danh mục đã tồn tại');
    }

    const category = await Category.create({
      categoryName,
      categorySlug,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
    });

    return { category };
  }

  static async updateCategory(id, payload) {
    const category = await Category.findOne({ _id: id, is_deleted: false });
    if (!category) {
      throw new NotFoundError('Không tìm thấy danh mục');
    }

    if (payload.categoryName !== undefined) {
      category.categoryName = payload.categoryName.trim();
    }

    if (payload.categorySlug !== undefined) {
      category.categorySlug = toSlug(payload.categorySlug);
    }

    if (payload.sortOrder !== undefined) {
      category.sortOrder = payload.sortOrder;
    }

    if (payload.isActive !== undefined) {
      category.isActive = payload.isActive;
    }

    const conflict = await Category.findOne({
      _id: { $ne: id },
      is_deleted: false,
      $or: [{ categoryName: category.categoryName }, { categorySlug: category.categorySlug }],
    }).lean();

    if (conflict) {
      throw new BadRequestError('Tên hoặc slug danh mục đã tồn tại');
    }

    await category.save();
    return { category };
  }

  static async deleteCategory(id) {
    const category = await Category.findOneAndUpdate(
      { _id: id, is_deleted: false },
      { $set: { is_deleted: true, isActive: false } },
      { new: true }
    ).lean();

    if (!category) {
      throw new NotFoundError('Không tìm thấy danh mục');
    }

    return { category };
  }
}

module.exports = CategoryService;