const redisClient = require('../config/redis');
const ProductModel = require('../models/product.model');

class InventoryService {
    // 1. Hàm nạp kho (Chạy 1 lần khi server start)
    static async initInventory() {
        try {
            // Lấy toàn bộ sản phẩm từ MongoDB
            const products = await ProductModel.find().lean();
            
            if (!products.length) return;

            console.log(`📦 Đang đồng bộ ${products.length} sản phẩm vào Redis...`);

            const commands = [];
            products.forEach(product => {
                const key = `product:${product._id}:stock`;
                // Dùng setnx (Set if Not Exists) để tránh đè lại nếu đã có
                commands.push(redisClient.setNX(key, String(product.productQuantity)));
            });

            // Chạy song song tất cả lệnh cho nhanh (Promise.all)
            await Promise.all(commands);
            console.log('✅ Đồng bộ kho hoàn tất!');
            
        } catch (error) {
            console.error('❌ Lỗi initInventory:', error);
        }
    }
    
    // 2. Hàm trừ kho (Promise trả về true/false)
    static async reservationInventory({ productId, quantity }) {
        const key = `product:${productId}:stock`; // Ví dụ key: product:123:stock

        // LUA SCRIPT: 
        // KEYS[1] là cái key ở trên
        // ARGV[1] là số lượng cần mua
        // Logic: Lấy tồn kho -> Check >= mua -> Trừ -> Trả về 1 (OK) hoặc 0 (Fail)
        const script = `
            local stock = redis.call('get', KEYS[1]) 
            if stock == false then
                return 0
            end
            
            if tonumber(stock) >= tonumber(ARGV[1]) then
                redis.call('decrby', KEYS[1], ARGV[1])
                return 1
            else
                return 0
            end
        `;

        // Chạy lệnh
        const result = await redisClient.eval(script, {
            keys: [key],
            arguments: [String(quantity)]
        });

        // Redis trả về 1 là thành công, 0 là thất bại
        return result === 1;
    }
}

module.exports = InventoryService;