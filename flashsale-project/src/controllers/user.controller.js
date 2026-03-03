const UserService = require('../services/user.service');
const { OK } = require('../core/success.response');
const asyncHandler = require('../utils/asyncHandler');
const CONST = require('../constants');

class UserController {
  static getMe = asyncHandler(async (req, res) => {
    const result = await UserService.getMe(req.user._id);
    new OK({
      message: CONST.USER.MESSAGE.GET_ME_SUCCESS,
      data: result,
    }).send(res);
  });

  static updateMe = asyncHandler(async (req, res) => {
    const result = await UserService.updateMe(req.user._id, req.body);
    new OK({
      message: CONST.USER.MESSAGE.UPDATE_ME_SUCCESS,
      data: result,
    }).send(res);
  });

  static changePassword = asyncHandler(async (req, res) => {
    const result = await UserService.changePassword(req.user._id, req.body);
    new OK({
      message: result.message,
      data: {},
    }).send(res);
  });
}

module.exports = UserController;
