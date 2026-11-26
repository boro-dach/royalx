// Shared domain types for RoyalX

// ─── User & Auth ────────────────────────────────────────────────────────────

export interface TgUser {
  id: string;
  name: string;
  photoUrl: string | null;
  initials: string;
  phone?: string | null;
}

export interface UserStats {
  totalDeposits: number;
  totalWithdrawals: number;
  gamesPlayed: number;
  gamesWon: number;
}

export interface ReferralStats {
  count: number;
  earned: number;
}

export type UserRtp = 'auto' | 'win' | 'lose';

// ─── Rank System ─────────────────────────────────────────────────────────────

export interface RankConfig {
  level: number;
  name: string;
  fullName: string;
  requiredTurnover: number;
  nextTurnover: number | null;
  cashbackPercent: number;
  color: string;
  badge: string;
}

export interface RankInfo {
  current: RankConfig;
  next: RankConfig | null;
  progressPercent: number;
  totalTurnover: number;
  userRankXP: number;
}

// ─── Toast Notifications ─────────────────────────────────────────────────────

export interface ToastState {
  show: boolean;
  message: string;
  isError: boolean;
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface HistoryItem {
  id?: string | number;
  game?: string;
  type?: string;
  amount?: number;
  result?: string;
  profit?: number;
  timestamp?: string | number;
  [key: string]: unknown;
}

// ─── Mandatory Channels ───────────────────────────────────────────────────────

export type ChannelType = 'channel' | 'creator' | 'chat';

export interface MandatoryChannel {
  id: string;
  badge: string;
  name: string;
  handle: string;
  url: string;
  btnText: string;
  type: ChannelType;
}

// ─── App Config ──────────────────────────────────────────────────────────────

export interface AppConfig {
  botUsername: string;
  channelUsername: string;
  channelUrl: string;
  creatorChannelUsername: string;
  creatorChannelUrl: string;
  chatUrl: string;
  supportUsername: string;
  supportUrl: string;
  termsUrl: string;
  rulesUrl: string;
  privacyUrl: string;
  superAdminId: string;
  trc20Wallet: string;
  tonWallet: string;
  xrocketPayUrl: string;
  cryptobotPayUrl: string;
}

// ─── App Context ─────────────────────────────────────────────────────────────

export type TabName = 'main' | 'earn' | 'promos' | 'cabinet';
export type GameName = 'mines' | 'dice' | 'bj' | 'crash' | 'coinflip' | 'hilo' | 'keno' | 'redblack' | 'boxes' | 'upgrade' | 'emoji' | null;
export type ModalName = 'deposit' | 'withdraw' | 'history' | 'support' | 'ref' | 'promo' | 'stats' | 'ranks' | 'admin' | null;
export type AuthModalMode = 'login' | 'register';

export interface AppContextValue {
  // Balance & financial
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  wagerRequired: number;
  setWagerRequired: React.Dispatch<React.SetStateAction<number>>;
  depositBonusPercent: number;
  setDepositBonusPercent: React.Dispatch<React.SetStateAction<number>>;
  accumulatedCashback: number;
  setAccumulatedCashback: React.Dispatch<React.SetStateAction<number>>;

  // Navigation
  activeTab: TabName;
  setActiveTab: React.Dispatch<React.SetStateAction<TabName>>;
  activeGame: GameName;
  setActiveGame: React.Dispatch<React.SetStateAction<GameName>>;
  activeModal: ModalName;
  setActiveModal: React.Dispatch<React.SetStateAction<ModalName>>;

  // Battle Pass
  passLevel: number;
  setPassLevel: React.Dispatch<React.SetStateAction<number>>;
  passXP: number;
  setPassXP: React.Dispatch<React.SetStateAction<number>>;
  claimedPassLevels: Record<string | number, boolean>;
  setClaimedPassLevels: React.Dispatch<React.SetStateAction<Record<string | number, boolean>>>;

  // Rank
  totalTurnover: number;
  setTotalTurnover: React.Dispatch<React.SetStateAction<number>>;
  getCurrentRankInfo: () => RankInfo;

  // User
  tgUser: TgUser;
  setTgUser: React.Dispatch<React.SetStateAction<TgUser>>;
  userStats: UserStats;
  setUserStats: React.Dispatch<React.SetStateAction<UserStats>>;
  referralStats: ReferralStats;
  setReferralStats: React.Dispatch<React.SetStateAction<ReferralStats>>;
  userRtp: UserRtp;
  setUserRtp: React.Dispatch<React.SetStateAction<UserRtp>>;

  // Auth & session
  sessionToken: string;
  setSessionToken: React.Dispatch<React.SetStateAction<string>>;
  isStandalone: boolean;
  setIsStandalone: React.Dispatch<React.SetStateAction<boolean>>;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  authModalMode: AuthModalMode;
  setAuthModalMode: React.Dispatch<React.SetStateAction<AuthModalMode>>;
  getAuthHeaders: () => Record<string, string>;

  // Status flags
  isDbLoaded: boolean;
  setIsDbLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  isAppReady: boolean;
  setIsAppReady: React.Dispatch<React.SetStateAction<boolean>>;
  isAdmin: boolean;
  setIsAdmin: React.Dispatch<React.SetStateAction<boolean>>;
  hasAgreedToTerms: boolean | null;
  setHasAgreedToTerms: React.Dispatch<React.SetStateAction<boolean | null>>;
  isSubscribed: boolean | null;
  setIsSubscribed: React.Dispatch<React.SetStateAction<boolean | null>>;
  isDevEnv: boolean;

  // History
  historyItems: HistoryItem[];
  setHistoryItems: React.Dispatch<React.SetStateAction<HistoryItem[]>>;

  // Tasks
  claimedTasks: Record<string, boolean>;
  setClaimedTasks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  // Toast
  toast: ToastState;
  showToast: (message: string, isError?: boolean) => void;

  // Server sync
  applyServerUserData: (u: ServerUserData, isAdminFlag?: boolean) => void;
  refreshProfile: () => Promise<void>;
}

// Server user data shape returned from /api/auth and /api/users/:id
export interface ServerUserData {
  balance?: number | string;
  depositBonusPercent?: number | string;
  wagerRequired?: number | string;
  totalTurnover?: number | string;
  cashback?: number | string;
  rtp?: UserRtp;
  history?: HistoryItem[];
  agreedToTerms?: boolean | number;
  isSubscribed?: boolean | number;
  phone?: string | null;
  totalDeposited?: number;
  totalWithdrawn?: number;
  gamesPlayed?: number;
  gamesWon?: number;
  referralsCount?: number;
  referralEarned?: number;
}

// ─── Games ───────────────────────────────────────────────────────────────────

export interface BetControlsProps {
  betAmount: number;
  setBetAmount: (amount: number) => void;
  minBet?: number;
  maxBet?: number;
  disabled?: boolean;
}

export interface GameHeaderProps {
  title: string;
  onClose: () => void;
  subtitle?: string;
}
