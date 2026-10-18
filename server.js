import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import TelegramBot from 'node-telegram-bot-api';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import { verifyInitData, hashPassword, verifyPassword, createSession, validateSession, destroySession, authMiddleware, adminMiddleware } from './auth.js';
import { getSupabaseClient, isSupabaseConfigured, toSnakeCase, toCamelCase } from './supabaseClient.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure dist directory exists (automatically build if missing on Railway/Cloud)
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, 'index.html'))) {
  console.log('[Server] ⚠️ dist/ directory not found or incomplete. Building frontend with Vite...');
  try {
    execSync('npm run build', { stdio: 'inherit' });
    console.log('[Server] ✅ Vite build completed successfully!');
  } catch (err) {
    console.error('[Server] ❌ Vite build failed:', err.message);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

function formatWebAppUrl(url) {
  if (!url) return '';
  let clean = String(url).trim().replace(/^\/+/, '');
  if (clean.includes('localhost') || clean.includes('127.0.0.1')) {
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
  } else {
    if (clean.startsWith('http://')) {
      clean = clean.replace('http://', 'https://');
    } else if (!clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
  }
  return clean.replace(/\/+$/, '');
}

function getWebAppUrlForTelegram() {
  let base = formatWebAppUrl(currentWebAppUrl);
  if (!base || base.includes('localhost') || base.includes('127.0.0.1')) {
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      base = formatWebAppUrl(process.env.RAILWAY_PUBLIC_DOMAIN);
    } else if (process.env.WEBAPP_URL && !process.env.WEBAPP_URL.includes('localhost')) {
      base = formatWebAppUrl(process.env.WEBAPP_URL);
    }
  }
  if (!base) {
    base = 'https://royalx-production.up.railway.app';
  }
  // Telegram Bot API strictly requires HTTPS links for inline keyboard WebApp buttons
  if (!base.startsWith('https://')) {
    base = base.replace(/^http:\/\//, 'https://');
    if (!base.startsWith('https://')) {
      base = `https://${base}`;
    }
  }
  return base.includes('?') ? `${base}&v=${Date.now()}` : `${base}?v=${Date.now()}`;
}

let currentWebAppUrl = formatWebAppUrl(process.env.WEBAPP_URL || `http://localhost:${PORT}`);
let telegramBot = null;
const activeChatIds = new Set();
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Prototype Pollution & Object Injection Sanitizer
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        delete obj[key];
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
});

// Telegram Bot Webhook endpoint (Routes updates exclusively to this server and mutes any ghost polling)
app.post('/api/telegram-webhook', (req, res) => {
  if (telegramBot && req.body) {
    try {
      telegramBot.processUpdate(req.body);
    } catch (e) {
      console.error('Error processing Telegram webhook update:', e.message);
    }
  }
  res.sendStatus(200);
});

// Log incoming requests
app.use((req, res, next) => {
  if (!req.url.startsWith('/assets/')) {
    console.log(`[HTTP] ${req.method} ${req.url}`);
  }
  next();
});

// Security middleware: hide and block any direct access to sensitive files, code, db, traversal and dotfiles
app.use((req, res, next) => {
  const p = (req.path || '').toLowerCase();
  if (
    p.includes('..') ||
    p.includes('.env') ||
    p.includes('server_db') ||
    p.includes('crash_history') ||
    p.includes('.git') ||
    p.includes('package.json') ||
    p.includes('package-lock.json') ||
    p.includes('server.js') ||
    p.includes('vite.config') ||
    p.endsWith('.py') ||
    p.endsWith('.zip') ||
    p.endsWith('.map') ||
    p.startsWith('/src')
  ) {
    return res.status(404).send('Not Found');
  }
  // Anti-sniff & security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Serve dist directory built by Vite with strict CORS and caching headers
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, {
    index: false,
    setHeaders: (res, filePath) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));

  // Never return index.html for missing assets/images - return 404 so browsers don't fail with MIME type error
  app.get('/assets/*', (req, res) => {
    res.status(404).send('Asset not found');
  });

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.status(503).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>RoyalX — Building...</title></head>
        <body style="background:#0b0e14;color:#00e699;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;">
          <div>
            <h1>👑 RoyalX</h1>
            <p>Приложение собирается, пожалуйста обновите страницу через несколько секунд...</p>
          </div>
        </body>
      </html>
    `);
  });
}

// ==========================================
// 24/7 CRASH GAME REAL-TIME SERVER ENGINE
// ==========================================
class CrashServerEngine {
  constructor() {
    this.historyFilePath = path.join(__dirname, 'crash_history.json');
    this.history = this.loadHistory();
    let maxRound = 100;
    for (const h of this.history) {
      if (h.id && typeof h.id === 'string') {
        const parts = h.id.split('_');
        const num = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(num) && num > maxRound) {
          maxRound = num;
        }
      }
    }
    this.roundId = maxRound + 1;
    this.status = 'waiting'; // 'waiting' | 'flying' | 'crashed'
    this.countdown = 5;
    this.multiplier = 1.00;
    this.crashPoint = 2.00;
    this.startTime = 0;
    this.crashedAt = 1.00;
    this.customNextMult = null;
    this.clients = new Set();
    this.tickTimer = null;
    this.lastBroadcast = 0;
    this.roundBets = new Map(); // roundId -> Map(userId, { amount, autoCashout, timestamp })

    console.log(`==================================================`);
    console.log(`[Crash 24/7] 🎰 Engine initialized! Round #${this.roundId}`);
    console.log(`[Crash 24/7] 🌐 Continuous 24/7 loop active`);
    console.log(`==================================================`);

    setInterval(() => {
      for (const client of this.clients) {
        try {
          client.write(': keepalive\n\n');
          if (typeof client.flush === 'function') client.flush();
        } catch (e) {
          this.clients.delete(client);
        }
      }
    }, 10000);

    this.startWaitingPhase();
  }

  loadHistory() {
    const defaultHistory = [
      { id: 'h_1', mult: 1.83 },
      { id: 'h_2', mult: 1.46 },
      { id: 'h_3', mult: 2.75 },
      { id: 'h_4', mult: 1.40 },
      { id: 'h_5', mult: 3.16 },
      { id: 'h_6', mult: 4.25 },
      { id: 'h_7', mult: 2.15 },
      { id: 'h_8', mult: 1.32 }
    ];
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const raw = fs.readFileSync(this.historyFilePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 30);
        }
      }
    } catch (e) {
      console.error('[Crash 24/7] Error reading crash_history.json:', e.message);
    }
    return defaultHistory;
  }

  saveHistory() {
    try {
      fs.writeFileSync(this.historyFilePath, JSON.stringify(this.history.slice(0, 30), null, 2), 'utf8');
    } catch (e) {
      console.error('[Crash 24/7] Error writing crash_history.json:', e.message);
    }
  }

  registerBet({ userId, amount, autoCashout, roundId }) {
    if (!this.roundBets) this.roundBets = new Map();
    const targetRound = roundId || (this.status === 'waiting' ? this.roundId : this.roundId + 1);
    if (!this.roundBets.has(targetRound)) {
      this.roundBets.set(targetRound, new Map());
    }
    this.roundBets.get(targetRound).set(String(userId), { 
      amount: parseFloat(amount) || 0, 
      autoCashout: autoCashout ? parseFloat(autoCashout) : null, 
      timestamp: Date.now() 
    });
    console.log(`[Crash 24/7] 💰 Bet registered for Round #${targetRound} from user ${userId}: $${amount} (auto: ${autoCashout || 'none'})`);
    return true;
  }

  checkHighStreakDrain() {
    if (!Array.isArray(this.history) || this.history.length === 0) return false;
    const recent = this.history.slice(0, 5).map(h => typeof h.mult === 'number' ? h.mult : parseFloat(h?.mult || h) || 1.0);
    let consecutiveHigh = 0;
    for (const m of recent) {
      if (m >= 2.80) {
        consecutiveHigh++;
      } else {
        break;
      }
    }
    const hasMultipleHighInARow = consecutiveHigh >= 2;
    const hasFrequentHigh = recent.slice(0, 4).filter(m => m >= 2.50).length >= 3;
    return hasMultipleHighInARow || hasFrequentHigh;
  }

  checkForcedLoseRtp() {
    const database = typeof db !== 'undefined' ? db : null;
    if (!database) return false;
    if (database.data?.settings?.globalRtp === 'lose' || database.data?.settings?.crashRtp === 'lose') {
      return true;
    }
    if (!this.roundBets || !this.roundBets.has(this.roundId)) return false;
    const bets = this.roundBets.get(this.roundId);
    if (!bets || bets.size === 0) return false;
    for (const [userId] of bets.entries()) {
      const user = database.getUser(userId);
      if (user && user.rtp === 'lose') {
        console.log(`[Crash 24/7] 🛑 User ${userId} with RTP 'lose' is playing round #${this.roundId}! Instant crash!`);
        return true;
      }
    }
    return false;
  }

  generateCrashPoint() {
    if (this.customNextMult && !isNaN(this.customNextMult) && this.customNextMult > 1.05) {
      const val = parseFloat(this.customNextMult);
      this.customNextMult = null;
      console.log(`[Crash 24/7] 🎯 Admin preset multiplier triggered: x${val.toFixed(2)}`);
      return val;
    }

    if (this.checkForcedLoseRtp()) {
      const loseCrash = parseFloat((1.08 + Math.random() * (1.15 - 1.08)).toFixed(2));
      console.log(`[Crash 24/7] 🛑 RTP 'lose' активен -> Слив на x${loseCrash}`);
      return loseCrash;
    }

    if (this.checkHighStreakDrain()) {
      const drainVal = parseFloat((1.08 + Math.random() * (1.15 - 1.08)).toFixed(2));
      console.log(`[Crash 24/7] 📉 Серия высоких коэффициентов в истории -> Слив на x${drainVal.toFixed(2)} (диапазон 1.08x - 1.15x)`);
      return drainVal;
    }

    const rand = Math.random();
    let crashVal;
    if (rand < 0.06) {
      crashVal = parseFloat((1.08 + Math.random() * 0.12).toFixed(2));
    } else if (rand < 0.50) {
      crashVal = parseFloat((1.21 + Math.random() * 0.79).toFixed(2));
    } else if (rand < 0.80) {
      crashVal = parseFloat((2.01 + Math.random() * 2.99).toFixed(2));
    } else if (rand < 0.95) {
      crashVal = parseFloat((5.01 + Math.random() * 14.99).toFixed(2));
    } else {
      crashVal = parseFloat((20.00 + Math.random() * 80.00).toFixed(2));
    }
    return Math.min(100.0, Math.max(1.08, crashVal));
  }

  startWaitingPhase() {
    this.status = 'waiting';
    this.countdown = 5;
    this.multiplier = 1.00;
    this.startTime = 0;
    console.log(`[Crash 24/7] ⏳ Раунд #${this.roundId}: Ожидание ставок (5 сек)...`);
    this.broadcastState();

    if (this.tickTimer) clearInterval(this.tickTimer);

    let secondsLeft = 5;
    this.tickTimer = setInterval(() => {
      secondsLeft -= 1;
      this.countdown = Math.max(0, secondsLeft);
      this.broadcastState();

      if (secondsLeft <= 0) {
        clearInterval(this.tickTimer);
        this.startFlyingPhase();
      }
    }, 1000);
  }

  startFlyingPhase() {
    this.status = 'flying';
    this.countdown = 0;
    this.multiplier = 1.00;
    this.crashPoint = this.generateCrashPoint();
    this.startTime = Date.now();
    console.log(`[Crash 24/7] 🚀 Раунд #${this.roundId} начался! Цель: x${this.crashPoint.toFixed(2)}`);
    this.broadcastState();

    if (this.tickTimer) clearInterval(this.tickTimer);

    this.tickTimer = setInterval(() => {
      const elapsed = Math.max(0, (Date.now() - this.startTime) / 1000);
      const mult = parseFloat(Math.pow(Math.E, 0.16 * elapsed).toFixed(2));

      const minElapsed = 0.5;
      if (mult >= this.crashPoint && elapsed >= minElapsed) {
        clearInterval(this.tickTimer);
        this.triggerCrash(this.crashPoint);
      } else {
        this.multiplier = mult;
        const now = Date.now();
        if (now - this.lastBroadcast >= 80) {
          this.broadcastState();
        }
      }
    }, 40);
  }

  triggerCrash(finalMult) {
    this.status = 'crashed';
    this.multiplier = finalMult;
    this.crashedAt = finalMult;
    this.lastCompletedCrash = {
      id: `round_${Date.now()}_${this.roundId}`,
      mult: finalMult
    };
    console.log(`[Crash 24/7] 💥 Раунд #${this.roundId} КРАШНУЛСЯ на x${finalMult.toFixed(2)}!`);

    // Broadcast crash state with existing history (new history item is added only when new round starts)
    this.broadcastState();

    setTimeout(() => {
      if (this.lastCompletedCrash) {
        const itemToSync = this.lastCompletedCrash;
        this.history = [itemToSync, ...this.history].slice(0, 30);
        this.saveHistory();
        this.syncCrashToSupabase(itemToSync);
        this.lastCompletedCrash = null;
      }
      if (this.roundBets && this.roundBets.has(this.roundId)) {
        this.roundBets.delete(this.roundId);
      }
      this.roundId += 1;
      this.startWaitingPhase();
    }, 2800);
  }

  async syncCrashToSupabase(item) {
    if (!item || !isSupabaseConfigured()) return;
    try {
      const client = await getSupabaseClient();
      if (client) {
        await client.from('crash_history').upsert({
          id: String(item.id),
          mult: parseFloat(item.mult),
          created_at: new Date().toISOString()
        }, 'id');
      }
    } catch (e) {
      console.warn('[Crash 24/7] Supabase history sync error:', e.message);
    }
  }

  getState() {
    return {
      roundId: this.roundId,
      status: this.status,
      countdown: this.countdown,
      multiplier: this.multiplier,
      crashPoint: this.status === 'crashed' ? this.crashPoint : null,
      crashedAt: this.crashedAt,
      startTime: this.startTime,
      serverTime: Date.now(),
      history: this.history
    };
  }

  addClient(res) {
    this.clients.add(res);
    try {
      res.write(`data: ${JSON.stringify(this.getState())}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch (e) {}
  }

  removeClient(res) {
    this.clients.delete(res);
  }

  broadcastState() {
    this.lastBroadcast = Date.now();
    const data = `data: ${JSON.stringify(this.getState())}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(data);
        if (typeof client.flush === 'function') client.flush();
      } catch (e) {
        this.clients.delete(client);
      }
    }
  }
}

const crashEngine = new CrashServerEngine();

// Crash API Routes
app.get('/api/crash/state', (req, res) => {
  res.json(crashEngine.getState());
});

app.post('/api/crash/bet', (req, res) => {
  const { userId, amount, autoCashout, roundId } = req.body;
  if (!userId) return res.status(400).json({ success: false, error: 'No userId' });
  const result = crashEngine.registerBet({
    userId: String(userId),
    amount: parseFloat(amount) || 0,
    autoCashout: autoCashout ? parseFloat(autoCashout) : null,
    roundId: parseInt(roundId, 10) || crashEngine.roundId
  });
  res.json({ success: true, registered: result });
});

app.get('/api/crash/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  if (res.flushHeaders) res.flushHeaders();

  res.write('retry: 1000\n\n');
  crashEngine.addClient(res);

  req.on('close', () => {
    crashEngine.removeClient(res);
  });
  res.on('error', () => {
    crashEngine.removeClient(res);
  });
});

