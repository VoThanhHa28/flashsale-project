const Product = require('../models/product.model');
const logger = require('../libs/logger');

/**
 * Lấy danh sách tất cả sản phẩm
 * GET /v1/api/product
 */
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({}).sort({ product_id: 1 });

    return res.status(200).json({
      status: 'success',
      message: 'Success',
      data: products,
    });
  } catch (error) {
    logger.error('Get products error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

/**
 * Lấy chi tiết sản phẩm theo ID
 * GET /v1/api/product/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm theo product_id (number) hoặc _id (MongoDB ObjectId)
    let product = await Product.findOne({ product_id: parseInt(id) });
    
    if (!product) {
      // Fallback: tìm theo _id nếu không tìm thấy theo product_id
      product = await Product.findById(id);
    }

    if (!product) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Success',
      data: product,
    });
  } catch (error) {
    logger.error('Get product by id error:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
    });
  }
};

module.exports = {
  getProducts,
  getProductById,
};
