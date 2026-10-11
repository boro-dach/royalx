import assert from 'assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  createSession,
  validateSession,
  destroySession,
  verifyInitData,
  authMiddleware,
  adminMiddleware
} from '../auth.js';
import { toSnakeCase, toCamelCase, isSupabaseConfigured } from '../supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function itAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING AUTH (NO JWT) & SUPABASE TEST SUITE');
  console.log('====================================================');

  // ----------------------------------------------------
  // TEST GROUP 1: PASSWORD HASHING (PBKDF2)
  // ----------------------------------------------------
  console.log('\n📌 1. Password Hashing & Verification (PBKDF2)');

  it('Generates salted PBKDF2 hash containing salt and hash separated by colon', () => {
    const raw = 'mySecretPass123';
    const hash = hashPassword(raw);
    assert(hash.includes(':'), 'Hash must contain colon');
    const [salt, key] = hash.split(':');
    assert.strictEqual(salt.length, 32, 'Salt should be 16 bytes hex (32 chars)');
    assert.strictEqual(key.length, 128, 'Key should be 64 bytes hex (128 chars)');
  });

  it('Verifies correct password returns true', () => {
    const raw = 'royal_secure_2026';
    const hash = hashPassword(raw);
    assert.strictEqual(verifyPassword(raw, hash), true);
  });

  it('Verifies incorrect password returns false', () => {
    const raw = 'royal_secure_2026';
    const hash = hashPassword(raw);
    assert.strictEqual(verifyPassword('wrongPassword', hash), false);
  });

  it('Handles invalid / malformed hashes safely without throwing', () => {
    assert.strictEqual(verifyPassword('pass', ''), false);
    assert.strictEqual(verifyPassword('pass', null), false);
    assert.strictEqual(verifyPassword('pass', 'bad_hash_without_colon'), false);
  });

  // ----------------------------------------------------
  // TEST GROUP 2: OPAQUE SESSION TOKENS (NO JWT)
  // ----------------------------------------------------
  console.log('\n📌 2. Cryptographic Non-JWT Session Tokens');

  it('Generates opaque random session token starting with sess_', () => {
    const token = generateSessionToken();
    assert(token.startsWith('sess_'), 'Token must start with sess_');
    assert.strictEqual(token.length, 69, 'Token prefix (5) + 32-byte hex (64) = 69 chars');
  });

  it('Generates unique non-deterministic tokens', () => {
    const token1 = generateSessionToken();
    const token2 = generateSessionToken();
    assert.notStrictEqual(token1, token2, 'Two tokens must not be equal');
  });

  await itAsync('Session store lifecycle: create, validate, expire, destroy', async () => {
    const mockDb = {
      sessions: {},
      saveSession: async function(s) { this.sessions[s.token] = s; },
      getSession: async function(t) { return this.sessions[t] || null; },
      deleteSession: async function(t) { delete this.sessions[t]; }
    };

    // Create session
    const session = await createSession(mockDb, '12345', 'Mozilla/5.0');
    assert(session.token.startsWith('sess_'));
    assert.strictEqual(session.userId, '12345');

    // Validate active session
    const active = await validateSession(mockDb, session.token);
    assert.notStrictEqual(active, null);
    assert.strictEqual(active.userId, '12345');

    // Validate expired session
    const expiredObj = {
      token: 'sess_expired_test',
      userId: '12345',
      expiresAt: new Date(Date.now() - 1000).toISOString()
    };
    await mockDb.saveSession(expiredObj);
    const expiredRes = await validateSession(mockDb, expiredObj.token);
    assert.strictEqual(expiredRes, null, 'Expired session must return null');
    assert.strictEqual(mockDb.sessions[expiredObj.token], undefined, 'Expired session must be pruned');

    // Destroy session
    await destroySession(mockDb, session.token);
    const destroyed = await validateSession(mockDb, session.token);
    assert.strictEqual(destroyed, null, 'Destroyed session must return null');
  });

  // ----------------------------------------------------
  // TEST GROUP 3: TELEGRAM INITDATA HMAC VALIDATION
  // ----------------------------------------------------
  console.log('\n📌 3. Telegram WebApp HMAC-SHA256 Validation');

  it('Verifies authentic Telegram WebApp initData string', () => {
    const botToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
    const authDate = Math.floor(Date.now() / 1000);
    const userStr = JSON.stringify({ id: 987654321, first_name: 'Alex', username: 'alex_test' });

    const params = [
      ['auth_date', String(authDate)],
      ['user', userStr]
    ];
    params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const dataCheckString = params.map(([k, v]) => `${k}=${v}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const initDataStr = `auth_date=${authDate}&user=${encodeURIComponent(userStr)}&hash=${hash}`;
    const result = verifyInitData(initDataStr, botToken);

    assert.notStrictEqual(result, null);
    assert.strictEqual(result.id, '987654321');
    assert.strictEqual(result.firstName, 'Alex');
    assert.strictEqual(result.username, 'alex_test');
  });

  it('Rejects tampered or expired Telegram initData string', () => {
    const botToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
    const fakeData = 'auth_date=1000000000&user=%7B%22id%22%3A123%7D&hash=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    const result = verifyInitData(fakeData, botToken);
    assert.strictEqual(result, null);
  });

  // ----------------------------------------------------
  // TEST GROUP 4: SUPABASE SCHEMAS & UTILITIES
  // ----------------------------------------------------
  console.log('\n📌 4. Supabase Schema DDL & Field Mappings');

  it('Verifies supabase_schema.sql exists and includes all essential tables', () => {
    const schemaPath = path.join(rootDir, 'supabase_schema.sql');
    assert(fs.existsSync(schemaPath), 'supabase_schema.sql file must exist');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    const requiredTables = [
      'create table if not exists public.users',
      'create table if not exists public.sessions',
      'create table if not exists public.invoices',
      'create table if not exists public.withdrawals',
      'create table if not exists public.promocodes',
      'create table if not exists public.app_settings',
      'create table if not exists public.crash_history'
    ];

    for (const tbl of requiredTables) {
      assert(sql.toLowerCase().includes(tbl.toLowerCase()), `Schema missing table definition: ${tbl}`);
    }
  });

  it('Bi-directional snake_case <-> camelCase mappers work accurately', () => {
    const camelObj = {
      userId: '123',
      totalTurnover: 450.5,
      agreedToTerms: true,
      usesLeft: 10
    };
    const snakeObj = toSnakeCase(camelObj);
    assert.strictEqual(snakeObj.user_id, '123');
    assert.strictEqual(snakeObj.total_turnover, 450.5);
    assert.strictEqual(snakeObj.agreed_to_terms, true);
    assert.strictEqual(snakeObj.uses_left, 10);

    const reversed = toCamelCase(snakeObj);
    assert.deepStrictEqual(reversed, camelObj);
  });

  it('Supabase client gracefully handles missing environment configuration', () => {
    // If no SUPABASE_URL / SUPABASE_KEY in env, isSupabaseConfigured() returns false
    const configured = isSupabaseConfigured();
    assert.strictEqual(typeof configured, 'boolean');
  });

  // ----------------------------------------------------
  // TEST GROUP 5: AUTH & ADMIN MIDDLEWARE LOGIC
  // ----------------------------------------------------
  console.log('\n📌 5. Express Auth & Admin Middlewares (Non-JWT)');

  await itAsync('Auth middleware allows public endpoints without authentication', async () => {
    const middleware = authMiddleware({}, {
      publicPaths: ['/api/public-endpoint'],
      publicPrefixes: ['/assets']
    });

    let nextCalled = false;
    const req = { path: '/api/public-endpoint', get: () => null, query: {} };
    const res = {};
    await middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'Next must be called for public paths');
  });

  await itAsync('Auth middleware rejects missing or invalid token with 401', async () => {
    const middleware = authMiddleware({
      getSession: async () => null
    }, {
      publicPaths: ['/api/public'],
      publicPrefixes: [],
      allowDevAuth: false
    });

    let statusCode = null;
    let responseData = null;
    const req = {
      path: '/api/user/sync',
      get: (h) => h === 'authorization' ? 'Bearer invalid_token' : null,
      query: {}
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await middleware(req, res, () => {});
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(responseData.code, 'UNAUTHORIZED');
  });

  await itAsync('Auth middleware accepts valid session token and sets req.userId & req.user', async () => {
    const mockUser = { id: 'user_42', name: 'Tester', balance: 100 };
    const mockSession = {
      token: 'sess_valid_123',
      userId: 'user_42',
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };
    const mockDb = {
      getSession: async (t) => t === 'sess_valid_123' ? mockSession : null,
      getUser: async (id) => id === 'user_42' ? mockUser : null,
      isAdmin: (id) => false,
      deleteSession: async () => {}
    };

    const middleware = authMiddleware(mockDb, { allowDevAuth: false });
    let nextCalled = false;
    const req = {
      path: '/api/user/sync',
      get: (h) => h === 'authorization' ? 'Bearer sess_valid_123' : null,
      query: {}
    };
    const res = {};

    await middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.userId, 'user_42');
    assert.strictEqual(req.user.name, 'Tester');
  });

  await itAsync('Auth middleware accepts valid x-telegram-init-data header directly (Automatic Telegram Auth)', async () => {
    const botToken = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11';
    process.env.BOT_TOKEN = botToken;

    const authDate = Math.floor(Date.now() / 1000);
    const userStr = JSON.stringify({ id: 55443322, first_name: 'AutoTgUser' });
    const params = [
      ['auth_date', String(authDate)],
      ['user', userStr]
    ];
    params.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const dataCheckString = params.map(([k, v]) => `${k}=${v}`).join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    const validInitData = `auth_date=${authDate}&user=${encodeURIComponent(userStr)}&hash=${hash}`;

    const mockUser = { id: '55443322', name: 'AutoTgUser', balance: 50 };
    const mockDb = {
      getUser: async (id) => mockUser,
      isAdmin: () => false
    };

    const middleware = authMiddleware(mockDb, { allowDevAuth: false });
    let nextCalled = false;
    const req = {
      path: '/api/user/sync',
      get: (h) => h === 'x-telegram-init-data' ? validInitData : null,
      query: {}
    };
    const res = {};

    await middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true, 'User with valid initData must pass middleware');
    assert.strictEqual(req.userId, '55443322');
    assert.strictEqual(req.user.name, 'AutoTgUser');
  });

  await itAsync('Admin middleware denies non-admin user with 403 FORBIDDEN', async () => {
    const mockDb = {
      isAdmin: (id) => id === '8281274109'
    };
    const middleware = adminMiddleware(mockDb);

    let statusCode = null;
    let responseData = null;
    const req = {
      path: '/api/admin/info',
      userId: 'normal_user_1',
      query: {},
      body: {}
    };
    const res = {
      status: (code) => { statusCode = code; return res; },
      json: (data) => { responseData = data; return res; }
    };

    await middleware(req, res, () => {});
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(responseData.code, 'FORBIDDEN');
  });

  await itAsync('Admin middleware authorizes designated admin user', async () => {
    const mockDb = {
      isAdmin: (id) => id === '8281274109'
    };
    const middleware = adminMiddleware(mockDb);

    let nextCalled = false;
    const req = {
      path: '/api/admin/info',
      userId: '8281274109',
      query: {},
      body: {}
    };
    const res = {};

    await middleware(req, res, () => { nextCalled = true; });
    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.adminId, '8281274109');
  });

  // ----------------------------------------------------
  // TEST GROUP 6: MIGRATION SCRIPT FILE VALIDATION
  // ----------------------------------------------------
  console.log('\n📌 6. Migration Script File Integrity');

  it('Verifies migrate_to_supabase.js handles users, invoices, withdrawals, promos, settings, crash history', () => {
    const migPath = path.join(rootDir, 'scripts', 'migrate_to_supabase.js');
    assert(fs.existsSync(migPath), 'migrate_to_supabase.js must exist');
    const content = fs.readFileSync(migPath, 'utf8');

    assert(content.includes('users'), 'Must handle users');
    assert(content.includes('promocodes'), 'Must handle promocodes');
    assert(content.includes('invoices'), 'Must handle invoices');
    assert(content.includes('withdrawals'), 'Must handle withdrawals');
    assert(content.includes('app_settings'), 'Must handle app_settings');
    assert(content.includes('crash_history'), 'Must handle crash_history');
  });

  // Summary
  console.log('\n====================================================');
  console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} PASSED`);
  console.log('====================================================');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed unexpectedly:', err);
  process.exit(1);
});
