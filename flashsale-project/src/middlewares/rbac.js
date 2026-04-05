const CONST = require('../constants');
const { ForbiddenError } = require('../core/error.response');

/**
 * RBAC: Chỉ cho phép SHOP_ADMIN.
 * Đặt sau verifyToken. req.user đã có từ auth middleware.
 * Dùng bảo vệ: reset stock, force start, admin stats, tạo/sửa product...
 */
const requireShopAdmin = (req, res, next) => {
  if (req.user?.usr_role?.roleCode !== CONST.AUTH.USR_ROLE.SHOP_ADMIN) {
    return next(new ForbiddenError(CONST.AUTH.MESSAGE.FORBIDDEN));
  }
  next();
};

module.exports = {
  requireShopAdmin,
};
