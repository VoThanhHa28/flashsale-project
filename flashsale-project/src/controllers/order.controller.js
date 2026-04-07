const InventoryService = require("../services/order.service");
const { sendToQueue } = require("../config/rabbitmq");
const asyncHandler = require("../utils/asyncHandler");
const { BadRequestError } = require("../core/error.response");
const { OK } = require("../core/success.response");
const CONST = require("../constants");
const Product = require("../models/product.model");

class OrderController {
    static placeOrder = asyncHandler(async (req, res) => {
        const userId = req.user?._id || req.body.userId;

        const itemsRaw = req.body.items || [{ productId: req.body.productId, quantity: req.body.quantity }];
        const merged = new Map();
        for (const item of itemsRaw) {
            if (!item?.productId || item.quantity == null) continue;
            const pid = String(item.productId);
            merged.set(pid, (merged.get(pid) || 0) + Number(item.quantity));
        }
        const mergedItems = [...merged.entries()].map(([productId, quantity]) => ({ productId, quantity }));
        if (!mergedItems.length) {
            throw new BadRequestError("Danh sách sản phẩm không hợp lệ");
        }

        const shippingAddress = String(req.body.shippingAddress || "").trim();
        if (req.user && (!shippingAddress || shippingAddress.length < 5)) {
            throw new BadRequestError("Vui lòng nhập địa chỉ giao hàng (ít nhất 5 ký tự)");
        }
        const addressForQueue = shippingAddress || (req.user ? "" : "K6 / test - dia chi mac dinh");

        const reserved = [];
        try {
            const linesForQueue = [];
            for (const { productId, quantity } of mergedItems) {
                const product = await Product.findById(productId).select("productPrice").lean();
                if (!product) {
                    throw new BadRequestError("Sản phẩm không tồn tại");
                }
                const price = product.productPrice;
                await InventoryService.reservationInventory({ productId, quantity });
                reserved.push({ productId, quantity });
                linesForQueue.push({ productId: productId.toString(), quantity, price });
            }

            const orderPayload = {
                userId: userId.toString(),
                items: linesForQueue,
                shippingAddress: addressForQueue,
                orderTime: new Date().toISOString(),
            };

            await sendToQueue(CONST.RABBIT_QUEUE.ORDER_QUEUE, orderPayload);

            return new OK({
                message: CONST.ORDER.MESSAGE.PLACE_ORDER_SUCCESS,
                data: {
                    order: orderPayload,
                },
            }).send(res);
        } catch (err) {
            for (const r of reserved.reverse()) {
                await InventoryService.releaseReservation(r.productId, r.quantity);
            }
            throw err;
        }
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
