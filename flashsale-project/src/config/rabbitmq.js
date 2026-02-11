const amqp = require('amqplib');
require('dotenv').config();

let channel = null;

const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URI || 'amqp://localhost:5672');
        channel = await connection.createChannel();
        
        // Tạo sẵn queue tên 'order-queue' để đảm bảo nó tồn tại
        await channel.assertQueue('order-queue', {
            durable: true // Server sập mở lại queue vẫn còn
        });
        
        console.log('✅ RabbitMQ Connected & Queue Created!');
    } catch (error) {
        console.error('❌ RabbitMQ Connection Failed:', error);
    }
};

// Hàm gửi tin nhắn (Dùng cho Controller)
const sendToQueue = async (msg) => {
    if (!channel) await connectRabbitMQ();
    
    // Gửi buffer (RabbitMQ chỉ nhận Buffer)
    channel.sendToQueue('order-queue', Buffer.from(JSON.stringify(msg)), {
        persistent: true // Lưu tin nhắn xuống ổ cứng, RabbitMQ sập không mất
    });
};

// Kết nối ngay khi file được load
connectRabbitMQ();

module.exports = { sendToQueue };