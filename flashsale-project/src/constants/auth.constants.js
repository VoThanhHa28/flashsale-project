module.exports = {
  ROLE: {
    ADMIN: 'admin',
    USER: 'user',
  },
  /** Dùng cho RBAC – khớp với user.model usr_role */
  USR_ROLE: {
    USER: 'USER',
    SHOP_ADMIN: 'SHOP_ADMIN',
    ADMIN: 'ADMIN',
  },

  JWT: {
    EXPIRES_IN: '1d',
  },

  MESSAGE: {
    INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
    UNAUTHORIZED: 'Unauthorized',
    FORBIDDEN: 'Forbidden',
    TOKEN_EXPIRED: 'Token expired',
    EMAIL_EXISTS: 'Email đã được sử dụng',
    REGISTER_SUCCESS: 'Đăng ký thành công',
    INTERNAL_ERROR: 'Lỗi hệ thống',
    REGISTER_SUCCESS: 'Đăng ký thành công',
    LOGIN_SUCCESS: 'Đăng nhập thành công',
    GET_ME_SUCCESS: 'Lấy thông tin thành công',
    USER_NOT_FOUND: 'Không tìm thấy người dùng',
    INTERNAL_ERROR: 'Có lỗi xảy ra'
  },
};
