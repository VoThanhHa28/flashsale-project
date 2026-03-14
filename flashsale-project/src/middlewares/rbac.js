const CONST = require('../constants');
const { ForbiddenError } = require('../core/error.response');

/**
 * RBAC: Chỉ cho phép ADMIN (quyền cao nhất).
 * Đặt sau verifyToken. req.user đã có từ auth middleware.
 * Dùng bảo vệ: quản lý SHOP_ADMIN, cấu hình hệ thống, system logs...
 */
const requireAdmin = (req, res, next) => {
  if (req.user.usr_role !== CONST.AUTH.USR_ROLE.ADMIN) {
    return next(new ForbiddenError(CONST.AUTH.MESSAGE.FORBIDDEN));
  }
  next();
};

/**
 * RBAC: Cho phép SHOP_ADMIN hoặc ADMIN.
 * Đặt sau verifyToken. req.user đã có từ auth middleware.
 * Dùng bảo vệ: reset stock, force start, admin stats, tạo/sửa product...
 */
const requireShopAdmin = (req, res, next) => {
  const allowedRoles = [
    CONST.AUTH.USR_ROLE.SHOP_ADMIN,
    CONST.AUTH.USR_ROLE.ADMIN,
  ];
  if (!allowedRoles.includes(req.user.usr_role)) {
    return next(new ForbiddenError(CONST.AUTH.MESSAGE.FORBIDDEN));
  }
  next();
};

module.exports = {
  requireAdmin,
  requireShopAdmin,
};
