const Product = require('../models/product.model');
const { BadRequestError, NotFoundError } = require('../core/error.response');
const CONST = require('../constants');
const InventoryService = require('./order.service'); // Import InventoryService
const redisClient = require('../config/redis');
const ProductRepo = require('../repositories/product.repo');
const FlashSaleCampaignService = require('./flashSaleCampaign.service');

// Constants nội bộ cho logic phân trang
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const SORT_MAP = {
  price_asc: { productPrice: 1 },
  price_desc: { productPrice: -1 },
  newest: { createdAt: -1 },
};

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
      isPublished = true,
    } = payload;

    const newProduct = await Product.create({
      productName: String(productName).trim(),
      productThumb: String(productThumb).trim(),
      productDescription: String(productDescription).trim(),
      productPrice: Number(productPrice),
      productQuantity: Number(productQuantity),
      isPublished: Boolean(isPublished),
    });

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
      isPublished,
    } = payload;

    const existingProduct = await Product.findOne({ _id: productId, is_deleted: false });
    if (!existingProduct) {
      throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
    }

    const updateData = {};
    if (productName !== undefined) updateData.productName = String(productName).trim();
    if (productThumb !== undefined) updateData.productThumb = String(productThumb).trim();
    if (productDescription !== undefined) updateData.productDescription = String(productDescription).trim();
    if (productPrice !== undefined) updateData.productPrice = Number(productPrice);
    if (productQuantity !== undefined) updateData.productQuantity = Number(productQuantity);
    if (isPublished !== undefined) updateData.isPublished = Boolean(isPublished);

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: productId, is_deleted: false },
      updateData,
      { new: true, runValidators: true }
    );

    if (productQuantity !== undefined) {
      await InventoryService.updateStock(
        updatedProduct._id.toString(),
        updatedProduct.productQuantity
      );
    }

    return updatedProduct;
  }

  /**
   * Soft-delete sản phẩm
   * Không xóa cứng dữ liệu để giữ lịch sử đối soát
   */
  static async deleteProduct(productId) {
    const deletedProduct = await Product.findOneAndUpdate(
      { _id: productId, is_deleted: false },
      { is_deleted: true, isPublished: false },
      { new: true }
    );

    if (!deletedProduct) {
      throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);
    }

    // Khi soft-delete, set stock Redis về 0 để chặn mua tiếp
    await InventoryService.updateStock(deletedProduct._id.toString(), 0);

    return deletedProduct;
  }

  static async forceStartProduct(productId) {
    const updatedProduct = await FlashSaleCampaignService.forceStartProduct(productId);
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
    const query = { is_deleted: false }; // Ẩn dữ liệu đã soft-delete
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('-__v') // Bỏ field version của mongoose
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(), // Convert sang JSON object thuần -> Nhanh hơn
      Product.countDocuments(query),
    ]);

    // 4. Sync productQuantity từ Redis (số tồn thực tế khi đặt hàng)
    try {
      if (products.length > 0 && redisClient?.mGet) {
        const keys = products.map((p) => CONST.REDIS.PRODUCT_STOCK(p._id.toString()));
        const redisStocks = await redisClient.mGet(keys);
        redisStocks.forEach((val, i) => {
          if (val !== null && val !== undefined && products[i]) {
            const num = parseInt(val, 10);
            if (!Number.isNaN(num)) products[i].productQuantity = num;
          }
        });
      }
    } catch (err) {
      console.warn('[ProductService] Redis get stock bỏ qua, dùng MongoDB:', err?.message);
    }

    await FlashSaleCampaignService.enrichProductsWithFlashSaleWindow(products);

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

  static async searchProducts({ keyword = '', price_min = 0, price_max = 0, sort = 'newest', page = 1, pageSize = DEFAULT_PAGE_SIZE }) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(Math.max(1, parseInt(pageSize)), MAX_PAGE_SIZE);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (keyword && keyword.trim()) {
      filter.productName = { $regex: keyword.trim(), $options: 'i' };
    }

    // price_min/price_max chỉ được áp dụng khi > 0 (0 = không lọc giá)
    if (price_min > 0 && price_max > 0 && Number(price_min) > Number(price_max)) {
      throw new BadRequestError('Giá tối thiểu không được lớn hơn giá tối đa');
    }

    if (price_min > 0 || price_max > 0) {
      filter.productPrice = {};
      if (price_min > 0) filter.productPrice.$gte = Number(price_min);
      if (price_max > 0) filter.productPrice.$lte = Number(price_max);
    }

    const sortOption = SORT_MAP[sort] || SORT_MAP.newest;

    const [products, total] = await Promise.all([
      ProductRepo.searchProducts({ filter, sort: sortOption, skip, limit: limitNum }),
      ProductRepo.countSearchProducts(filter),
    ]);

    await FlashSaleCampaignService.enrichProductsWithFlashSaleWindow(products);

    return {
      products,
      pagination: {
        page: pageNum,
        pageSize: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  /**
   * Lấy thống kê sản phẩm
   */
  static async getProductStats() {
    const [
      totalProducts,
      publishedProducts,
      outOfStockProducts,
      flashBuckets,
    ] = await Promise.all([
      Product.countDocuments({ is_deleted: false }),
      Product.countDocuments({ is_deleted: false, isPublished: true }),
      Product.countDocuments({ is_deleted: false, productQuantity: 0 }),
      FlashSaleCampaignService.getProductStatsBuckets(),
    ]);

    return {
      total: totalProducts,
      published: publishedProducts,
      outOfStock: outOfStockProducts,
      activeFlashSale: flashBuckets.activeFlashSale,
      upcomingFlashSale: flashBuckets.upcomingFlashSale,
      endedFlashSale: flashBuckets.endedFlashSale,
    };
  }
}

module.exports = ProductService;