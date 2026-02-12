require("dotenv").config();
const { getChannel, connectToRabbitMQ } = require("../config/rabbitmq");
const OrderModel = require("../models/order.model");
const mongoose = require("mongoose");
const CONST = require("../constants/constants");

// Cấu hình
const QUEUE_NAME = CONST.RABBIT_QUEUE.ORDER;
const PREFETCH_COUNT = 10; // Xử lý tối đa 10 message cùng lúc
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/flashsale";

/**
 * Kết nối MongoDB
 */
const connectMongoDB = async () => {
    try {
        console.log("[MongoDB] Đang kết nối đến:", MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        console.log("[MongoDB] Kết nối thành công!");
        console.log("[MongoDB] Database name:", mongoose.connection.name);
        console.log("[MongoDB] Host:", mongoose.connection.host);
        console.log("[MongoDB] Port:", mongoose.connection.port);

        // List all collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log(
            "[MongoDB] Collections:",
            collections.map((c) => c.name),
        );

        // Check OrderModel collection name
        console.log("[MongoDB] OrderModel collection:", OrderModel.collection.name);
    } catch (error) {
        console.error("[MongoDB] Lỗi kết nối:", error.message);
        process.exit(1);
    }
};

/**
 * Xử lý đơn hàng từ queue
 */
const processOrder = async (orderData, channel, msg) => {
    const startTime = Date.now();

    try {
        console.log(`[Worker] Nhận đơn hàng:`, orderData);

        // Validate format cơ bản (không validate nghiệp vụ - đã xử lý ở API)
        if (orderData.quantity && orderData.quantity <= 0) {
            throw new Error("Quantity không hợp lệ");
        }

        // Lưu đơn hàng vào MongoDB
        console.log(`[Worker] MongoDB ReadyState: ${mongoose.connection.readyState}`);
        console.log(`[Worker] Connected DB: ${mongoose.connection.name}`);

        const order = await OrderModel.create({
            userId: orderData.userId,
            productId: orderData.productId,
            quantity: orderData.quantity,
            status: "Pending",
            totalPrice: orderData.price || 0,
            processedAt: orderData.orderTime || new Date(),
        });

        const processingTime = Date.now() - startTime;
        console.log(`[Worker] ✅ Đã lưu đơn hàng ID: ${order._id} (${processingTime}ms)`);

        // Verify ngay sau khi lưu
        const count = await OrderModel.countDocuments();
        console.log(`[Worker] 📊 Tổng số đơn hàng trong DB: ${count}`);

        // ACK tin nhắn - quan trọng!
        channel.ack(msg);

        return order;
    } catch (error) {
        console.error("[Worker] ❌ Lỗi xử lý đơn hàng:", error.message);
        console.error("[Worker] Dữ liệu lỗi:", orderData);

        // NACK message nhưng không requeue (tránh loop vô hạn)
        // Nếu muốn retry, dùng Dead Letter Exchange
        channel.nack(msg, false, false);
    }
};

/**
 * Khởi động Worker
 */
const startWorker = async () => {
    try {
        console.log("[Worker] Đang khởi động Order Worker...");

        // 1. Kết nối MongoDB
        await connectMongoDB();

        // 2. Kết nối RabbitMQ
        await connectToRabbitMQ();
        const channel = await getChannel();

        // 3. Khai báo Queue (durable: true để tin nhắn không mất khi restart)
        await channel.assertQueue(QUEUE_NAME, {
            durable: true,
            arguments: {
                // Có thể thêm Dead Letter Exchange cho tin nhắn lỗi
                // 'x-dead-letter-exchange': 'dlx-exchange',
                // 'x-dead-letter-routing-key': 'failed-orders'
            },
        });

        // 4. Giới hạn số message xử lý đồng thời (tránh quá tải)
        channel.prefetch(PREFETCH_COUNT);

        console.log(`[Worker] 🚀 Đang lắng nghe queue: ${QUEUE_NAME}`);
        console.log(`[Worker] Prefetch count: ${PREFETCH_COUNT}`);

        // 5. Consume messages
        channel.consume(
            QUEUE_NAME,
            async (msg) => {
                if (msg !== null) {
                    try {
                        // Parse JSON từ Buffer
                        const orderData = JSON.parse(msg.content.toString());

                        // Xử lý đơn hàng
                        await processOrder(orderData, channel, msg);
                    } catch (parseError) {
                        console.error("[Worker] ❌ Lỗi parse JSON:", parseError.message);
                        console.error("[Worker] Raw message:", msg.content.toString());

                        // ACK tin nhắn lỗi format để không bị stuck
                        channel.ack(msg);
                    }
                }
            },
            {
                noAck: false, // Bắt buộc phải ACK thủ công
            },
        );

        console.log("[Worker] ✅ Worker đã sẵn sàng xử lý đơn hàng!");
    } catch (error) {
        console.error("[Worker] ❌ Lỗi khởi động Worker:", error.message);
        process.exit(1);
    }
};

// Xử lý graceful shutdown
const { closeConnection } = require("../config/rabbitmq");

process.on("SIGINT", async () => {
    console.log("[Worker] Đang tắt Worker...");
    await closeConnection();
    await mongoose.connection.close();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("[Worker] Đang tắt Worker...");
    await closeConnection();
    await mongoose.connection.close();
    process.exit(0);
});

// Khởi động Worker
startWorker();

module.exports = { startWorker };