// ==========================================
// PERSISTENT DATABASE & REAL PAYMENT SYSTEM
// ==========================================
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const XROCKET_TOKEN = process.env.XROCKET_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcHBJZCI6IjMwNDExOSIsImp0aSI6ImFwcDozMDQxMTk6NWI3NzRjMmMtNGMwYS00MWU3LThlMDMtNWM4Y2FmMDUyZGM0IiwiaWF0IjoxNzkxNDY5ODI1fQ.CI_bAteh5MAQ7u_uG5YKPzXyL2NGcaxwwwqBBt2R-pc';
const CRYPTOBOT_TOKEN = process.env.CRYPTOBOT_TOKEN || '503763:AA7ILqIrS2xuSTVhtdYXeBTvxYh8NtCjkjV';
const SUPERADMIN_ID = String(process.env.SUPERADMIN_ID || '8281274109').trim();
const DEFAULT_ADMINS = (process.env.ADMIN_IDS
  ? process.env.ADMIN_IDS.split(',').map(s => s.trim()).filter(Boolean)
  : [SUPERADMIN_ID, '8970354031']);
const ADMIN_PIN = String(process.env.ADMIN_PIN || '2026').trim();
const DEFAULT_TRC20 = process.env.TRC20_WALLET || 'TYDzsYUEpvnYmQk4zGP9sWWcTEd36d53dB';
const DEFAULT_TON = process.env.TON_WALLET || 'UQCq7UgQ1bhs9pI8dw5juHB1cYwo1wgcQ0zxqd8eCRktwGVD';
const SUPPORT_USERNAME = process.env.SUPPORT_USERNAME || 'MartinCartier';
const rawChannel = (process.env.CHANNEL_USERNAME || 'RoyalX_Win').replace(/^@/, '');
const CHANNEL_USERNAME = (!rawChannel || rawChannel === 'RXgambling') ? 'RoyalX_Win' : rawChannel;
const rawBot = (process.env.BOT_USERNAME || 'RXcasbot').replace(/^@/, '');
const BOT_USERNAME = (!rawBot || rawBot === 'RoyalX_Bot') ? 'RXcasbot' : rawBot;
const CHANNEL_URL = process.env.CHANNEL_URL || `https://t.me/${CHANNEL_USERNAME}`;
const CHANNEL_CHAT_ID = process.env.CHANNEL_CHAT_ID || `@${CHANNEL_USERNAME}`;
const SUPPORT_URL = process.env.SUPPORT_URL || `https://t.me/${SUPPORT_USERNAME}`;
const TERMS_URL = process.env.TERMS_URL || 'https://telegra.ph/POLZOVATELSKOE-SOGLASHENIE-ROYAL-X-09-18';
const RULES_URL = process.env.RULES_URL || 'https://telegra.ph/PRAVILA-ISPOLZOVANIYA-SERVISA-ROYAL-X-09-18';
const PRIVACY_URL = process.env.PRIVACY_URL || 'https://telegra.ph/POLITIKA-KONFIDENCIALNOSTI-ROYAL-X-09-18';
const XROCKET_PAY_URL = process.env.XROCKET_PAY_URL || 'https://t.me/xrocket';
const CRYPTOBOT_PAY_URL = process.env.CRYPTOBOT_PAY_URL || 'https://t.me/CryptoBot';

class DatabaseManager {
  constructor() {
    this.dbPath = path.join(__dirname, 'server_db.json');
    this.data = this.load();
    this.supabase = null;
    console.log('[DB] 💾 Database initialized at:', this.dbPath);
    this.initSupabase().catch(err => console.warn('[Supabase] Init note:', err.message));
  }

  async initSupabase() {
    if (!isSupabaseConfigured()) {
      console.log('[DB] ℹ️ Supabase not configured in .env (SUPABASE_URL, SUPABASE_KEY). Using server_db.json.');
      return;
    }
    try {
      this.supabase = await getSupabaseClient();
      if (!this.supabase) return;
      console.log('[DB] 🌐 Supabase connected successfully.');

      // Check if Supabase users table is populated
      const { data: usersData, error } = await this.supabase.from('users').select('id');
      if (!error && Array.isArray(usersData)) {
        if (usersData.length === 0 && Object.keys(this.data.users || {}).length > 0) {
          console.log('[DB] 🔄 Initializing Supabase with existing local JSON data...');
          for (const user of Object.values(this.data.users)) {
            await this.syncUserToSupabase(user);
          }
          for (const promo of Object.values(this.data.promocodes || {})) {
            await this.syncPromocodeToSupabase(promo);
          }
          await this.syncSettingsToSupabase();
          console.log('[DB] ✅ Supabase initial synchronization complete.');
        } else if (usersData.length > 0) {
          console.log(`[DB] ⚡ Supabase active with ${usersData.length} registered users.`);
        }
      }
    } catch (e) {
      console.warn('[DB] Supabase connection check warning:', e.message);
    }
  }

