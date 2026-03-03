/**
 * Script xóa tất cả messages trong queue
 * Chạy: node src/scripts/purgeQueue.js
 */

require("dotenv").config();
const amqp = require("amqplib");

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const QUEUE_NAME = "order-queue";

async function purgeQueue() {
    let connection;
    let channel;

    try {
        console.log("🔍 Kết nối RabbitMQ...");
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        console.log(`🗑️  Đang xóa queue: ${QUEUE_NAME}...`);

        // Xóa queue hoàn toàn
        try {
            await channel.deleteQueue(QUEUE_NAME);
            console.log(`✅ Đã xóa queue cũ`);
        } catch (e) {
            console.log(`⚠️  Queue chưa tồn tại hoặc đã bị xóa`);
        }

        // Tạo lại queue mới
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`✅ Đã tạo lại queue mới`);
        console.log("✅ Queue đã được làm sạch hoàn toàn!");
    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    } finally {
        if (channel) await channel.close();
        if (connection) await connection.close();
        process.exit(0);
    }
}

purgeQueue();
