const Product = require('../models/product.model');

// Constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ALLOWED_SORT_FIELDS = ['productName', 'productPrice', 'productQuantity', 'createdAt', 'updatedAt'];

/**
 * Lấy danh sách sản phẩm
 * GET /v1/api/products
 * Query params: page, pageSize, sortBy, sortOrder
 */
const getProducts = async (req, res) => {
  try {
    // Lấy và validate query params (đã được middleware validate nhưng double check)
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    // Double check validation (đảm bảo trả về cùng format JSend)
    if (page < 1 || !Number.isInteger(page)) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        data: {
          errors: ['Page must be an integer >= 1'],
        },
      });
    }

    if (pageSize < 1 || pageSize > MAX_PAGE_SIZE || !Number.isInteger(pageSize)) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        data: {
          errors: [`Page size must be an integer between 1 and ${MAX_PAGE_SIZE}`],
        },
      });
    }

    // Build query (cÃ³ thá»ƒ thÃªm filter sau)
    const query = {};

    // Build sort object
    const sort = {};
    if (ALLOWED_SORT_FIELDS.includes(sortBy)) {
      sort[sortBy] = sortOrder;
    } else {
      sort.createdAt = -1; // Default sort
    }

    // Execute query vá»›i pagination
    const skip = (page - 1) * pageSize;
    const [products, total] = await Promise.all([
      Product.find(query)
        .select('-__v')
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
        .lean(),
      Product.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    // Trả về theo chuẩn JSend, không mapping thủ công
    return res.status(200).json({
      status: 'success',
      message: 'Lấy danh sách sản phẩm thành công',
      data: {
        products,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error('Error in getProducts:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      // Có thể expose thêm error.message khi NODE_ENV=development nếu cần debug
      data: process.env.NODE_ENV === 'development'
        ? { error: error.message }
        : undefined,
    });
  }
};

/**
 * Tạo sản phẩm mới
 * POST /v1/api/products
 */
const createProduct = async (req, res) => {
  try {
    // Body đã được validate ở middleware, sử dụng trực tiếp các field camelCase
    const {
      productName,
      productThumb,
      productDescription,
      productPrice,
      productQuantity,
    } = req.body;

    // Chuẩn hoá dữ liệu (trim string, ép kiểu number)
    const productData = {
      productName: String(productName).trim(),
      productThumb: String(productThumb).trim(),
      productDescription: String(productDescription).trim(),
      productPrice: Number(productPrice),
      productQuantity: Number(productQuantity),
    };

    // Tạo sản phẩm mới
    const product = await Product.create(productData);

    return res.status(201).json({
      status: 'success',
      message: 'Tạo sản phẩm thành công',
      data: {
        product,
      },
    });
  } catch (error) {
    console.error('Error in createProduct:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        status: 'error',
        message: 'Validation error',
        data: { errors },
      });
    }

    // Handle duplicate key errors (náº¿u cÃ³ unique index)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        status: 'error',
        message: `${field} already exists`,
      });
    }

    // Handle cast errors (invalid ObjectId, etc.)
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid data format',
        data: process.env.NODE_ENV === 'development'
          ? { error: error.message }
          : undefined,
      });
    }

    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      data: process.env.NODE_ENV === 'development'
        ? { error: error.message }
        : undefined,
    });
  }
};

module.exports = {
  getProducts,
  createProduct,
};