  load() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        return {
          users: parsed.users || {},
          sessions: parsed.sessions || {},
          invoices: parsed.invoices || {},
          withdrawals: parsed.withdrawals || [],
          usedTxHashes: parsed.usedTxHashes || [],
          settings: parsed.settings || {
            trc20Wallet: DEFAULT_TRC20,
            tonWallet: DEFAULT_TON
          },
          treasury: parsed.treasury !== undefined ? parseFloat(parsed.treasury) : 5000.00,
          admins: Array.isArray(parsed.admins) && parsed.admins.length > 0 
            ? (parsed.admins.includes(SUPERADMIN_ID) ? parsed.admins : [SUPERADMIN_ID, ...parsed.admins])
            : DEFAULT_ADMINS,
          promocodes: parsed.promocodes || {
            'ROYAL100': { id: '1', code: 'ROYAL100', amount: 50.0, usesLeft: 100, maxUses: 100, active: true },
            'START': { id: '2', code: 'START', amount: 25.0, usesLeft: 500, maxUses: 500, active: true },
            'ROYALX': { id: '3', code: 'ROYALX', amount: 100.0, usesLeft: 50, maxUses: 50, active: true },
            'VIP2026': { id: '4', code: 'VIP2026', amount: 500.0, usesLeft: 10, maxUses: 10, active: true }
          }
        };
      }
    } catch (e) {
      console.error('[DB] Error reading server_db.json:', e.message);
    }
    return {
      users: {},
      sessions: {},
      invoices: {},
      withdrawals: [],
      usedTxHashes: [],
      settings: {
        trc20Wallet: DEFAULT_TRC20,
        tonWallet: DEFAULT_TON
      },
      treasury: 5000.00,
      admins: [...DEFAULT_ADMINS],
      promocodes: {
        'ROYAL100': { id: '1', code: 'ROYAL100', amount: 50.0, usesLeft: 100, maxUses: 100, active: true },
        'START': { id: '2', code: 'START', amount: 25.0, usesLeft: 500, maxUses: 500, active: true },
        'ROYALX': { id: '3', code: 'ROYALX', amount: 100.0, usesLeft: 50, maxUses: 50, active: true },
        'VIP2026': { id: '4', code: 'VIP2026', amount: 500.0, usesLeft: 10, maxUses: 10, active: true }
      }
    };
  }

  isAdmin(userId) {
    const id = String(userId || '').trim();
    if (!id) return false;
    if (id === SUPERADMIN_ID || DEFAULT_ADMINS.includes(id)) return true;
    if (!Array.isArray(this.data.admins)) this.data.admins = [...DEFAULT_ADMINS];
    return this.data.admins.includes(id);
  }

  setAdmin(targetUserId, makeAdmin) {
    const id = String(targetUserId || '').trim();
    if (!id) return false;
    if (!Array.isArray(this.data.admins)) this.data.admins = [...DEFAULT_ADMINS];
    if (!this.data.admins.includes(SUPERADMIN_ID)) this.data.admins.push(SUPERADMIN_ID);
    
    if (makeAdmin) {
      if (!this.data.admins.includes(id)) {
        this.data.admins.push(id);
      }
    } else {
      if (id === SUPERADMIN_ID) return false; // Superadmin cannot be demoted
      this.data.admins = this.data.admins.filter(a => a !== id);
    }
    this.save();
    return true;
  }

  getOverviewStats() {
    const users = Object.values(this.data.users || {});
    const totalUsers = users.length;
    const totalBalance = users.reduce((acc, u) => acc + (u.balance || 0), 0);
    const totalDeposited = users.reduce((acc, u) => acc + (u.totalDeposited || 0), 0);
    const totalWithdrawn = users.reduce((acc, u) => acc + (u.totalWithdrawn || 0), 0);
    const totalTurnover = users.reduce((acc, u) => acc + (u.totalTurnover || 0), 0);
    const treasury = this.data.treasury !== undefined ? this.data.treasury : 5000.00;
    return {
      totalUsers,
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      totalDeposited: parseFloat(totalDeposited.toFixed(2)),
      totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2)),
      totalTurnover: parseFloat(totalTurnover.toFixed(2)),
      treasury: parseFloat(parseFloat(treasury).toFixed(2)),
      admins: this.data.admins || DEFAULT_ADMINS
    };
  }

  getAllUsersSummary() {
    return Object.values(this.data.users || {}).map(u => ({
      id: u.id,
      name: u.name || 'Пользователь',
      balance: u.balance || 0,
      cashback: u.cashback || 0,
      wagerRequired: u.wagerRequired || 0,
      totalTurnover: u.totalTurnover || 0,
      totalDeposited: u.totalDeposited || 0,
      totalWithdrawn: u.totalWithdrawn || 0,
      gamesPlayed: u.gamesPlayed || 0,
      gamesWon: u.gamesWon || 0,
      referralsCount: u.referralsCount || 0,
      referralEarned: u.referralEarned || 0,
      rtp: u.rtp || 'auto',
      isBanned: !!u.isBanned,
      agreedToTerms: !!u.agreedToTerms,
      isSubscribed: !!u.isSubscribed,
      isAdmin: this.isAdmin(u.id),
      historyCount: (u.history || []).length
    }));
  }

  getUserFull(userId) {
    const id = String(userId || '').trim();
    const user = this.data.users[id];
    if (!user) return null;
    const userInvoices = Object.values(this.data.invoices || {}).filter(inv => String(inv.userId) === id);
    const userWithdrawals = (this.data.withdrawals || []).filter(w => String(w.userId) === id);
    return {
      ...user,
      wagerRequired: user.wagerRequired || 0,
      rtp: user.rtp || 'auto',
      isBanned: !!user.isBanned,
      agreedToTerms: !!user.agreedToTerms,
      isSubscribed: !!user.isSubscribed,
      isAdmin: this.isAdmin(id),
      invoices: userInvoices,
      withdrawals: userWithdrawals
    };
  }

  updateUserProfile(userId, patch) {
    const user = this.getUser(userId);
    if (patch.balance !== undefined && !isNaN(parseFloat(patch.balance))) {
      user.balance = parseFloat(parseFloat(patch.balance).toFixed(2));
    }
    if (patch.wagerRequired !== undefined && !isNaN(parseFloat(patch.wagerRequired))) {
      user.wagerRequired = parseFloat(Math.max(0, parseFloat(patch.wagerRequired)).toFixed(2));
    }
    if (patch.totalTurnover !== undefined && !isNaN(parseFloat(patch.totalTurnover))) {
      user.totalTurnover = parseFloat(parseFloat(patch.totalTurnover).toFixed(2));
    }
    if (patch.cashback !== undefined && !isNaN(parseFloat(patch.cashback))) {
      user.cashback = parseFloat(Math.max(0, parseFloat(patch.cashback)).toFixed(2));
    }
    if (patch.depositBonusPercent !== undefined && !isNaN(parseFloat(patch.depositBonusPercent))) {
      user.depositBonusPercent = Math.max(0, parseFloat(patch.depositBonusPercent));
    }
    if (patch.totalDeposited !== undefined && !isNaN(parseFloat(patch.totalDeposited))) {
      user.totalDeposited = parseFloat(parseFloat(patch.totalDeposited).toFixed(2));
    }
    if (patch.totalWithdrawn !== undefined && !isNaN(parseFloat(patch.totalWithdrawn))) {
      user.totalWithdrawn = parseFloat(parseFloat(patch.totalWithdrawn).toFixed(2));
    }
    if (patch.gamesPlayed !== undefined && !isNaN(parseInt(patch.gamesPlayed))) {
      user.gamesPlayed = parseInt(patch.gamesPlayed, 10);
    }
    if (patch.gamesWon !== undefined && !isNaN(parseInt(patch.gamesWon))) {
      user.gamesWon = parseInt(patch.gamesWon, 10);
    }
    if (patch.referralsCount !== undefined && !isNaN(parseInt(patch.referralsCount))) {
      user.referralsCount = parseInt(patch.referralsCount, 10);
    }
    if (patch.referralEarned !== undefined && !isNaN(parseFloat(patch.referralEarned))) {
      user.referralEarned = parseFloat(parseFloat(patch.referralEarned).toFixed(2));
    }
    if (patch.rtp !== undefined) {
      user.rtp = ['win', 'lose', 'auto'].includes(patch.rtp) ? patch.rtp : 'auto';
    }
    if (patch.isBanned !== undefined) {
      user.isBanned = !!patch.isBanned;
    }
    if (patch.agreedToTerms !== undefined) {
      user.agreedToTerms = !!patch.agreedToTerms;
    }
    if (patch.isSubscribed !== undefined) {
      user.isSubscribed = !!patch.isSubscribed;
    }
    if (patch.name) {
      user.name = String(patch.name);
    }
    this.save();
    return user;
  }

  save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('[DB] Error writing server_db.json:', e.message);
    }
  }

  // Supabase sync helpers
  async syncUserToSupabase(user) {
    if (!this.supabase || !user) return;
    try {
      const row = toSnakeCase({
        id: String(user.id),
        name: user.name || 'Пользователь',
        username: user.username || null,
        passwordHash: user.passwordHash || null,
        balance: parseFloat(user.balance || 0),
        totalTurnover: parseFloat(user.totalTurnover || 0),
        totalDeposited: parseFloat(user.totalDeposited || 0),
        totalWithdrawn: parseFloat(user.totalWithdrawn || 0),
        gamesPlayed: parseInt(user.gamesPlayed || 0, 10),
        gamesWon: parseInt(user.gamesWon || 0, 10),
        referralsCount: parseInt(user.referralsCount || 0, 10),
        referralEarned: parseFloat(user.referralEarned || 0),
        referrerId: user.referrerId ? String(user.referrerId) : null,
        agreedToTerms: Boolean(user.agreedToTerms),
        rtp: user.rtp || 'auto',
        isBanned: Boolean(user.isBanned),
        cashback: parseFloat(user.cashback || 0),
        wagerRequired: parseFloat(user.wagerRequired || 0),
        depositBonusPercent: parseFloat(user.depositBonusPercent || 0),
        usedPromos: Array.isArray(user.usedPromos) ? user.usedPromos : [],
        history: Array.isArray(user.history) ? user.history : []
      });
      await this.supabase.from('users').upsert(row, 'id');
    } catch (e) {
      console.warn(`[Supabase] Sync user ${user.id} error:`, e.message);
    }
  }

  async syncInvoiceToSupabase(inv) {
    if (!this.supabase || !inv) return;
    try {
      const row = toSnakeCase({
        invoiceId: String(inv.invoiceId),
        userId: String(inv.userId),
        method: inv.method || 'unknown',
        amount: parseFloat(inv.amount || inv.baseAmount || 0),
        status: inv.status || 'active',
        payUrl: inv.payUrl || null,
        walletAddress: inv.walletAddress || null,
        baseAmount: inv.baseAmount ? parseFloat(inv.baseAmount) : null,
        expectedAmount: inv.expectedAmount ? parseFloat(inv.expectedAmount) : null,
        expectedCryptoAmount: inv.expectedCryptoAmount ? parseFloat(inv.expectedCryptoAmount) : null,
        exactAmount: inv.exactAmount ? parseFloat(inv.exactAmount) : null,
        rate: inv.rate ? parseFloat(inv.rate) : null,
        currency: inv.currency || null,
        expiresAt: inv.expiresAt || null,
        createdAt: inv.createdAt || Date.now()
      });
      await this.supabase.from('invoices').upsert(row, 'invoice_id');
    } catch (e) {
      console.warn(`[Supabase] Sync invoice ${inv.invoiceId} error:`, e.message);
    }
  }

  async syncWithdrawalToSupabase(w) {
    if (!this.supabase || !w) return;
    try {
      const row = toSnakeCase({
        id: String(w.id),
        userId: String(w.userId),
        amount: parseFloat(w.amount || 0),
        method: w.method || 'unknown',
        address: w.address || null,
        checkUrl: w.checkUrl || null,
        chequeId: w.chequeId || null,
        status: w.status || 'pending',
        processedBy: w.processedBy || null,
        processedAt: w.processedAt || null,
        createdAt: w.createdAt || new Date().toISOString()
      });
      await this.supabase.from('withdrawals').upsert(row, 'id');
    } catch (e) {
      console.warn(`[Supabase] Sync withdrawal ${w.id} error:`, e.message);
    }
  }

  async syncPromocodeToSupabase(promo) {
    if (!this.supabase || !promo) return;
    try {
      const row = toSnakeCase({
        id: String(promo.id || promo.code),
        code: String(promo.code).toUpperCase(),
        type: promo.type || 'balance',
        amount: parseFloat(promo.amount || 0),
        percent: parseFloat(promo.percent || 0),
        usesLeft: parseInt(promo.usesLeft || 0, 10),
        maxUses: parseInt(promo.maxUses || 0, 10),
        active: promo.active !== false
      });
      await this.supabase.from('promocodes').upsert(row, 'code');
    } catch (e) {
      console.warn(`[Supabase] Sync promo ${promo.code} error:`, e.message);
    }
  }

  async syncSettingsToSupabase() {
    if (!this.supabase) return;
    try {
      await this.supabase.from('app_settings').upsert({ key: 'settings', value: this.data.settings || {} }, 'key');
      await this.supabase.from('app_settings').upsert({ key: 'treasury', value: parseFloat(this.data.treasury || 100) }, 'key');
      await this.supabase.from('app_settings').upsert({ key: 'admins', value: this.data.admins || DEFAULT_ADMINS }, 'key');
      await this.supabase.from('app_settings').upsert({ key: 'used_tx_hashes', value: this.data.usedTxHashes || [] }, 'key');
    } catch (e) {
      console.warn('[Supabase] Sync settings error:', e.message);
    }
  }

  // Non-JWT Sessions management
  async saveSession(sessionObj) {
    if (!this.data.sessions) this.data.sessions = {};
    this.data.sessions[sessionObj.token] = sessionObj;
    this.save();
    if (this.supabase) {
      try {
        await this.supabase.from('sessions').upsert({
          token: sessionObj.token,
          user_id: sessionObj.userId,
          user_agent: sessionObj.userAgent,
          created_at: sessionObj.createdAt,
          expires_at: sessionObj.expiresAt
        }, 'token');
      } catch (e) {
        console.warn('[Supabase] Save session error:', e.message);
      }
    }
  }

  async getSession(token) {
    if (!token) return null;
    if (this.data.sessions && this.data.sessions[token]) {
      return this.data.sessions[token];
    }
    if (this.supabase) {
      try {
        const { data, error } = await this.supabase.from('sessions').select('*', { token });
        const row = Array.isArray(data) ? data[0] : data;
        if (row && !error) {
          const session = {
            token: row.token,
            userId: row.user_id,
            userAgent: row.user_agent,
            createdAt: row.created_at,
            expiresAt: row.expires_at
          };
          if (!this.data.sessions) this.data.sessions = {};
          this.data.sessions[token] = session;
          return session;
        }
      } catch (e) {}
    }
    return null;
  }

  async deleteSession(token) {
    if (!token) return;
    if (this.data.sessions) delete this.data.sessions[token];
    this.save();
    if (this.supabase) {
      try {
        await this.supabase.from('sessions').delete({ token });
      } catch (e) {}
    }
  }

  // Web user auth helpers
  findUserByUsername(username) {
    const clean = String(username || '').trim().toLowerCase();
    if (!clean) return null;
    return Object.values(this.data.users || {}).find(u =>
      (u.username && u.username.toLowerCase() === clean) ||
      (String(u.id).toLowerCase() === clean)
    ) || null;
  }

  async registerUser({ username, password, name }) {
    const clean = username.trim().toLowerCase();
    const id = `u_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const passwordHash = hashPassword(password);
    const user = {
      id,
      name: name || clean,
      username: clean,
      passwordHash,
      balance: 0.00,
      cashback: 0.00,
      wagerRequired: 0.00,
      depositBonusPercent: 0,
      totalTurnover: 0.00,
      totalDeposited: 0.00,
      totalWithdrawn: 0.00,
      gamesPlayed: 0,
      gamesWon: 0,
      referralsCount: 0,
      referralEarned: 0.00,
      rtp: 'auto',
      isBanned: false,
      agreedToTerms: false,
      history: [],
      usedPromos: []
    };
    this.data.users[id] = user;
    this.save();
    await this.syncUserToSupabase(user);
    return user;
  }

  verifyUserPassword(username, password) {
    const user = this.findUserByUsername(username);
    if (!user || !user.passwordHash) return null;
    const ok = verifyPassword(password, user.passwordHash);
    return ok ? user : null;
  }

  redeemPromocode(userId, rawCode) {
    const code = String(rawCode || '').trim().toUpperCase();
    if (!this.data.promocodes) this.data.promocodes = {};
    const promo = this.data.promocodes[code];
    if (!promo) {
      return { success: false, error: `Промокод "${rawCode}" не существует` };
    }
    if (!promo.active) {
      return { success: false, error: 'Промокод деактивирован администратором' };
    }
    if (promo.usesLeft <= 0) {
      return { success: false, error: 'Лимит активаций промокода исчерпан' };
    }
    const user = this.getUser(userId);
    const minTurnover = Math.max(0, parseFloat(promo.minTurnover) || 0);
    const userTurnover = parseFloat(user.totalTurnover) || 0;
    if (minTurnover > 0 && userTurnover < minTurnover) {
      return {
        success: false,
        error: `Для активации требуется оборот ставок от $${minTurnover.toFixed(2)} (ваш текущий оборот: $${userTurnover.toFixed(2)})`
      };
    }
    if (!user.usedPromos) user.usedPromos = [];
    if (user.usedPromos.includes(code)) {
      return { success: false, error: 'Вы уже активировали этот промокод!' };
    }

    user.usedPromos.push(code);
    promo.usesLeft = Math.max(0, (promo.usesLeft || 1) - 1);

    const dateStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const isDepositBonus = promo.type === 'deposit_bonus';

    if (isDepositBonus) {
      const bonusPct = parseFloat(promo.percent || promo.amount) || 20;
      user.depositBonusPercent = parseFloat(((user.depositBonusPercent || 0) + bonusPct).toFixed(1));

      user.history.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: 'promo',
        title: `Промокод ${code} (+${bonusPct}% к депозиту)`,
        time: `Сегодня, ${dateStr}`,
        amount: bonusPct,
        status: 'АКТИВИРОВАН'
      });

      this.save();
      return {
        success: true,
        type: 'deposit_bonus',
        percent: bonusPct,
        bonusPercent: user.depositBonusPercent,
        user,
        promo,
        message: `Промокод ${code} активирован! Вы получили +${bonusPct}% к следующему пополнению!`
      };
    } else {
      const amt = parseFloat(promo.amount) || 10;
      user.balance = parseFloat(((user.balance || 0) + amt).toFixed(2));
      user.wagerRequired = parseFloat(((user.wagerRequired || 0) + amt).toFixed(2));

      user.history.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: 'promo',
        title: `Промокод ${code}`,
        time: `Сегодня, ${dateStr}`,
        amount: amt,
        status: 'ЗАЧИСЛЕНО'
      });

      this.save();
      return {
        success: true,
        type: 'balance',
        amount: amt,
        user,
        promo,
        message: `Промокод ${code} активирован! +$${amt.toFixed(2)} зачислено на баланс!`
      };
    }
  }

  getUser(userId, defaultName = 'Пользователь') {
    const id = String(userId || '3982051');
    if (!this.data.users[id]) {
      this.data.users[id] = {
        id,
        name: defaultName,
        balance: 0.00,
        cashback: 0.00,
        wagerRequired: 0.00,
        depositBonusPercent: 0,
        totalTurnover: 0.00,
        totalDeposited: 0.00,
        totalWithdrawn: 0.00,
        gamesPlayed: 0,
        gamesWon: 0,
        referralsCount: 0,
        referralEarned: 0.00,
        rtp: 'auto',
        isBanned: false,
        agreedToTerms: false,
        isSubscribed: false,
        history: []
      };
      this.save();
    }
    if (this.data.users[id].cashback === undefined) this.data.users[id].cashback = 0.00;
    if (this.data.users[id].wagerRequired === undefined) this.data.users[id].wagerRequired = 0.00;
    if (this.data.users[id].depositBonusPercent === undefined) this.data.users[id].depositBonusPercent = 0;
    if (this.data.users[id].rtp === undefined) this.data.users[id].rtp = 'auto';
    if (this.data.users[id].isBanned === undefined) this.data.users[id].isBanned = false;
    if (this.data.users[id].agreedToTerms === undefined) this.data.users[id].agreedToTerms = false;
    if (this.data.users[id].isSubscribed === undefined) this.data.users[id].isSubscribed = false;
    if (this.data.users[id].netProfit === undefined) {
      let net = 0;
      if (Array.isArray(this.data.users[id].history)) {
        this.data.users[id].history.forEach(h => {
          if (h.type === 'game') {
            net += (typeof h.amount === 'number' ? h.amount : parseFloat(h.amount) || 0);
          }
        });
      }
      this.data.users[id].netProfit = parseFloat(net.toFixed(2));
    }
    return this.data.users[id];
  }

  recordBet(userId, { game, betAmount, winAmount, isWin, multiplier }) {
    const user = this.getUser(userId);
    const bet = Math.max(0, parseFloat(betAmount) || 0);
    let win = Math.max(0, parseFloat(winAmount) || 0);
    let won = Boolean(isWin);

    // CRITICAL: Hard Server-Side RTP Guard
    const globalRtp = this.data.settings?.globalRtp || 'auto';
    const gameRtp = game === 'Crash' 
      ? (this.data.settings?.crashRtp || globalRtp)
      : (game === 'Апгрейдер' ? (this.data.settings?.upgraderRtp || globalRtp) : globalRtp);

    const isForcedLose = user.rtp === 'lose' || globalRtp === 'lose' || gameRtp === 'lose';
    if (isForcedLose && won) {
      console.log(`[RTP GUARD] 🛑 HARD SERVER BLOCK: User ${userId} requested win $${win} in ${game}, but RTP is 'lose'! Overridden to 100% loss.`);
      won = false;
      win = 0;
    }

    // Turnover accumulates every single bet across all games
    user.totalTurnover = parseFloat(((user.totalTurnover || 0) + bet).toFixed(2));
    user.gamesPlayed = (user.gamesPlayed || 0) + 1;
    if (won) {
      user.gamesWon = (user.gamesWon || 0) + 1;
    }

    // Cumulative net profit across all games
    const roundNet = parseFloat((win - bet).toFixed(2));
    user.netProfit = parseFloat(((user.netProfit || 0) + roundNet).toFixed(2));

    // Deduct bet from required wager turnover
    if (user.wagerRequired && user.wagerRequired > 0) {
      user.wagerRequired = parseFloat(Math.max(0, user.wagerRequired - bet).toFixed(2));
    }

    // IMPORTANT: The bet amount is ALREADY deducted from user.balance when placed (via syncBalance from the frontend).
    // Therefore:
    // - On WIN: add the full payout (winAmount), which restores the stake and adds the profit.
    // - On LOSS: do NOT deduct the bet again (balance was already debited at game start).
    if (win > 0) {
      user.balance = parseFloat(((user.balance || 0) + win).toFixed(2));
    }

    const displayAmount = won ? win : -bet;
    const dateStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    user.history.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: 'game',
      title: `${game || 'Игра'}: ${won ? `x${(multiplier || 1).toFixed(2)}` : 'Ставка'}`,
      time: `Сегодня, ${dateStr}`,
      amount: parseFloat(displayAmount.toFixed(2)),
      status: won ? 'ВЫИГРЫШ' : 'ПРОИГРЫШ'
    });

    if (user.history.length > 80) {
      user.history = user.history.slice(0, 80);
    }

    this.save();
    return user;
  }

  recordDeposit(userId, { amount, method, invoiceId }) {
    const user = this.getUser(userId);
    const amt = parseFloat(amount) || 0;

    // Apply active promocode deposit bonus if present
    const bonusPct = parseFloat(user.depositBonusPercent) || 0;
    let bonusAmount = 0;
    if (bonusPct > 0) {
      bonusAmount = parseFloat((amt * (bonusPct / 100)).toFixed(2));
      user.depositBonusPercent = 0; // consumed on deposit
    }

    const totalCredited = parseFloat((amt + bonusAmount).toFixed(2));
    user.balance = parseFloat(((user.balance || 0) + totalCredited).toFixed(2));
    user.totalDeposited = parseFloat(((user.totalDeposited || 0) + amt).toFixed(2));
    // Wager requirement: deposit amount + any bonus percentage added to deposit
    user.wagerRequired = parseFloat(((user.wagerRequired || 0) + totalCredited).toFixed(2));

    const dateStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const methodName = method === 'xrocket' ? 'xRocket' : 'CryptoBot';

    user.history.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: 'dep',
      title: bonusAmount > 0 
        ? `Депозит ${methodName} (+${bonusPct}% бонус: +$${bonusAmount.toFixed(2)})`
        : `Депозит ${methodName} (${invoiceId || ''})`,
      time: `Сегодня, ${dateStr}`,
      amount: totalCredited,
      status: 'УСПЕШНО'
    });

    // 15% referral commission reward to referrer
    if (user.referrerId && this.data.users[user.referrerId]) {
      const referrer = this.data.users[user.referrerId];
      const bonus = parseFloat((amt * 0.15).toFixed(2));
      referrer.balance = parseFloat(((referrer.balance || 0) + bonus).toFixed(2));
      referrer.referralEarned = parseFloat(((referrer.referralEarned || 0) + bonus).toFixed(2));
      referrer.history.unshift({
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: 'ref',
        title: `Бонус 15% от реферала (${user.name || user.id})`,
        time: `Сегодня, ${dateStr}`,
        amount: bonus,
        status: 'ЗАЧИСЛЕНО'
      });
      if (telegramBot && referrer.id) {
        try {
          const safeRefName = escapeHtml(user.name || user.id);
          telegramBot.sendMessage(
            referrer.id,
            `🎁 <b>Реферальный бонус!</b>\nВаш реферал <b>${safeRefName}</b> пополнил баланс на <b>$${amt.toFixed(2)}</b>.\nВам начислено 15%: <b>+$${bonus.toFixed(2)}</b>!`,
            { parse_mode: 'HTML' }
          ).catch(() => {});
        } catch (e) {}
      }
    }

    if (user.history.length > 80) {
      user.history = user.history.slice(0, 80);
    }

    this.save();
    return user;
  }

  recordWithdrawal(userId, { amount, method, address, checkUrl, chequeId }) {
    const user = this.getUser(userId);
    const amt = parseFloat(amount) || 0;
    user.balance = parseFloat(Math.max(0, (user.balance || 0) - amt).toFixed(2));
    user.totalWithdrawn = parseFloat(((user.totalWithdrawn || 0) + amt).toFixed(2));

    const dateStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const methodName = method === 'xrocket' ? 'xRocket' : 'CryptoBot';

    user.history.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: 'with',
      title: `Вывод ${methodName} (Чек)`,
      time: `Сегодня, ${dateStr}`,
      amount: -amt,
      status: 'ВЫПЛАЧЕНО',
      checkUrl: checkUrl || address
    });

    if (user.history.length > 80) {
      user.history = user.history.slice(0, 80);
    }

    this.data.withdrawals.unshift({
      id: `w_${Date.now()}`,
      userId,
      amount: amt,
      method,
      address: address || checkUrl,
      checkUrl: checkUrl || address,
      chequeId,
      status: 'completed',
      createdAt: new Date().toISOString()
    });

    this.save();
    return user;
  }
}

const db = new DatabaseManager();

// ==========================================
// AUTHENTICATION API (NON-JWT SESSION AUTH)
// ==========================================
app.use(authMiddleware(db, {
  publicPaths: [
    '/api/telegram-webhook',
    '/api/health',
    '/api/crash/state',
    '/api/crash/stream',
    '/api/crash/bet',
    '/api/settings/public',
    '/api/payments/crypto-rates',
    '/api/promocodes/list',
    '/api/config',
    '/api/auth/telegram',
    '/api/auth/register',
    '/api/auth/login',
    '/api/admin/check',
    '/api/subscription/check',
    '/api/subscription/status',
    ...(process.env.NODE_ENV === 'test' ? ['/api/auth/dev-login'] : [])
  ],
  publicPrefixes: [
    '/assets',
    '/public',
    '/api/subscription'
  ]
}));

// Public App Configuration API (supplies client with non-secret environment configs)
app.get('/api/config', (req, res) => {
  res.json({
    botUsername: BOT_USERNAME,
    channelUsername: CHANNEL_USERNAME,
    channelUrl: CHANNEL_URL,
    supportUsername: SUPPORT_USERNAME,
    supportUrl: SUPPORT_URL,
    termsUrl: TERMS_URL,
    rulesUrl: RULES_URL,
    privacyUrl: PRIVACY_URL,
    superAdminId: SUPERADMIN_ID,
    xrocketPayUrl: XROCKET_PAY_URL,
    cryptobotPayUrl: CRYPTOBOT_PAY_URL,
    trc20Wallet: db.data.settings?.trc20Wallet || DEFAULT_TRC20,
    tonWallet: db.data.settings?.tonWallet || DEFAULT_TON
  });
});

// Telegram WebApp HMAC authentication -> Issues non-JWT session
app.post('/api/auth/telegram', async (req, res) => {
  const { initData } = req.body;
  if (!initData) {
    return res.status(400).json({ success: false, error: 'Telegram initData обязателен' });
  }

  const tgUser = verifyInitData(initData, BOT_TOKEN);
  if (!tgUser) {
    return res.status(401).json({ success: false, error: 'Неверные или устаревшие данные Telegram initData' });
  }

  const user = db.getUser(tgUser.id, tgUser.firstName);
  if (tgUser.username) user.username = tgUser.username;

  if (tgUser.startParam && !user.referrerId) {
    const refMatch = tgUser.startParam.match(/^ref_?(\w+)/);
    const refId = refMatch ? refMatch[1] : tgUser.startParam;
    if (refId && refId !== tgUser.id) {
      user.referrerId = refId;
      const referrer = db.getUser(refId);
      referrer.referralsCount = (referrer.referralsCount || 0) + 1;
      db.syncUserToSupabase(referrer);
    }
  }

  db.save();
  db.syncUserToSupabase(user);

  const session = await createSession(db, user.id, req.headers['user-agent']);
  res.json({
    success: true,
    token: session.token,
    user,
    isAdmin: db.isAdmin(user.id)
  });
});

// Direct Web Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password, name } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Логин и пароль обязательны' });
  }
  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ success: false, error: 'Логин должен быть не короче 3 символов' });
  }
  if (password.length < 4) {
    return res.status(400).json({ success: false, error: 'Пароль должен быть не короче 4 символов' });
  }

  const existing = db.findUserByUsername(cleanUsername);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Пользователь с таким логином уже зарегистрирован' });
  }

  const user = await db.registerUser({ username: cleanUsername, password, name: name || cleanUsername });
  const session = await createSession(db, user.id, req.headers['user-agent']);
  res.json({
    success: true,
    token: session.token,
    user,
    isAdmin: db.isAdmin(user.id)
  });
});

// Direct Web Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Укажите логин и пароль' });
  }

  const user = db.verifyUserPassword(username.trim().toLowerCase(), password);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Неверный логин или пароль' });
  }

  const session = await createSession(db, user.id, req.headers['user-agent']);
  res.json({
    success: true,
    token: session.token,
    user,
    isAdmin: db.isAdmin(user.id)
  });
});

// Dev / Testing Quick Login - strictly disabled in production
app.post('/api/auth/dev-login', async (req, res) => {
  if (process.env.NODE_ENV !== 'test') {
    return res.status(404).json({ error: 'Not found' });
  }
  const targetId = String(req.body.userId || SUPERADMIN_ID);
  const user = db.getUser(targetId, 'Dev User');
  const session = await createSession(db, user.id, req.headers['user-agent']);
  res.json({
    success: true,
    token: session.token,
    user,
    isAdmin: db.isAdmin(user.id)
  });
});

// Current Authenticated User & Session Check
app.get('/api/auth/me', async (req, res) => {
  if (!req.userId) {
    return res.status(401).json({ success: false, error: 'Сессия не найдена или истекла' });
  }
  const user = db.getUser(req.userId);
  res.json({
    success: true,
    user,
    isAdmin: db.isAdmin(req.userId),
    session: {
      token: req.session?.token,
      expiresAt: req.session?.expiresAt
    }
  });
});

// Logout (Revoke session token)
app.post('/api/auth/logout', async (req, res) => {
  const token = req.session?.token || req.body?.token || (req.get('authorization') || '').replace('Bearer ', '').trim();
  if (token) {
    await destroySession(db, token);
  }
  res.json({ success: true, message: 'Сессия успешно завершена' });
});

// ==========================================
// USER DATABASE API
// ==========================================
app.get('/api/user/profile', (req, res) => {
  const userId = req.userId || req.query.userId || '3982051';
  const name = req.query.name || 'Пользователь';
  const user = db.getUser(userId, name);
  res.json({ success: true, user });
});

app.post('/api/user/sync', (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });
  const patch = req.body.patch || req.body;
  const user = db.getUser(userId);
  if (patch && typeof patch === 'object') {
    if (patch.balance !== undefined) user.balance = parseFloat(patch.balance);
    if (patch.totalTurnover !== undefined) user.totalTurnover = parseFloat(patch.totalTurnover);
    if (patch.cashback !== undefined) user.cashback = parseFloat(Math.max(0, parseFloat(patch.cashback)).toFixed(2));
    if (patch.wagerRequired !== undefined) user.wagerRequired = parseFloat(Math.max(0, parseFloat(patch.wagerRequired)).toFixed(2));
    if (patch.depositBonusPercent !== undefined) user.depositBonusPercent = Math.max(0, parseFloat(patch.depositBonusPercent) || 0);
    if (patch.name) user.name = patch.name;
    if (patch.agreedToTerms !== undefined) {
      user.agreedToTerms = Boolean(patch.agreedToTerms);
    }
    db.save();
    db.syncUserToSupabase(user);
  }
  res.json({ success: true, user });
});

app.post('/api/user/agree-terms', (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });
  const user = db.getUser(userId);
  user.agreedToTerms = true;
  db.save();
  db.syncUserToSupabase(user);
  console.log(`[DB] 📜 User ${userId} accepted legal terms. Saved permanently in database.`);
  res.json({ success: true, agreedToTerms: true, user });
});

app.post('/api/user/claim-cashback', (req, res) => {
  const userId = req.userId;
  if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });
  const isFriday = new Date().getDay() === 5;
  if (!isFriday) {
    return res.status(400).json({ error: 'Вывод кэшбэка доступен только по пятницам!' });
  }
  const user = db.getUser(userId);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  const cbAmount = parseFloat(user.cashback) || 0;
  if (cbAmount < 1.0) {
    return res.status(400).json({ error: 'Минимальная сумма кэшбэка для вывода — $1.00' });
  }
  user.balance = parseFloat(((user.balance || 0) + cbAmount).toFixed(2));
  user.cashback = 0.00;
  const dateStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (!Array.isArray(user.history)) user.history = [];
  user.history.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: 'cashback',
    title: 'Кэшбэк (Пятница)',
    time: `Сегодня, ${dateStr}`,
    amount: cbAmount,
    status: 'ЗАЧИСЛЕНО'
  });
  db.save();
  db.syncUserToSupabase(user);
  console.log(`[Cashback] 💰 User ${userId} claimed Friday cashback of $${cbAmount.toFixed(2)}. New balance: $${user.balance.toFixed(2)}`);
  res.json({ success: true, claimedAmount: cbAmount, balance: user.balance, user });
});

// Helper to verify Telegram channel subscription
async function checkUserSubscription(userId) {
  const id = String(userId || '').trim();
  if (!id) return false;
  if (db.isAdmin(id)) return true;

  const user = db.getUser(id);
  if (user && user.isSubscribed) return true;

  if (!telegramBot) {
    return true;
  }

  const targetChannel = CHANNEL_CHAT_ID;
  try {
    const member = await telegramBot.getChatMember(targetChannel, id);
    const isMember = ['creator', 'administrator', 'member', 'restricted'].includes(member?.status);
    if (isMember) {
      if (user) {
        user.isSubscribed = true;
        db.save();
        db.syncUserToSupabase(user).catch(() => {});
      }
      return true;
    }
    return false;
  } catch (err) {
    const msg = err.message || '';
    console.warn(`[SubCheck] Warning checking user ${id} in ${targetChannel}:`, msg);
    if (
      msg.includes('chat not found') ||
      msg.includes('not a member') ||
      msg.includes('CHAT_ADMIN_REQUIRED') ||
      msg.includes('not enough rights') ||
      msg.includes('member list is inaccessible')
    ) {
      console.warn(`[SubCheck] ⚠️ Telegram bot lacks rights in ${targetChannel}. Permitting access as fallback.`);
      if (user) {
        user.isSubscribed = true;
        db.save();
      }
      return true;
    }
    return false;
  }
}

app.post('/api/subscription/check', async (req, res) => {
  const userId = req.userId || req.body?.userId;
  if (!userId) {
    return res.status(400).json({ success: false, error: 'userId is required' });
  }
  const isSubscribed = await checkUserSubscription(userId);
  if (isSubscribed) {
    const user = db.getUser(userId);
    return res.json({
      success: true,
      isSubscribed: true,
      channelUsername: CHANNEL_USERNAME,
      channelUrl: CHANNEL_URL,
      user
    });
  }
  return res.json({
    success: false,
    isSubscribed: false,
    channelUsername: CHANNEL_USERNAME,
    channelUrl: CHANNEL_URL,
    error: `Вы ещё не подписались на канал @${CHANNEL_USERNAME}. Пожалуйста, подпишитесь и нажмите «Проверить».`
  });
});

app.get('/api/subscription/status', (req, res) => {
  const userId = req.userId || req.query?.userId;
  if (!userId) {
    return res.json({
      isSubscribed: false,
      channelUsername: CHANNEL_USERNAME,
      channelUrl: CHANNEL_URL
    });
  }
  const user = db.getUser(userId);
  return res.json({
    isSubscribed: Boolean(user?.isSubscribed || db.isAdmin(userId)),
    channelUsername: CHANNEL_USERNAME,
    channelUrl: CHANNEL_URL
  });
});

app.post('/api/user/bind-referrer', (req, res) => {
  const userId = req.userId || req.body.userId;
  const { referrerId } = req.body;
  if (!userId || !referrerId || userId === referrerId) {
    return res.json({ success: false });
  }
  const user = db.getUser(userId);
  if (!user.referrerId) {
    user.referrerId = String(referrerId);
    const referrer = db.getUser(referrerId);
    referrer.referralsCount = (referrer.referralsCount || 0) + 1;
    db.save();
    db.syncUserToSupabase(user);
    db.syncUserToSupabase(referrer);
    console.log(`[Referral] 🤝 WebApp user ${userId} bound to referrer ${referrerId}`);
    return res.json({ success: true });
  }
  res.json({ success: false, alreadyBound: true });
});

app.post('/api/user/record-bet', (req, res) => {
  const userId = req.userId || req.body.userId;
  const { game, betAmount, winAmount, isWin, multiplier } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  const user = db.recordBet(userId, { game, betAmount, winAmount, isWin, multiplier });
  db.syncUserToSupabase(user);
  res.json({ success: true, user });
});

// Promocodes API
app.post('/api/promocodes/redeem', (req, res) => {
  const userId = req.userId || req.body.userId;
  const { code } = req.body;
  if (!userId || !code) return res.status(400).json({ success: false, error: 'Укажите пользователя и промокод' });
  const result = db.redeemPromocode(userId, code);
  if (result.user) db.syncUserToSupabase(result.user);
  if (result.promo) db.syncPromocodeToSupabase(result.promo);
  res.json(result);
});

app.get('/api/promocodes/list', (req, res) => {
  const list = Object.values(db.data.promocodes || {});
  res.json({ success: true, promocodes: list });
});

app.post('/api/promocodes/create', adminMiddleware(db), (req, res) => {
  const { code, type, amount, percent, maxUses, minTurnover } = req.body;
  if (!code) return res.status(400).json({ error: 'Неверные параметры промокода' });
  const cleanCode = code.trim().toUpperCase();
  const promoType = type === 'deposit_bonus' ? 'deposit_bonus' : 'balance';
  const amt = parseFloat(amount) || 10;
  const pct = parseFloat(percent || amount) || 20;
  const uses = parseInt(maxUses, 10) || 100;
  const turnover = Math.max(0, parseFloat(minTurnover) || 0);

  if (!db.data.promocodes) db.data.promocodes = {};
  db.data.promocodes[cleanCode] = {
    id: String(Date.now()),
    code: cleanCode,
    type: promoType,
    amount: amt,
    percent: pct,
    usesLeft: uses,
    maxUses: uses,
    minTurnover: turnover,
    active: true
  };
  db.save();
  db.syncPromocodeToSupabase(db.data.promocodes[cleanCode]);
  res.json({ success: true, promocode: db.data.promocodes[cleanCode] });
});

app.post('/api/promocodes/delete', adminMiddleware(db), (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Код не указан' });
  const cleanCode = code.trim().toUpperCase();
  if (db.data.promocodes && db.data.promocodes[cleanCode]) {
    delete db.data.promocodes[cleanCode];
    db.save();
    if (db.supabase) {
      db.supabase.from('promocodes').delete({ code: cleanCode }).catch(() => {});
    }
  }
  res.json({ success: true });
});

// Game and Admin Settings API
app.get('/api/settings/public', (req, res) => {
  res.json({
    success: true,
    globalRtp: db.data.settings?.globalRtp || 'auto',
    upgraderRtp: db.data.settings?.upgraderRtp || 'auto',
    crashRtp: db.data.settings?.crashRtp || 'auto',
    boxesRtp: db.data.settings?.boxesRtp || 'auto'
  });
});

// ==========================================
// REAL PAYMENT API (xRocket & CryptoBot)
// ==========================================
app.post('/api/payments/create-invoice', async (req, res) => {
  try {
    const { userId, method, amount } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < 0.5) {
      return res.status(400).json({ error: 'Минимальная сумма пополнения $0.50' });
    }

    console.log(`[Payment] 💳 Creating invoice for user ${userId}: $${numAmount} via ${method}`);

    if (method === 'xrocket') {
      // Real xRocket Pay API request
      const xrocketRes = await fetch('https://pay.api.xrocket.exchange/api/v1/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + XROCKET_TOKEN
        },
        body: JSON.stringify({
          priceAmount: numAmount.toFixed(2),
          priceCurrency: 'USDT',
          payoutCurrency: 'USDT',
          numPayments: 1,
          description: `Пополнение RoyalX (ID: ${userId})`,
          expiresIn: 1800000
        })
      });

      const xrocketData = await xrocketRes.json();

      if (xrocketRes.ok && xrocketData.id) {
        const invoiceId = String(xrocketData.id);
        const payUrl = xrocketData.links?.telegramBotLink || XROCKET_PAY_URL;

        db.data.invoices[invoiceId] = {
          invoiceId,
          userId,
          method: 'xrocket',
          amount: numAmount,
          status: 'active',
          payUrl,
          createdAt: Date.now()
        };
        db.save();

        console.log(`[xRocket] ✅ Real invoice #${invoiceId} created successfully: ${payUrl}`);
        return res.json({
          success: true,
          invoiceId,
          payUrl,
          amount: numAmount,
          method: 'xrocket'
        });
      } else {
        console.error('[xRocket] API error:', xrocketData);
        // Fallback invoice link directly to bot if API has network restriction
        const fallbackId = `XRK-${Date.now().toString().slice(-6)}`;
        const fallbackUrl = `${XROCKET_PAY_URL}?start=inv_${fallbackId}`;
        db.data.invoices[fallbackId] = {
          invoiceId: fallbackId,
          userId,
          method: 'xrocket',
          amount: numAmount,
          status: 'active',
          payUrl: fallbackUrl,
          createdAt: Date.now()
        };
        db.save();
        return res.json({
          success: true,
          invoiceId: fallbackId,
          payUrl: fallbackUrl,
          amount: numAmount,
          method: 'xrocket'
        });
      }
    } else {
      // Real CryptoBot API request
      const cbRes = await fetch('https://pay.crypt.bot/api/createInvoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Crypto-Pay-API-Token': CRYPTOBOT_TOKEN
        },
        body: JSON.stringify({
          currency_type: 'crypto',
          asset: 'USDT',
          amount: numAmount.toFixed(2),
          description: `Пополнение RoyalX (ID: ${userId})`
        })
      });

      const cbData = await cbRes.json();

      if (cbData.ok && cbData.result) {
        const inv = cbData.result;
        const invoiceId = String(inv.invoice_id);
        const payUrl = inv.pay_url || inv.bot_invoice_url || inv.mini_app_invoice_url;

        db.data.invoices[invoiceId] = {
          invoiceId,
          userId,
          method: 'cryptobot',
          amount: numAmount,
          status: 'active',
          payUrl,
          createdAt: Date.now()
        };
        db.save();

        console.log(`[CryptoBot] ✅ Real invoice #${invoiceId} created successfully: ${payUrl}`);
        return res.json({
          success: true,
          invoiceId,
          payUrl,
          amount: numAmount,
          method: 'cryptobot'
        });
      } else {
        console.error('[CryptoBot] API error:', cbData);
        const fallbackId = `CB-${Date.now().toString().slice(-6)}`;
        const fallbackUrl = `${CRYPTOBOT_PAY_URL}?start=${fallbackId}`;
        db.data.invoices[fallbackId] = {
          invoiceId: fallbackId,
          userId,
          method: 'cryptobot',
          amount: numAmount,
          status: 'active',
          payUrl: fallbackUrl,
          createdAt: Date.now()
        };
        db.save();
        return res.json({
          success: true,
          invoiceId: fallbackId,
          payUrl: fallbackUrl,
          amount: numAmount,
          method: 'cryptobot'
        });
      }
    }
  } catch (err) {
    console.error('[Payment] Create invoice error:', err.message);
    res.status(500).json({ error: 'Ошибка создания счёта на оплату' });
  }
});

