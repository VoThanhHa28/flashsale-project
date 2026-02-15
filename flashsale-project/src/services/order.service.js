const redisClient = require("../config/redis");
const ProductModel = require("../models/product.model");
const OrderModel = require("../models/order.model");
const { getIO } = require("../config/socket");
const { NotFoundError, BadRequestError } = require("../core/error.response");
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

        return order;
    }

    // 5. NOTIFY STOCK UPDATE VIA SOCKET
    static async notifyStockUpdate(productId, quantity, remainingStock) {
        try {
            const io = getIO();
            const roomName = CONST.SOCKET.SOCKET_ROOM.PRODUCT(productId);

            // Lấy remaining stock từ Redis nếu không được cung cấp
            if (remainingStock === null || remainingStock === undefined) {
                const keyStock = CONST.REDIS.PRODUCT_STOCK(productId);
                remainingStock = await redisClient.get(keyStock);
            }

            // Broadcast to ALL clients (không dùng room)
            io.emit(CONST.SOCKET.SOCKET_EVENT.UPDATE_STOCK, {
                productId,
                quantity,
                remainingStock: remainingStock ? parseInt(remainingStock) : 0,
                timestamp: Date.now(),
            });

            console.log(`[OrderService] 📡 Đã broadcast stock update cho product ${productId}`);
        } catch (error) {
            console.error(`[OrderService] ❌ Lỗi notifyStockUpdate:`, error.message);
            // Không throw error để worker không bị crash nếu socket có vấn đề
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

            return order;
        } catch (error) {
            console.error(`[OrderService] ❌ Lỗi saveFailedOrder:`, error.message);
            throw error;
        }
    }
}

module.exports = OrderService;
