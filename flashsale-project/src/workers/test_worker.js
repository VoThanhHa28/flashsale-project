const amqp = require("amqplib");

const QUEUE_NAME = "order_queue";
const RABBITMQ_URL = "amqp://localhost";

/**
 * Gửi nhiều đơn hàng test vào Queue
 */
const testSendOrders = async () => {
    let connection;
    let channel;

    try {
        // Kết nối RabbitMQ
        console.log("[Test] Đang kết nối RabbitMQ...");
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        // Khai báo Queue
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        console.log(`[Test] Bắt đầu gửi 10 đơn hàng vào queue: ${QUEUE_NAME}`);

        // Gửi 10 đơn hàng test
        for (let i = 1; i <= 10; i++) {
            const orderData = {
                userId: `user_${i}`,
                productId: `product_${Math.floor(Math.random() * 5) + 1}`,
                quantity: Math.floor(Math.random() * 3) + 1,
                totalPrice: Math.floor(Math.random() * 1000000) + 100000,
            };

            // Gửi message vào queue
            channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(orderData)), {
                persistent: true, // Đảm bảo message không mất khi RabbitMQ restart
            });

            console.log(`[Test] ✅ Đã gửi đơn hàng ${i}:`, orderData);

            // Delay nhỏ giữa các lần gửi
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log("[Test] 🎉 Đã gửi xong 10 đơn hàng!");
        console.log("[Test] Kiểm tra log của Worker để xem kết quả...");
    } catch (error) {
        console.error("[Test] ❌ Lỗi:", error.message);
    } finally {
        // Đóng kết nối
        if (channel) await channel.close();
        if (connection) await connection.close();
        console.log("[Test] Đã đóng kết nối.");
    }
};

// Chạy test
testSendOrders();
