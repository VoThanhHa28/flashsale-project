const redisClient = require("../config/redis");
const ProductModel = require("../models/product.model");
const OrderModel = require("../models/order.model");
const ReservationLogModel = require("../models/reservationLog.model");
const { getIO } = require("../config/socket");
const OrderRepo = require("../repositories/order.repo");
const OrderDetailRepo = require("../repositories/orderDetail.repo");
const PaymentRepo = require("../repositories/payment.repo");
const InventoryRepo = require("../repositories/inventory.repo");
const OrderDetailModel = require("../models/orderDetail.model");
const PaymentModel = require("../models/payment.model");
const { NotFoundError, BadRequestError } = require("../core/error.response");
const { ForbiddenError } = require("../core/error.response");
const CONST = require("../constants");

class OrderService {
    /** Hoàn tác order + order_details + payments nếu lưu chi tiết/payment thất bại. */
    static async _rollbackOrderPersist(orderId) {
        await Promise.all([
            OrderDetailModel.deleteMany({ orderId }),
            PaymentModel.deleteMany({ orderId }),
            OrderModel.deleteOne({ _id: orderId }),
        ]);
    }

    /** Đồng bộ MongoDB inventories.quantityOnHand từ Redis (sau đặt/hủy đơn). */
    static async _syncInventoryFromRedis(productId) {
        try {
            const pid = String(productId);
            const remaining = await redisClient.get(CONST.REDIS.PRODUCT_STOCK(pid));
            if (remaining !== null && remaining !== undefined) {
                await InventoryRepo.upsertQuantity(pid, parseInt(remaining, 10));
            }
        } catch (e) {
            console.warn(`[OrderService] _syncInventoryFromRedis(${productId}):`, e.message);
        }
    }

    // 1. INIT INVENTORY (Safe Mode) — Redis từ inventories (hoặc productQuantity nếu chưa có dòng tồn)
    static async initInventory(specificProductId) {
        try {
            if (specificProductId) {
                const pid = String(specificProductId);
                const product = await ProductModel.findOne({ _id: pid, is_deleted: false })
                    .select("_id productQuantity isPublished")
                    .lean();
                if (!product || !product.isPublished) return;

                const inv = await InventoryRepo.findByProductId(pid);
                const qty = inv != null ? inv.quantityOnHand : product.productQuantity;

                await Promise.all([
                    redisClient.set(CONST.REDIS.PRODUCT_STOCK(pid), String(qty), { EX: CONST.PRODUCT.CACHE.TTL_STOCK }),
                    redisClient.del(CONST.REDIS.PRODUCT_INFO(pid)),
                ]);

                if (inv == null) {
                    await InventoryRepo.upsertQuantity(pid, product.productQuantity);
                }
                return;
            }

            const products = await ProductModel.find({ isPublished: true, is_deleted: false })
                .select("_id productQuantity")
                .lean();

            if (!products.length) return;

            console.log(`📦 Đang kiểm tra đồng bộ ${products.length} sản phẩm...`);

            const ids = products.map((p) => p._id.toString());
            const invs = await InventoryRepo.findByProductIds(ids);
            const invMap = new Map(invs.map((i) => [i.productId.toString(), i]));

            const commands = [];
            for (const p of products) {
                const inv = invMap.get(p._id.toString());
                const qty = inv != null ? inv.quantityOnHand : p.productQuantity;
                commands.push(
                    redisClient.set(CONST.REDIS.PRODUCT_STOCK(p._id), String(qty), { EX: CONST.PRODUCT.CACHE.TTL_STOCK }),
                );
                commands.push(redisClient.del(CONST.REDIS.PRODUCT_INFO(p._id)));
            }
            await Promise.all(commands);

            await InventoryRepo.bulkEnsureMissing(products, invMap);
            console.log("✅ Đồng bộ kho hoàn tất (Safe Mode)!");
        } catch (error) {
            console.error("❌ Lỗi initInventory:", error);
        }
    }

