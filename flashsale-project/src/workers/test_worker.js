"use strict";

const amqp = require("amqplib");

const QUEUE_NAME = "order-queue";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

// Danh sách sản phẩm giả
const PRODUCTS = [
    { id: "65b3abc111", name: "iPhone 15 Pro Max", price: 30000000 },
    { id: "65b3abc222", name: "Samsung Galaxy S24", price: 25000000 },
    { id: "65b3abc333", name: "MacBook Pro M3", price: 50000000 },
    { id: "65b3abc444", name: "iPad Air", price: 15000000 },
    { id: "65b3abc555", name: "AirPods Pro", price: 6000000 },
];

// Danh sách user giả
const USERS = ["65b2user001", "65b2user002", "65b2user003", "65b2user004", "65b2user005"];

/**
 * Tạo dữ liệu đơn hàng ngẫu nhiên
 */
const generateOrderData = (index) => {
    const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    const quantity = Math.floor(Math.random() * 3) + 1; // 1-3

    return {
        userId: userId,
        productId: product.id,
        quantity: quantity,
        price: product.price,
        orderTime: new Date().toISOString(),
    };
};

/**
 * Gửi nhiều đơn hàng test vào Queue
 */
const testSendOrders = async () => {
    let connection;
    let channel;

    try {
        console.log("");
        console.log("╔════════════════════════════════════════╗");
        console.log("║      🧪 TEST WORKER - SEND ORDERS     ║");
        console.log("╚════════════════════════════════════════╝");
        console.log("");

        // Kết nối RabbitMQ
        console.log("[Test] Đang kết nối RabbitMQ...");
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();
        console.log("[Test] ✅ Kết nối thành công!");

        // Khai báo Queue
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        console.log("");
        console.log(`[Test] 📤 Bắt đầu gửi 10 đơn hàng vào queue: ${QUEUE_NAME}`);
        console.log("");

        // Gửi 10 đơn hàng test
        for (let i = 1; i <= 10; i++) {
            const orderData = generateOrderData(i);

            // Gửi message vào queue
            channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(orderData)), {
                persistent: true, // Đảm bảo message không mất khi RabbitMQ restart
            });

            console.log(`[Test] ✅ Đơn hàng ${i}/10`);
            console.log(`       User: ${orderData.userId}`);
            console.log(`       Product: ${orderData.productId}`);
            console.log(`       Quantity: ${orderData.quantity}`);
            console.log(`       Price: ${orderData.price.toLocaleString("vi-VN")} VNĐ`);
            console.log(`       Total: ${(orderData.quantity * orderData.price).toLocaleString("vi-VN")} VNĐ`);
            console.log("");

            // Delay nhỏ giữa các lần gửi
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log("╔════════════════════════════════════════╗");
        console.log("║       🎉 ĐÃ GỬI XONG 10 ĐƠN HÀNG      ║");
        console.log("╚════════════════════════════════════════╝");
        console.log("");
        console.log("📋 Kiểm tra:");
        console.log("   1. Log của Worker để xem kết quả xử lý");
        console.log("   2. RabbitMQ UI: http://localhost:15672");
        console.log("   3. MongoDB: mongosh flashsale → db.orders.find()");
        console.log("");
    } catch (error) {
        console.error("");
        console.error("╔════════════════════════════════════════╗");
        console.error("║           ❌ TEST THẤT BẠI            ║");
        console.error("╚════════════════════════════════════════╝");
        console.error("");
        console.error("[Test] Lỗi:", error.message);
        console.error("[Test] Stack:", error.stack);
    } finally {
        // Đóng kết nối
        try {
            if (channel) await channel.close();
            if (connection) await connection.close();
            console.log("[Test] ✅ Đã đóng kết nối RabbitMQ");
        } catch (closeError) {
            console.error("[Test] Lỗi đóng kết nối:", closeError.message);
        }
    }
};

// Chạy test
testSendOrders();
