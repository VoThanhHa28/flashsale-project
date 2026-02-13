const Product = require('../models/product.model');
const { BadRequestError, NotFoundError } = require('../core/error.response');
const CONST = require('../constants');
const InventoryService = require('./order.service'); // Import InventoryService

// Constants nội bộ cho logic phân trang
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

class ProductService {
  /**
   * Tạo sản phẩm mới
   */
  static async createProduct(payload) {
    const { productName, productThumb, productDescription, productPrice, productQuantity } = payload;

    // Logic nghiệp vụ: Trim data trước khi lưu
    const newProduct = await Product.create({
      productName: String(productName).trim(),
      productThumb: String(productThumb).trim(),
      productDescription: String(productDescription).trim(),
      productPrice: Number(productPrice),
      productQuantity: Number(productQuantity),
    });

    return newProduct;
  }

  /**
   * Force Start Flash Sale (Kích hoạt ngay)
   * Update productStartTime = hiện tại và đồng bộ Redis
   */
  static async forceStartProduct(productId) {
    // Tìm product hiện tại
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
    }

    // Update productStartTime = hiện tại
    const now = new Date();
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { productStartTime: now },
      { new: true, runValidators: true }
    );

    // Đồng bộ Redis sau khi update (invalidate cache và update stock)
    await InventoryService.updateStock(
      updatedProduct._id.toString(),
      updatedProduct.productQuantity
    );

    return updatedProduct;
  }

  /**
   * Lấy danh sách sản phẩm (Pagination + Sort)
   */
  static async getAllProducts({ page = 1, pageSize = DEFAULT_PAGE_SIZE, sortBy = 'createdAt', sortOrder = 'desc' }) {
    // 1. Validate & Convert params (Dù Joi đã làm, check lại ở đây cho chắc logic)
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(pageSize)), MAX_PAGE_SIZE);
    const skip = (pageNum - 1) * limitNum;

    // 2. Xử lý Sort
    const sort = {};
    const sortField = CONST.PRODUCT.SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    sort[sortField] = sortOrder === 'asc' ? 1 : -1;

    // 3. Query DB song song (Promise.all)
    const query = {}; // Có thể thêm filter active/inactive sau này
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('-__v') // Bỏ field version của mongoose
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(), // Convert sang JSON object thuần -> Nhanh hơn
      Product.countDocuments(query),
    ]);

    // 4. Tính toán Pagination metadata
    const totalPages = Math.ceil(total / limitNum);

    return {
      products,
      pagination: {
        page: pageNum,
        pageSize: limitNum,
        total,
        totalPages,
      },
    };
  }
}

module.exports = ProductService;