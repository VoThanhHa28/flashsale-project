import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
    vus: 100, // 100 virtual users
    duration: "30s", // Test trong 30 giây
};

const BASE_URL = "http://localhost:3000";

export default function () {
    const orderData = {
        userId: "65b2user001",
        productId: "65b3abc111",
        quantity: 1,
        price: 30000000,
    };

    const response = http.post(`${BASE_URL}/api/orders`, JSON.stringify(orderData), {
        headers: { "Content-Type": "application/json" },
    });

    check(response, {
        "status is 200": (r) => r.status === 200 || r.status === 201,
    });

    sleep(1);
}
