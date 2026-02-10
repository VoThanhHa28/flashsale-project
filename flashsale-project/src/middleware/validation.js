/**
 * Validation Middleware
 * Xá»­ lÃ½ validation cho query params vÃ  request body
 */

// Constants
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MIN_PAGE = 1;
const MIN_PAGE_SIZE = 1;
const ALLOWED_SORT_FIELDS = ['productName', 'productPrice', 'productQuantity', 'createdAt', 'updatedAt'];
const ALLOWED_SORT_ORDERS = ['asc', 'desc'];

/**
 * Validate query params cho GET /products
 */
const validateGetProductsQuery = (req, res, next) => {
  const { page, pageSize, sortBy, sortOrder } = req.query;
  const errors = [];

  // Validate page
  if (page !== undefined) {
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || !Number.isInteger(pageNum) || pageNum < MIN_PAGE) {
      errors.push(`Page must be an integer >= ${MIN_PAGE}`);
    } else {
      req.query.page = pageNum;
    }
  } else {
    req.query.page = MIN_PAGE;
  }

  // Validate pageSize
  if (pageSize !== undefined) {
    const pageSizeNum = parseInt(pageSize, 10);
    if (
      isNaN(pageSizeNum) ||
      !Number.isInteger(pageSizeNum) ||
      pageSizeNum < MIN_PAGE_SIZE ||
      pageSizeNum > MAX_PAGE_SIZE
    ) {
      errors.push(`Page size must be an integer between ${MIN_PAGE_SIZE} and ${MAX_PAGE_SIZE}`);
    } else {
      req.query.pageSize = pageSizeNum;
    }
  } else {
    req.query.pageSize = DEFAULT_PAGE_SIZE;
  }

  // Validate sortBy
  if (sortBy !== undefined) {
    if (typeof sortBy !== 'string' || !ALLOWED_SORT_FIELDS.includes(sortBy)) {
      errors.push(`Sort by must be one of: ${ALLOWED_SORT_FIELDS.join(", ")}`);
    }
  }

  // Validate sortOrder
  if (sortOrder !== undefined) {
    const normalizedSortOrder = sortOrder.toLowerCase();
    if (!ALLOWED_SORT_ORDERS.includes(normalizedSortOrder)) {
      errors.push(`Sort order must be one of: ${ALLOWED_SORT_ORDERS.join(", ")}`);
    } else {
      req.query.sortOrder = normalizedSortOrder;
    }
  } else {
    req.query.sortOrder = 'asc';
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      data: { errors },
    });
  }

  next();
};

/**
 * Validate request body cho POST /products
 * Body sử dụng các field camelCase trùng với Product Schema
 */
const validateCreateProduct = (req, res, next) => {
  const { productName, productThumb, productDescription, productPrice, productQuantity } = req.body;
  const errors = [];

  // Validate productName
  if (productName === undefined || productName === null) {
    errors.push('Product name is required');
  } else if (typeof productName !== 'string') {
    errors.push('Product name must be a string');
  } else {
    const trimmedName = productName.trim();
    if (trimmedName.length === 0) {
      errors.push('Product name cannot be empty or whitespace only');
    } else if (trimmedName.length > 200) {
      errors.push('Product name cannot exceed 200 characters');
    }
  }

  // Validate productThumb
  if (productThumb === undefined || productThumb === null) {
    errors.push('Product thumbnail URL is required');
  } else if (typeof productThumb !== 'string') {
    errors.push('Product thumbnail URL must be a string');
  } else {
    const trimmedThumb = productThumb.trim();
    if (trimmedThumb.length === 0) {
      errors.push('Product thumbnail URL cannot be empty');
    }
  }

  // Validate productDescription
  if (productDescription === undefined || productDescription === null) {
    errors.push('Product description is required');
  } else if (typeof productDescription !== 'string') {
    errors.push('Product description must be a string');
  } else {
    const trimmedDesc = productDescription.trim();
    if (trimmedDesc.length === 0) {
      errors.push('Product description cannot be empty or whitespace only');
    } else if (trimmedDesc.length > 2000) {
      errors.push('Product description cannot exceed 2000 characters');
    }
  }

  // Validate productPrice
  if (productPrice === undefined || productPrice === null) {
    errors.push('Product price is required');
  } else {
    const priceNum = Number(productPrice);
    if (isNaN(priceNum) || !Number.isFinite(priceNum)) {
      errors.push('Product price must be a valid number');
    } else if (priceNum < 0) {
      errors.push('Product price must be greater than or equal to 0');
    } else if (priceNum > 999999999999) {
      errors.push('Product price cannot exceed 999999999999');
    }
  }

  // Validate productQuantity
  if (productQuantity === undefined || productQuantity === null) {
    errors.push('Product quantity is required');
  } else {
    const quantityNum = Number(productQuantity);
    if (isNaN(quantityNum) || !Number.isFinite(quantityNum)) {
      errors.push('Product quantity must be a valid number');
    } else if (!Number.isInteger(quantityNum)) {
      errors.push('Product quantity must be an integer');
    } else if (quantityNum < 0) {
      errors.push('Product quantity must be greater than or equal to 0');
    } else if (quantityNum > 999999) {
      errors.push('Product quantity cannot exceed 999999');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      data: { errors },
    });
  }

  next();
};

module.exports = {
  validateGetProductsQuery,
  validateCreateProduct,
};

