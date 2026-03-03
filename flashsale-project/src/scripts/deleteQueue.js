require("dotenv").config();
const amqp = require("amqplib");

async function deleteQueue() {
    let connection;
    try {
        console.log("🔍 Kết nối RabbitMQ...");
        connection = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        const channel = await connection.createChannel();

        console.log("🗑️  Xóa queue order-queue...");

        try {
            // Delete queue completely (with all messages)
            await channel.deleteQueue("order-queue", { ifUnused: false, ifEmpty: false });
            console.log("✅ Đã xóa queue thành công");
        } catch (err) {
            console.log("⚠️  Queue không tồn tại hoặc đã bị xóa");
        }

        await channel.close();
        console.log("✅ Hoàn tất!");
    } catch (error) {
        console.error("❌ Lỗi:", error.message);
    } finally {
        if (connection) {
            await connection.close();
        }
        process.exit(0);
    }
}

deleteQueue();
