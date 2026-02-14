require("dotenv").config();
const amqp = require("amqplib");
const CONST = require("../constants");

async function purgeQueueMessages() {
    let connection;
    try {
        console.log("🔍 Kết nối RabbitMQ...");
        connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();

        const queueName = CONST.RABBIT_QUEUE.ORDER_QUEUE;

        console.log(`🗑️  Đang xóa TẤT CẢ messages trong queue: ${queueName}...`);

        // Purge all messages from queue
        const result = await channel.purgeQueue(queueName);
        console.log(`✅ Đã xóa ${result.messageCount} messages`);

        await channel.close();
        console.log("✅ Queue đã được làm sạch hoàn toàn!");
    } catch (error) {
        console.error("❌ Lỗi khi purge queue:", error.message);
    } finally {
        if (connection) {
            await connection.close();
            console.log("🔌 Đã đóng kết nối RabbitMQ");
        }
        process.exit(0);
    }
}

purgeQueueMessages();
