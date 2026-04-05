const redisClient = require("../config/redis");
const ProductModel = require("../models/product.model");
const OrderModel = require("../models/order.model");
const ReservationLogModel = require("../models/reservationLog.model");
const { getIO } = require("../config/socket");
const OrderRepo = require("../repositories/order.repo");
const { NotFoundError, BadRequestError } = require("../core/error.response");
const { ForbiddenError } = require("../core/error.response");
const CONST = require("../constants");

class OrderService {
    // 1. INIT INVENTORY (Safe Mode)
    static async initInventory() {
        try {
            const query = { isPublished: true }; // Đổi sang camelCase
            const products = await ProductModel.find(query).select("_id productQuantity").lean();

            if (!products.length) return;

            console.log(`📦 Đang kiểm tra đồng bộ ${products.length} sản phẩm...`);

            const commands = [];
            products.forEach((product) => {
                const key = CONST.REDIS.PRODUCT_STOCK(product._id);
                const keyInfo = CONST.REDIS.PRODUCT_INFO(product._id);

                // Force update stock (dùng SET thay vì SETNX)
                commands.push(redisClient.set(key, String(product.productQuantity)));

                // Delete old info cache để reload từ DB
                commands.push(redisClient.del(keyInfo));
            });

            await Promise.all(commands);
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

    // 3. UPDATE STOCK (Cho Admin)
    static async updateStock(productId, stock) {
        const keyStock = CONST.REDIS.PRODUCT_STOCK(productId);
        const keyInfo = CONST.REDIS.PRODUCT_INFO(productId);

        // Update kho & Xóa cache info để load lại giờ G (nếu có đổi giờ)
        await Promise.all([redisClient.set(keyStock, stock, { EX: CONST.PRODUCT.CACHE.TTL_STOCK }), redisClient.del(keyInfo)]);

        console.log(`Updated Redis: Stock ${stock} & Invalidated Info Cache for ${productId}`);
    }

    // 4. PROCESS ORDER FROM QUEUE
    static async processOrderFromQueue(orderData) {
        const { userId, productId, quantity, price } = orderData;

        // Tạo order mới từ queue data
        const order = new OrderModel({
            userId,
            productId,
            quantity,
            price,
            totalPrice: quantity * price,
            status: CONST.ORDER.STATUS.COMPLETED,
            orderTime: orderData.orderTime || new Date(),
            processedAt: new Date(),
        });

        await order.save();
        console.log(`[OrderService] ✅ Đã lưu đơn hàng: ${order._id}`);

        // Ghi reservation log: worker_commit – slot đã được cam kết vào DB
        const keyStock = CONST.REDIS.PRODUCT_STOCK(productId);
        const remainingRaw = await redisClient.get(keyStock).catch(() => null);
        ReservationLogModel.create({
            userId: userId?.toString() ?? null,
            productId: productId?.toString() ?? null,
            quantity,
            price,
            remainingStockAfter: remainingRaw !== null ? parseInt(remainingRaw) : null,
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
        try {
            const { userId, productId, quantity, price } = orderData;

            const order = new OrderModel({
                userId,
                productId,
                quantity,
                price,
                totalPrice: quantity * price,
                status: CONST.ORDER.STATUS.FAILED,
                orderTime: orderData.orderTime || new Date(),
                processedAt: new Date(),
                errorMessage: errorMessage || "Unknown error",
            });

            await order.save();
            console.log(`[OrderService] 💾 Đã lưu đơn hàng lỗi: ${order._id}`);

            // Ghi reservation log: rollback – kho Redis đã được hoàn lại bởi worker
            ReservationLogModel.create({
                userId: userId?.toString() ?? null,
                productId: productId?.toString() ?? null,
                quantity,
                price,
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

        // Hoàn kho Redis
        const keyStock = CONST.REDIS.PRODUCT_STOCK(order.productId);
        await redisClient.incrBy(keyStock, order.quantity);

        // Cập nhật status
        order.status = CONST.ORDER.STATUS.CANCELLED;
        order.processedAt = new Date();
        await order.save();

        console.log(`[OrderService] ❌ Đã hủy đơn hàng: ${order._id}, hoàn ${order.quantity} sản phẩm vào kho`);

        return { order };
    }
}

module.exports = OrderService;
