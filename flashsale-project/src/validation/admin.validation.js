const Joi = require('joi');

const getUsers = {
    query: Joi.object({
        page: Joi.number().integer().min(1).optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
    }),
};

const banUser = {
    params: Joi.object({
        id: Joi.string().required(),
    }),
    body: Joi.object({
        status: Joi.string().valid('inactive').required(),
    }),
};

const createShopAdmin = {
    body: Joi.object({
        email: Joi.string().email().required().messages({
            'string.email': 'Email không hợp lệ',
            'any.required': 'Email là bắt buộc',
        }),
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/)
            .required()
            .messages({
                'string.min': 'Mật khẩu phải có ít nhất 8 ký tự',
                'string.pattern.base': 'Mật khẩu phải chứa chữ hoa, chữ thường, số và ký tự đặc biệt (!@#$%^&*)',
                'any.required': 'Mật khẩu là bắt buộc',
            }),
        name: Joi.string().min(2).max(100).optional().messages({
            'string.min': 'Tên phải có ít nhất 2 ký tự',
            'string.max': 'Tên không được vượt quá 100 ký tự',
        }),
    }),
};

const changeUserRole = {
    params: Joi.object({
        id: Joi.string().required().messages({
            'any.required': 'ID là bắt buộc',
        }),
    }),
    body: Joi.object({
        role: Joi.string().valid('USER', 'SHOP_ADMIN').required().messages({
            'any.only': 'Role phải là USER hoặc SHOP_ADMIN',
            'any.required': 'Role là bắt buộc',
        }),
    }),
};

module.exports = {
    getUsers,
    banUser,
    createShopAdmin,
    changeUserRole,
};
