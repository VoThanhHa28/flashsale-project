"use strict";

require("dotenv").config();

const { getChannel, connectToRabbitMQ } = require("../config/rabbitmq");
const { initSocket } = require("../config/socket");
const OrderService = require("../services/order.service");
const mongoose = require("mongoose");
const http = require("http");
const { RABBIT_QUEUE } = require("../constants");

// Alias for backward compatibility
const QUEUE_NAME = { ORDER: RABBIT_QUEUE.ORDER_QUEUE };

// Cấu hình
const PREFETCH_COUNT = parseInt(process.env.PREFETCH_COUNT) || 10;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/flashsale";

/**
 * Kết nối MongoDB
 */
const connectMongoDB = async () => {
    try {
        console.log("[MongoDB] Đang kết nối...");
        await mongoose.connect(MONGODB_URI);
        console.log("[MongoDB] ✅ Kết nối thành công!");
    } catch (error) {
        console.error("[MongoDB] ❌ Lỗi kết nối:", error.message);
        process.exit(1);
    }
};

/**
 * Khởi tạo Socket.io cho Worker (không listen port).
 * Dùng chung Redis adapter với App → emit từ Worker vẫn tới client đang connect App.
 */
const initWorkerSocket = async () => {
    const server = http.createServer();
    await initSocket(server);
    console.log("[Socket.io] Worker đã gắn Redis adapter, emit sẽ tới client của App");
    return server;
};

/**
 * Xử lý đơn hàng từ queue
 */
const processOrder = async (orderData, channel, msg) => {
    const startTime = Date.now();

    try {
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("[Worker] 📦 Nhận đơn hàng mới");
        console.log("[Worker] Dữ liệu:", JSON.stringify(orderData, null, 2));

        const order = await OrderService.processOrderFromQueue(orderData);

        const { lines } = OrderService.normalizeOrderQueuePayload(orderData);
        for (const line of lines) {
            await OrderService.notifyStockUpdate(line.productId, line.quantity, null);
        }

        // Thông báo cho user (nếu cần)
        // await OrderService.notifyOrderSuccess(order.userId, order);

        const processingTime = Date.now() - startTime;
        console.log(`[Worker] ✅ Hoàn thành trong ${processingTime}ms`);
        console.log(`[Worker] Order ID: ${order._id}`);
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // ACK tin nhắn
        channel.ack(msg);

        return order;
    } catch (error) {
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.error("[Worker] ❌ LỖI XỬ LÝ ĐỜN HÀNG");
        console.error("[Worker] Message:", error.message);
        console.error("[Worker] Stack:", error.stack);
        console.error("[Worker] Dữ liệu lỗi:", JSON.stringify(orderData, null, 2));
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

        // Lưu đơn hàng lỗi vào DB
        await OrderService.saveFailedOrder(orderData, error.message);

        // NACK message (không requeue để tránh loop vô hạn)
        channel.nack(msg, false, false);
    }
};

/**
 * Khởi động Worker
 */
const startWorker = async () => {
    let socketServer = null;

    try {
        console.log("");
        console.log("╔════════════════════════════════════════╗");
        console.log("║   🚀 FLASHSALE ORDER WORKER v1.0.0    ║");
        console.log("╚════════════════════════════════════════╝");
        console.log("");

        // 1. Kết nối MongoDB
        await connectMongoDB();

        // 2. Khởi tạo Socket.io
        socketServer = await initWorkerSocket();

        // 3. Kết nối RabbitMQ
        console.log("[RabbitMQ] Đang kết nối...");
        await connectToRabbitMQ();
        const channel = await getChannel();
        console.log("[RabbitMQ] ✅ Kết nối thành công!");

        // 4. Khai báo Queue
        await channel.assertQueue(QUEUE_NAME.ORDER, {
            durable: true,
            arguments: {
                // Có thể thêm Dead Letter Exchange
                // 'x-dead-letter-exchange': 'dlx-exchange',
                // 'x-dead-letter-routing-key': 'failed-orders'
            },
        });

        // 5. Giới hạn số message xử lý đồng thời
        channel.prefetch(PREFETCH_COUNT);

        console.log("");
        console.log("╔═════��══════════════════════════════════╗");
        console.log("║          ✅ WORKER READY              ║");
        console.log("╠════════════════════════════════════════╣");
        console.log(`║  Queue: ${QUEUE_NAME.ORDER.padEnd(29)}║`);
        console.log(`║  Prefetch: ${PREFETCH_COUNT.toString().padEnd(26)}║`);
        console.log(`║  MongoDB: Connected                   ║`);
        console.log(`║  RabbitMQ: Connected                  ║`);
        console.log(`║  Socket.io: Redis adapter (emit → App)  ║`);
        console.log("╚════════════════════════════════════════╝");
        console.log("");
        console.log("⏳ Đang lắng nghe đơn hàng...\n");

        // 6. Consume messages
        channel.consume(
            QUEUE_NAME.ORDER,
            async (msg) => {
                if (msg !== null) {
                    try {
                        // Parse JSON từ Buffer
                        const orderData = JSON.parse(msg.content.toString());

                        // Xử lý đơn hàng
                        await processOrder(orderData, channel, msg);
                    } catch (parseError) {
                        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
                        console.error("[Worker] ❌ LỖI PARSE JSON");
                        console.error("[Worker] Message:", parseError.message);
                        console.error("[Worker] Raw data:", msg.content.toString());
                        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

                        // ACK tin nhắn lỗi format để không bị stuck
                        channel.ack(msg);
                    }
                }
            },
            {
                noAck: false, // Bắt buộc phải ACK thủ công
            },
        );
    } catch (error) {
        console.error("");
        console.error("╔════════════════════════════════════════╗");
        console.error("║     ❌ WORKER KHỞI ĐỘNG THẤT BẠI      ║");
        console.error("╚════════════════════════════════════════╝");
        console.error("");
        console.error("[Worker] Lỗi:", error.message);
        console.error("[Worker] Stack:", error.stack);

        // Đóng các kết nối nếu có
        if (socketServer) {
            socketServer.close();
        }

        process.exit(1);
    }
};

// Xử lý graceful shutdown
process.on("SIGINT", async () => {
    console.log("\n[Worker] 🛑 Đang tắt Worker...");

    try {
        await mongoose.connection.close();
        console.log("[Worker] ✅ Đã đóng MongoDB");
    } catch (error) {
        console.error("[Worker] ❌ Lỗi đóng MongoDB:", error.message);
    }

    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("\n[Worker] 🛑 Nhận SIGTERM, đang tắt...");

    try {
        await mongoose.connection.close();
        console.log("[Worker] ✅ Đã đóng MongoDB");
    } catch (error) {
        console.error("[Worker] ❌ Lỗi đóng MongoDB:", error.message);
    }

    process.exit(0);
});

// Xử lý uncaught exception
process.on("uncaughtException", (error) => {
    console.error("[Worker] ❌ Uncaught Exception:", error);
    process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("[Worker] ❌ Unhandled Rejection at:", promise);
    console.error("[Worker] Reason:", reason);
});

// Khởi động Worker
startWorker();

module.exports = { startWorker };
