import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getSupabaseClient, isSupabaseConfigured, toSnakeCase } from '../supabaseClient.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function migrate() {
  console.log('==================================================');
  console.log('🔄 STARTING DATA MIGRATION TO SUPABASE');
  console.log('==================================================');

  if (!isSupabaseConfigured()) {
    console.error('❌ Error: SUPABASE_URL or SUPABASE_KEY is missing in .env!');
    console.log('Please add SUPABASE_URL and SUPABASE_KEY to your .env file first.');
    process.exit(1);
  }

  const supabase = await getSupabaseClient();
  if (!supabase) {
    console.error('❌ Could not initialize Supabase client.');
    process.exit(1);
  }

  const dbPath = path.join(rootDir, 'server_db.json');
  if (!fs.existsSync(dbPath)) {
    console.error('❌ server_db.json not found at:', dbPath);
    process.exit(1);
  }

  const raw = fs.readFileSync(dbPath, 'utf8');
  const dbData = JSON.parse(raw);

  // 1. Migrate Users
  const users = Object.values(dbData.users || {});
  console.log(`📦 Found ${users.length} users to migrate...`);
  for (const u of users) {
    const userRow = toSnakeCase({
      id: String(u.id),
      name: u.name || 'Пользователь',
      username: u.username || null,
      balance: parseFloat(u.balance || 0),
      totalTurnover: parseFloat(u.totalTurnover || 0),
      totalDeposited: parseFloat(u.totalDeposited || 0),
      totalWithdrawn: parseFloat(u.totalWithdrawn || 0),
      gamesPlayed: parseInt(u.gamesPlayed || 0, 10),
      gamesWon: parseInt(u.gamesWon || 0, 10),
      referralsCount: parseInt(u.referralsCount || 0, 10),
      referralEarned: parseFloat(u.referralEarned || 0),
      referrerId: u.referrerId ? String(u.referrerId) : null,
      agreedToTerms: Boolean(u.agreedToTerms),
      rtp: u.rtp || 'auto',
      isBanned: Boolean(u.isBanned),
      cashback: parseFloat(u.cashback || 0),
      wagerRequired: parseFloat(u.wagerRequired || 0),
      depositBonusPercent: parseFloat(u.depositBonusPercent || 0),
      usedPromos: Array.isArray(u.usedPromos) ? u.usedPromos : [],
      history: Array.isArray(u.history) ? u.history : []
    });

    const { error } = await supabase.from('users').upsert(userRow, 'id');
    if (error) {
      console.warn(`⚠️ Warning inserting user ${u.id}:`, error.message || error);
    } else {
      console.log(`  ✅ User ${u.id} (${u.name}) synced.`);
    }
  }

  // 2. Migrate Promocodes
  const promocodes = Object.values(dbData.promocodes || {});
  console.log(`🎟️ Found ${promocodes.length} promocodes to migrate...`);
  for (const p of promocodes) {
    const promoRow = toSnakeCase({
      id: String(p.id || p.code),
      code: String(p.code).toUpperCase(),
      type: p.type || 'balance',
      amount: parseFloat(p.amount || 0),
      percent: parseFloat(p.percent || 0),
      usesLeft: parseInt(p.usesLeft || 0, 10),
      maxUses: parseInt(p.maxUses || 0, 10),
      active: p.active !== false
    });
    const { error } = await supabase.from('promocodes').upsert(promoRow, 'code');
    if (error) {
      console.warn(`⚠️ Warning inserting promo ${p.code}:`, error.message || error);
    } else {
      console.log(`  ✅ Promocode ${p.code} synced.`);
    }
  }

  // 3. Migrate Invoices
  const invoices = Object.values(dbData.invoices || {});
  console.log(`🧾 Found ${invoices.length} invoices to migrate...`);
  for (const inv of invoices) {
    const invRow = toSnakeCase({
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
    const { error } = await supabase.from('invoices').upsert(invRow, 'invoice_id');
    if (error) {
      console.warn(`⚠️ Warning inserting invoice ${inv.invoiceId}:`, error.message || error);
    } else {
      console.log(`  ✅ Invoice ${inv.invoiceId} synced.`);
    }
  }

  // 4. Migrate Withdrawals
  const withdrawals = dbData.withdrawals || [];
  console.log(`💸 Found ${withdrawals.length} withdrawals to migrate...`);
  for (const w of withdrawals) {
    const wRow = toSnakeCase({
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
    const { error } = await supabase.from('withdrawals').upsert(wRow, 'id');
    if (error) {
      console.warn(`⚠️ Warning inserting withdrawal ${w.id}:`, error.message || error);
    } else {
      console.log(`  ✅ Withdrawal ${w.id} synced.`);
    }
  }

  // 5. Migrate Settings & Admins & Treasury
  console.log(`⚙️ Migrating app settings, treasury and admins...`);
  const settingsRows = [
    { key: 'settings', value: dbData.settings || {} },
    { key: 'treasury', value: parseFloat(dbData.treasury || 100) },
    { key: 'admins', value: dbData.admins || ['8281274109', '8970354031'] },
    { key: 'used_tx_hashes', value: dbData.usedTxHashes || [] }
  ];
  for (const row of settingsRows) {
    await supabase.from('app_settings').upsert(row, 'key');
  }
  console.log(`  ✅ App settings synced.`);

  // 6. Migrate Crash History
  const crashPath = path.join(rootDir, 'crash_history.json');
  if (fs.existsSync(crashPath)) {
    try {
      const crashData = JSON.parse(fs.readFileSync(crashPath, 'utf8'));
      if (Array.isArray(crashData)) {
        console.log(`🎰 Migrating ${crashData.length} crash rounds...`);
        for (const c of crashData.slice(0, 50)) { // sync latest 50 rounds
          await supabase.from('crash_history').upsert({
            id: String(c.id),
            mult: parseFloat(c.mult)
          }, 'id');
        }
        console.log(`  ✅ Crash history synced.`);
      }
    } catch (e) {
      console.warn('⚠️ Error reading crash_history.json:', e.message);
    }
  }

  console.log('==================================================');
  console.log('🎉 SUPABASE DATA MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('==================================================');
}

migrate().catch(e => {
  console.error('Migration failed:', e);
  process.exit(1);
});