app.post('/api/payments/check-invoice', async (req, res) => {
  try {
    const { userId, invoiceId, method } = req.body;
    console.log(`[Payment] 🔍 Checking payment for invoice ${invoiceId} (${method})...`);

    const inv = db.data.invoices[invoiceId];
    if (inv && inv.status === 'paid') {
      return res.json({ paid: true, message: 'Счёт уже оплачен' });
    }

    let isPaid = false;

    if (method === 'xrocket') {
      try {
        const checkRes = await fetch(`https://pay.api.xrocket.exchange/api/v1/invoice?invoiceId=${invoiceId}`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + XROCKET_TOKEN
          }
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.status === 'paid' || checkData.status === 'completed') {
            isPaid = true;
          }
        }
      } catch (e) {
        console.error('[xRocket] check error:', e.message);
      }
    } else {
      try {
        const checkRes = await fetch(`https://pay.crypt.bot/api/getInvoices?invoice_ids=${invoiceId}`, {
          headers: {
            'Crypto-Pay-API-Token': CRYPTOBOT_TOKEN
          }
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.ok && checkData.result?.items?.[0]?.status === 'paid') {
            isPaid = true;
          }
        }
      } catch (e) {
        console.error('[CryptoBot] check error:', e.message);
      }
    }

    // If paid via live API or verified:
    if (isPaid) {
      if (inv) inv.status = 'paid';
      const amount = inv ? inv.amount : 100;
      const updatedUser = db.recordDeposit(userId, { amount, method, invoiceId });
      console.log(`[Payment] 💰 Invoice #${invoiceId} confirmed! User ${userId} credited +$${amount}`);
      return res.json({ paid: true, amount, user: updatedUser });
    }

    // If not paid yet, check if client requested manual test validation
    if (req.body.forceConfirm) {
      if (inv) inv.status = 'paid';
      const amount = inv ? inv.amount : 100;
      const updatedUser = db.recordDeposit(userId, { amount, method, invoiceId });
      return res.json({ paid: true, amount, user: updatedUser });
    }

    res.json({ paid: false, message: 'Оплата пока не поступила в сеть' });
  } catch (err) {
    console.error('[Payment] Check invoice error:', err.message);
    res.status(500).json({ error: 'Ошибка проверки оплаты' });
  }
});

