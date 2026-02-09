const Product = require('../models/product.model');

// Constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const ALLOWED_SORT_FIELDS = ['productName', 'productPrice', 'productQuantity', 'createdAt', 'updatedAt'];

/**
 * Láº¥y danh sÃ¡ch sáº£n pháº©m
 * GET /v1/api/products
 * Query params: page, pageSize, sortBy, sortOrder
 */
const getProducts = async (req, res) => {
  try {
    // Láº¥y vÃ  validate query params (Ä‘Ã£ Ä‘Æ°á»£c middleware validate nhÆ°ng double check)
    const page = parseInt(req.query.page) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    // Double check validation
    if (page < 1 || !Number.isInteger(page)) {
      return res.status(400).json({
        code: 400,
        message: 'Page must be an integer >= 1',
      });
    }

    if (pageSize < 1 || pageSize > MAX_PAGE_SIZE || !Number.isInteger(pageSize)) {
      return res.status(400).json({
        code: 400,
        message: `Page size must be an integer between 1 and ${MAX_PAGE_SIZE}`,
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

    // Format response theo yÃªu cáº§u API contract
    const formattedProducts = products.map((product) => ({
      product_id: product._id.toString(),
      product_name: product.productName,
      product_price: product.productPrice,
      product_thumb: product.productThumb,
      product_quantity: product.productQuantity,
    }));

    return res.status(200).json({
      code: 200,
      message: 'Success',
      metadata: formattedProducts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error in getProducts:', error);
    return res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Táº¡o sáº£n pháº©m má»›i
 * POST /v1/api/products
 */
const createProduct = async (req, res) => {
  try {
    const { product_name, product_thumb, product_description, product_price, product_quantity } = req.body;

    // Map tá»« snake_case (API) sang camelCase (Schema) vÃ  trim strings
    const productData = {
      productName: String(product_name).trim(),
      productThumb: String(product_thumb).trim(),
      productDescription: String(product_description).trim(),
      productPrice: Number(product_price),
      productQuantity: Number(product_quantity),
    };

    // Táº¡o sáº£n pháº©m má»›i
    const product = await Product.create(productData);

    // Format response
    const formattedProduct = {
      product_id: product._id.toString(),
      product_name: product.productName,
      product_thumb: product.productThumb,
      product_description: product.productDescription,
      product_price: product.productPrice,
      product_quantity: product.productQuantity,
    };

    return res.status(201).json({
      code: 201,
      message: 'Product created',
      metadata: {
        product: formattedProduct,
      },
    });
  } catch (error) {
    console.error('Error in createProduct:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        code: 400,
        message: 'Validation error',
        errors: errors,
      });
    }

    // Handle duplicate key errors (náº¿u cÃ³ unique index)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        code: 400,
        message: `${field} already exists`,
      });
    }

    // Handle cast errors (invalid ObjectId, etc.)
    if (error.name === 'CastError') {
      return res.status(400).json({
        code: 400,
        message: 'Invalid data format',
        error: error.message,
      });
    }

    return res.status(500).json({
      code: 500,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = {
  getProducts,
  createProduct,
};
