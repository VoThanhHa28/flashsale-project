import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");
const loginErrorRate = new Rate("login_errors");

const TARGET_VUS = Number(__ENV.TARGET_VUS || 200);

// Test configuration
export let options = {
    stages: [
        { duration: "30s", target: Math.floor(TARGET_VUS * 0.25) }, // Warm-up
        { duration: "30s", target: TARGET_VUS }, // Ramp-up
        { duration: "1m", target: TARGET_VUS }, // Hold
        { duration: "30s", target: 0 }, // Cool-down
    ],
    thresholds: {
        http_req_duration: ["p(95)<2000"], // 95% requests < 2s
        http_req_failed: ["rate<0.1"], // Error rate < 10%
        errors: ["rate<0.1"], // Custom error rate < 10%
    },
};

// API endpoint
const BASE_URL = __ENV.API_URL || "http://localhost:3000";
const LOGIN_ENDPOINT = `${BASE_URL}/v1/api/auth/login`;
const ORDER_ENDPOINT = `${BASE_URL}/v1/api/order`;

// Test data - 1000 users đã seed
const USER_TIMESTAMP = "1775526487648";
const TOTAL_USERS = 1000;
const PASSWORD = "123456";

const PRODUCTS = [
    { id: "698f0a382d13189379eb9be0", price: 20000000 }, // iPhone 15
    { id: "698f0a382d13189379eb9be1", price: 28000000 }, // iPhone 15 Pro
    { id: "698f0a382d13189379eb9be2", price: 18000000 }, // Samsung Galaxy S24
    { id: "698f0a382d13189379eb9be3", price: 32000000 }, // Samsung Galaxy S24 Ultra
    { id: "698f0a382d13189379eb9be4", price: 15000000 }, // Xiaomi 14
    { id: "698f0a382d13189379eb9be5", price: 16000000 }, // Oppo Find X7
    { id: "698f0a382d13189379eb9be6", price: 22000000 }, // Vivo X100 Pro
    { id: "698f0a382d13189379eb9be7", price: 14000000 }, // Realme GT 5 Pro
    { id: "698f0a382d13189379eb9be8", price: 24000000 }, // Google Pixel 8 Pro
    { id: "698f0a382d13189379eb9be9", price: 19000000 }, // Asus ROG Phone 7
];

// Cache JWT tokens cho mỗi VU (lưu trong execution context)
let userToken = null;

/**
 * Get user email based on VU number
 */
function getUserEmail(vuId) {
    const userNumber = ((vuId - 1) % TOTAL_USERS) + 1;
    return `testuser${USER_TIMESTAMP}_${userNumber}@flashsale.test`;
}

/**
 * Login và lấy JWT token
 */
function login(email) {
    const loginData = {
        email: email,
        password: PASSWORD,
    };

    const payload = JSON.stringify(loginData);

    const params = {
        headers: {
            "Content-Type": "application/json",
        },
        timeout: "20s",
    };

    const response = http.post(LOGIN_ENDPOINT, payload, params);

    const checkResult = check(response, {
        "login status is 200": (r) => r.status === 200,
        "login has token": (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.data && body.data.accessToken;
            } catch (e) {
                return false;
            }
        },
    });

    loginErrorRate.add(!checkResult);

    if (!checkResult) {
        console.error(`❌ Login failed for ${email}: ${response.status} - ${response.body}`);
        console.error(`📤 Payload sent: ${payload}`);
        return null;
    }

    try {
        const body = JSON.parse(response.body);
        return {
            token: body.data.accessToken,
        };
    } catch (e) {
        console.error(`❌ Failed to parse login response: ${e.message}`);
        return null;
    }
}

/**
 * Generate random order data
 */
function generateOrderData() {
    const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;

    return {
        items: [
            {
                productId: product.id,
                quantity: quantity,
            },
        ],
        note: `K6 Load Test - VU ${__VU} - Iteration ${__ITER}`,
    };
}

/**
 * Setup function - runs once before test
 */
export function setup() {
    console.log("🚀 Starting authenticated load test...");
    console.log(`📍 Login: ${LOGIN_ENDPOINT}`);
    console.log(`📍 Order: ${ORDER_ENDPOINT}`);
    console.log(`👥 Users: testuser${USER_TIMESTAMP}_{1-${TOTAL_USERS}}@flashsale.test`);
    console.log(`🔑 Password: ${PASSWORD}`);
    console.log(`🎯 Target VUs: ${TARGET_VUS}`);
    return { startTimeMs: Date.now() };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
    // Login 1 lần duy nhất cho mỗi VU
    if (!userToken) {
        const email = getUserEmail(__VU);
        console.log(`🔐 VU ${__VU} logging in as ${email}...`);

        const loginResult = login(email);
        if (!loginResult) {
            console.error(`❌ VU ${__VU} failed to login, skipping...`);
            return;
        }

        userToken = loginResult.token;
        console.log(`✅ VU ${__VU} logged in successfully`);
    }

    // Generate order data
    const orderData = generateOrderData();
    const payload = JSON.stringify(orderData);

    // Headers with JWT token
    const params = {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
        },
        timeout: "20s",
    };

    // Send POST request to real order endpoint
    const response = http.post(ORDER_ENDPOINT, payload, params);

    // Check response
    const checkResult = check(response, {
        "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
        "has statusCode + data": (r) => {
            try {
                const body = JSON.parse(r.body);
                return typeof body.statusCode === "number" && typeof body.data === "object";
            } catch (e) {
                return false;
            }
        },
    });

    check(response, {
        "response time < 2000ms": (r) => r.timings.duration < 2000,
        "response time < 5000ms": (r) => r.timings.duration < 5000,
    });

    // Record errors
    errorRate.add(!checkResult);

    // Log errors
    if (response.status !== 200 && response.status !== 201) {
        console.error(`❌ Order failed: ${response.status} - ${response.body}`);
    }

    // Think time
    sleep(1);
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
    const startTimeMs = data && typeof data.startTimeMs === "number" ? data.startTimeMs : Date.now();
    const duration = (Date.now() - startTimeMs) / 1000;

    console.log("");
    console.log("╔════════════════════════════════════════╗");
    console.log("║    ✅ AUTHENTICATED TEST COMPLETED    ║");
    console.log("╚════════════════════════════════════════╝");
    console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log("");
}
