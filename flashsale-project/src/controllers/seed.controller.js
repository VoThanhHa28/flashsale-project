const SeedService = require('../services/seed.service');
const { CREATED } = require('../core/success.response');
const asyncHandler = require('../utils/asyncHandler');
const CONST = require('../constants');

class SeedController {
  static seedUsers = asyncHandler(async (req, res) => {
    const result = await SeedService.seedUsers();
    
    new CREATED({
      message: CONST.SEED.MESSAGE.SEED_SUCCESS,
      data: result,
    }).send(res);
  });
}

module.exports = SeedController;
