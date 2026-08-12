/**
 * CopyCraft — Full API & Credential Health Check
 * -----------------------------------------------
 * Run: node test-api-health.mjs
 *
 * Tests:
 *  1. MongoDB Atlas connection
 *  2. Cloudflare R2 credentials (bucket head)
 *  3. JWT sign / verify
 *  4. All REST endpoints (requires server running on PORT 5000)
 */

import 'dotenv/config';
import jwt from 'jsonwebtoken';

const BASE = `http://localhost:${process.env.PORT || 5000}`;
const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';
const WARN = '\x1b[33m⚠️  WARN\x1b[0m';
const INFO = '\x1b[36mℹ️  INFO\x1b[0m';

let authToken = '';
let orderId = '';
let results = [];

function log(label, status, msg) {
  const icon = status === 'PASS' ? PASS : status === 'FAIL' ? FAIL : status === 'WARN' ? WARN : INFO;
  console.log(`  ${icon}  ${label}: ${msg}`);
  results.push({ label, status, msg });
}

async function apiCall(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: {}, error: e.message };
  }
}

// ─────────────────────────────────────────────
// 1. MONGODB
// ─────────────────────────────────────────────
async function testMongoDB() {
  console.log('\n\x1b[1m── 1. MongoDB Atlas ──────────────────────────\x1b[0m');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    log('MONGODB_URI', 'FAIL', 'Not set in .env');
    return;
  }
  log('MONGODB_URI', 'INFO', `Found (cluster: ${uri.split('@')[1]?.split('/')[0] ?? 'unknown'})`);

  try {
    const { MongoClient } = await import('mongodb');
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000, family: 4, tls: true });
    await client.connect();
    const db = client.db(process.env.DB_NAME || 'copycraft_db');
    await db.command({ ping: 1 });
    const colls = await db.listCollections().toArray();
    log('Connection', 'PASS', `Connected — DB: ${db.databaseName}, Collections: ${colls.map(c => c.name).join(', ') || 'none yet'}`);
    
    // Check seed users exist
    const users = db.collection('users');
    const count = await users.countDocuments();
    if (count > 0) {
      log('Seed Data', 'PASS', `${count} user(s) found in users collection`);
      const admin = await users.findOne({ role: { $in: ['admin', 'super_admin'] } });
      if (admin) log('Admin User', 'PASS', `Found: ${admin.email}`);
      else log('Admin User', 'WARN', 'No admin user found — seed data may be missing');
    } else {
      log('Seed Data', 'WARN', 'users collection is empty — app will use in-memory store');
    }
    await client.close();
  } catch (err) {
    log('Connection', 'FAIL', err.message);
  }
}

// ─────────────────────────────────────────────
// 2. CLOUDFLARE R2
// ─────────────────────────────────────────────
async function testR2() {
  console.log('\n\x1b[1m── 2. Cloudflare R2 ──────────────────────────\x1b[0m');
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    log('R2 Credentials', 'WARN', 'One or more R2 env vars are missing — file uploads will use fallback');
    return;
  }
  log('R2_ACCOUNT_ID', 'INFO', R2_ACCOUNT_ID);
  log('R2_ACCESS_KEY_ID', 'INFO', R2_ACCESS_KEY_ID.slice(0, 8) + '...');
  log('R2_SECRET_ACCESS_KEY', 'INFO', R2_SECRET_ACCESS_KEY.slice(0, 8) + '...');
  log('R2_BUCKET_NAME', 'INFO', R2_BUCKET_NAME || 'copycraft-files');

  try {
    const { S3Client, HeadBucketCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
    });

    const bucket = R2_BUCKET_NAME || 'copycraft-files';

    try {
      await s3.send(new HeadBucketCommand({ Bucket: bucket }));
      log('Bucket Access', 'PASS', `Bucket "${bucket}" is accessible`);
    } catch (headErr) {
      if (headErr.$metadata?.httpStatusCode === 403) {
        log('Bucket Access', 'FAIL', `403 Forbidden — credentials rejected or bucket policy blocking access`);
      } else if (headErr.$metadata?.httpStatusCode === 404) {
        log('Bucket Access', 'FAIL', `Bucket "${bucket}" does not exist — create it in Cloudflare dashboard`);
      } else {
        log('Bucket Access', 'FAIL', headErr.message);
      }
      return;
    }

    // Try listing objects (proves read permission)
    try {
      const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 5 }));
      const count = list.KeyCount ?? 0;
      log('List Objects', 'PASS', `Can list objects (${count} found)`);
    } catch (listErr) {
      log('List Objects', 'WARN', `HeadBucket OK but ListObjects failed: ${listErr.message}`);
    }
  } catch (err) {
    log('R2 SDK Init', 'FAIL', err.message);
  }
}

