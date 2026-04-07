/**
 * Middleware kiểm tra role
 * @param  {...string} allowedRoles - Các role được phép truy cập
 */
const checkRole = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized',
        });
      }

      const userRole = req.user?.usr_role?.roleCode || req.user?.role || req.user?.usr_role;

      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          status: 'error',
          message: 'Forbidden - You do not have permission',
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  };
};

module.exports = { checkRole };

// const { verifyToken } = require('../middleware/auth');
// const { checkRole } = require('../middleware/role');

// router.post(
//   '/',
//   verifyToken,
//   checkRole('admin'),   // 👈 chỉ admin được tạo sản phẩm
//   validateCreateProduct,
//   productController.createProduct
// );

// User model phải có field:
// role: {
//   type: String,
//   enum: ['admin', 'user'],
//   default: 'user'
// }
