const redisClient = require('../config/redis');
const ProductModel = require('../models/product.model');
const CONST = require('../constants'); // 👉 Import Constants

class InventoryService {
    static async initInventory() {
        try {
            const products = await ProductModel.find().lean();
            if (!products.length) return;

            const commands = [];
            products.forEach(product => {
                // 👉 SỬA: Dùng hàm tạo key từ constant
                const key = CONST.REDIS.PRODUCT_STOCK(product._id); 
                commands.push(redisClient.setNX(key, String(product.productQuantity)));
            });

            await Promise.all(commands);
            console.log('✅ Đồng bộ kho hoàn tất!');
        } catch (error) {
            console.error('❌ Lỗi initInventory:', error);
        }
    }
    
    static async reservationInventory({ productId, quantity }) {
        // 👉 SỬA: Dùng hàm tạo key từ constant
        const key = CONST.REDIS.PRODUCT_STOCK(productId);

        const script = `
            local stock = redis.call('get', KEYS[1]) 
            if stock == false then return 0 end
            if tonumber(stock) >= tonumber(ARGV[1]) then
                redis.call('decrby', KEYS[1], ARGV[1])
                return 1
            else return 0 end
        `;

        const result = await redisClient.eval(script, {
            keys: [key],
            arguments: [String(quantity)]
        });

        return result === 1;
    }
}
module.exports = InventoryService;