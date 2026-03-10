#!/usr/bin/env node
/**
 * Kiểm tra backend trước khi hoàn thành feature.
 * Gọi GET {REACT_APP_API_URL}/v1/api/products và in OK hoặc lỗi.
 * Cần file .env có REACT_APP_API_URL (vd. http://localhost:3001).
 */
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^\s*REACT_APP_API_URL\s*=\s*(.+)\s*$/);
    if (m) process.env.REACT_APP_API_URL = m[1].trim().replace(/^["']|["']$/g, '');
  });
}

const baseUrl = process.env.REACT_APP_API_URL || '';
if (!baseUrl) {
  console.log('⚠ Không có REACT_APP_API_URL trong .env — bỏ qua kiểm tra backend.');
  process.exit(0);
}

const url = `${baseUrl.replace(/\/$/, '')}/v1/api/products`;

async function check() {
  try {
    const res = await fetch(url, { method: 'GET' });
    if (res.ok || res.status === 304) {
      console.log(`✓ Backend OK: GET ${url} → ${res.status}`);
      process.exit(0);
    }
    console.error(`✗ Backend trả lỗi: ${res.status} ${res.statusText}`);
    process.exit(1);
  } catch (err) {
    console.error(`✗ Không kết nối được backend (${url}):`, err.message || err);
    process.exit(1);
  }
}

check();
