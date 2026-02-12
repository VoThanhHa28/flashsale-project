const AuthService = require('../services/auth.service');
const { CREATED, OK } = require('../core/success.response');
const CONST = require('../constants');
const asyncHandler = require('../utils/asyncHandler');

class AuthController {
    
    register = asyncHandler(async (req, res, next) => {
        // 1. Gọi Service (Mọi logic check email nằm bên kia)
        const result = await AuthService.register(req.body);

        // 2. Trả về thành công (Logic cũ: status 201)
        new CREATED({
            message: CONST.AUTH.MESSAGE.REGISTER_SUCCESS,
            data: result
        }).send(res);
        
        // ❓ Tại sao không thấy catch lỗi 500 hay 409 ở đây?
        // ✅ Vì asyncHandler đã bọc rồi. Nếu Service throw ConflictRequestError, 
        // nó tự nhảy sang middleware error xử lý.
    });

    login = asyncHandler(async (req, res) => {
        const result = await AuthService.login(req.body);

        new OK({
            message: CONST.AUTH.MESSAGE.LOGIN_SUCCESS,
            data: result
        }).send(res);
    });

    getMe = asyncHandler(async (req, res) => {
        const result = await AuthService.getMe(req.user._id);

        new OK({
            message: CONST.AUTH.MESSAGE.GET_ME_SUCCESS,
            data: result
        }).send(res);
    });
}

module.exports = new AuthController();