// ─────────────────────────────────────────────
// 3. JWT
// ─────────────────────────────────────────────
async function testJWT() {
  console.log('\n\x1b[1m── 3. JWT Secret ─────────────────────────────\x1b[0m');
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    log('JWT_SECRET', 'FAIL', 'Not set — tokens will use insecure dev default');
    return;
  }
  if (secret.length < 32) {
    log('JWT_SECRET', 'WARN', `Secret is only ${secret.length} chars — use ≥32 chars in production`);
  } else {
    log('JWT_SECRET', 'PASS', `Set (${secret.length} chars)`);
  }

  try {
    const token = jwt.sign({ id: 'test-user', role: 'customer' }, secret, { expiresIn: '1m' });
    const decoded = jwt.verify(token, secret);
    log('Sign & Verify', 'PASS', `Token round-trip OK (exp: ${new Date(decoded.exp * 1000).toISOString()})`);
    authToken = ''; // will get real token from login test
  } catch (err) {
    log('Sign & Verify', 'FAIL', err.message);
  }
}

// ─────────────────────────────────────────────
// 4. REST API ENDPOINTS
// ─────────────────────────────────────────────
async function testEndpoints() {
  console.log('\n\x1b[1m── 4. REST API Endpoints ─────────────────────\x1b[0m');

  // Health Check
  console.log('\n  \x1b[2m[System]\x1b[0m');
  {
    const { status, data, error } = await apiCall('GET', '/api/health');
    if (error || status === 0) {
      log('GET /api/health', 'FAIL', `Server not reachable — is it running? (${error || 'connection refused'})`);
      console.log('\n  \x1b[33m⚠️  Server is not running on port 5000. Start it with: npm run server\x1b[0m');
      console.log('  \x1b[33m   Then re-run this script in a second terminal.\x1b[0m\n');
      return; // no point testing other endpoints
    }
    log('GET /api/health', status === 200 ? 'PASS' : 'FAIL', `status=${status}, env=${data.environment}`);
  }

  // Auth
  console.log('\n  \x1b[2m[Auth — POST /register]\x1b[0m');
  {
    const { status, data } = await apiCall('POST', '/api/auth/register', {
      name: 'Test User', phone: '9999999999',
      email: `test_${Date.now()}@copycraft.com`, password: 'Test1234!'
    });
    log('POST /api/auth/register', status === 201 ? 'PASS' : status === 400 ? 'WARN' : 'FAIL',
      `status=${status}, msg="${data.message}"`);
    if (data.token) authToken = data.token;
  }

  console.log('\n  \x1b[2m[Auth — POST /login (customer)]\x1b[0m');
  {
    const { status, data } = await apiCall('POST', '/api/auth/login', {
      email: 'customer@copycraft.com', password: 'Password123!', portal: 'customer'
    });
    log('POST /api/auth/login (customer)', status === 200 ? 'PASS' : 'FAIL',
      `status=${status}, msg="${data.message}"`);
    if (data.token) authToken = data.token;
  }

  console.log('\n  \x1b[2m[Auth — POST /login (admin)]\x1b[0m');
  {
    const { status, data } = await apiCall('POST', '/api/auth/login', {
      email: 'admin@copycraft.com', password: 'Password123!', portal: 'admin'
    });
    log('POST /api/auth/login (admin)', status === 200 ? 'PASS' : 'FAIL',
      `status=${status}, role=${data.user?.role}`);
  }

  console.log('\n  \x1b[2m[Auth — Protected Routes]\x1b[0m');
  {
    const { status, data } = await apiCall('GET', '/api/auth/profile', null, authToken);
    log('GET /api/auth/profile', status === 200 ? 'PASS' : 'FAIL',
      `status=${status}, user=${data.user?.name || data.message}`);
  }
  {
    const { status, data } = await apiCall('GET', '/api/auth/delivery-pin', null, authToken);
    log('GET /api/auth/delivery-pin', status === 200 ? 'PASS' : 'FAIL',
      `status=${status}, pin=${data.deliveryPin || data.message}`);
  }
  {
    const { status } = await apiCall('GET', '/api/auth/notifications', null, authToken);
    log('GET /api/auth/notifications', status === 200 ? 'PASS' : 'FAIL', `status=${status}`);
  }

  // Orders
  console.log('\n  \x1b[2m[Orders]\x1b[0m');
  {
    const { status, data } = await apiCall('GET', '/api/orders/colleges');
    log('GET /api/orders/colleges', status === 200 ? 'PASS' : 'FAIL',
      `status=${status}, count=${data.colleges?.length}`);
  }
  {
    const { status, data } = await apiCall('GET', '/api/orders/staff/active', null, authToken);
    log('GET /api/orders/staff/active', status === 200 ? 'PASS' : 'FAIL', `status=${status}`);
  }
  {
    const { status, data } = await apiCall('POST', '/api/orders/quote', {
      pages: 20, copies: 2, colorMode: 'bw', paperSize: 'A4',
      printSide: 'single', binding: 'spiral', lamination: false
    });
    log('POST /api/orders/quote', status === 200 ? 'PASS' : 'FAIL',
      `status=${status}, total=₹${data.quote?.totalPrice ?? data.message}`);
  }
  {
    const { status, data } = await apiCall('GET', '/api/orders/my-orders', null, authToken);
    log('GET /api/orders/my-orders', status === 200 ? 'PASS' : 'FAIL',
      `status=${status}, count=${data.orders?.length ?? data.message}`);
  }

  // Dealer
  console.log('\n  \x1b[2m[Dealer — need dealer token]\x1b[0m');
  {
    let dealerToken = authToken;
    const { data: loginData } = await apiCall('POST', '/api/auth/login', {
      email: 'dealer@copycraft.com', password: 'Password123!', portal: 'dealer'
    });
    if (loginData.token) dealerToken = loginData.token;

    const { status, data } = await apiCall('GET', '/api/dealer/queue', null, dealerToken);
    log('GET /api/dealer/queue', status === 200 ? 'PASS' : 'FAIL',
      `status=${status}, orders=${data.queue?.length ?? data.message}`);
  }

  // Distributor
  console.log('\n  \x1b[2m[Distributor — need distributor token]\x1b[0m');
  {
    let distToken = authToken;
    const { data: loginData } = await apiCall('POST', '/api/auth/login', {
      email: 'distributor@copycraft.com', password: 'Password123!', portal: 'distributor'
    });
    if (loginData.token) distToken = loginData.token;

    const { status, data } = await apiCall('GET', '/api/distributor/dashboard', null, distToken);
    log('GET /api/distributor/dashboard', status === 200 ? 'PASS' : 'FAIL',
      `status=${status}, msg=${data.message || 'OK'}`);
  }

  // Admin
  console.log('\n  \x1b[2m[Admin — need admin token]\x1b[0m');
  {
    let adminToken = authToken;
    const { data: loginData } = await apiCall('POST', '/api/auth/login', {
      email: 'admin@copycraft.com', password: 'Password123!', portal: 'admin'
    });
    if (loginData.token) adminToken = loginData.token;

    for (const endpoint of [
      '/api/admin/analytics',
      '/api/admin/users',
      '/api/admin/coupons',
      '/api/admin/audit-logs',
    ]) {
      const { status, data } = await apiCall('GET', endpoint, null, adminToken);
      log(`GET ${endpoint}`, status === 200 ? 'PASS' : 'FAIL', `status=${status}`);
    }
  }

  // Payments
  console.log('\n  \x1b[2m[Payments]\x1b[0m');
  {
    const { status } = await apiCall('GET', '/api/payments/receipts', null, authToken);
    log('GET /api/payments/receipts', status === 200 ? 'PASS' : 'FAIL', `status=${status}`);
  }

  // 401 guard test
  console.log('\n  \x1b[2m[Security — 401 guard]\x1b[0m');
  {
    const { status } = await apiCall('GET', '/api/auth/profile', null, 'bad-token');
    log('GET /api/auth/profile (bad token)', status === 403 ? 'PASS' : 'FAIL',
      `status=${status} (expected 403)`);
  }
  {
    const { status } = await apiCall('GET', '/api/auth/profile');
    log('GET /api/auth/profile (no token)', status === 401 ? 'PASS' : 'FAIL',
      `status=${status} (expected 401)`);
  }
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  console.log('\x1b[1m\n╔════════════════════════════════════════════╗');
  console.log('║   CopyCraft API & Credential Health Check  ║');
  console.log('╚════════════════════════════════════════════╝\x1b[0m');

  await testMongoDB();
  await testR2();
  await testJWT();
  await testEndpoints();

  // Summary
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;
  const warn = results.filter(r => r.status === 'WARN').length;

  console.log('\n\x1b[1m── Summary ───────────────────────────────────\x1b[0m');
  console.log(`  ${PASS} ${pass} passed`);
  if (warn > 0) console.log(`  ${WARN} ${warn} warnings`);
  if (fail > 0) {
    console.log(`  ${FAIL} ${fail} failed`);
    console.log('\n  Failed checks:');
    results.filter(r => r.status === 'FAIL').forEach(r =>
      console.log(`    • ${r.label}: ${r.msg}`)
    );
  }
  console.log();
}

main().catch(err => {
  console.error('Health check crashed:', err);
  process.exit(1);
});
