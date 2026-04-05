const asyncHandler = require('../utils/asyncHandler');
const CategoryService = require('../services/category.service');
const { CREATED, OK } = require('../core/success.response');

class CategoryController {
  getCategories = asyncHandler(async (req, res) => {
    const result = await CategoryService.listCategories();

    new OK({
      message: 'Lấy danh sách danh mục thành công',
      data: result,
    }).send(res);
  });

  getCategoryById = asyncHandler(async (req, res) => {
    const result = await CategoryService.getCategoryById(req.params.id);

    new OK({
      message: 'Lấy chi tiết danh mục thành công',
      data: result,
    }).send(res);
  });

  createCategory = asyncHandler(async (req, res) => {
    const result = await CategoryService.createCategory(req.body);

    new CREATED({
      message: 'Tạo danh mục thành công',
      data: result,
    }).send(res);
  });

  updateCategory = asyncHandler(async (req, res) => {
    const result = await CategoryService.updateCategory(req.params.id, req.body);

    new OK({
      message: 'Cập nhật danh mục thành công',
      data: result,
    }).send(res);
  });

  deleteCategory = asyncHandler(async (req, res) => {
    const result = await CategoryService.deleteCategory(req.params.id);

    new OK({
      message: 'Xóa danh mục thành công',
      data: result,
    }).send(res);
  });
}

module.exports = new CategoryController();