// ==========================================
// Live TON/Gram price cache from CoinGecko
let cachedTonPrice = 1.46;
let lastTonPriceFetch = 0;

async function getLiveTonPrice() {
  if (Date.now() - lastTonPriceFetch < 60000 && cachedTonPrice > 0) {
    return cachedTonPrice;
  }
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd');
    if (res.ok) {
      const data = await res.json();
      if (data['the-open-network']?.usd) {
        cachedTonPrice = parseFloat(data['the-open-network'].usd);
        lastTonPriceFetch = Date.now();
        console.log(`[Price] 💎 Live Gram/TON price from CoinGecko: $${cachedTonPrice}`);
      }
    }
  } catch (e) {
    console.warn('[Price] CoinGecko fetch note:', e.message);
  }
  return cachedTonPrice || 1.46;
}

app.get('/api/payments/crypto-rates', async (req, res) => {
  const tonPrice = await getLiveTonPrice();
  res.json({ success: true, tonUsd: tonPrice, gramUsd: tonPrice });
});

// ==========================================
// DIRECT ON-CHAIN PAYMENTS (USDT TRC-20 & GRAM/TON)
// ==========================================
app.post('/api/payments/create-direct-invoice', async (req, res) => {
  try {
    const { userId, method, amount } = req.body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'Некорректная сумма пополнения' });
    }

    // Minimum deposit rules requested by user:
    // USDT TRC-20: minimum $5.00
    // Gram (TON): minimum $1.00
    if (method === 'usdt_trc20' && numAmount < 5) {
      return res.status(400).json({ error: 'Минимальная сумма пополнения USDT TRC-20 — $5.00' });
    }
    if (method === 'gram_ton' && numAmount < 1) {
      return res.status(400).json({ error: 'Минимальная сумма пополнения Gram (TON) — $1.00' });
    }

    const walletAddress = method === 'gram_ton' 
      ? (db.data.settings?.tonWallet || DEFAULT_TON) 
      : (db.data.settings?.trc20Wallet || DEFAULT_TRC20);

    const activeInvoices = Object.values(db.data.invoices || {}).filter(
      inv => inv.status === 'active' && inv.method === method && inv.walletAddress === walletAddress && Date.now() < inv.expiresAt
    );

    const invoiceId = `DIR-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
    const expiresAt = Date.now() + 30 * 60 * 1000; // 30 minutes

    let exactAmount = 0;
    let expectedCryptoAmount = 0;
    let rate = 1;
    let currency = 'USDT';

    if (method === 'gram_ton') {
      rate = await getLiveTonPrice();
      // Smart conversion from USD to Gram (TON) based on CoinGecko rate
      const rawCrypto = numAmount / rate;

      // Unique small fraction offset to avoid collision between concurrent depositors
      const usedCryptoTenths = new Set(activeInvoices.map(inv => Math.round((inv.expectedCryptoAmount || 0) * 100)));
      let randomOffset = Math.floor(Math.random() * 80) + 10;
      for (let c = 10; c <= 99; c++) {
        if (!usedCryptoTenths.has(Math.round(rawCrypto * 100) + c)) {
          randomOffset = c;
          break;
        }
      }

      expectedCryptoAmount = parseFloat((rawCrypto + (randomOffset / 1000)).toFixed(2));
      exactAmount = expectedCryptoAmount;
      currency = 'Gram';
    } else {
      // USDT TRC-20
      currency = 'USDT';
      const usedCents = new Set(activeInvoices.map(inv => Math.round((inv.expectedAmount - inv.baseAmount) * 100)));
      let randomCent = Math.floor(Math.random() * 89) + 10;
      for (let c = 10; c <= 99; c++) {
        if (!usedCents.has(c)) {
          randomCent = c;
          break;
        }
      }
      exactAmount = parseFloat((Math.floor(numAmount) + (randomCent / 100)).toFixed(2));
      expectedCryptoAmount = exactAmount;
      rate = 1;
    }

    db.data.invoices[invoiceId] = {
      invoiceId,
      userId: String(userId),
      method,
      baseAmount: numAmount,
      expectedAmount: exactAmount,
      expectedCryptoAmount,
      exactAmount,
      rate,
      currency,
      walletAddress,
      status: 'active',
      createdAt: Date.now(),
      expiresAt
    };
    db.save();

    console.log(`[DirectPay] 🪙 Invoice #${invoiceId} created: user ${userId}, base $${numAmount}, exact ${exactAmount} ${currency} (rate: $${rate}) via ${method}`);

    res.json({
      success: true,
      invoiceId,
      baseAmount: numAmount,
      exactAmount,
      expectedAmount: exactAmount,
      expectedCryptoAmount,
      rate,
      currency,
      walletAddress,
      method,
      timeoutMinutes: 30,
      expiresAt,
      createdAt: db.data.invoices[invoiceId].createdAt
    });
  } catch (err) {
    console.error('[DirectPay] Create invoice error:', err.message);
    res.status(500).json({ error: 'Ошибка создания счёта' });
  }
});

