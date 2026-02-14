import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

// Custom metrics
const errorRate = new Rate("errors");

// Test configuration
export let options = {
    stages: [
        { duration: "30s", target: 100 }, // Warm-up: 0 → 100 users
        { duration: "10s", target: 1000 }, // Spike: 100 → 1000 users
        { duration: "1m", target: 1000 }, // Hold: 1000 users
        { duration: "30s", target: 0 }, // Cool-down: 1000 → 0 users
    ],
    thresholds: {
        http_req_duration: ["p(95)<500"], // 95% requests < 500ms
        http_req_failed: ["rate<0.1"], // Error rate < 10%
        errors: ["rate<0.1"], // Custom error rate < 10%
    },
};

// API endpoint
const BASE_URL = __ENV.API_URL || "http://localhost:3000";
const ORDER_ENDPOINT = `${BASE_URL}/api/orders/test`;

// Test data
const PRODUCTS = [
    { id: "698f0a382d13189379eb9be0", price: 20000000 }, // iPhone 15
    { id: "698f0a382d13189379eb9be1", price: 28000000 }, // iPhone 15 Pro
    { id: "698f0a382d13189379eb9be2", price: 18000000 }, // Samsung Galaxy S24
    { id: "698f0a382d13189379eb9be3", price: 32000000 }, // Samsung Galaxy S24 Ultra
    { id: "698f0a382d13189379eb9be4", price: 15000000 }, // Xiaomi 14
];

const USERS = ["65b2user001", "65b2user002", "65b2user003", "65b2user004", "65b2user005"];

/**
 * Generate random order data
 */
function generateOrderData() {
    const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const userId = USERS[Math.floor(Math.random() * USERS.length)];
    const quantity = Math.floor(Math.random() * 3) + 1;

    return {
        userId: userId,
        productId: product.id,
        quantity: quantity,
        price: product.price,
    };
}

/**
 * Setup function - runs once before test
 */
export function setup() {
    console.log("🚀 Starting load test...");
    console.log(`📍 Target: ${ORDER_ENDPOINT}`);
    return { startTime: new Date() };
}

/**
 * Main test function - runs for each VU
 */
export default function (data) {
    // Generate order data
    const orderData = generateOrderData();
    const payload = JSON.stringify(orderData);

    // Headers
    const params = {
        headers: {
            "Content-Type": "application/json",
        },
        timeout: "10s",
    };

    // Send POST request
    const response = http.post(ORDER_ENDPOINT, payload, params);

    // Check response
    const checkResult = check(response, {
        "status is 200 or 201": (r) => r.status === 200 || r.status === 201,
        "response time < 500ms": (r) => r.timings.duration < 500,
        "response time < 1000ms": (r) => r.timings.duration < 1000,
        "has success field": (r) => {
            try {
                const body = JSON.parse(r.body);
                return body.hasOwnProperty("success");
            } catch (e) {
                return false;
            }
        },
    });

    // Record errors
    errorRate.add(!checkResult);

    // Log errors
    if (response.status !== 200 && response.status !== 201) {
        console.error(`❌ Request failed: ${response.status} - ${response.body}`);
    }

    // Think time
    sleep(1);
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data) {
    const endTime = new Date();
    const duration = (endTime - data.startTime) / 1000;

    console.log("");
    console.log("╔════════════════════════════════════════╗");
    console.log("║         ✅ TEST COMPLETED             ║");
    console.log("╚════════════════════════════════════════╝");
    console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log("");
}
