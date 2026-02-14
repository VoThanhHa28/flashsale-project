const InventoryService = require("../services/order.service");
const { sendToQueue } = require("../config/rabbitmq");
const asyncHandler = require("../utils/asyncHandler");
const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");
const CONST = require("../constants");
const Product = require("../models/product.model");

class OrderController {
    static placeOrder = asyncHandler(async (req, res) => {
        // 1️⃣ LẤY USER TỪ AUTH MIDDLEWARE hoặc từ body (cho test)
        const userId = req.user?._id || req.body.userId;

        // 2️⃣ LẤY DATA từ items array (format mới) hoặc từ root (backward compatibility)
        const items = req.body.items || [{ productId: req.body.productId, quantity: req.body.quantity }];
        const firstItem = items[0];
        const { productId, quantity } = firstItem;

        // 3️⃣ LẤY GIÁ TỪ DATABASE (không tin client)
        const product = await Product.findById(productId).select("productPrice").lean();
        if (!product) {
            throw new BadRequestError("Sản phẩm không tồn tại");
        }
        const price = product.productPrice;

        // 4️⃣ TRỪ KHO (REDIS – ATOMIC)
        const isInStock = await InventoryService.reservationInventory({
            productId,
            quantity,
        });

        if (!isInStock) {
            throw new BadRequestError("Rất tiếc! Sản phẩm đã hết hàng.");
        }

        // 5️⃣ PAYLOAD ĐẨY QUEUE (CHỈ DATA CẦN THIẾT)
        const orderPayload = {
            userId: userId.toString(),
            productId: productId.toString(),
            quantity,
            price,
            orderTime: new Date().toISOString(),
        };

        // 6️⃣ ĐẨY SANG RABBITMQ (ASYNC)
        await sendToQueue(CONST.RABBIT_QUEUE.ORDER_QUEUE, orderPayload);

        // 7️⃣ RESPONSE NGAY (NON-BLOCKING)
        return new OK({
            message: CONST.ORDER.MESSAGE.PLACE_ORDER_SUCCESS,
            data: {
                order: orderPayload,
            },
        }).send(res);
    });
}

module.exports = OrderController;
