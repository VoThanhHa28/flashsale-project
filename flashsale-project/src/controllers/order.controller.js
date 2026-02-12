const InventoryService = require('../services/order.service');
const { sendToQueue } = require('../config/rabbitmq');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError } = require('../core/error.response');
const { OK } = require('../core/success.response');
const CONST = require('../constants');

class OrderController {

  static placeOrder = asyncHandler(async (req, res) => {
    // 1️⃣ LẤY USER TỪ AUTH MIDDLEWARE (KHÔNG TỪ BODY)
    const userId = req.user._id;

    // 2️⃣ LẤY DATA ĐÃ ĐƯỢC VALIDATE
    const { productId, quantity, price } = req.body;

    // 3️⃣ TRỪ KHO (REDIS – ATOMIC)
    const isInStock = await InventoryService.reservationInventory({
      productId,
      quantity,
    });

    if (!isInStock) {
      throw new BadRequestError('Rất tiếc! Sản phẩm đã hết hàng.');
    }

    // 4️⃣ PAYLOAD ĐẨY QUEUE (CHỈ DATA CẦN THIẾT)
    const orderPayload = {
      userId: userId.toString(),
      productId: productId.toString(),
      quantity,
      price,
      orderTime: new Date().toISOString(),
    };

    // 5️⃣ ĐẨY SANG RABBITMQ (ASYNC)
    await sendToQueue(CONST.RABBIT_QUEUE.ORDER_QUEUE, orderPayload);

    // 6️⃣ RESPONSE NGAY (NON-BLOCKING)
    return new OK({
      message: CONST.ORDER.MESSAGE.PLACE_ORDER_SUCCESS,
      data: {
        order: orderPayload,
      },
    }).send(res);
  });
}

module.exports = OrderController;
