import { EventEmitter } from 'events';
import assert from 'assert';
import { app, db } from '../server.js';

function request(app, method, url, { headers = {}, body = null } = {}) {
  return new Promise((resolve, reject) => {
    const req = new EventEmitter();
    req.method = method;
    req.url = url;
    req.headers = Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
    );
    req.body = body || {};
    req.query = {};
    req.params = {};
    req.get = (name) => req.headers[name.toLowerCase()];

    const qIndex = url.indexOf('?');
    if (qIndex !== -1) {
      const sp = new URLSearchParams(url.slice(qIndex + 1));
      for (const [k, v] of sp.entries()) req.query[k] = v;
      req.path = url.slice(0, qIndex);
    } else {
      req.path = url;
    }

    const res = new EventEmitter();
    res.statusCode = 200;
    res._headers = {};
    res.setHeader = (k, v) => { res._headers[k.toLowerCase()] = v; };
    res.getHeader = (k) => res._headers[k.toLowerCase()];
    res.status = (code) => { res.statusCode = code; return res; };

    let resolved = false;
    const finish = (data) => {
      if (resolved) return;
      resolved = true;
      resolve({ status: res.statusCode, body: data });
    };

    res.json = (data) => { finish(data); return res; };
    res.send = (data) => { finish(data); return res; };
    res.end = (data) => { finish(data); return res; };

    try {
      app.handle(req, res, (err) => {
        if (err) reject(err);
        else finish(null);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function runApiTests() {
  console.log('====================================================');
  console.log('⚡ TESTING EXPRESS APP IN-MEMORY (NO JWT AUTH & API)');
  console.log('====================================================');

  // Test 1: GET /api/health
  const healthRes = await request(app, 'GET', '/api/health');
  assert.strictEqual(healthRes.status, 200, 'Health endpoint should return 200');
  assert.strictEqual(healthRes.body.status, 'ok');
  console.log('  ✅ [PASS] GET /api/health returned 200 OK');

  // Test 1b: GET /api/config (Public environment config)
  const configRes = await request(app, 'GET', '/api/config');
  assert.strictEqual(configRes.status, 200, 'Config endpoint should return 200');
  assert.strictEqual(configRes.body.botUsername, process.env.BOT_USERNAME || 'RXcasbot');
  assert.strictEqual(configRes.body.channelUsername, process.env.CHANNEL_USERNAME || 'RoyalX_Win');
  assert(configRes.body.termsUrl && configRes.body.rulesUrl && configRes.body.privacyUrl, 'Legal URLs must be populated');
  assert(configRes.body.superAdminId, 'superAdminId must be present');
  console.log('  ✅ [PASS] GET /api/config returned public environment configuration');

  // Test 2: POST /api/auth/register
  const uniqueUsername = `player_${Date.now()}`;
  const regRes = await request(app, 'POST', '/api/auth/register', {
    headers: { 'Content-Type': 'application/json' },
    body: {
      username: uniqueUsername,
      password: 'StrongPassword123',
      name: 'Player One'
    }
  });
  assert.strictEqual(regRes.status, 200, 'Register should return 200');
  assert.strictEqual(regRes.body.success, true);
  assert(regRes.body.token && regRes.body.token.startsWith('sess_'), 'Token must start with sess_');
  assert.strictEqual(regRes.body.user.username, uniqueUsername);
  console.log('  ✅ [PASS] POST /api/auth/register registered user with non-JWT token:', regRes.body.token.slice(0, 16) + '...');

  const token = regRes.body.token;

  // Test 3: POST /api/auth/login with wrong password
  const failLogin = await request(app, 'POST', '/api/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    body: {
      username: uniqueUsername,
      password: 'incorrectPassword'
    }
  });
  assert.strictEqual(failLogin.status, 401);
  console.log('  ✅ [PASS] POST /api/auth/login rejected incorrect password (401)');

  // Test 4: POST /api/auth/login with correct password
  const successLogin = await request(app, 'POST', '/api/auth/login', {
    headers: { 'Content-Type': 'application/json' },
    body: {
      username: uniqueUsername,
      password: 'StrongPassword123'
    }
  });
  assert.strictEqual(successLogin.status, 200);
  assert.strictEqual(successLogin.body.success, true);
  assert(successLogin.body.token.startsWith('sess_'));
  console.log('  ✅ [PASS] POST /api/auth/login successfully authenticated (200)');

  // Test 5: GET /api/auth/me with Bearer token
  const meRes = await request(app, 'GET', '/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(meRes.status, 200);
  assert.strictEqual(meRes.body.user.username, uniqueUsername);
  assert.strictEqual(meRes.body.isAdmin, false);
  console.log('  ✅ [PASS] GET /api/auth/me returned current user profile');

  // Test 6: GET /api/auth/me without token -> 401 Unauthorized
  const anonRes = await request(app, 'GET', '/api/auth/me');
  assert.strictEqual(anonRes.status, 401);
  console.log('  ✅ [PASS] GET /api/auth/me without token returned 401 Unauthorized');

  // Test 7: Non-admin accessing admin route -> 403 Forbidden
  const forbiddenRes = await request(app, 'GET', '/api/admin/info', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(forbiddenRes.status, 403);
  console.log('  ✅ [PASS] GET /api/admin/info with regular token returned 403 Forbidden');

  // Test 8: Admin login via dev-login (using existing superadmin 8281274109)
  const adminLogin = await request(app, 'POST', '/api/auth/dev-login', {
    headers: { 'Content-Type': 'application/json' },
    body: { userId: '8281274109' }
  });
  assert.strictEqual(adminLogin.status, 200);
  assert.strictEqual(adminLogin.body.isAdmin, true);
  const adminToken = adminLogin.body.token;
  console.log('  ✅ [PASS] POST /api/auth/dev-login issued admin token');

  // Test 9: Admin accessing admin route -> 200 OK
  const adminRes = await request(app, 'GET', '/api/admin/info', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(adminRes.status, 200);
  assert.strictEqual(adminRes.body.status, 'ok');
  console.log('  ✅ [PASS] GET /api/admin/info with admin token returned 200 OK');

  // Test 10: User sync route (/api/user/sync) updates user state
  const syncRes = await request(app, 'POST', '/api/user/sync', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: {
      balance: 150.50,
      totalTurnover: 50.00
    }
  });
  assert.strictEqual(syncRes.status, 200);
  assert.strictEqual(syncRes.body.user.balance, 150.50);
  console.log('  ✅ [PASS] POST /api/user/sync updated balance to 150.50');

  // Test 11: User logout (/api/auth/logout)
  const logoutRes = await request(app, 'POST', '/api/auth/logout', {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  assert.strictEqual(logoutRes.status, 200);
  console.log('  ✅ [PASS] POST /api/auth/logout invalidated session token');

  // Test 12: Subsequent request with invalidated token returns 401
  const afterLogout = await request(app, 'GET', '/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  assert.strictEqual(afterLogout.status, 401);
  console.log('  ✅ [PASS] GET /api/auth/me with revoked token rejected with 401');

  // Test 13: Subscription check endpoint (/api/subscription/check)
  const subRes = await request(app, 'POST', '/api/subscription/check', {
    headers: { 'Content-Type': 'application/json' },
    body: { userId: '8281274109' } // superadmin auto-subscribed
  });
  assert.strictEqual(subRes.status, 200);
  assert.strictEqual(subRes.body.success, true);
  assert.strictEqual(subRes.body.isSubscribed, true);
  assert.strictEqual(subRes.body.channelUsername, 'RoyalX_Win');
  console.log('  ✅ [PASS] POST /api/subscription/check verified channel @RoyalX_Win');

  console.log('====================================================');
  console.log('🎉 ALL 13 EXPRESS SERVER API TESTS PASSED!');
  console.log('====================================================');

  process.exit(0);
}

runApiTests().catch(err => {
  console.error('Server API Test Failure:', err);
  process.exit(1);
});
