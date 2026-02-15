"use strict";

const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const { createClient } = require("redis");
const { SOCKET_EVENT, SOCKET_ROOM, SOCKET_MESSAGE } = require("../constants/socket.constant");

let io = null;

const initSocket = async (server) => {
    if (io) {
        console.log("[Socket.io] Đã khởi tạo trước đó");
        return io;
    }

    io = new Server(server, {
        cors: {
            origin: [process.env.CLIENT_URL || "http://localhost:3001", "http://localhost:3000", "http://localhost:3002", "http://localhost:5173"],
            methods: ["GET", "POST"],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Setup Redis Adapter (cho phép nhiều Socket.io servers share events)
    try {
        const pubClient = createClient({
            url: process.env.REDIS_URL || "redis://localhost:6379",
        });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));
        console.log("[Socket.io] ✅ Redis Adapter kích hoạt - Multi-server mode");
    } catch (error) {
        console.warn("[Socket.io] ⚠️  Redis Adapter không khả dụng:", error.message);
        console.warn("[Socket.io] ⚠️  Chạy ở Single-server mode");
    }

    console.log("[Socket.io] Khởi tạo thành công");

    // Xử lý kết nối
    io.on(SOCKET_EVENT.CONNECTION, (socket) => {
        console.log(`[Socket.io] Client kết nối: ${socket.id}`);

        // Client join room theo productId
        socket.on(SOCKET_EVENT.JOIN_PRODUCT_ROOM, (productId) => {
            if (!productId) {
                console.error("[Socket.io] ProductId không hợp lệ");
                return;
            }

            const roomName = SOCKET_ROOM.PRODUCT(productId);
            socket.join(roomName);
            console.log(`[Socket.io] Client ${socket.id} joined room: ${roomName}`);

            // Xác nhận đã join
            socket.emit("room-joined", {
                room: roomName,
                message: SOCKET_MESSAGE.JOINED_ROOM,
            });
        });

        // Client leave room theo productId
        socket.on(SOCKET_EVENT.LEAVE_PRODUCT_ROOM, (productId) => {
            if (!productId) return;

            const roomName = SOCKET_ROOM.PRODUCT(productId);
            socket.leave(roomName);
            console.log(`[Socket.io] Client ${socket.id} left room: ${roomName}`);
        });

        // Client join flash sale room
        socket.on(SOCKET_EVENT.JOIN_FLASH_SALE_ROOM, (flashSaleId) => {
            if (!flashSaleId) {
                console.error("[Socket.io] FlashSaleId không hợp lệ");
                return;
            }

            const roomName = SOCKET_ROOM.FLASH_SALE(flashSaleId);
            socket.join(roomName);
            console.log(`[Socket.io] Client ${socket.id} joined flash sale room: ${roomName}`);

            socket.emit("room-joined", {
                room: roomName,
                message: SOCKET_MESSAGE.JOINED_ROOM,
            });
        });

        // Client leave flash sale room
        socket.on(SOCKET_EVENT.LEAVE_FLASH_SALE_ROOM, (flashSaleId) => {
            if (!flashSaleId) return;

            const roomName = SOCKET_ROOM.FLASH_SALE(flashSaleId);
            socket.leave(roomName);
            console.log(`[Socket.io] Client ${socket.id} left flash sale room: ${roomName}`);
        });

        // Xử lý disconnect
        socket.on(SOCKET_EVENT.DISCONNECT, (reason) => {
            console.log(`[Socket.io] Client ${socket.id} ngắt kết nối: ${reason}`);
        });

        // Xử lý lỗi
        socket.on("error", (error) => {
            console.error(`[Socket.io] Socket error:`, error);
        });
    });

    // Xử lý lỗi connection
    io.on("error", (error) => {
        console.error("[Socket.io] Server error:", error);
    });

    return io;
};

/**
 * Lấy Socket.io instance
 * @returns {Object} Socket.io instance
 */
const getIO = () => {
    if (!io) {
        throw new Error("[Socket.io] Chưa khởi tạo. Gọi initSocket() trước!");
    }
    return io;
};

/**
 * Đóng Socket.io connection
 */
const closeSocket = () => {
    if (io) {
        io.close();
        io = null;
        console.log("[Socket.io] Đã đóng kết nối");
    }
};

module.exports = {
    initSocket,
    getIO,
    closeSocket,
};
