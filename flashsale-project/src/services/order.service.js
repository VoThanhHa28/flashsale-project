const redisClient = require('../config/redis');
const ProductModel = require('../models/product.model'); // Nhớ import Model
const { NotFoundError, BadRequestError } = require('../core/error.response');
const CONST = require('../constants'); // Import file tổng constants

class InventoryService {

    // 1. INIT INVENTORY (Safe Mode)
    static async initInventory() {
        try {
            const query = { is_published: true }; 
            const products = await ProductModel.find(query).select('_id productQuantity').lean();
            
            if (!products.length) return;

            console.log(`📦 Đang kiểm tra đồng bộ ${products.length} sản phẩm...`);

            const commands = [];
            products.forEach(product => {
                const key = CONST.REDIS.PRODUCT_STOCK(product._id);
                commands.push(redisClient.setNX(key, String(product.productQuantity)));
            });

            await Promise.all(commands);
            console.log('✅ Đồng bộ kho hoàn tất (Safe Mode)!');
        } catch (error) {
            console.error('❌ Lỗi initInventory:', error);
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
                                .select('product_start_time product_end_time')
                                .lean();
            
            if (!product) throw new NotFoundError(CONST.PRODUCT.MESSAGE.NOT_FOUND);

            productInfo = JSON.stringify({
                start: new Date(product.product_start_time).getTime(),
                end: new Date(product.product_end_time).getTime()
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
            arguments: [String(quantity)]
        });

        if (result === 0) throw new BadRequestError(CONST.PRODUCT.MESSAGE.OUT_OF_STOCK);

        return true;
    }

    // 3. UPDATE STOCK (Cho Admin)
    static async updateStock(productId, stock) {
        const keyStock = CONST.REDIS.PRODUCT_STOCK(productId);
        const keyInfo = CONST.REDIS.PRODUCT_INFO(productId);

        // Update kho & Xóa cache info để load lại giờ G (nếu có đổi giờ)
        await Promise.all([
            redisClient.set(keyStock, stock, { EX: CONST.PRODUCT.CACHE.TTL_STOCK }),
            redisClient.del(keyInfo)
        ]);
        
        console.log(`Updated Redis: Stock ${stock} & Invalidated Info Cache for ${productId}`);
    }
}

module.exports = InventoryService;