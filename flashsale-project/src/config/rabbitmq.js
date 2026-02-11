const amqp = require("amqplib");

let connection = null;
let channel = null;

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";
const MAX_RETRY = 5;
const RETRY_DELAY = 5000; // 5 seconds

/**
 * Kết nối đến RabbitMQ với cơ chế retry
 */
const connectToRabbitMQ = async (retryCount = 0) => {
    try {
        console.log(`[RabbitMQ] Đang kết nối đến ${RABBITMQ_URL}...`);

        connection = await amqp.connect(RABBITMQ_URL);

        console.log("[RabbitMQ] Kết nối thành công!");

        // Xử lý khi mất kết nối
        connection.on("error", (err) => {
            console.error("[RabbitMQ] Connection error:", err.message);
        });

        connection.on("close", () => {
            console.warn("[RabbitMQ] Connection closed. Reconnecting...");
            connection = null;
            channel = null;

            // Tự động reconnect sau 5 giây
            setTimeout(() => connectToRabbitMQ(), RETRY_DELAY);
        });

        return connection;
    } catch (error) {
        console.error(`[RabbitMQ] Lỗi kết nối (lần ${retryCount + 1}):`, error.message);

        if (retryCount < MAX_RETRY) {
            console.log(`[RabbitMQ] Retry sau ${RETRY_DELAY / 1000} giây...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
            return connectToRabbitMQ(retryCount + 1);
        } else {
            throw new Error(`[RabbitMQ] Không thể kết nối sau ${MAX_RETRY} lần thử`);
        }
    }
};

/**
 * Tạo channel giao tiếp với RabbitMQ
 */
const createChannel = async () => {
    try {
        if (!connection) {
            await connectToRabbitMQ();
        }

        if (!channel) {
            channel = await connection.createChannel();
            console.log("[RabbitMQ] Channel created successfully!");

            // Xử lý lỗi channel
            channel.on("error", (err) => {
                console.error("[RabbitMQ] Channel error:", err.message);
                channel = null;
            });

            channel.on("close", () => {
                console.warn("[RabbitMQ] Channel closed");
                channel = null;
            });
        }

        return channel;
    } catch (error) {
        console.error("[RabbitMQ] Lỗi tạo channel:", error.message);
        throw error;
    }
};

/**
 * Lấy channel hiện tại hoặc tạo mới
 */
const getChannel = async () => {
    if (!channel) {
        return await createChannel();
    }
    return channel;
};

/**
 * Đóng kết nối RabbitMQ
 */
const closeConnection = async () => {
    try {
        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        console.log("[RabbitMQ] Connection closed successfully");
    } catch (error) {
        console.error("[RabbitMQ] Lỗi khi đóng kết nối:", error.message);
    }
};

module.exports = {
    connectToRabbitMQ,
    createChannel,
    getChannel,
    closeConnection,
};
