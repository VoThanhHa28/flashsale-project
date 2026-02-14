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
    const { 
      productName, 
      productThumb, 
      productDescription, 
      productPrice, 
      productQuantity,
      startTime,
      endTime,
      isPublished = true
    } = payload;

    // Validate thời gian: startTime < endTime
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (start >= end) {
        throw new BadRequestError(CONST.PRODUCT.MESSAGE.INVALID_TIME);
      }
    }

    // Logic nghiệp vụ: Trim data trước khi lưu
    const newProduct = await Product.create({
      productName: String(productName).trim(),
      productThumb: String(productThumb).trim(),
      productDescription: String(productDescription).trim(),
      productPrice: Number(productPrice),
      productQuantity: Number(productQuantity),
      productStartTime: startTime ? new Date(startTime) : new Date(),
      productEndTime: endTime ? new Date(endTime) : new Date(+new Date() + 7*24*60*60*1000),
      isPublished: Boolean(isPublished),
    });

    // Đồng bộ Stock vào Redis sau khi tạo product
    await InventoryService.updateStock(newProduct._id.toString(), newProduct.productQuantity);

    return newProduct;
  }

  /**
   * Cập nhật sản phẩm
   */
  static async updateProduct(productId, payload) {
    const {
      productName,
      productThumb,
      productDescription,
      productPrice,
      productQuantity,
      startTime,
      endTime,
      isPublished,
    } = payload;

    // Tìm product hiện tại
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
    }

    // Validate thời gian nếu có cả startTime và endTime
    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      
      if (start >= end) {
        throw new BadRequestError(CONST.PRODUCT.MESSAGE.INVALID_TIME);
      }
    } else if (startTime && existingProduct.productEndTime) {
      // Nếu chỉ có startTime, check với endTime hiện tại
      const start = new Date(startTime);
      if (start >= existingProduct.productEndTime) {
        throw new BadRequestError(CONST.PRODUCT.MESSAGE.INVALID_TIME);
      }
    } else if (endTime && existingProduct.productStartTime) {
      // Nếu chỉ có endTime, check với startTime hiện tại
      const end = new Date(endTime);
      if (existingProduct.productStartTime >= end) {
        throw new BadRequestError(CONST.PRODUCT.MESSAGE.INVALID_TIME);
      }
    }

    // Build update object (chỉ update các field có trong payload)
    const updateData = {};
    if (productName !== undefined) updateData.productName = String(productName).trim();
    if (productThumb !== undefined) updateData.productThumb = String(productThumb).trim();
    if (productDescription !== undefined) updateData.productDescription = String(productDescription).trim();
    if (productPrice !== undefined) updateData.productPrice = Number(productPrice);
    if (productQuantity !== undefined) updateData.productQuantity = Number(productQuantity);
    if (startTime !== undefined) updateData.productStartTime = new Date(startTime);
    if (endTime !== undefined) updateData.productEndTime = new Date(endTime);
    if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished);

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true }
    );

    // Nếu có thay đổi productQuantity hoặc startTime/endTime, đồng bộ Redis
    if (productQuantity !== undefined || startTime !== undefined || endTime !== undefined) {
      await InventoryService.updateStock(
        updatedProduct._id.toString(),
        updatedProduct.productQuantity
      );
    }

    return updatedProduct;
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

  /**
   * Lấy thống kê sản phẩm
   */
  static async getProductStats() {
    const now = new Date();

    // Query song song để tối ưu performance
    const [
      totalProducts,
      publishedProducts,
      outOfStockProducts,
      activeFlashSaleProducts,
      upcomingFlashSaleProducts,
      endedFlashSaleProducts,
    ] = await Promise.all([
      // Tổng số sản phẩm
      Product.countDocuments({}),
      
      // Số sản phẩm đang bán (isPublished: true)
      Product.countDocuments({ isPublished: true }),
      
      // Số sản phẩm đã hết hàng (productQuantity: 0)
      Product.countDocuments({ productQuantity: 0 }),
      
      // Số sản phẩm đang trong Flash Sale (productStartTime <= now <= productEndTime)
      Product.countDocuments({
        productStartTime: { $lte: now },
        productEndTime: { $gte: now },
      }),
      
      // Số sản phẩm sắp bắt đầu Flash Sale (productStartTime > now)
      Product.countDocuments({
        productStartTime: { $gt: now },
      }),
      
      // Số sản phẩm đã kết thúc Flash Sale (productEndTime < now)
      Product.countDocuments({
        productEndTime: { $lt: now },
      }),
    ]);

    return {
      total: totalProducts,
      published: publishedProducts,
      outOfStock: outOfStockProducts,
      activeFlashSale: activeFlashSaleProducts,
      upcomingFlashSale: upcomingFlashSaleProducts,
      endedFlashSale: endedFlashSaleProducts,
    };
  }
}

module.exports = ProductService;