    // 2. RESERVATION (Logic chính)
    static async reservationInventory({ productId, quantity }) {
        const keyStock = CONST.REDIS.PRODUCT_STOCK(productId);
        const keyInfo = CONST.REDIS.PRODUCT_INFO(productId); // 👉 Dùng constant mới

        // A. LẤY THÔNG TIN GIỜ G
        let productInfo = await redisClient.get(keyInfo);

        // B. CACHE MISS -> GỌI DB
        if (!productInfo) {
            const product = await ProductModel.findById(productId)
                .select("productStartTime productEndTime") // Đổi sang camelCase
                .lean();

            if (!product) throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);

            productInfo = JSON.stringify({
                start: new Date(product.productStartTime).getTime(), // Đổi sang camelCase
                end: new Date(product.productEndTime).getTime(), // Đổi sang camelCase
            });

            // Set TTL từ Constant (604800s)
            await redisClient.set(keyInfo, productInfo, { EX: CONST.PRODUCT.CACHE.TTL_INFO });
        }

        // C. CHECK GIỜ G
        const { start, end } = JSON.parse(productInfo);
        const now = Date.now();

        if (now < start) throw new BadRequestError(CONST.PRODUCT.MESSAGE.NOT_STARTED);
        if (now > end) throw new BadRequestError(CONST.PRODUCT.MESSAGE.ENDED);

        // D. TRỪ KHO (Lua Script)
        const script = `
            local stock = redis.call('get', KEYS[1])
            if stock == false then return 0 end
            if tonumber(stock) >= tonumber(ARGV[1]) then
                redis.call('decrby', KEYS[1], ARGV[1])
                return 1
            else return 0 end
        `;

        const result = await redisClient.eval(script, {
            keys: [keyStock],
            arguments: [String(quantity)],
        });

        if (result === 0) throw new BadRequestError(CONST.PRODUCT.MESSAGE.OUT_OF_STOCK);

