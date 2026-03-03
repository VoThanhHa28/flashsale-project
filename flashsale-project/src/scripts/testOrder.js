/**
 * Script test order flow hoàn chỉnh
 * Chạy: node src/scripts/testOrder.js
 */

require("dotenv").config();
const http = require("http");

const BASE_URL = "http://localhost:3000";
const LOGIN_PATH = "/v1/api/auth/login";
const ORDER_PATH = "/v1/api/order";
const PRODUCTS_PATH = "/v1/api/products";

// Test với user đầu tiên
const USER_TIMESTAMP = "1771040216695"; // Thay bằng timestamp của bạn
const TEST_EMAIL = `testuser${USER_TIMESTAMP}_1@flashsale.test`;
const TEST_PASSWORD = "123456";

function httpRequest(path, method = "GET", data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "localhost",
            port: 3000,
            path: path,
            method: method,
            headers: {
                "Content-Type": "application/json",
                ...headers,
            },
        };

        if (data) {
            const postData = JSON.stringify(data);
            options.headers["Content-Length"] = Buffer.byteLength(postData);
        }

        const req = http.request(options, (res) => {
            let responseData = "";

            res.on("data", (chunk) => {
                responseData += chunk;
            });

            res.on("end", () => {
                try {
                    const jsonData = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${responseData}`));
                }
            });
        });

        req.on("error", (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testOrderFlow() {
    try {
        console.log("🚀 Bắt đầu test order flow...\n");

        // Step 1: Login
        console.log("📝 Step 1: Login");
        console.log(`   Email: ${TEST_EMAIL}`);
        const loginResponse = await httpRequest(LOGIN_PATH, "POST", {
            email: TEST_EMAIL,
            password: TEST_PASSWORD,
        });

        if (loginResponse.status !== 200) {
            console.error("❌ Login failed:", loginResponse.data);
            return;
        }

        const accessToken = loginResponse.data.data.accessToken;
        console.log(`   ✅ Login thành công`);
        console.log(`   🎫 Token: ${accessToken.substring(0, 30)}...\n`);

        // Step 2: Get products
        console.log("📝 Step 2: Get products từ API");
        const productsResponse = await httpRequest(PRODUCTS_PATH, "GET", null, {
            Authorization: `Bearer ${accessToken}`,
        });

        console.log("   📥 Products response status:", productsResponse.status);
        console.log("   📥 Products response:", JSON.stringify(productsResponse.data, null, 2));

        const products =
            productsResponse.data.data?.products ||
            productsResponse.data.metadata?.products ||
            productsResponse.data.data ||
            productsResponse.data.products ||
            [];

        if (products.length === 0) {
            console.error("❌ Không có products trong database!");
            console.error("💡 Chạy: npm run seed:products");
            return;
        }

        console.log(`   ✅ Tìm thấy ${products.length} products`);
        const firstProduct = products[0];
        console.log(`   📦 Product test: ${firstProduct.productName}`);
        console.log(`   🆔 ID: ${firstProduct._id}`);
        console.log(`   💰 Giá: ${firstProduct.productPrice.toLocaleString("vi-VN")} VNĐ`);
        console.log(`   📊 Số lượng: ${firstProduct.productQuantity}\n`);

        // Step 3: Create order
        console.log("📝 Step 3: Tạo order");
        const orderData = {
            items: [
                {
                    productId: firstProduct._id,
                    quantity: 1,
                },
            ],
            note: "Test order from script",
        };

        console.log("   📤 Order data:", JSON.stringify(orderData, null, 2));

        const orderResponse = await httpRequest(ORDER_PATH, "POST", orderData, {
            Authorization: `Bearer ${accessToken}`,
        });

        console.log(`   📥 Response status: ${orderResponse.status}`);
        console.log("   📥 Response data:", JSON.stringify(orderResponse.data, null, 2));

        if (orderResponse.status === 200 || orderResponse.status === 201) {
            console.log("\n✅ TẠO ORDER THÀNH CÔNG!");
        } else {
            console.log("\n❌ TẠO ORDER THẤT BẠI!");
        }
    } catch (error) {
        console.error("\n❌ Error:", error.message);
    }
}

testOrderFlow();
