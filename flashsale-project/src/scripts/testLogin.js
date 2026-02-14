/**
 * Script test login với 1 user đã seed
 * Chạy: node src/scripts/testLogin.js
 */

require("dotenv").config();
const http = require("http");

const BASE_URL = "http://localhost:3000";
const LOGIN_PATH = "/v1/api/auth/login";

// Test với user đầu tiên
const USER_TIMESTAMP = "1771040216695"; // Thay bằng timestamp của bạn
const TEST_EMAIL = `testuser${USER_TIMESTAMP}_1@flashsale.test`;
const TEST_PASSWORD = "123456";

async function testLogin() {
    console.log("🔐 Testing login...");
    console.log(`📧 Email: ${TEST_EMAIL}`);
    console.log(`🔑 Password: ${TEST_PASSWORD}`);
    console.log(`📍 Endpoint: ${BASE_URL}${LOGIN_PATH}`);
    console.log("");

    const postData = JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
    });

    const options = {
        hostname: "localhost",
        port: 3000,
        path: LOGIN_PATH,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
        },
    };

    const req = http.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
            data += chunk;
        });

        res.on("end", () => {
            console.log(`Status: ${res.statusCode}`);
            console.log("");

            try {
                const jsonData = JSON.parse(data);
                console.log("Response:", JSON.stringify(jsonData, null, 2));

                if (res.statusCode === 200 && jsonData.data && jsonData.data.accessToken) {
                    console.log("");
                    console.log("✅ LOGIN SUCCESSFUL!");
                    console.log("🎫 Access Token:", jsonData.data.accessToken.substring(0, 50) + "...");
                } else {
                    console.log("");
                    console.log("❌ LOGIN FAILED!");
                }
            } catch (e) {
                console.error("Failed to parse response:", data);
            }
        });
    });

    req.on("error", (error) => {
        console.error("❌ Request error:", error.message);
    });

    req.write(postData);
    req.end();
}

testLogin();