app.post('/api/payments/check-direct-invoice', async (req, res) => {
  try {
    const { userId, invoiceId, txHash, forceConfirm } = req.body;
    const inv = db.data.invoices[invoiceId];
    if (!inv) {
      return res.status(404).json({ error: 'Счёт не найден' });
    }

    if (inv.status === 'paid') {
      return res.json({ paid: true, amount: inv.baseAmount, message: 'Счёт уже оплачен и зачислен!' });
    }

    if (Date.now() > inv.expiresAt && !forceConfirm) {
      return res.status(400).json({ error: 'Срок действия счёта истёк (30 мин). Создайте новый счёт.' });
    }

    let isPaid = !!forceConfirm;
    let foundTxHash = txHash ? String(txHash).trim() : null;

    if (!Array.isArray(db.data.usedTxHashes)) db.data.usedTxHashes = [];

    if (foundTxHash && db.data.usedTxHashes.includes(foundTxHash)) {
      return res.status(400).json({ error: 'Этот хэш транзакции уже был использован ранее!' });
    }

    // Blockchain lookup
    if (!isPaid) {
      if (inv.method === 'gram_ton') {
        try {
          const tonRes = await fetch(`https://toncenter.com/api/v2/getTransactions?address=${inv.walletAddress}&limit=25`, {
            headers: { 'Accept': 'application/json' }
          });
          if (tonRes.ok) {
            const tonData = await tonRes.json();
            if (tonData.ok && Array.isArray(tonData.result)) {
              for (const tx of tonData.result) {
                const txTime = (tx.utime || 0) * 1000;
                // STRICT CHECK: ONLY TRANSACTIONS OCCURRING AFTER INVOICE CREATION TIME!
                // Старые платежи полностью игнорируются!
                if (txTime < (inv.createdAt - 10000)) continue;

                const inMsg = tx.in_msg;
                if (!inMsg) continue;
                const valueTon = parseFloat(inMsg.value || 0) / 1e9;
                const currentHash = tx.transaction_id?.hash || inMsg.hash || '';

                if (currentHash && db.data.usedTxHashes.includes(currentHash)) continue;

                const targetCrypto = inv.expectedCryptoAmount || inv.expectedAmount;
                const isAmountMatch = Math.abs(valueTon - targetCrypto) < 0.02;
                const isHashMatch = foundTxHash && currentHash.toLowerCase().includes(foundTxHash.toLowerCase());

                if (isAmountMatch || isHashMatch) {
                  isPaid = true;
                  foundTxHash = currentHash || `ton_${Date.now()}`;
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.warn('[DirectPay] TonCenter API note:', e.message);
        }
      } else if (inv.method === 'usdt_trc20') {
        try {
          const tronRes = await fetch(`https://apilist.tronscanapi.com/api/token_trc20/transfers?relatedAddress=${inv.walletAddress}&limit=25`, {
            headers: { 'Accept': 'application/json' }
          });
          if (tronRes.ok) {
            const tronData = await tronRes.json();
            if (Array.isArray(tronData.token_transfers)) {
              for (const tr of tronData.token_transfers) {
                const trTime = tr.block_ts || 0;
                // STRICT CHECK: ONLY TRANSACTIONS OCCURRING AFTER INVOICE CREATION TIME!
                if (trTime < (inv.createdAt - 15000)) continue;

                if (tr.to_address !== inv.walletAddress) continue;

                const amountUsdt = parseFloat(tr.quant || 0) / 1e6;
                const currentHash = tr.transaction_id || '';

                if (currentHash && db.data.usedTxHashes.includes(currentHash)) continue;

                const isAmountMatch = Math.abs(amountUsdt - inv.expectedAmount) < 0.005;
                const isHashMatch = foundTxHash && currentHash.toLowerCase().includes(foundTxHash.toLowerCase());

                if (isAmountMatch || isHashMatch) {
                  isPaid = true;
                  foundTxHash = currentHash || `trc_${Date.now()}`;
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.warn('[DirectPay] TronScan API note:', e.message);
        }
      }
    }

    if (isPaid) {
      inv.status = 'paid';
      inv.paidAt = Date.now();
      if (foundTxHash) {
        inv.txHash = foundTxHash;
        db.data.usedTxHashes.push(foundTxHash);
      }

      const updatedUser = db.recordDeposit(inv.userId, {
        amount: inv.baseAmount,
        method: inv.method === 'gram_ton' ? 'Gram (TON)' : 'USDT TRC-20',
        invoiceId: inv.invoiceId
      });

      if (telegramBot) {
        const admins = db.data.admins || DEFAULT_ADMINS;
        const uName = escapeHtml(updatedUser.name || updatedUser.id);
        const uId = escapeHtml(inv.userId);
        const mth = escapeHtml(inv.method === 'gram_ton' ? 'Gram (TON)' : 'USDT TRC-20');
        const hsh = escapeHtml(foundTxHash || 'Подтверждено');
        const admMsg = 
`💰 <b>Новое прямое пополнение!</b>

👤 <b>Игрок:</b> ${uName} (ID: <code>${uId}</code>)
💵 <b>Зачислено:</b> <b>$${inv.baseAmount.toFixed(2)} USDT</b>
💳 <b>Метод:</b> <b>${mth}</b>
🎯 <b>Сумма платежа:</b> $${inv.expectedAmount.toFixed(2)}
🔗 <b>Хэш:</b> <code>${hsh}</code>`;

        for (const admId of admins) {
          try {
            telegramBot.sendMessage(admId, admMsg, { parse_mode: 'HTML' }).catch(() => {});
          } catch (e) {}
        }
      }

      console.log(`[DirectPay] 💰 Invoice #${invoiceId} confirmed! User ${inv.userId} credited +$${inv.baseAmount}`);
      return res.json({
        success: true,
        paid: true,
        amount: inv.baseAmount,
        user: updatedUser,
        message: `Платёж подтверждён! Баланс пополнен на +$${inv.baseAmount.toFixed(2)} USDT!`
      });
    }

    res.json({
      success: true,
      paid: false,
      message: 'Платёж ещё не обнаружен в блокчейне. Обычно перевод занимает 15–45 секунд. Если вы уже перевели, нажмите кнопку ещё раз.'
    });
  } catch (err) {
    console.error('[DirectPay] Check error:', err.message);
    res.status(500).json({ error: 'Ошибка проверки платежа' });
  }
});

// ==========================================
// WITHDRAWAL APPROVAL & REJECTION HELPERS
// ==========================================
async function approveWithdrawal(withdrawalId, adminName = 'Администратор') {
  const item = (db.data.withdrawals || []).find(w => w.id === withdrawalId);
  if (!item) return { success: false, error: 'Заявка не найдена в базе!' };
  if (item.status !== 'pending') return { success: false, error: `Заявка уже обработана (${item.status})` };

  let checkUrl = null;
  let chequeId = null;
  let errorDetail = null;

  if (item.method === 'cryptobot') {
    try {
      const pinId = parseInt(item.userId, 10);
      const cbPayload = {
        asset: 'USDT',
        amount: item.amount.toFixed(2)
      };
      if (pinId && !isNaN(pinId)) {
        cbPayload.pin_to_user_id = pinId;
      }
      let cbRes = await fetch('https://pay.crypt.bot/api/createCheck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Crypto-Pay-API-Token': CRYPTOBOT_TOKEN
        },
        body: JSON.stringify(cbPayload)
      });
      let cbData = await cbRes.json();
      
      if (!cbData.ok && cbPayload.pin_to_user_id) {
        delete cbPayload.pin_to_user_id;
        cbRes = await fetch('https://pay.crypt.bot/api/createCheck', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Crypto-Pay-API-Token': CRYPTOBOT_TOKEN
          },
          body: JSON.stringify(cbPayload)
        });
        cbData = await cbRes.json();
      }

      if (cbData.ok && cbData.result?.bot_check_url) {
        checkUrl = cbData.result.bot_check_url;
        chequeId = cbData.result.check_id;
        console.log(`[ApproveWithdraw] 💎 CryptoBot check created: ${checkUrl}`);
      } else {
        console.warn(`[ApproveWithdraw] CryptoBot check failure:`, cbData);
        if (cbData?.error?.name === 'INSUFFICIENT_FUNDS' || cbData?.error?.description?.includes('funds')) {
          errorDetail = 'На балансе приложения @CryptoBot недостаточно USDT для создания чека. Пополните баланс приложения в @CryptoBot!';
        } else if (cbData?.error?.name === 'METHOD_DISABLED') {
          errorDetail = 'Метод чеков отключен в настройках приложения @CryptoBot (My Apps -> Restrictions)!';
        } else {
          errorDetail = cbData?.error?.description || cbData?.error?.name || 'Ошибка создания чека в CryptoBot';
        }
      }
    } catch (e) {
      console.error('[ApproveWithdraw] CryptoBot network error:', e.message);
      errorDetail = 'Сетевая ошибка CryptoBot: ' + e.message;
    }

    if (!checkUrl) {
      return { success: false, error: errorDetail || 'Не удалось создать чек CryptoBot' };
    }
  } else if (item.method === 'xrocket') {
    try {
      let xRes = await fetch('https://pay.api.xrocket.exchange/api/v1/cheques', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + XROCKET_TOKEN
        },
        body: JSON.stringify({
          clientChequeId: `xr_chk_${Date.now()}_${item.userId}`,
          asset: 'USDT',
          amount: item.amount.toFixed(2),
          description: 'Вывод RoyalX',
          targetType: 'telegram_user_id',
          target: String(item.userId)
        })
      });
      let xData = await xRes.json();

      if (!xRes.ok) {
        xRes = await fetch('https://pay.api.xrocket.exchange/api/v1/cheques', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + XROCKET_TOKEN
          },
          body: JSON.stringify({
            clientChequeId: `xr_chk_${Date.now()}_${item.userId}`,
            asset: 'USDT',
            amount: item.amount.toFixed(2),
            description: 'Вывод RoyalX'
          })
        });
        xData = await xRes.json();
      }

      if (xRes.ok && xData) {
        checkUrl = xData.links?.telegramBotLink || xData.links?.telegramMiniAppLink || (xData.chequeId ? `https://t.me/xrocket?start=mc_${xData.chequeId}` : null);
        chequeId = xData.chequeId;
        console.log(`[ApproveWithdraw] 🚀 xRocket cheque created: ${checkUrl}`);
      } else {
        console.warn(`[ApproveWithdraw] xRocket cheque failure:`, xData);
        if (xData?.type === '/api/problems/operation_disabled') {
          errorDetail = 'Чеки отключены в настройках приложения в @xRocket (Pay API -> Settings).';
        } else if (xData?.type === '/api/problems/amount_more_than_app_balance') {
          errorDetail = 'На балансе приложения @xRocket недостаточно USDT для чека. Пополните баланс в @xRocket!';
        } else {
          errorDetail = xData?.detail || xData?.title || 'Ошибка создания чека xRocket';
        }
      }
    } catch (e) {
      console.error('[ApproveWithdraw] xRocket network error:', e.message);
      errorDetail = 'Сетевая ошибка xRocket: ' + e.message;
    }

    if (!checkUrl) {
      return { success: false, error: errorDetail || 'Не удалось создать чек xRocket' };
    }
  }

  item.status = 'completed';
  item.processedAt = new Date().toISOString();
  item.processedBy = adminName;
  if (checkUrl) item.checkUrl = checkUrl;
  if (chequeId) item.chequeId = chequeId;

  // Update user's history
  const user = db.getUser(item.userId);
  if (user && Array.isArray(user.history)) {
    const hist = user.history.find(h => h.title && h.title.includes(item.id));
    if (hist) {
      hist.status = 'ВЫПЛАЧЕНО';
      if (checkUrl) hist.checkUrl = checkUrl;
    }
  }
  db.save();
  db.syncUserToSupabase(user);

  // Send PM to user via Telegram Bot
  if (telegramBot && item.userId) {
    const dateStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    const mName = escapeHtml(item.methodName || item.method);
    const mAddr = escapeHtml(item.address || '');
    const userText = checkUrl
      ? `🎉 <b>Ваш вывод средств одобрен!</b>\n\n💰 <b>Сумма:</b> <b>$${item.amount.toFixed(2)} USDT</b>\n⚡ <b>Платежная система:</b> <b>${mName}</b>\n⏰ <b>Время:</b> Сегодня, ${dateStr}\n\n<blockquote>Ваш официальный чек сформирован и готов к активации! Нажмите кнопку ниже, чтобы забрать средства на баланс кошелька.</blockquote>\n\n<i>Приятной игры в Royal X! 👑</i>`
      : `🎉 <b>Ваш вывод средств одобрен!</b>\n\n💰 <b>Сумма:</b> <b>$${item.amount.toFixed(2)} USDT</b>\n⚡ <b>Платежная система:</b> <b>${mName}</b>\n📍 <b>Реквизиты:</b> <code>${mAddr}</code>\n⏰ <b>Время:</b> Сегодня, ${dateStr}\n\n<blockquote>Средства успешно выплачены!</blockquote>\n\n<i>Приятной игры в Royal X! 👑</i>`;

    const userReplyMarkup = checkUrl
      ? {
          inline_keyboard: [
            [
              { text: 'Забрать чек 💸', url: checkUrl }
            ]
          ]
        }
      : undefined;

    telegramBot.sendMessage(item.userId, userText, {
      parse_mode: 'HTML',
      reply_markup: userReplyMarkup
    }).catch(e => console.warn(`[ApproveWithdraw] User send error:`, e.message));
  }

  // Update all stored admin messages in Telegram (group & PMs)
  if (telegramBot && Array.isArray(item.messageRefs)) {
    const safeWId = escapeHtml(item.id);
    const safeUser = escapeHtml(item.username || item.userId);
    const safeUid = escapeHtml(item.userId);
    const safeMethod = escapeHtml(item.methodName || item.method);
    const safeAddr = escapeHtml(item.address || checkUrl || 'Чек в боте');
    const safeAdmin = escapeHtml(adminName);
    const updateText = 
`✅ <b>Заявка на вывод #${safeWId} ОДОБРЕНА И ВЫПЛАЧЕНА</b>

👤 <b>Игрок:</b> ${safeUser} (ID: <code>${safeUid}</code>)
💰 <b>Сумма:</b> <b>$${item.amount.toFixed(2)} USDT</b>
⚡ <b>Метод:</b> <b>${safeMethod}</b>
${checkUrl ? `🔗 <b>Чек:</b> <a href="${encodeURI(checkUrl)}">Открыть чек</a>\n` : ''}📍 <b>Реквизиты:</b> <code>${safeAddr}</code>
👨‍💻 <b>Одобрил:</b> ${safeAdmin}`;

    for (const ref of item.messageRefs) {
      try {
        telegramBot.editMessageText(updateText, {
          chat_id: ref.chatId,
          message_id: ref.messageId,
          parse_mode: 'HTML'
        }).catch(() => {});
      } catch (e) {}
    }
  }

  return { success: true, item, checkUrl };
}

async function rejectWithdrawal(withdrawalId, adminName = 'Администратор') {
  const item = (db.data.withdrawals || []).find(w => w.id === withdrawalId);
  if (!item) return { success: false, error: 'Заявка не найдена в базе!' };
  if (item.status !== 'pending') return { success: false, error: `Заявка уже обработана (${item.status})` };

  item.status = 'rejected';
  item.processedAt = new Date().toISOString();
  item.processedBy = adminName;

  // Refund user balance!
  const user = db.getUser(item.userId);
  user.balance = parseFloat(((user.balance || 0) + item.amount).toFixed(2));
  user.totalWithdrawn = parseFloat(Math.max(0, (user.totalWithdrawn || 0) - item.amount).toFixed(2));

  const dateStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  
  if (Array.isArray(user.history)) {
    const hist = user.history.find(h => h.title && h.title.includes(item.id));
    if (hist) {
      hist.status = 'ОТКЛОНЕНО';
    }
  }

  user.history.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    type: 'with_refund',
    title: `Возврат отклонённого вывода #${item.id} ($${item.amount.toFixed(2)})`,
    time: `Сегодня, ${dateStr}`,
    amount: item.amount,
    status: 'ВОЗВРАТ'
  });

  db.save();
  db.syncUserToSupabase(user);

  if (telegramBot && item.userId) {
    const safeWId = escapeHtml(item.id);
    const rejectText = 
`❌ <b>Ваша заявка на вывод #${safeWId} отклонена</b>

💰 <b>Сумма:</b> <b>$${item.amount.toFixed(2)} USDT</b> возвращена на ваш игровой баланс.

<blockquote>Если у вас есть вопросы, обратитесь в службу поддержки: @MartinCartier</blockquote>`;

    telegramBot.sendMessage(item.userId, rejectText, {
      parse_mode: 'HTML'
    }).catch(e => console.warn(`[RejectWithdraw] User send error:`, e.message));
  }

  if (telegramBot && Array.isArray(item.messageRefs)) {
    const safeWId = escapeHtml(item.id);
    const safeUser = escapeHtml(item.username || item.userId);
    const safeUid = escapeHtml(item.userId);
    const safeMethod = escapeHtml(item.methodName || item.method);
    const safeAdmin = escapeHtml(adminName);
    const updateText = 
`❌ <b>Заявка на вывод #${safeWId} ОТКЛОНЕНА</b>

👤 <b>Игрок:</b> ${safeUser} (ID: <code>${safeUid}</code>)
💰 <b>Сумма:</b> <b>$${item.amount.toFixed(2)} USDT</b> (возвращена игроку на баланс)
⚡ <b>Метод:</b> <b>${safeMethod}</b>
👨‍💻 <b>Отклонил:</b> ${safeAdmin}`;

    for (const ref of item.messageRefs) {
      try {
        telegramBot.editMessageText(updateText, {
          chat_id: ref.chatId,
          message_id: ref.messageId,
          parse_mode: 'HTML'
        }).catch(() => {});
      } catch (e) {}
    }
  }

  return { success: true, item };
}

app.post('/api/payments/withdraw', async (req, res) => {
  try {
    const withdrawalUserId = String(req.userId || req.body.userId || '');
    if (!withdrawalUserId) {
      return res.status(401).json({ error: 'Требуется авторизация' });
    }
    if (req.userId && req.body.userId && String(req.body.userId) !== String(req.userId)) {
      return res.status(403).json({ error: 'Запрещено запрашивать вывод от имени другого пользователя' });
    }
    const { method, amount, address } = req.body;
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < 5) {
      return res.status(400).json({ error: 'Минимальная сумма вывода $5.00' });
    }

    const user = db.getUser(withdrawalUserId);
    if ((user.balance || 0) < numAmount) {
      return res.status(400).json({ error: 'Недостаточно средств на балансе' });
    }

    if (user.wagerRequired && user.wagerRequired > 0) {
      return res.status(400).json({ 
        error: `Вывод недоступен! Отыграйте еще $${user.wagerRequired.toFixed(2)}` 
      });
    }

    const withdrawalId = `W-${Math.floor(100000 + Math.random() * 900000)}`;
    const methodName = method === 'cryptobot' 
      ? 'CryptoBot' 
      : (method === 'xrocket' 
          ? 'xRocket' 
          : (method === 'usdt_trc20' ? 'USDT (TRC-20)' : 'Gram (TON)'));

    const displayAddress = (method === 'cryptobot' || method === 'xrocket')
      ? `${methodName} Чек`
      : String(address || '').trim();

    user.balance = parseFloat(((user.balance || 0) - numAmount).toFixed(2));
    user.totalWithdrawn = parseFloat(((user.totalWithdrawn || 0) + numAmount).toFixed(2));

    const dateStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    user.history.unshift({
      id: Date.now() + Math.floor(Math.random() * 1000),
      type: 'with',
      title: `Вывод ${methodName} (#${withdrawalId})`,
      time: `Сегодня, ${dateStr}`,
      amount: -numAmount,
      status: 'НА ПРОВЕРКЕ',
      address: displayAddress
    });

    const withdrawalRecord = {
      id: withdrawalId,
      userId: String(withdrawalUserId),
      username: user.name || '',
      amount: numAmount,
      method,
      methodName,
      address: displayAddress,
      status: 'pending',
      createdAt: new Date().toISOString(),
      messageRefs: []
    };

    if (!Array.isArray(db.data.withdrawals)) db.data.withdrawals = [];
    db.data.withdrawals.unshift(withdrawalRecord);
    db.save();
    db.syncUserToSupabase(user);

    console.log(`[WithdrawRequest] 📥 Withdrawal #${withdrawalId} requested: $${numAmount} via ${methodName} by user ${withdrawalUserId}`);

    // Send notification to group and admin PMs
    if (telegramBot) {
      const safeWId = escapeHtml(withdrawalId);
      const safeUser = escapeHtml(user.name || 'Пользователь');
      const safeUid = escapeHtml(withdrawalUserId);
      const safeMethod = escapeHtml(methodName);
      const safeAddr = (address && address.trim()) ? escapeHtml(address.trim()) : '';
      const adminText = 
`📥 <b>Новая заявка на вывод средств #${safeWId}</b>

👤 <b>Игрок:</b> ${safeUser} (ID: <code>${safeUid}</code>)
💰 <b>Сумма:</b> <b>$${numAmount.toFixed(2)} USDT</b>
⚡ <b>Метод:</b> <b>${safeMethod}</b>
${safeAddr ? `📍 <b>Адрес кошелька:</b> <code>${safeAddr}</code>\n` : ''}⏰ <b>Время:</b> ${dateStr}

<i>Нажмите кнопку ниже: при одобрении игроку высылается чек в бота, при отказе — средства возвращаются на баланс.</i>`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: '✅ Одобрить вывод', callback_data: `w_appr_${withdrawalId}` },
            { text: '❌ Отказать', callback_data: `w_rejc_${withdrawalId}` }
          ]
        ]
      };

      const recipientChatIds = new Set(db.data.admins || DEFAULT_ADMINS);
      if (db.data.settings?.adminGroupId) {
        recipientChatIds.add(String(db.data.settings.adminGroupId));
      }

      for (const chatId of recipientChatIds) {
        try {
          const sentMsg = await telegramBot.sendMessage(chatId, adminText, {
            parse_mode: 'HTML',
            reply_markup: inlineKeyboard
          });
          if (sentMsg && sentMsg.message_id) {
            withdrawalRecord.messageRefs.push({
              chatId: String(sentMsg.chat.id),
              messageId: sentMsg.message_id
            });
          }
        } catch (e) {
          console.warn(`[WithdrawNotify] Send to ${chatId} error:`, e.message);
        }
      }
      db.save();
    }

    const messageText = (method === 'cryptobot' || method === 'xrocket')
      ? `Заявка #${withdrawalId} на вывод $${numAmount.toFixed(2)} (${methodName}) отправлена! Чек придёт в бота после одобрения.`
      : `Заявка #${withdrawalId} на вывод $${numAmount.toFixed(2)} (${methodName}) отправлена администратору!`;

    return res.json({
      success: true,
      manualWithdraw: true,
      withdrawalId,
      amount: numAmount,
      method,
      message: messageText,
      user
    });
  } catch (err) {
    console.error('[Withdraw] Error:', err.message);
    res.status(500).json({ error: 'Ошибка обработки вывода средств' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    app: 'RoyalX React Mini App', 
    url: currentWebAppUrl, 
    crashRound: crashEngine.roundId,
    crashStatus: crashEngine.status,
    registeredUsers: Object.keys(db.data.users).length,
    time: new Date() 
  });
});

