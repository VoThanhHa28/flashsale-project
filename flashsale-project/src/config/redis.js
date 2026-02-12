const { createClient } = require('redis');
require('dotenv').config();

const client = createClient({
    url: process.env.REDIS_URI || 'redis://localhost:6379',
    socket: {
        // Chiến thuật kết nối lại thông minh
        reconnectStrategy: (retries) => {
            if (retries > 20) {
                console.log('Error: Retry connection exhausted. Redis is dead.');
                return new Error('Retry connection exhausted');
            }
            // Thời gian chờ tăng dần: 100ms, 200ms... tối đa 3s
            return Math.min(retries * 100, 3000);
        }
    }
});

// Lắng nghe sự kiện để log (Dễ debug)
client.on('error', (err) => console.log('❌ Redis Client Error', err));
client.on('connect', () => console.log('✅ Redis Connected!'));
client.on('ready', () => console.log('✅ Redis Ready to use!'));

// Kết nối ngay lập tức
(async () => {
    await client.connect();
})();

module.exports = client;