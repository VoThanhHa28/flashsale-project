const CONST = require('../constants');
const { ForbiddenError } = require('../core/error.response');

/**
 * RBAC: Chỉ cho phép ADMIN (quyền cao nhất).
 * Đặt sau verifyToken. req.user đã có từ auth middleware.
 * Dùng bảo vệ: quản lý role user, quản lý SHOP_ADMIN, system/health...
 */
const requireAdmin = (req, res, next) => {
  if (req.user.usr_role !== CONST.AUTH.USR_ROLE.ADMIN) {
    return next(new ForbiddenError(CONST.AUTH.MESSAGE.FORBIDDEN));
  }
  next();
};

/**
 * RBAC: Chỉ cho phép SHOP_ADMIN (không bao gồm ADMIN).
 * Dùng cho các nghiệp vụ vận hành shop: sản phẩm, đơn hàng shop, flash sale...
 */
const requireShopAdmin = (req, res, next) => {
  if (req.user.usr_role !== CONST.AUTH.USR_ROLE.SHOP_ADMIN) {
    return next(new ForbiddenError(CONST.AUTH.MESSAGE.FORBIDDEN));
  }
  next();
};

module.exports = {
  requireAdmin,
  requireShopAdmin,
};