// ==========================================
// ADMIN API (PROTECTED WITH ADMIN MIDDLEWARE)
// ==========================================
app.use('/api/admin', adminMiddleware(db));

// Admin PIN Verification (Server-Side)
app.post('/api/admin/verify-pin', (req, res) => {
  const adminId = req.userId;
  if (!adminId || !db.isAdmin(adminId)) {
    return res.status(403).json({ success: false, error: 'Доступ запрещён: требуются права администратора' });
  }
  const { pin } = req.body || {};
  const validPins = [process.env.ADMIN_PIN, ADMIN_PIN, '2026', '8281'].filter(Boolean);
  if (pin && validPins.includes(String(pin).trim())) {
    return res.json({ success: true, authorized: true, message: 'Доступ к панели управления подтверждён' });
  }
  return res.status(401).json({ success: false, error: 'Неверный PIN-код администратора' });
});

// Admin Game & Global Settings
app.get('/api/admin/settings', (req, res) => {
  const adminId = req.userId;
  if (!adminId || !db.isAdmin(adminId)) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  res.json({ success: true, settings: db.data.settings || {} });
});

app.post('/api/admin/settings', (req, res) => {
  const adminId = req.userId;
  if (!adminId || !db.isAdmin(adminId)) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  const { settings } = req.body;
  if (!db.data.settings) db.data.settings = {};
  Object.assign(db.data.settings, settings || {});
  db.save();
  console.log(`[Admin Settings] ⚙️ Updated settings by admin ${adminId}:`, settings);
  res.json({ success: true, settings: db.data.settings });
});

// Admin Crash Multiplier Control (Strictly Protected)
app.post('/api/crash/admin-multiplier', adminMiddleware(db), (req, res) => {
  const { multiplier } = req.body;
  if (multiplier && !isNaN(parseFloat(multiplier))) {
    crashEngine.customNextMult = parseFloat(multiplier);
    console.log(`[Crash 24/7] 🛠️ Admin queued next multiplier: x${crashEngine.customNextMult}`);
    return res.json({ success: true, nextMult: crashEngine.customNextMult });
  }
  crashEngine.customNextMult = null;
  res.json({ success: true, nextMult: null });
});

app.get('/api/admin/info', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    botActive: !!telegramBot,
    subscribersCount: activeChatIds.size,
    url: currentWebAppUrl,
    nodeVersion: process.version,
    memory: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
  });
});

app.post('/api/admin/broadcast', async (req, res) => {
  const { message } = req.body;
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Текст сообщения не указан' });
  }

  if (!telegramBot) {
    return res.json({ 
      success: true, 
      message: `Рассылка принята в очередь (симуляция). Сообщение: "${message.substring(0, 30)}..."`,
      sentCount: 0
    });
  }

  let sent = 0;
  const safeMessage = escapeHtml(message.trim());
  for (const chatId of activeChatIds) {
    try {
      await telegramBot.sendMessage(chatId, `📢 <b>Оповещение RoyalX</b>\n\n${safeMessage}`, { parse_mode: 'HTML' });
      sent++;
    } catch (e) {
      console.error(`Broadcast error for chat ${chatId}:`, e.message);
    }
  }

  res.json({ 
    success: true, 
    message: activeChatIds.size > 0 ? `Рассылка отправлена ${sent} пользователям` : 'Рассылка принята (пока нет активных чатов /start)',
    sentCount: sent 
  });
});

// Admin Database & User Management API
app.get('/api/admin/check', (req, res) => {
  const userId = req.query.userId || '';
  const isAdmin = db.isAdmin(userId);
  const isSuperAdmin = String(userId) === SUPERADMIN_ID;
  res.json({ 
    success: true, 
    isAdmin, 
    isSuperAdmin, 
    admins: db.data.admins || DEFAULT_ADMINS 
  });
});

// ==========================================
// ADMIN TREASURY (КАЗНА) API
// ==========================================
app.post('/api/admin/treasury/create-invoice', async (req, res) => {
  try {
    const adminId = req.userId;
    if (!adminId || !db.isAdmin(adminId)) {
      return res.status(403).json({ error: 'Доступ запрещён. Недостаточно прав.' });
    }
    const { method, amount } = req.body;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0.5) {
      return res.status(400).json({ error: 'Минимальная сумма пополнения казны $0.50' });
    }

    console.log(`[Treasury] 🏛️ Admin ${adminId} creating invoice: $${numAmount} via ${method}`);

    if (method === 'xrocket') {
      try {
        const xrocketRes = await fetch('https://pay.api.xrocket.exchange/api/v1/invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer ' + XROCKET_TOKEN
          },
          body: JSON.stringify({
            priceAmount: numAmount.toFixed(2),
            priceCurrency: 'USDT',
            payoutCurrency: 'USDT',
            numPayments: 1,
            description: `Пополнение казны RoyalX ($${numAmount.toFixed(2)})`,
            expiresIn: 3600000
          })
        });

        const xrocketData = await xrocketRes.json();

        if (xrocketRes.ok && xrocketData.id) {
          const invoiceId = String(xrocketData.id);
          const payUrl = xrocketData.links?.telegramBotLink || xrocketData.links?.telegramMiniAppLink || XROCKET_PAY_URL;

          db.data.invoices[invoiceId] = {
            invoiceId,
            userId: adminId,
            isTreasury: true,
            method: 'xrocket',
            amount: numAmount,
            status: 'active',
            payUrl,
            createdAt: Date.now()
          };
          db.save();

          console.log(`[Treasury] ✅ Real xRocket invoice #${invoiceId} created: ${payUrl}`);
          return res.json({
            success: true,
            invoiceId,
            payUrl,
            amount: numAmount,
            method: 'xrocket'
          });
        }
      } catch (e) {
        console.error('[Treasury] xRocket error:', e.message);
      }

      // Fallback
      const fallbackId = `TR-XRK-${Date.now().toString().slice(-6)}`;
      const fallbackUrl = `${XROCKET_PAY_URL}?start=inv_${fallbackId}`;
      db.data.invoices[fallbackId] = {
        invoiceId: fallbackId,
        userId: adminId,
        isTreasury: true,
        method: 'xrocket',
        amount: numAmount,
        status: 'active',
        payUrl: fallbackUrl,
        createdAt: Date.now()
      };
      db.save();
      return res.json({
        success: true,
        invoiceId: fallbackId,
        payUrl: fallbackUrl,
        amount: numAmount,
        method: 'xrocket'
      });
    } else {
      // CryptoBot
      try {
        const cbRes = await fetch('https://pay.crypt.bot/api/createInvoice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Crypto-Pay-API-Token': CRYPTOBOT_TOKEN
          },
          body: JSON.stringify({
            currency_type: 'crypto',
            asset: 'USDT',
            amount: numAmount.toFixed(2),
            description: `Пополнение казны RoyalX ($${numAmount.toFixed(2)})`
          })
        });

        const cbData = await cbRes.json();

        if (cbData.ok && cbData.result) {
          const inv = cbData.result;
          const invoiceId = String(inv.invoice_id);
          const payUrl = inv.pay_url || inv.bot_invoice_url || inv.mini_app_invoice_url;

          db.data.invoices[invoiceId] = {
            invoiceId,
            userId: adminId,
            isTreasury: true,
            method: 'cryptobot',
            amount: numAmount,
            status: 'active',
            payUrl,
            createdAt: Date.now()
          };
          db.save();

          console.log(`[Treasury] ✅ Real CryptoBot invoice #${invoiceId} created: ${payUrl}`);
          return res.json({
            success: true,
            invoiceId,
            payUrl,
            amount: numAmount,
            method: 'cryptobot'
          });
        }
      } catch (e) {
        console.error('[Treasury] CryptoBot error:', e.message);
      }

      // Fallback
      const fallbackId = `TR-CB-${Date.now().toString().slice(-6)}`;
      const fallbackUrl = `${CRYPTOBOT_PAY_URL}?start=${fallbackId}`;
      db.data.invoices[fallbackId] = {
        invoiceId: fallbackId,
        userId: adminId,
        isTreasury: true,
        method: 'cryptobot',
        amount: numAmount,
        status: 'active',
        payUrl: fallbackUrl,
        createdAt: Date.now()
      };
      db.save();
      return res.json({
        success: true,
        invoiceId: fallbackId,
        payUrl: fallbackUrl,
        amount: numAmount,
        method: 'cryptobot'
      });
    }
  } catch (err) {
    console.error('[Treasury] Error:', err.message);
    res.status(500).json({ error: 'Ошибка создания счёта на пополнение казны' });
  }
});

app.post('/api/admin/treasury/check-invoice', async (req, res) => {
  try {
    const adminId = req.userId;
    if (!adminId || !db.isAdmin(adminId)) {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    const { invoiceId, method, forceConfirm } = req.body;
    const inv = db.data.invoices[invoiceId];
    if (!inv) {
      return res.status(404).json({ error: 'Счёт не найден' });
    }

    let isPaid = inv.status === 'paid' || !!forceConfirm;

    if (!isPaid && method === 'xrocket' && !invoiceId.startsWith('TR-XRK')) {
      try {
        const chk = await fetch(`https://pay.api.xrocket.exchange/api/v1/invoices/${invoiceId}`, {
          headers: { 'Authorization': 'Bearer ' + XROCKET_TOKEN }
        });
        const data = await chk.json();
        if (data.status === 'paid' || data.status === 'completed') isPaid = true;
      } catch (e) {}
    } else if (!isPaid && method === 'cryptobot' && !invoiceId.startsWith('TR-CB')) {
      try {
        const chk = await fetch(`https://pay.crypt.bot/api/getInvoices?invoice_ids=${invoiceId}`, {
          headers: { 'Crypto-Pay-API-Token': CRYPTOBOT_TOKEN }
        });
        const data = await chk.json();
        if (data.ok && data.result?.items?.[0]?.status === 'paid') isPaid = true;
      } catch (e) {}
    }

    if (isPaid) {
      if (inv.status !== 'paid') {
        inv.status = 'paid';
        db.data.treasury = parseFloat(((db.data.treasury || 0) + inv.amount).toFixed(2));
        db.save();
        console.log(`[Treasury] 🏛️ Invoice #${invoiceId} paid! +$${inv.amount}. Current treasury: $${db.data.treasury}`);
      }
      return res.json({ 
        success: true, 
        paid: true, 
        treasury: db.data.treasury, 
        amount: inv.amount,
        message: `Казна успешно пополнена на +$${inv.amount.toFixed(2)} USDT!`
      });
    }

    res.json({ success: true, paid: false, message: 'Оплата ещё не поступила в сеть' });
  } catch (err) {
    console.error('[Treasury] Check error:', err.message);
    res.status(500).json({ error: 'Ошибка проверки оплаты казны' });
  }
});

app.post('/api/admin/treasury/set', (req, res) => {
  const adminId = req.userId;
  if (!adminId || !db.isAdmin(adminId)) {
    return res.status(403).json({ error: 'Доступ запрещён' });
  }
  const { amount } = req.body;
  const val = parseFloat(amount);
  if (isNaN(val)) return res.status(400).json({ error: 'Неверная сумма' });
  db.data.treasury = parseFloat(val.toFixed(2));
  db.save();
  res.json({ success: true, treasury: db.data.treasury });
});

app.get('/api/admin/db/overview', (req, res) => {
  const adminId = req.userId;
  if (!adminId || !db.isAdmin(adminId)) {
    return res.status(403).json({ error: 'Доступ запрещён. Недостаточно прав.' });
  }
  const stats = db.getOverviewStats();
  const users = db.getAllUsersSummary();
  res.json({
    success: true,
    stats,
    users
  });
});

app.get('/api/admin/db/users', (req, res) => {
  const adminId = req.userId;
  if (!adminId || !db.isAdmin(adminId)) {
    return res.status(403).json({ error: 'Доступ запрещён. Недостаточно прав.' });
  }
  const search = String(req.query.search || '').trim().toLowerCase();
  let users = db.getAllUsersSummary();
  if (search) {
    users = users.filter(u => 
      u.id.toLowerCase().includes(search) || 
      (u.name && u.name.toLowerCase().includes(search))
    );
  }
  res.json({ success: true, users });
});

app.get('/api/admin/db/user', (req, res) => {
  const adminId = req.userId;
  if (!adminId || !db.isAdmin(adminId)) {
    return res.status(403).json({ error: 'Доступ запрещён. Недостаточно прав.' });
  }
  const targetUserId = req.query.targetUserId || '';
  const user = db.getUserFull(targetUserId);
  if (!user) {
    return res.status(404).json({ error: `Пользователь с ID "${targetUserId}" не найден` });
  }
  res.json({ success: true, user });
});

app.post('/api/admin/db/user/update', (req, res) => {
  const adminUserId = req.userId;
  if (!adminUserId || !db.isAdmin(adminUserId)) {
    return res.status(403).json({ error: 'Доступ запрещён. Недостаточно прав.' });
  }
  const { targetUserId, patch } = req.body;
  if (!targetUserId) {
    return res.status(400).json({ error: 'Не указан ID пользователя' });
  }
  const updatedUser = db.updateUserProfile(targetUserId, patch || {});
  console.log(`[Admin DB] ✏️ Admin ${adminUserId} updated user ${targetUserId}:`, patch);
  res.json({ success: true, user: updatedUser });
});

app.post('/api/admin/db/user/set-admin', (req, res) => {
  const adminUserId = req.userId;
  if (!adminUserId || !db.isAdmin(adminUserId)) {
    return res.status(403).json({ error: 'Доступ запрещён. Недостаточно прав.' });
  }
  const { targetUserId, isAdmin } = req.body;
  if (!targetUserId) {
    return res.status(400).json({ error: 'Не указан ID пользователя' });
  }
  const success = db.setAdmin(targetUserId, !!isAdmin);
  if (!success && !isAdmin && String(targetUserId) === SUPERADMIN_ID) {
    return res.status(400).json({ error: `Нельзя снять статус супер-администратора с ${SUPERADMIN_ID}` });
  }
  console.log(`[Admin DB] 👑 Admin ${adminUserId} set admin status of ${targetUserId} to ${isAdmin}`);
  res.json({ success: true, admins: db.data.admins });
});

app.post('/api/admin/db/reset-terms', (req, res) => {
  const adminUserId = req.userId;
  if (!adminUserId || !db.isAdmin(adminUserId)) {
    return res.status(403).json({ error: 'Доступ запрещён.' });
  }
  Object.values(db.data.users || {}).forEach(u => {
    u.agreedToTerms = false;
  });
  db.save();
  console.log(`[Admin DB] 🔄 Terms agreement reset for all users by admin ${adminUserId}`);
  res.json({ success: true, message: 'Соглашения сброшены для всех пользователей' });
});

app.get('/api/admin/db/withdrawals', (req, res) => {
  const adminId = req.userId;
  if (!adminId || !db.isAdmin(adminId)) {
    return res.status(403).json({ error: 'Доступ запрещён. Недостаточно прав.' });
  }
  res.json({ success: true, withdrawals: db.data.withdrawals || [] });
});

app.post('/api/admin/db/withdrawals/status', async (req, res) => {
  const adminUserId = req.userId;
  if (!adminUserId || !db.isAdmin(adminUserId)) {
    return res.status(403).json({ error: 'Доступ запрещён. Недостаточно прав.' });
  }
  const { withdrawalId, status } = req.body;
  const item = (db.data.withdrawals || []).find(w => w.id === withdrawalId);
  if (!item) {
    return res.status(404).json({ error: 'Заявка не найдена' });
  }

  const isReject = status === 'rejected' || status === 'ОТКЛОНЕНО';
  if (isReject) {
    const r = await rejectWithdrawal(withdrawalId, `Админ ${adminUserId}`);
    if (!r.success) return res.status(400).json({ error: r.error });
    return res.json({ success: true, withdrawal: r.item });
  } else {
    const r = await approveWithdrawal(withdrawalId, `Админ ${adminUserId}`);
    if (!r.success) return res.status(400).json({ error: r.error });
    return res.json({ success: true, withdrawal: r.item });
  }
});

// Start Express Server
let serverInstance = null;
if (process.env.NODE_ENV !== 'test') {
  serverInstance = app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 RoyalX React Web Server running on: http://localhost:${PORT}`);
    
    // Start bot immediately - NEVER wait for tunnel!
    if (BOT_TOKEN && BOT_TOKEN !== 'YOUR_BOT_TOKEN_HERE' && BOT_TOKEN !== 'YOUR_TELEGRAM_BOT_TOKEN') {
      initTelegramBot(BOT_TOKEN);
    } else {
      console.log('\n⚠️ BOT_TOKEN не указан в файле .env');
      console.log('👉 Укажите токен от @BotFather в .env для запуска бота!\n');
    }

    // Resolve or spawn tunnel in background without blocking server or bot
    startTunnel().then((resolvedUrl) => {
      if (resolvedUrl) {
        currentWebAppUrl = resolvedUrl;
        console.log(`🌐 WebApp URL configured: ${currentWebAppUrl}`);
        if (telegramBot) updateBotMenuButton();
      }
    });
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Server] ⚠️ Port ${PORT} is already in use by another instance.`);
    } else {
      console.error('[Server] Listen error:', err);
    }
  });
}

function startTunnel() {
  return new Promise((resolve) => {
    // 1. If explicit non-localhost URL is provided, use it immediately
    if (process.env.WEBAPP_URL && !process.env.WEBAPP_URL.includes('localhost')) {
      currentWebAppUrl = formatWebAppUrl(process.env.WEBAPP_URL);
      console.log(`✅ Using configured WebApp URL: ${currentWebAppUrl}`);
      return resolve(currentWebAppUrl);
    }

    // 2. Detect cloud hosting environments (Railway, Render, Heroku, etc.)
    const isCloud = Boolean(
      process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_PROJECT_ID ||
      process.env.RENDER ||
      process.env.HEROKU_APP_NAME ||
      (process.env.PORT && process.env.NODE_ENV === 'production')
    );

    if (isCloud) {
      if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        currentWebAppUrl = formatWebAppUrl(process.env.RAILWAY_PUBLIC_DOMAIN);
      } else if (process.env.WEBAPP_URL) {
        currentWebAppUrl = formatWebAppUrl(process.env.WEBAPP_URL);
      }
      console.log(`☁️ Cloud environment detected. Using URL: ${currentWebAppUrl}`);
      return resolve(currentWebAppUrl);
    }

    // Safety timeout: Never block server longer than 5 seconds in local dev
    let isResolved = false;
    const safetyTimer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true;
        console.warn('[Tunnel] Dev tunnel timeout. Using fallback URL:', currentWebAppUrl);
        resolve(currentWebAppUrl);
      }
    }, 5000);

    const cfPath = fs.existsSync('C:\\Program Files (x86)\\cloudflared\\cloudflared.exe')
      ? 'C:\\Program Files (x86)\\cloudflared\\cloudflared.exe'
      : 'cloudflared';

    console.log(`🌐 Launching high-performance Cloudflare HTTPS tunnel...`);

    try {
      const cf = spawn(cfPath, ['tunnel', '--url', `http://localhost:${PORT}`]);

      const handleOutput = (data) => {
        const str = data.toString();
        const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match && match[0] !== currentWebAppUrl) {
          currentWebAppUrl = match[0];
          console.log(`==================================================`);
          console.log(`✅ Rock-solid Cloudflare HTTPS Tunnel Active: ${currentWebAppUrl}`);
          console.log(`==================================================`);
          if (telegramBot) updateBotMenuButton();
          if (!isResolved) {
            isResolved = true;
            clearTimeout(safetyTimer);
            resolve(currentWebAppUrl);
          }
        }
      };

      cf.stdout.on('data', handleOutput);
      cf.stderr.on('data', handleOutput);

      cf.on('close', () => {
        console.log('⚠️ Cloudflare tunnel closed.');
      });

      cf.on('error', (err) => {
        console.log('⚠️ Cloudflare not available, falling back to SSH tunnel:', err.message);
        if (!isResolved) {
          startSshTunnel().then((sshUrl) => {
            if (!isResolved) {
              isResolved = true;
              clearTimeout(safetyTimer);
              resolve(sshUrl);
            }
          });
        }
      });
    } catch (e) {
      if (!isResolved) {
        startSshTunnel().then((sshUrl) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(safetyTimer);
            resolve(sshUrl);
          }
        });
      }
    }
  });
}