        return true;
    }
    static async releaseReservation(productId, quantity) {
        const keyStock = CONST.REDIS.PRODUCT_STOCK(productId);
        await redisClient.incrBy(keyStock, quantity);
        await redisClient.del(CONST.REDIS.PRODUCT_INFO(productId)).catch(() => {});
        await OrderService._syncInventoryFromRedis(productId);
    }

    static normalizeOrderQueuePayload(orderData) {
        const userId = String(orderData.userId || "");
        if (!userId) throw new BadRequestError("orderData.userId is required");

        const shippingAddress = typeof orderData.shippingAddress === "string" ? orderData.shippingAddress.trim() : "";
        const orderTime = orderData.orderTime ? new Date(orderData.orderTime) : new Date();

        let lines = [];
        if (Array.isArray(orderData.items) && orderData.items.length > 0) {
            lines = orderData.items.map((i) => ({
                productId: String(i.productId),
                quantity: Number(i.quantity),
                price: Number(i.price),
            }));
        } else {
            lines = [{
                productId: String(orderData.productId || ""),
                quantity: Number(orderData.quantity),
                price: Number(orderData.price),
            }];
        }

        lines = lines.filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0 && Number.isFinite(l.price) && l.price >= 0);
        if (!lines.length) throw new BadRequestError("orderData items are invalid");
        return { userId, shippingAddress, lines, orderTime };
    }

    // 3. UPDATE STOCK (Cho Admin / ProductService) — Redis + bảng inventories
    static async updateStock(productId, stock) {
        const pid = String(productId);
        const keyStock = CONST.REDIS.PRODUCT_STOCK(pid);
        const keyInfo = CONST.REDIS.PRODUCT_INFO(pid);
        const n = Math.max(0, Math.floor(Number(stock)));

        await Promise.all([
            redisClient.set(keyStock, String(n), { EX: CONST.PRODUCT.CACHE.TTL_STOCK }),
            redisClient.del(keyInfo),
            InventoryRepo.upsertQuantity(pid, n),
        ]);

        console.log(`Updated Redis + inventories: Stock ${n} for ${pid}`);
    }

    // 4. PROCESS ORDER FROM QUEUE
    static async processOrderFromQueue(orderData) {

        const { userId, shippingAddress, lines, orderTime } = OrderService.normalizeOrderQueuePayload(orderData);
        const first = lines[0];
        const detailInputs = lines.map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            unitPrice: l.price,
            lineTotal: l.quantity * l.price,
        }));
        const totalPrice = detailInputs.reduce((s, l) => s + l.lineTotal, 0);

        const order = new OrderModel({
            client_order_id: orderData.client_order_id || null,
            userId,
            shippingAddress,
            productId: first.productId,
            quantity: lines.length === 1 ? first.quantity : undefined,
            price: lines.length === 1 ? first.price : undefined,
            totalPrice,
            status: CONST.ORDER.STATUS.PENDING,
            orderTime,
            processedAt: new Date(),
        });

        await order.save();
        try {
            await OrderDetailRepo.insertLines(order._id, detailInputs);
            await PaymentRepo.insertForOrder(order._id, {
                amount: totalPrice,
                status: CONST.ORDER.PAYMENT.STATUS.PENDING,
            });
        } catch (persistErr) {
            await OrderService._rollbackOrderPersist(order._id);
            throw persistErr;
        }
        console.log(`[OrderService] ✅ Đã lưu đơn + order_details + payment: ${order._id}`);

        for (const l of lines) {
            await OrderService._syncInventoryFromRedis(l.productId);
        }

        const keyStock = CONST.REDIS.PRODUCT_STOCK(first.productId);
        const remainingRaw = await redisClient.get(keyStock).catch(() => null);
        ReservationLogModel.create({
            userId: userId || null,
            productId: first.productId || null,
            quantity: first.quantity,
            price: first.price,
            remainingStockAfter: remainingRaw !== null ? parseInt(remainingRaw, 10) : null,
            orderId: order._id.toString(),
            source: CONST.RESERVATION_LOG.SOURCE.WORKER_COMMIT,
            note: CONST.RESERVATION_LOG.MESSAGE.SLOT_COMMITTED,
        }).catch((err) => console.error(CONST.RESERVATION_LOG.MESSAGE.LOG_FAILED, err.message));

        return order;
    }

    // 5. NOTIFY STOCK UPDATE VIA SOCKET
    static async notifyStockUpdate(productId, quantity, remainingStock) {
        try {
            const io = getIO();

            // Lấy remaining stock từ Redis nếu không được cung cấp
            if (remainingStock === null || remainingStock === undefined) {
                const keyStock = CONST.REDIS.PRODUCT_STOCK(productId);
                remainingStock = await redisClient.get(keyStock);
            }

            io.emit(CONST.SOCKET.SOCKET_EVENT.UPDATE_STOCK, {
                productId,
                quantity,
                remainingStock: remainingStock ? parseInt(remainingStock) : 0,
                timestamp: Date.now(),
            });

            console.log(`[OrderService] 📡 Đã phát socket event update-stock (broadcast)`);
        } catch (error) {
            console.error(`[OrderService] ❌ Lỗi notifyStockUpdate:`, error.message);
            // Hồng sửa – khi Redis chết Worker emit Socket không tới client, nên gọi Main App qua HTTP để emit system-error cho FE hiện "Bảo trì" (Case 3)
            try {
                const io = getIO();
                io.emit(CONST.SOCKET.SOCKET_EVENT.SYSTEM_ERROR, { message: "Hệ thống đang bảo trì" });
            } catch (_) {
                // Bỏ qua nếu Worker emit fail (vd không có adapter)
            }
            // Hồng sửa – gọi Main App POST /internal/emit-system-error để broadcast system-error tới client
            const appUrl = process.env.APP_URL || process.env.BACKEND_URL || "http://localhost:3000";
            const secret = process.env.INTERNAL_EMIT_SECRET || "flashsale-internal-dev";
            const httpRes = await fetch(`${appUrl}/internal/emit-system-error`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Internal-Secret": secret,
                },
                body: JSON.stringify({ message: "Hệ thống đang bảo trì" }),
            }).catch((e) => {
                console.warn("[OrderService] Gọi internal emit-system-error thất bại:", e?.message);
            });
            if (httpRes && !httpRes.ok) {
                const text = await httpRes.text().catch(() => "");
                console.warn("[OrderService] Main App trả lỗi:", httpRes.status, text);
            }
            // Không throw để worker không crash
        }
    }

    // 6. SAVE FAILED ORDER
    static async saveFailedOrder(orderData, errorMessage) {
        let normalized;
        try {
            normalized = OrderService.normalizeOrderQueuePayload(orderData);
        } catch (e) {
            console.error(`[OrderService] saveFailedOrder: payload không hợp lệ — ${e.message}`);
            return null;
        }

        try {
            const { userId, shippingAddress, lines, orderTime } = normalized;

            const detailInputs = lines.map((l) => ({
                productId: l.productId,
                quantity: l.quantity,
                unitPrice: l.price,
                lineTotal: l.quantity * l.price,
            }));
            const totalPrice = detailInputs.reduce((s, l) => s + l.lineTotal, 0);
            const first = lines[0];

            const order = new OrderModel({
                userId,
                shippingAddress,
                productId: first.productId,
                quantity: lines.length === 1 ? first.quantity : undefined,
                price: lines.length === 1 ? first.price : undefined,
                totalPrice,
                status: CONST.ORDER.STATUS.FAILED,
                orderTime,
                processedAt: new Date(),
                errorMessage: errorMessage || "Unknown error",
            });

            await order.save();
            try {
                await OrderDetailRepo.insertLines(order._id, detailInputs);
                await PaymentRepo.insertForOrder(order._id, {
                    amount: totalPrice,
                    status: CONST.ORDER.PAYMENT.STATUS.PENDING,
                });
            } catch (persistErr) {
                await OrderService._rollbackOrderPersist(order._id);
                throw persistErr;
            }
            console.log(`[OrderService] 💾 Đã lưu đơn lỗi + order_details + payment: ${order._id}`);

            // Ghi reservation log: rollback – kho Redis đã được hoàn lại bởi worker
            ReservationLogModel.create({
                userId: userId || null,
                productId: first?.productId || null,
                quantity: first?.quantity || null,
                price: first?.price || null,
                remainingStockAfter: null,
                orderId: order._id.toString(),
                source: CONST.RESERVATION_LOG.SOURCE.ROLLBACK,
                note: `${CONST.RESERVATION_LOG.MESSAGE.SLOT_ROLLBACK}: ${errorMessage || "Unknown error"}`,
            }).catch((err) => console.error(CONST.RESERVATION_LOG.MESSAGE.LOG_FAILED, err.message));

            return order;
        } catch (error) {
            console.error(`[OrderService] ❌ Lỗi saveFailedOrder:`, error.message);
            throw error;
        }
    }

    // 7. ORDER HISTORY (không đụng Inventory)
    static async getMyOrders(userId, query = {}) {
        const result = await OrderRepo.findByUserId(userId.toString(), {
            page: query.page,
            limit: query.limit,
        });
        return result;
    }

    static async getMyOrderById(userId, orderId) {
        const order = await OrderRepo.findByIdAndUserId(orderId, userId);
        if (!order) {
            throw new ForbiddenError(CONST.ORDER.MESSAGE.ORDER_NOT_OWNED);
        }
        return { order };
    }

    // 8. CANCEL ORDER (User hủy đơn hàng)
    static async cancelOrder(userId, orderId) {
        // Tìm đơn hàng của user
        const order = await OrderModel.findOne({
            _id: orderId,
            userId: userId.toString(),
        });

        if (!order) {
            throw new NotFoundError(CONST.ORDER.MESSAGE.ORDER_NOT_FOUND);
        }

        // Chỉ được hủy đơn đang chờ xử lý (PENDING)
        if (order.status !== CONST.ORDER.STATUS.PENDING) {
            throw new BadRequestError(CONST.ORDER.MESSAGE.CANCEL_ORDER_NOT_ALLOWED);
        }

        const details = await OrderDetailModel.find({ orderId: order._id }).lean();
        if (details.length > 0) {
            for (const d of details) {
                const keyStock = CONST.REDIS.PRODUCT_STOCK(d.productId);
                await redisClient.incrBy(keyStock, d.quantity);
                await OrderService._syncInventoryFromRedis(d.productId);
            }
        } else if (order.productId && order.quantity != null) {
            const keyStock = CONST.REDIS.PRODUCT_STOCK(order.productId);
            await redisClient.incrBy(keyStock, order.quantity);
            await OrderService._syncInventoryFromRedis(order.productId);
        }

        order.status = CONST.ORDER.STATUS.CANCELLED;
        order.processedAt = new Date();
        await order.save();

        console.log(`[OrderService] ❌ Đã hủy đơn hàng: ${order._id}, hoàn kho Redis theo từng dòng`);

        const orderLean = await OrderModel.findById(order._id).lean();
        const orderWithDetails = await OrderDetailRepo.enrichOrderWithDetails(orderLean);
        const orderWithPayment = await PaymentRepo.enrichOrderWithPayment(orderWithDetails);
        return { order: orderWithPayment };
    }
}

module.exports = OrderService;
