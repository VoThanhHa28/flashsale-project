const InventoryService = require("../services/order.service");
const { sendToQueue } = require("../config/rabbitmq");
const asyncHandler = require("../utils/asyncHandler");
const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");
const CONST = require("../constants");
const Product = require("../models/product.model");
const { randomUUID } = require("crypto");

class OrderController {
    static placeOrder = asyncHandler(async (req, res) => {
        // 1️⃣ LẤY USER TỪ AUTH MIDDLEWARE hoặc từ body (cho test)
        const userId = req.user?._id;

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

        // 4️⃣ GENERATE OR USE CLIENT_ORDER_ID (Idempotency Key)
        // If client provides one, use it (for idempotency testing)
        // Otherwise generate new one
        const clientOrderId = req.body.client_order_id || randomUUID();
        console.log(`[OrderController] 📦 New order attempt: ${clientOrderId}`);

        // 5️⃣ RESERVE PRODUCT SLOT (Redis Lua Script + Reservation record)
        const { success, reservation } = await InventoryService.reserveProductSlot({
            userId,
            productId,
            quantity,
            clientOrderId,
        });

        if (!success) {
            throw new BadRequestError("Rất tiếc! Sản phẩm đã hết hàng.");
        }

        // 6️⃣ PAYLOAD ĐẨY QUEUE (CHỈ DATA CẦN THIẾT + client_order_id)
        const orderPayload = {
            client_order_id: clientOrderId, // ← Idempotency key
            reservation_id: reservation._id.toString(), // ← Link tới Reservation model
            userId: userId.toString(),
            productId: productId.toString(),
            quantity,
            price,
            orderTime: new Date().toISOString(),
        };

        // 7️⃣ ĐẨY SANG RABBITMQ (ASYNC - non-blocking)
        await sendToQueue(CONST.RABBIT_QUEUE.ORDER_QUEUE, orderPayload);

        // 8️⃣ RESPONSE NGAY (NON-BLOCKING)
        return new OK({
            message: CONST.ORDER.MESSAGE.PLACE_ORDER_SUCCESS,
            data: {
                client_order_id: clientOrderId,
                reservation_id: reservation._id.toString(),
                order: orderPayload,
            },
        }).send(res);
    });

    static getMyOrders = asyncHandler(async (req, res) => {
        const result = await InventoryService.getMyOrders(req.user._id, req.query);
        return new OK({
            message: CONST.ORDER.MESSAGE.GET_MY_ORDERS_SUCCESS,
            data: result,
        }).send(res);
    });

    static getMyOrderById = asyncHandler(async (req, res) => {
        const result = await InventoryService.getMyOrderById(req.user._id, req.params.id);
        return new OK({
            message: CONST.ORDER.MESSAGE.GET_MY_ORDER_SUCCESS,
            data: result,
        }).send(res);
    });

    static cancelOrder = asyncHandler(async (req, res) => {
        const result = await InventoryService.cancelOrder(req.user._id, req.params.id);
        return new OK({
            message: CONST.ORDER.MESSAGE.CANCEL_ORDER_SUCCESS,
            data: result,
        }).send(res);
    });
}

module.exports = OrderController;
