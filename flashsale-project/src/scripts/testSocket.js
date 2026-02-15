/**
 * Script test Socket.io emit
 * Test emit stock update manually
 * Chạy: node src/scripts/testSocket.js
 */

require("dotenv").config();

async function testSocketEmit() {
    try {
        const { getIO } = require("../config/socket");
        const CONST = require("../constants");

        console.log("🧪 Testing Socket.io emit...\n");

        // Get socket instance
        const io = getIO();

        // Test data
        const testData = {
            productId: "698f0a382d13189379eb9be0",
            quantity: 1,
            remainingStock: 999,
            timestamp: Date.now(),
        };

        console.log("📤 Emitting update-stock event...");
        console.log("Data:", JSON.stringify(testData, null, 2));

        // Emit to all clients
        io.emit(CONST.SOCKET.SOCKET_EVENT.UPDATE_STOCK, testData);

        console.log("\n✅ Event emitted successfully!");
        console.log("💡 Check browser console để xem có nhận được không");

        // Test flash sale start
        console.log("\n📤 Emitting flash-sale-start event...");
        const flashSaleData = {
            productId: "698f0a382d13189379eb9be0",
            productName: "iPhone 15",
            productPrice: 20000000,
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 3600000).toISOString(),
            quantity: 1000,
            message: "Flash sale test!",
        };

        console.log("Data:", JSON.stringify(flashSaleData, null, 2));
        io.emit(CONST.SOCKET.SOCKET_EVENT.FLASH_SALE_START, flashSaleData);

        console.log("\n✅ Flash sale event emitted!");
    } catch (error) {
        console.error("\n❌ Error:", error.message);
        console.log("\n💡 Make sure server is running: npm start");
    }
}

// Chạy test sau 1 giây để đảm bảo server đã khởi động
setTimeout(testSocketEmit, 1000);
