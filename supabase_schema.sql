-- ====================================================================
-- SUPABASE POSTGRESQL DDL SCHEMA FOR ROYALX TELEGRAM MINI APP & CASINO
-- Pure Schema Definition (NO DATA TRANSFERRED / STRICTLY DDL ONLY)
-- Compatible with PostgreSQL 15+ and Supabase SQL Editor
-- ====================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function for automated updated_at timestamp maintenance
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 1. USERS TABLE
-- Stores player profiles, balances, gameplay statistics, and permissions
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Пользователь',
  username TEXT,
  password_hash TEXT,
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  total_turnover NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_turnover >= 0),
  total_deposited NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_deposited >= 0),
  total_withdrawn NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (total_withdrawn >= 0),
  games_played INTEGER NOT NULL DEFAULT 0 CHECK (games_played >= 0),
  games_won INTEGER NOT NULL DEFAULT 0 CHECK (games_won >= 0),
  referrals_count INTEGER NOT NULL DEFAULT 0 CHECK (referrals_count >= 0),
  referral_earned NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (referral_earned >= 0),
  referrer_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  agreed_to_terms BOOLEAN NOT NULL DEFAULT false,
  rtp TEXT NOT NULL DEFAULT 'auto' CHECK (rtp IN ('auto', 'win', 'lose')),
  is_banned BOOLEAN NOT NULL DEFAULT false,
  cashback NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (cashback >= 0),
  wager_required NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (wager_required >= 0),
  deposit_bonus_percent NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (deposit_bonus_percent >= 0),
  used_promos JSONB NOT NULL DEFAULT '[]'::jsonb,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_referrer ON public.users(referrer_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON public.users(created_at DESC);

-- Automated updated_at trigger for users
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 2. SESSIONS TABLE (NON-JWT AUTHENTICATION)
-- Secure cryptographic session tokens (sess_...) stored directly in DB
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);

-- ====================================================================
-- 3. INVOICES TABLE (DEPOSITS & PAYMENT GATEWAYS)
-- Supports CryptoBot, xRocket, and direct USDT TRC-20 / Gram (TON)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  invoice_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paid', 'expired', 'cancelled')),
  pay_url TEXT,
  wallet_address TEXT,
  base_amount NUMERIC(15, 2),
  expected_amount NUMERIC(15, 2),
  expected_crypto_amount NUMERIC(24, 8),
  exact_amount NUMERIC(24, 8),
  rate NUMERIC(24, 8),
  currency TEXT,
  expires_at BIGINT,
  created_at BIGINT NOT NULL
);

-- Invoices Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at DESC);

-- ====================================================================
-- 4. WITHDRAWALS TABLE (PAYOUT REQUESTS)
-- Tracks manual and automated player withdrawals and administrative actions
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL,
  address TEXT,
  check_url TEXT,
  cheque_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed')),
  processed_by TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Withdrawals Indexes
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON public.withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON public.withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON public.withdrawals(created_at DESC);

-- ====================================================================
-- 5. PROMOCODES TABLE
-- Bonus codes for instant balance credits or deposit multipliers
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.promocodes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'balance' CHECK (type IN ('balance', 'deposit_bonus')),
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00 CHECK (amount >= 0),
  percent NUMERIC(5, 2) DEFAULT 0.00 CHECK (percent >= 0),
  uses_left INTEGER NOT NULL DEFAULT 0 CHECK (uses_left >= 0),
  max_uses INTEGER NOT NULL DEFAULT 0 CHECK (max_uses >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Promocodes Indexes
CREATE INDEX IF NOT EXISTS idx_promocodes_code ON public.promocodes(code);
CREATE INDEX IF NOT EXISTS idx_promocodes_active ON public.promocodes(active);

-- ====================================================================
-- 6. APP SETTINGS TABLE
-- Key-value store for casino settings, treasury, admin IDs, used tx hashes
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automated updated_at trigger for app_settings
DROP TRIGGER IF EXISTS trg_app_settings_updated_at ON public.app_settings;
CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 7. CRASH HISTORY TABLE
-- Historical crash game multipliers for 24/7 continuous rounds
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.crash_history (
  id TEXT PRIMARY KEY,
  mult NUMERIC(8, 2) NOT NULL CHECK (mult >= 1.00),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crash History Indexes
CREATE INDEX IF NOT EXISTS idx_crash_history_created_at ON public.crash_history(created_at DESC);

-- ====================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Ensures data security and protects sensitive game & balance state
-- ====================================================================

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promocodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_history ENABLE ROW LEVEL SECURITY;

-- 8.1 Backend / Service Role Access (Full unrestricted access for server)
DROP POLICY IF EXISTS "Service role full access on users" ON public.users;
CREATE POLICY "Service role full access on users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on sessions" ON public.sessions;
CREATE POLICY "Service role full access on sessions" ON public.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on invoices" ON public.invoices;
CREATE POLICY "Service role full access on invoices" ON public.invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on withdrawals" ON public.withdrawals;
CREATE POLICY "Service role full access on withdrawals" ON public.withdrawals FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on promocodes" ON public.promocodes;
CREATE POLICY "Service role full access on promocodes" ON public.promocodes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on app_settings" ON public.app_settings;
CREATE POLICY "Service role full access on app_settings" ON public.app_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on crash_history" ON public.crash_history;
CREATE POLICY "Service role full access on crash_history" ON public.crash_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8.2 Client / Public Read Access (For anon & authenticated clients)
DROP POLICY IF EXISTS "Public read access on active promocodes" ON public.promocodes;
CREATE POLICY "Public read access on active promocodes" ON public.promocodes FOR SELECT TO anon, authenticated USING (active = true);

DROP POLICY IF EXISTS "Public read access on crash_history" ON public.crash_history;
CREATE POLICY "Public read access on crash_history" ON public.crash_history FOR SELECT TO anon, authenticated USING (true);

-- ====================================================================
-- 9. REALTIME PUBLICATION (OPTIONAL / RECOMMENDED)
-- Allows frontend or bots to subscribe to live updates
-- ====================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.crash_history, public.invoices, public.withdrawals;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
