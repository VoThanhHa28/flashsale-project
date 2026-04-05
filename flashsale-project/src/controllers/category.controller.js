const asyncHandler = require('../utils/asyncHandler');
const CategoryService = require('../services/category.service');
const { OK } = require('../core/success.response');

class CategoryController {
  getCategories = asyncHandler(async (req, res) => {
    const result = await CategoryService.listCategories();

    new OK({
      message: 'Lấy danh sách danh mục thành công',
      data: result,
    }).send(res);
  });
}

module.exports = new CategoryController();