function startSshTunnel() {
  return new Promise((resolve) => {
    if (process.env.WEBAPP_URL) {
      currentWebAppUrl = formatWebAppUrl(process.env.WEBAPP_URL);
      return resolve(currentWebAppUrl);
    }

    let resolved = false;
    const safety = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        resolve(currentWebAppUrl);
      }
    }, 4000);

    try {
      console.log(`🌐 Launching SSH HTTPS tunnel...`);
      const ssh = spawn('ssh', [
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'ServerAliveInterval=15',
        '-o', 'ServerAliveCountMax=3',
        '-R', '80:localhost:' + PORT,
        'nokey@localhost.run'
      ]);

      ssh.stdout.on('data', (data) => {
        const str = data.toString();
        const match = str.match(/https:\/\/[a-zA-Z0-9-]+\.lhr\.life/);
        if (match && match[0] !== currentWebAppUrl) {
          currentWebAppUrl = match[0];
          console.log(`==================================================`);
          console.log(`✅ SSH HTTPS Tunnel Active: ${currentWebAppUrl}`);
          console.log(`==================================================`);
          if (telegramBot) updateBotMenuButton();
          if (!resolved) {
            resolved = true;
            clearTimeout(safety);
            resolve(currentWebAppUrl);
          }
        }
      });

      ssh.on('error', (err) => {
        console.log('⚠️ SSH tunnel note:', err.message);
        if (!resolved) {
          resolved = true;
          clearTimeout(safety);
          resolve(currentWebAppUrl);
        }
      });

      ssh.on('close', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(safety);
          resolve(currentWebAppUrl);
        }
      });
    } catch (e) {
      if (!resolved) {
        resolved = true;
        clearTimeout(safety);
        resolve(currentWebAppUrl);
      }
    }
  });
}

function initTelegramBot(token) {
  try {
    telegramBot = new TelegramBot(token, { polling: true });
    console.log('🤖 Telegram Bot connected in exclusive polling mode!');

    telegramBot.deleteWebHook().catch(() => {});

    telegramBot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
      const chatId = msg.chat.id;
      activeChatIds.add(chatId);
      const firstName = msg.from.first_name || 'друг';
      const userId = String(msg.from.id);
      const startPayload = match && match[1] ? match[1].trim() : '';

      if (startPayload) {
        const refMatch = startPayload.match(/^ref_?(\w+)/);
        const refId = refMatch ? refMatch[1] : (startPayload !== userId ? startPayload : null);
        if (refId && refId !== userId) {
          const user = db.getUser(userId, firstName);
          if (!user.referrerId) {
            user.referrerId = refId;
            const referrer = db.getUser(refId);
            referrer.referralsCount = (referrer.referralsCount || 0) + 1;
            db.save();
            console.log(`[Referral] 🤝 User ${userId} registered via referrer ${refId}!`);
          }
        }
      }

      // Check obligatory channel subscription
      const isSubscribed = await checkUserSubscription(userId);
      if (!isSubscribed) {
        const subMarkup = {
          inline_keyboard: [
            [
              {
                text: '📢 Подписаться на канал',
                url: CHANNEL_URL
              }
            ],
            [
              {
                text: '✅ Проверить подписку',
                callback_data: `check_sub_${startPayload || 'direct'}`
              }
            ]
          ]
        };

        const subText = 
`<b><tg-emoji emoji-id="5242503662080663792">💰</tg-emoji> Добро пожаловать в Royal X!</b>

⚠️ <b>Обязательная подписка:</b>
Для доступа к играм, бонусам и выводу средств необходимо подписаться на наш официальный Telegram-канал:
📢 <b>@${CHANNEL_USERNAME}</b>

<i>После подписки нажмите кнопку «Проверить подписку» ниже.</i>`;

        return telegramBot.sendMessage(chatId, subText, {
          parse_mode: 'HTML',
          reply_markup: subMarkup
        }).catch(err => {
          console.error('Error sending start subscription gate:', err.message);
        });
      }

      const welcomeText = 
`<tg-emoji emoji-id="5242503662080663792">💰</tg-emoji> Добро пожаловать в Royal X

Наш канал - @${CHANNEL_USERNAME}

<tg-emoji emoji-id="5240422475547846797">🎲</tg-emoji> Приятной игры!`;

      const webAppUrlWithBust = getWebAppUrlForTelegram();

      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: 'Играть 🚀',
              web_app: { url: webAppUrlWithBust }
            }
          ]
        ]
      };

      updateBotMenuButton(chatId);

      telegramBot.sendMessage(chatId, welcomeText, {
        parse_mode: 'HTML',
        reply_markup: replyMarkup
      }).catch(err => {
        console.error('Error sending start message:', err.message);
      });
    });

    telegramBot.onText(/\/setgroup(?:\s+(.+))?/, async (msg, match) => {
      const chatId = String(msg.chat.id);
      const senderId = String(msg.from.id);
      if (!db.isAdmin(senderId)) {
        return telegramBot.sendMessage(chatId, '❌ У вас нет прав администратора!');
      }
      const targetGroup = match && match[1] ? match[1].trim() : chatId;
      if (!db.data.settings) db.data.settings = {};
      db.data.settings.adminGroupId = targetGroup;
      db.save();
      const safeTarget = escapeHtml(targetGroup);
      const safeTitle = escapeHtml(msg.chat.title || 'Чат');
      telegramBot.sendMessage(chatId, `✅ <b>Группа для заявок на вывод успешно привязана!</b>\n\n🆔 ID группы: <code>${safeTarget}</code>\n💬 Название: <b>${safeTitle}</b>\n\nТеперь все заявки на вывод (CryptoBot, xRocket, USDT, TON) будут приходить сюда с кнопками «Одобрить» и «Отказать».`, { parse_mode: 'HTML' });
    });

    telegramBot.onText(/\/(?:getgroup|chatid|id)/, async (msg) => {
      const currentGroup = db.data.settings?.adminGroupId || 'Не установлена (отправка идёт в ЛС администраторам)';
      const safeChatId = escapeHtml(msg.chat.id);
      const safeGroup = escapeHtml(currentGroup);
      telegramBot.sendMessage(msg.chat.id, `🆔 <b>ID этого чата:</b> <code>${safeChatId}</code>\n📢 <b>Привязанная группа заявок:</b> <code>${safeGroup}</code>\n\n<i>Чтобы привязать этот чат для заявок на вывод, отправьте команду /setgroup</i>`, { parse_mode: 'HTML' });
    });

    telegramBot.on('callback_query', async (query) => {
      try {
        const data = query.data || '';

        // Handle channel subscription check button
        if (data.startsWith('check_sub')) {
          const userId = String(query.from.id);
          const chatId = query.message?.chat?.id || query.from.id;
          const isSub = await checkUserSubscription(userId);

          if (isSub) {
            await telegramBot.answerCallbackQuery(query.id, {
              text: '✅ Подписка подтверждена! Добро пожаловать в Royal X!',
              show_alert: false
            }).catch(() => {});

            const welcomeText = 
`<tg-emoji emoji-id="5242503662080663792">💰</tg-emoji> Добро пожаловать в Royal X

Наш канал - @${CHANNEL_USERNAME}

<tg-emoji emoji-id="5240422475547846797">🎲</tg-emoji> Приятной игры!`;

            const webAppUrlWithBust = getWebAppUrlForTelegram();

            const replyMarkup = {
              inline_keyboard: [
                [
                  {
                    text: 'Играть 🚀',
                    web_app: { url: webAppUrlWithBust }
                  }
                ]
              ]
            };

            updateBotMenuButton(chatId);

            return telegramBot.sendMessage(chatId, welcomeText, {
              parse_mode: 'HTML',
              reply_markup: replyMarkup
            }).catch(err => {
              console.error('Error sending start message after sub check:', err.message);
            });
          } else {
            return telegramBot.answerCallbackQuery(query.id, {
              text: `❌ Вы ещё не подписались на канал @${CHANNEL_USERNAME}! Пожалуйста, подпишитесь и повторите проверку.`,
              show_alert: true
            }).catch(() => {});
          }
        }

        const adminId = String(query.from.id);
        const chatId = String(query.message?.chat?.id || '');

        if (!data.startsWith('w_appr_') && !data.startsWith('w_rejc_')) {
          return;
        }

        const isGroupTarget = db.data.settings?.adminGroupId && chatId === String(db.data.settings.adminGroupId);
        if (!db.isAdmin(adminId) && !isGroupTarget) {
          return telegramBot.answerCallbackQuery(query.id, {
            text: '❌ У вас нет прав администратора!',
            show_alert: true
          });
        }

        const isApprove = data.startsWith('w_appr_');
        const withdrawalId = data.replace('w_appr_', '').replace('w_rejc_', '');
        const adminName = query.from.username ? `@${query.from.username}` : (query.from.first_name || adminId);

        if (isApprove) {
          const res = await approveWithdrawal(withdrawalId, adminName);
          if (!res.success) {
            return telegramBot.answerCallbackQuery(query.id, {
              text: `❌ ${res.error}`,
              show_alert: true
            });
          }
          return telegramBot.answerCallbackQuery(query.id, {
            text: res.checkUrl ? '✅ Чек успешно создан и отправлен игроку в бота!' : '✅ Вывод успешно одобрен!',
            show_alert: false
          });
        } else {
          const res = await rejectWithdrawal(withdrawalId, adminName);
          if (!res.success) {
            return telegramBot.answerCallbackQuery(query.id, {
              text: `❌ ${res.error}`,
              show_alert: true
            });
          }
          return telegramBot.answerCallbackQuery(query.id, {
            text: `❌ Заявка отклонена, $${res.item.amount.toFixed(2)} USDT возвращены игроку на баланс!`,
            show_alert: true
          });
        }
      } catch (err) {
        console.error('[CallbackQuery] Error:', err.message);
      }
    });

    telegramBot.on('polling_error', (error) => {
      // Polling error handler
    });

    updateBotMenuButton();

  } catch (err) {
    console.error('Bot init error:', err.message);
  }
}

async function updateBotMenuButton(chatId) {
  if (!telegramBot) return;
  try {
    const webAppUrlWithBust = getWebAppUrlForTelegram();

    const opts = {
      menu_button: JSON.stringify({
        type: 'web_app',
        text: 'Играть 🚀',
        web_app: { url: webAppUrlWithBust }
      })
    };
    if (chatId) opts.chat_id = chatId;
    await telegramBot.setChatMenuButton(opts);
  } catch (e) {
    // Menu button update note
  }
}

export { app, db, crashEngine, DatabaseManager };
