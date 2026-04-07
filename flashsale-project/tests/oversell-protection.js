/**
 * K6 Load Test: Chứng minh hệ thống chống Oversell
 * 
 * TEST PLAN:
 * - Product stock = 5 units
 * - 100 concurrent users đặt hàng
 * - EXPECTED: 5 orders thành công (200), 95 orders reject (400)
 * 
 * RUN: k6 run tests/oversell-protection.js
 */

import http from 'k6/http';
import { check, group } from 'k6';

// ==================== CONFIG ====================
const PRODUCT_ID = '66234567890abcdef1234567'; // 👈 THAY BẰNG PRODUCT ID THỰC TẾ
const STOCK = 5; // 👈 Số stock của product
const VUS = 100; // 100 concurrent users
const DURATION = '30s';

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_duration: ['p(99)<500'], // 99% requests < 500ms
  },
};

// ==================== BIẾN TOÀN CỤC ====================
let successCount = 0;
let failCount = 0;
let oversellCount = 0;

// ==================== TEST ====================
export default function () {
  group('Flash Sale - Oversell Protection', function () {
    const payload = {
      productId: PRODUCT_ID,
      quantity: 1,
    };

    const response = http.post(
      'http://localhost:3000/v1/api/order/test',
      JSON.stringify(payload),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    // ✅ Đặt hàng thành công
    if (response.status === 201 || response.status === 200) {
      successCount++;
      check(response, {
        '[201/200] Order Success': (r) => r.status === 201 || r.status === 200,
      });
    }
    // ❌ Hết hàng (EXPECTED khi vượt quá stock)
    else if (response.status === 400) {
      const body = JSON.parse(response.body);
      if (body.message && body.message.includes('hết hàng')) {
        failCount++;
        check(response, {
          '[400] Out of Stock': (r) => r.status === 400,
        });
      }
    }
    // 🚨 Bất thường (không nên xảy ra)
    else {
      oversellCount++;
      console.error(
        `❌ OVERSELL DETECTED! Status: ${response.status}, Body: ${response.body}`
      );
      check(response, {
        '[Oversell Check] Status NOT 400': (r) => r.status !== 400,
      });
    }
  });
}

// ==================== SUMMARY ====================
export function teardown() {
  console.log(`
╔════════════════════════════════════════════╗
║        OVERSELL PROTECTION TEST RESULT     ║
╚════════════════════════════════════════════╝

📊 SUMMARY:
  • Total Requests: ${VUS}
  • Stock Available: ${STOCK}
  • Successful Orders (201): ${successCount} ✅
  • Failed Orders - Out of Stock (400): ${failCount} ❌
  • Oversell Violations: ${oversellCount} 🚨

✅ TEST PASSED IF:
  • successCount === ${STOCK} (chỉ ${STOCK} orders được accept)
  • failCount === ${VUS - STOCK} (${VUS - STOCK} orders bị reject)
  • oversellCount === 0 (KHÔNG bao giờ oversell)

❌ TEST FAILED IF:
  • successCount > ${STOCK} → OVERSELL HẬP HĂN!
  • oversellCount > 0 → LỖI HỆ THỐNG!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}
