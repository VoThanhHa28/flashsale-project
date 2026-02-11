const InventoryService = require('../services/inventory.service');
const { sendToQueue } = require('../config/rabbitmq');

class OrderController {

    static async placeOrder(req, res) {
        try {
            // 1. Lấy dữ liệu từ Frontend
            const { userId, productId, quantity, price } = req.body;

            // Validate cơ bản (Best practice)
            if (!userId || !productId || !quantity) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Thiếu thông tin đặt hàng!'
                });
            }

            // 2. [QUAN TRỌNG] Trừ kho trong Redis (Xử lý đồng thời)
            const isInStock = await InventoryService.reservationInventory({ 
                productId, 
                quantity 
            });

            if (!isInStock) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Rất tiếc! Sản phẩm đã hết hàng.'
                });
            }

            // 3. Nếu còn hàng -> Tạo payload đơn hàng
            const orderPayload = {
                userId,
                productId,
                quantity,
                price,
                orderTime: new Date().toISOString()
            };

            // 4. Đẩy xuống Queue cho Worker xử lý (Async)
            await sendToQueue(orderPayload);

            // 5. Trả về ngay lập tức (Không chờ DB lưu) -> Tốc độ phản hồi cực nhanh
            return res.status(200).json({
                status: 'success',
                message: 'Đặt hàng thành công! Đang xử lý...',
                data: orderPayload
            });

        } catch (error) {
            console.error('Order Error:', error);
            return res.status(500).json({
                status: 'error',
                message: 'Lỗi hệ thống, vui lòng thử lại sau.'
            });
        }
    }
}

module.exports = OrderController;