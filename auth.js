import crypto from 'crypto';

// ====================================================================
// NON-JWT SESSION & TELEGRAM AUTHENTICATION ENGINE
// ====================================================================

// 1. Verify Telegram WebApp initData with HMAC-SHA256
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
export function verifyInitData(initData, botToken, maxAgeSec = 24 * 3600) {
  if (
    !initData ||
    typeof initData !== 'string' ||
    initData.length > 4096
  ) {
    return null;
  }

  // Development fallback when BOT_TOKEN is not configured
  if (!botToken || botToken.startsWith('YOUR_')) {
    if (process.env.NODE_ENV !== 'production') {
      try {
        const params = new URLSearchParams(initData);
        const u = JSON.parse(params.get('user') || 'null');
        if (u && u.id) {
          return {
            id: String(u.id),
            firstName: u.first_name || '',
            username: u.username || '',
            startParam: params.get('start_param') || '',
            photoUrl: u.photo_url || null
          };
        }
      } catch (e) {}
    }
    return null;
  }

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return null;
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secret = crypto
      .createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const computed = crypto
      .createHmac('sha256', secret)
      .update(dataCheckString)
      .digest();

    const given = Buffer.from(hash, 'hex');
    if (
      given.length !== computed.length ||
      !crypto.timingSafeEqual(given, computed)
    ) {
      return null;
    }

    const authDate = parseInt(params.get('auth_date') || '0', 10);
    if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;

    const u = JSON.parse(params.get('user') || 'null');
    if (!u || !u.id) return null;

    return {
      id: String(u.id),
      firstName: u.first_name || '',
      username: u.username || '',
      startParam: params.get('start_param') || '',
      photoUrl: u.photo_url || null
    };
  } catch (e) {
    return null;
  }
}

// 2. Password Hashing (PBKDF2 with SHA-512)
export function hashPassword(password) {
  if (!password || typeof password !== 'string') return '';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!password || !storedHash || !storedHash.includes(':')) return false;
  try {
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
  } catch (e) {
    return false;
  }
}

// 3. Cryptographically Secure Random Opaque Session Token (Without JWT)
export function generateSessionToken() {
  return 'sess_' + crypto.randomBytes(32).toString('hex');
}

// 4. Session Store Helpers
export async function createSession(db, userId, userAgent = '', expiresInDays = 30) {
  const token = generateSessionToken();
  const createdAt = new Date();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 3600 * 1000);

  const sessionObj = {
    token,
    userId: String(userId),
    userAgent: String(userAgent || ''),
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  await db.saveSession(sessionObj);
  return sessionObj;
}

export async function validateSession(db, token) {
  if (!token || typeof token !== 'string') return null;
  const session = await db.getSession(token);
  if (!session) return null;

  const expTime = new Date(session.expiresAt).getTime();
  if (isNaN(expTime) || expTime < Date.now()) {
    await db.deleteSession(token);
    return null;
  }

  return session;
}

export async function destroySession(db, token) {
  if (!token) return false;
  await db.deleteSession(token);
  return true;
}

// 5. Express Middleware for Non-JWT Session Authentication
export function authMiddleware(
  db,
  { publicPaths = [], publicPrefixes = [], allowDevAuth = true } = {}
) {
  return async (req, res, next) => {
    const p = req.path;

    // Static files and frontend assets are public
    if (!p.startsWith('/api')) {
      return next();
    }

    // Check if path is public
    const isPublic =
      publicPaths.includes(p) ||
      publicPrefixes.some((prefix) => p.startsWith(prefix));

    // 1. Try to extract session token from Authorization: Bearer <token>
    let token = null;
    const authHeader = req.get('authorization') || req.get('x-session-token');
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      } else {
        token = authHeader.trim();
      }
    }

    // Also check query param (?token=) or cookie
    if (!token && req.query.token) {
      token = String(req.query.token).trim();
    }

    if (token) {
      const session = await validateSession(db, token);
      if (session) {
        req.session = session;
        req.userId = session.userId;
        req.user = await db.getUser(session.userId);
        req.isAdmin = db.isAdmin(session.userId);
        return next();
      }
    }

    // 2. Direct Telegram initData header check (Auto-auth fallback)
    const initData = req.get('x-telegram-init-data');
    if (initData && process.env.BOT_TOKEN) {
      const tgUser = verifyInitData(initData, process.env.BOT_TOKEN);
      if (tgUser) {
        const user = await db.getUser(tgUser.id, tgUser.firstName);
        req.userId = tgUser.id;
        req.user = user;
        req.tgUser = tgUser;
        req.isAdmin = db.isAdmin(tgUser.id);
        return next();
      }
    }

    // 3. Dev auth bypass strictly for automated test suites
    if (
      allowDevAuth &&
      process.env.NODE_ENV === 'test' &&
      (req.query.devUserId || process.env.DEV_AUTH_USER_ID)
    ) {
      const devId = String(req.query.devUserId || process.env.DEV_AUTH_USER_ID);
      const user = await db.getUser(devId, 'Dev User');
      req.userId = devId;
      req.user = user;
      req.isAdmin = db.isAdmin(devId);
      return next();
    }

    // 4. In development environment, allow access with dev user fallback
    if (process.env.NODE_ENV !== 'production') {
      const devId = String(req.query?.userId || req.body?.userId || 'dev_admin');
      const user = db.getUser(devId, 'Dev Admin');
      req.userId = devId;
      req.user = user;
      req.isAdmin = true;
      return next();
    }

    // If path is public, continue unauthenticated
    if (isPublic) {
      return next();
    }

    // Otherwise return 401 Unauthorized
    return res.status(401).json({
      success: false,
      error: 'Требуется авторизация (сессия отсутствует или истекла)',
      code: 'UNAUTHORIZED'
    });
  };
}

// 6. Express Middleware for Administrator Access
export function adminMiddleware(db) {
  return async (req, res, next) => {
    if (req.path === '/check' || req.path === '/api/admin/check') {
      return next();
    }

    // In development environment, allow admin access for everyone (strictly blocked in production)
    if (process.env.NODE_ENV !== 'production') {
      req.adminId = String(req.userId || 'dev_admin');
      req.isAdmin = true;
      return next();
    }

    const adminId = req.userId;
    if (!adminId || !db.isAdmin(adminId)) {
      console.warn(`[Security] ⛔ Unauthorized admin access attempt from: ${adminId || 'anonymous'}`);
      return res.status(403).json({
        success: false,
        error: 'Доступ запрещён: требуются права администратора',
        code: 'FORBIDDEN'
      });
    }
    req.adminId = String(adminId);
    next();
  };
}
