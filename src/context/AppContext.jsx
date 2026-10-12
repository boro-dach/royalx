import React, { createContext, useContext, useState, useEffect } from 'react';
import { APP_CONFIG } from '../config';

export const RANKS_CONFIG = [
  { level: 1, name: 'Бронза', fullName: 'Ранг 1 • Бронза', requiredTurnover: 0, nextTurnover: 100, cashbackPercent: 2.0, color: '#cd7f32', badge: '🥉' },
  { level: 2, name: 'Серебро', fullName: 'Ранг 2 • Серебро', requiredTurnover: 100, nextTurnover: 500, cashbackPercent: 2.5, color: '#c0c0c0', badge: '🥈' },
  { level: 3, name: 'Золото', fullName: 'Ранг 3 • Золото', requiredTurnover: 500, nextTurnover: 1500, cashbackPercent: 3.0, color: '#ffd700', badge: '🥇' },
  { level: 4, name: 'Платина', fullName: 'Ранг 4 • Платина', requiredTurnover: 1500, nextTurnover: 5000, cashbackPercent: 3.5, color: '#e5e4e2', badge: '💎' },
  { level: 5, name: 'Изумруд', fullName: 'Ранг 5 • Изумруд', requiredTurnover: 5000, nextTurnover: 15000, cashbackPercent: 4.0, color: '#50c878', badge: '❇️' },
  { level: 6, name: 'Рубин', fullName: 'Ранг 6 • Рубин', requiredTurnover: 15000, nextTurnover: 50000, cashbackPercent: 5.0, color: '#e0115f', badge: '🔻' },
  { level: 7, name: 'Бриллиант', fullName: 'Ранг 7 • Бриллиант', requiredTurnover: 50000, nextTurnover: 150000, cashbackPercent: 6.0, color: '#b9f2ff', badge: '💠' },
  { level: 8, name: 'Мастер', fullName: 'Ранг 8 • Мастер', requiredTurnover: 150000, nextTurnover: 500000, cashbackPercent: 7.0, color: '#9932cc', badge: '⚡' },
  { level: 9, name: 'Грандмастер', fullName: 'Ранг 9 • Грандмастер', requiredTurnover: 500000, nextTurnover: 1000000, cashbackPercent: 7.5, color: '#ff4500', badge: '🔥' },
  { level: 10, name: 'Легенда RoyalX', fullName: 'Ранг 10 • Легенда RoyalX', requiredTurnover: 1000000, nextTurnover: null, cashbackPercent: 8.0, color: '#00e699', badge: '👑' }
];

const AppContext = createContext();

export function AppProvider({ children }) {
  // Initial Cached Profile Helper for Instant Startup
  const getCachedProfile = () => {
    try {
      const CURRENT_VER = 'rx_wager_sync_v7';
      if (localStorage.getItem('rx_profile_ver') !== CURRENT_VER) {
        localStorage.removeItem('rx_profile_cache');
        localStorage.setItem('rx_profile_ver', CURRENT_VER);
        return null;
      }
      const raw = localStorage.getItem('rx_profile_cache');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  };
  const initialCache = getCachedProfile();

  // State
  const [balance, setBalance] = useState(initialCache?.balance ?? 0.00);
  const [wagerRequired, setWagerRequired] = useState(initialCache?.wagerRequired ?? 0.00);
  const [depositBonusPercent, setDepositBonusPercent] = useState(initialCache?.depositBonusPercent ?? 0);
  const [activeTab, setActiveTab] = useState('main'); // main, promos, pass, cabinet
  const [activeGame, setActiveGame] = useState(null); // mines, dice, bj, crash
  const [activeModal, setActiveModal] = useState(null); // deposit, history, promocodes, support, stats
  
  // Cashback state (persisted from DB & cache)
  const [accumulatedCashback, setAccumulatedCashback] = useState(initialCache?.cashback ?? 0.00);

  // Battle Pass state
  const [passLevel, setPassLevel] = useState(1);
  const [passXP, setPassXP] = useState(0);
  const [claimedPassLevels, setClaimedPassLevels] = useState({});

  // Rank based on Total Turnover ($ оборот в сумме)
  const [totalTurnover, setTotalTurnover] = useState(initialCache?.totalTurnover ?? 0.00);

  // User Stats
  const [userStats, setUserStats] = useState(initialCache?.userStats || {
    totalDeposits: 0.00,
    totalWithdrawals: 0.00,
    gamesPlayed: 0,
    gamesWon: 0
  });

  // Referral Stats
  const [referralStats, setReferralStats] = useState(initialCache?.referralStats || {
    count: 0,
    earned: 0.00
  });

  // DB Sync Status Flag
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);

  // Legal Terms Agreement Status (verified directly from DB)
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(() => {
    if (initialCache && initialCache.agreedToTerms !== undefined) {
      return Boolean(initialCache.agreedToTerms);
    }
    return null;
  });

  // Personal User RTP ('auto' | 'win' | 'lose')
  const [userRtp, setUserRtp] = useState('auto');

  const getCurrentRankInfo = () => {
    let current = RANKS_CONFIG[0];
    let next = RANKS_CONFIG[1];

    for (let i = 0; i < RANKS_CONFIG.length; i++) {
      if (totalTurnover >= RANKS_CONFIG[i].requiredTurnover) {
        current = RANKS_CONFIG[i];
        next = RANKS_CONFIG[i + 1] || null;
      }
    }

    let progressPercent = 100;
    if (next && next.nextTurnover !== null) {
      const range = next.requiredTurnover - current.requiredTurnover;
      const currentInLevel = totalTurnover - current.requiredTurnover;
      progressPercent = Math.min(100, Math.max(0, Math.round((currentInLevel / range) * 100)));
    }

    return { current, next, progressPercent, totalTurnover, userRankXP: totalTurnover };
  };

  // Tasks state
  const [claimedTasks, setClaimedTasks] = useState({});

  // Toast state
  const [toast, setToast] = useState({ show: false, message: '', isError: false });

  // Telegram User synchronous extractor
  const getInitialTgUser = () => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.user) {
        const u = window.Telegram.WebApp.initDataUnsafe.user;
        const displayName = u.username 
          ? `@${u.username}` 
          : [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Пользователь';
        let init = 'TG';
        if (u.first_name) {
          init = (u.first_name[0] + (u.last_name ? u.last_name[0] : '')).toUpperCase();
        }
        return {
          id: String(u.id),
          name: displayName,
          photoUrl: u.photo_url || null,
          initials: init
        };
      }
    } catch (e) {}

    try {
      const cached = localStorage.getItem('rx_last_tg_user');
      if (cached) return JSON.parse(cached);
    } catch (e) {}

    return { 
      name: 'Пользователь', 
      id: APP_CONFIG.superAdminId, 
      photoUrl: null, 
      initials: 'RX' 
    };
  };

  // Telegram User state
  const [tgUser, setTgUser] = useState(getInitialTgUser);

  // Non-JWT Session Token state
  const [sessionToken, setSessionToken] = useState(() => {
    try {
      return localStorage.getItem('rx_session_token') || '';
    } catch (e) {
      return '';
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const getAuthHeaders = () => {
    const token = sessionToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('rx_session_token') : '');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const rawInitData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : '';
    if (rawInitData) headers['x-telegram-init-data'] = rawInitData;
    return headers;
  };

  // History operations
  const [historyItems, setHistoryItems] = useState(initialCache?.history || []);

  // Helper to apply user state from server
  const applyServerUserData = (u, isAdminFlag) => {
    if (!u) return;
    if (u.balance !== undefined) setBalance(parseFloat(u.balance) || 0.00);
    if (u.depositBonusPercent !== undefined) setDepositBonusPercent(parseFloat(u.depositBonusPercent) || 0);
    if (u.wagerRequired !== undefined) setWagerRequired(parseFloat(u.wagerRequired) || 0.00);
    if (u.totalTurnover !== undefined) setTotalTurnover(parseFloat(u.totalTurnover) || 0.00);
    if (u.cashback !== undefined) setAccumulatedCashback(parseFloat(u.cashback) || 0.00);
    if (Array.isArray(u.history)) setHistoryItems(u.history);
    if (u.rtp) setUserRtp(u.rtp);
    if (u.agreedToTerms !== undefined) setHasAgreedToTerms(Boolean(u.agreedToTerms));
    if (isAdminFlag !== undefined) setIsAdmin(Boolean(isAdminFlag));

    const stats = {
      totalDeposits: u.totalDeposited || 0,
      totalWithdrawals: u.totalWithdrawn || 0,
      gamesPlayed: u.gamesPlayed || 0,
      gamesWon: u.gamesWon || 0
    };
    const refStats = {
      count: u.referralsCount || 0,
      earned: u.referralEarned || 0.00
    };
    setUserStats(stats);
    setReferralStats(refStats);

    try {
      localStorage.setItem('rx_profile_cache', JSON.stringify({
        balance: u.balance,
        depositBonusPercent: u.depositBonusPercent || 0,
        wagerRequired: u.wagerRequired !== undefined ? parseFloat(u.wagerRequired) : 0.00,
        cashback: u.cashback !== undefined ? u.cashback : 0.00,
        totalTurnover: u.totalTurnover,
        history: u.history,
        userStats: stats,
        referralStats: refStats,
        agreedToTerms: Boolean(u.agreedToTerms)
      }));
    } catch (e) {}
  };

  // 100% AUTOMATIC AUTHENTICATION (FROM TELEGRAM INITDATA)
  // The user NEVER has to enter any credentials manually!
  useEffect(() => {
    let isCancelled = false;

    async function initAutoAuth() {
      try {
        let rawInitData = '';
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          try {
            window.Telegram.WebApp.ready();
            window.Telegram.WebApp.expand();
            rawInitData = window.Telegram.WebApp.initData || '';

            const user = window.Telegram.WebApp.initDataUnsafe?.user;
            if (user) {
              const displayName = user.username 
                ? `@${user.username}` 
                : [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Пользователь';
              let init = 'TG';
              if (user.first_name) {
                init = (user.first_name[0] + (user.last_name ? user.last_name[0] : '')).toUpperCase();
              }
              const newUserObj = {
                id: String(user.id),
                name: displayName,
                photoUrl: user.photo_url || null,
                initials: init
              };
              setTgUser(newUserObj);
              try { localStorage.setItem('rx_last_tg_user', JSON.stringify(newUserObj)); } catch(e){}
            }
          } catch (e) {
            console.warn('[Telegram WebApp] Init warning:', e);
          }
        }

        let token = sessionToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('rx_session_token') : '');

        // 1. Primary Auto-Auth: If Telegram initData is available -> ALWAYS authenticate with it automatically
        if (rawInitData) {
          try {
            const authRes = await fetch('/api/auth/telegram', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ initData: rawInitData })
            });
            const authData = await authRes.json();
            if (authData.success && authData.token) {
              token = authData.token;
              setSessionToken(token);
              try { localStorage.setItem('rx_session_token', token); } catch(e){}
              if (!isCancelled && authData.user) {
                applyServerUserData(authData.user, authData.isAdmin);
              }
              // Handle referral start_param
              const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
              if (startParam && authData.user?.id) {
                const refMatch = startParam.match(/^ref_?(\w+)/);
                const refId = refMatch ? refMatch[1] : startParam;
                if (refId && refId !== String(authData.user.id)) {
                  fetch('/api/user/bind-referrer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'x-telegram-init-data': rawInitData },
                    body: JSON.stringify({ userId: String(authData.user.id), referrerId: refId })
                  }).catch(() => {});
                }
              }
              return;
            }
          } catch (e) {
            console.warn('[AutoAuth] Telegram auth note:', e);
          }
        }

        // 2. If existing valid session token is stored, verify via /api/auth/me
        if (token) {
          try {
            const meRes = await fetch('/api/auth/me', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.success && meData.user && !isCancelled) {
                applyServerUserData(meData.user, meData.isAdmin);
                return;
              }
            }
          } catch (e) {}
        }

        // 3. Fallback for testing/browser outside Telegram (Zero manual input!):
        // Automatically create a session for the default/dev user
        try {
          const devUserId = tgUser?.id || APP_CONFIG.superAdminId;
          const devRes = await fetch('/api/auth/dev-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: devUserId })
          });
          const devData = await devRes.json();
          if (devData.success && devData.token) {
            token = devData.token;
            setSessionToken(token);
            try { localStorage.setItem('rx_session_token', token); } catch(e){}
            if (!isCancelled && devData.user) {
              applyServerUserData(devData.user, devData.isAdmin);
            }
          }
        } catch (e) {
          console.warn('[AutoAuth] Dev fallback note:', e);
        }

      } finally {
        if (!isCancelled) {
          setIsDbLoaded(true);
          setIsAppReady(true);
        }
      }
    }

    initAutoAuth();
    return () => { isCancelled = true; };
  }, []);

  // Toast helper
  const showToast = (message, isError = false) => {
    setToast({ show: true, message, isError });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 2800);
  };

  // Balance helper with server synchronization
  const addBalance = (amount, toastMsg) => {
    setBalance(prev => {
      const next = parseFloat((prev + amount).toFixed(2));
      try {
        fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ userId: tgUser.id || '3982051', patch: { balance: next } })
        }).catch(() => {});
      } catch (e) {}
      return next;
    });
    if (toastMsg) showToast(toastMsg);
  };

  const syncBalance = (newBalance) => {
    const val = parseFloat(Math.max(0, Number(newBalance)).toFixed(2));
    setBalance(val);
    try {
      fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ userId: tgUser.id || '3982051', patch: { balance: val } })
      }).catch(() => {});
    } catch (e) {}
  };

  const syncCashback = (newCashback) => {
    const val = parseFloat(Math.max(0, Number(newCashback)).toFixed(2));
    setAccumulatedCashback(val);
    try {
      fetch('/api/user/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ userId: tgUser.id || APP_CONFIG.superAdminId, patch: { cashback: val } })
      }).catch(() => {});
    } catch (e) {}
  };

  // Process lost bet for rank-scaled cashback (up to 8.0%, min bet $0.15)
  const processBetForCashback = (betAmt) => {
    const amt = parseFloat(betAmt) || 0;
    if (amt >= 0.15) {
      const { current } = getCurrentRankInfo();
      const pct = (current?.cashbackPercent || 2.0) / 100;
      const cb = parseFloat((amt * pct).toFixed(4));
      setAccumulatedCashback(prev => {
        const next = parseFloat((prev + cb).toFixed(2));
        syncCashback(next);
        return next;
      });
    }
  };

  // Claim accumulated cashback (minimum 1 USDT)
  const claimCashback = () => {
    if (accumulatedCashback < 1) {
      showToast('Минимальная сумма для вывода кэшбэка — 1.00 USDT', true);
      return;
    }
    const amt = accumulatedCashback;
    addBalance(amt, `Кэшбэк +${amt.toFixed(2)} USDT зачислен на баланс!`);
    syncCashback(0.00);
  };

  const processedBetsRef = React.useRef(new Set());

  // Process bet for Rank: Every dollar bet increases the total turnover ($) exactly once
  const processBetForTurnover = (betAmt, betId = null) => {
    const num = Math.max(0, parseFloat(betAmt) || 0);
    if (num <= 0) return;

    if (betId) {
      if (processedBetsRef.current.has(betId)) {
        return;
      }
      processedBetsRef.current.add(betId);
      if (processedBetsRef.current.size > 1000) {
        processedBetsRef.current.clear();
      }
    }

    setTotalTurnover(prev => {
      const next = parseFloat((prev + num).toFixed(2));
      try {
        fetch('/api/user/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ userId: tgUser.id || '3982051', patch: { totalTurnover: next } })
        }).catch(() => {});
      } catch (e) {}
      return next;
    });

    setWagerRequired(prev => {
      const next = parseFloat(Math.max(0, prev - num).toFixed(2));
      return next;
    });

    setUserStats(prev => ({
      ...prev,
      gamesPlayed: (prev.gamesPlayed || 0) + 1
    }));
  };
  const processBetForPass = processBetForTurnover;


  // Pass reward calculation
  const getPassRewardForLevel = (lvl) => {
    if (lvl === 90) return { type: 'money', amount: 500, title: '🏆 СУПЕР ПРИЗ СЕЗОНА 1', icon: '👑' };
    if (lvl % 15 === 0) return { type: 'money', amount: lvl * 3, title: `Золотой Мега-Бокс #${lvl}`, icon: '🎁' };
    if (lvl % 10 === 0) return { type: 'money', amount: lvl * 2, title: `Сундук Награды Уровень ${lvl}`, icon: '📦' };
    if (lvl % 5 === 0) return { type: 'money', amount: lvl * 1.5, title: `Серебряный Чекпоинт`, icon: '💎' };
    
    const baseReward = Math.round((1 + lvl * 0.45) * 100) / 100;
    return { type: 'money', amount: baseReward, title: `Бонус уровня ${lvl}`, icon: '💵' };
  };

  const claimPassLevel = (lvl) => {
    if (lvl > passLevel) {
      showToast('🔒 Этот уровень ещё не разблокирован!', true);
      return;
    }
    if (claimedPassLevels[lvl]) {
      showToast('Награда за этот уровень уже получена!');
      return;
    }
    const reward = getPassRewardForLevel(lvl);
    setClaimedPassLevels(prev => ({ ...prev, [lvl]: true }));
    addBalance(reward.amount, `Награда за ${lvl} уровень: +$${reward.amount.toFixed(2)}!`);
  };

  const claimAllPassRewards = () => {
    let totalClaimed = 0;
    let count = 0;
    const updated = { ...claimedPassLevels };

    for (let lvl = 1; lvl <= passLevel; lvl++) {
      if (!updated[lvl]) {
        const reward = getPassRewardForLevel(lvl);
        updated[lvl] = true;
        totalClaimed += reward.amount;
        count++;
      }
    }

    if (count > 0) {
      setClaimedPassLevels(updated);
      addBalance(totalClaimed, `Получено ${count} наград на сумму +$${totalClaimed.toFixed(2)}!`);
    } else {
      showToast('Нет доступных наград для получения!', true);
    }
  };

  const buyPassLevel = () => {
    if (passLevel >= 90) {
      showToast('🎉 Вы уже достигли максимального 90 уровня!');
      return;
    }
    const cost = 5.00;
    if (balance < cost) {
      showToast('❌ Недостаточно средств для покупки уровня ($5.00)', true);
      return;
    }
    setBalance(prev => prev - cost);
    setPassLevel(prev => prev + 1);
    showToast(`⚡ Куплен +1 уровень! Текущий уровень: ${passLevel + 1}`);
  };

  // Admin settings state
  const [adminSettings, setAdminSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('rx_admin_settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      globalRtp: 'normal', // 'normal' | 'casino' | 'win' | 'lose'
      targetRtpPercent: 80, // default 80% (казино всегда в плюсе)
      crashNextMult: null, // null | number
      minesXRay: false,
      minesAlwaysWin: false,
      minesRtp: 'auto', // 'auto' | 'casino' | 'win' | 'lose'
      diceForceResult: 'auto', // 'auto' | 'win' | 'lose'
      upgraderRtp: 'auto', // 'auto' | 'casino' | 'win' | 'lose'
      boxesRtp: 'auto', // 'auto' | 'casino' | 'win' | 'lose'
      bjDealerBust: false,
      bjDealerWin: false,
      maintenanceMode: false,
      soundMuted: false
    };
  });

  const updateAdminSettings = (patch) => {
    setAdminSettings(prev => {
      const next = { ...prev, ...patch };
      try {
        localStorage.setItem('rx_admin_settings', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const clearCrashNextMult = () => {
    updateAdminSettings({ crashNextMult: null });
  };

  // Admin Promocodes Manager state
  const [promocodes, setPromocodes] = useState(() => {
    try {
      const saved = localStorage.getItem('rx_promocodes');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', code: 'ROYAL100', type: 'balance', amount: 50.0, percent: 50, usesLeft: 100, maxUses: 100, active: true },
      { id: '2', code: 'START', type: 'balance', amount: 25.0, percent: 25, usesLeft: 500, maxUses: 500, active: true },
      { id: '3', code: 'BONUS50', type: 'deposit_bonus', percent: 50, amount: 50, usesLeft: 300, maxUses: 300, active: true },
      { id: '4', code: 'ROYALX', type: 'balance', amount: 100.0, percent: 100, usesLeft: 50, maxUses: 50, active: true },
      { id: '5', code: 'BOOST100', type: 'deposit_bonus', percent: 100, amount: 100, usesLeft: 100, maxUses: 100, active: true },
      { id: '6', code: 'VIP2026', type: 'balance', amount: 500.0, percent: 500, usesLeft: 10, maxUses: 10, active: true }
    ];
  });

  const savePromocodes = (items) => {
    setPromocodes(items);
    try {
      localStorage.setItem('rx_promocodes', JSON.stringify(items));
    } catch (e) {}
  };

  const addPromocode = (newPromo) => {
    const list = [newPromo, ...promocodes.filter(p => p.code !== newPromo.code)];
    savePromocodes(list);
    showToast(`Промокод ${newPromo.code} добавлен!`);
  };

  const deletePromocode = (id, code) => {
    const list = promocodes.filter(p => p.id !== id && (!code || p.code !== code));
    savePromocodes(list);
    if (code) {
      fetch('/api/promocodes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code })
      }).catch(() => {});
    }
    showToast('Промокод удален');
  };

  const togglePromocode = (id) => {
    const list = promocodes.map(p => p.id === id ? { ...p, active: !p.active } : p);
    savePromocodes(list);
  };

  // Money Task claim
  const claimTask = (taskId, reward, taskTitle) => {
    if (claimedTasks[taskId]) {
      showToast('Задание уже выполнено!');
      return;
    }
    setClaimedTasks(prev => ({ ...prev, [taskId]: true }));
    addBalance(reward, `Задание "${taskTitle}" выполнено! +$${reward}.00`);
  };

  // Redeem Promo code (connected to Server DB & Admin promocodes list)
  const redeemPromocode = async (code) => {
    const clean = code.trim().toUpperCase();
    try {
      const res = await fetch('/api/promocodes/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ userId: tgUser.id || '3982051', code: clean })
      });
      const data = await res.json();
      if (data.success && data.user) {
        setBalance(data.user.balance);
        if (data.user.depositBonusPercent !== undefined) {
          setDepositBonusPercent(parseFloat(data.user.depositBonusPercent) || 0);
        }
        if (data.user.wagerRequired !== undefined) {
          setWagerRequired(parseFloat(data.user.wagerRequired) || 0.00);
        }
        if (Array.isArray(data.user.history)) {
          setHistoryItems(data.user.history);
        }
        if (data.type === 'deposit_bonus') {
          showToast(`🎉 Промокод ${clean} активирован! +${data.percent}% к следующему пополнению!`);
        } else {
          showToast(`🎉 Промокод ${clean} активирован! +$${parseFloat(data.amount || 0).toFixed(2)} на баланс!`);
        }
        return true;
      } else {
        showToast(`❌ ${data.error || 'Ошибка активации промокода'}`, true);
        return false;
      }
    } catch (e) {
      showToast('❌ Ошибка связи с сервером', true);
      return false;
    }
  };

  // Admin Privilege check (superAdminId, plus any assigned admins)
  const [isAdmin, setIsAdmin] = useState(() => {
    return String(tgUser?.id) === APP_CONFIG.superAdminId;
  });

  useEffect(() => {
    async function checkAdminStatus() {
      const currentId = String(tgUser?.id || '');
      if (currentId === APP_CONFIG.superAdminId) {
        setIsAdmin(true);
        return;
      }
      try {
        const res = await fetch(`/api/admin/check?userId=${currentId}`);
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(!!data.isAdmin || currentId === APP_CONFIG.superAdminId);
        } else {
          setIsAdmin(currentId === APP_CONFIG.superAdminId);
        }
      } catch (e) {
        setIsAdmin(currentId === APP_CONFIG.superAdminId);
      }
    }
    checkAdminStatus();
  }, [tgUser.id]);

  // Admin Auth helper
  const [isAdminAuthed, setIsAdminAuthed] = useState(() => {
    try {
      return sessionStorage.getItem('rx_admin_authed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const setAdminAuthed = (val) => {
    setIsAdminAuthed(val);
    try {
      sessionStorage.setItem('rx_admin_authed', val ? 'true' : 'false');
    } catch (e) {}
  };

  // Admin Rank & Pass Helpers
  const setUserRankLevel = (lvl) => {
    const targetRank = RANKS_CONFIG[lvl - 1];
    if (targetRank) {
      setTotalTurnover(targetRank.requiredTurnover);
      showToast(`Ранг изменен на "${targetRank.fullName}"!`);
    }
  };

  const setUserPassLevel = (lvl) => {
    const val = Math.max(1, Math.min(90, parseInt(lvl, 10) || 1));
    setPassLevel(val);
  };

  const addCustomTransaction = (tx) => {
    const newTx = {
      id: Date.now(),
      time: 'Только что',
      ...tx
    };
    setHistoryItems(prev => [newTx, ...prev]);
    showToast('Транзакция добавлена в историю');
  };

  const clearHistory = () => {
    setHistoryItems([]);
    showToast('История операций очищена');
  };

  // Modal closing handler with smooth animation
  const [isClosingModal, setIsClosingModal] = useState(false);

  const closeModal = () => {
    setIsClosingModal(true);
    setTimeout(() => {
      setActiveModal(null);
      setIsClosingModal(false);
    }, 200);
  };

  const recordGameBet = async ({ game, betAmount, winAmount, isWin, multiplier }) => {
    const bet = Math.max(0, parseFloat(betAmount) || 0);
    const win = Math.max(0, parseFloat(winAmount) || 0);
    const net = isWin ? (win - bet) : -bet;

    setUserStats(prev => ({
      ...prev,
      gamesPlayed: (prev.gamesPlayed || 0) + 1,
      gamesWon: isWin ? (prev.gamesWon || 0) + 1 : (prev.gamesWon || 0)
    }));

    // Optimistically credit win payout to balance immediately
    if (win > 0) {
      setBalance(prev => parseFloat((prev + win).toFixed(2)));
    }

    setWagerRequired(prev => {
      const next = parseFloat(Math.max(0, prev - bet).toFixed(2));
      return next;
    });

    const displayAmount = isWin ? win : -bet;
    const dateStr = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    setHistoryItems(prev => [
      {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type: 'game',
        title: `${game || 'Игра'}: ${isWin ? `x${(multiplier || 1).toFixed(2)}` : 'Ставка'}`,
        time: `Сегодня, ${dateStr}`,
        amount: parseFloat(displayAmount.toFixed(2)),
        status: isWin ? 'ВЫИГРЫШ' : 'ПРОИГРЫШ'
      },
      ...prev
    ]);

    try {
      const res = await fetch('/api/user/record-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          userId: tgUser.id || '3982051',
          game,
          betAmount: bet,
          winAmount: win,
          isWin,
          multiplier
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          setBalance(data.user.balance);
          setTotalTurnover(data.user.totalTurnover);
          if (data.user.wagerRequired !== undefined) {
            setWagerRequired(parseFloat(data.user.wagerRequired) || 0.00);
          }
          if (Array.isArray(data.user.history)) {
            setHistoryItems(data.user.history);
          }
        }
      }
    } catch (e) {}
  };

  const confirmTermsAgreement = async () => {
    setHasAgreedToTerms(true);
    try {
      localStorage.setItem('rx_terms_accepted_v1', 'true');
    } catch (e) {}
    try {
      const uid = tgUser?.id || APP_CONFIG.superAdminId;
      await fetch('/api/user/agree-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ userId: uid })
      });
    } catch (e) {
      console.warn('Failed to save terms agreement to server:', e);
    }
  };

  // ==========================================
  // NON-JWT AUTHENTICATION ACTIONS
  // ==========================================
  const login = async (username, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('rx_session_token', data.token);
        setSessionToken(data.token);
        if (data.user) {
          const u = data.user;
          const uObj = {
            id: String(u.id),
            name: u.name || `@${u.username}` || 'Пользователь',
            photoUrl: null,
            initials: (u.name || u.username || 'RX').slice(0, 2).toUpperCase()
          };
          setTgUser(uObj);
          try { localStorage.setItem('rx_last_tg_user', JSON.stringify(uObj)); } catch(e){}
          if (u.balance !== undefined) setBalance(u.balance);
          if (u.totalTurnover !== undefined) setTotalTurnover(u.totalTurnover);
          if (u.cashback !== undefined) setAccumulatedCashback(u.cashback);
          if (u.wagerRequired !== undefined) setWagerRequired(u.wagerRequired);
          if (Array.isArray(u.history)) setHistoryItems(u.history);
        }
        setIsAdmin(Boolean(data.isAdmin));
        setIsAuthModalOpen(false);
        showToast('Вход выполнен успешно! 🎉');
        return { success: true };
      }
      return { success: false, error: data.error || 'Ошибка входа' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const register = async (username, password, name) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('rx_session_token', data.token);
        setSessionToken(data.token);
        if (data.user) {
          const u = data.user;
          const uObj = {
            id: String(u.id),
            name: u.name || `@${u.username}` || 'Пользователь',
            photoUrl: null,
            initials: (u.name || u.username || 'RX').slice(0, 2).toUpperCase()
          };
          setTgUser(uObj);
          try { localStorage.setItem('rx_last_tg_user', JSON.stringify(uObj)); } catch(e){}
          if (u.balance !== undefined) setBalance(u.balance);
        }
        setIsAdmin(Boolean(data.isAdmin));
        setIsAuthModalOpen(false);
        showToast('Регистрация завершена! 🚀');
        return { success: true };
      }
      return { success: false, error: data.error || 'Ошибка регистрации' };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const devLogin = async (userId) => {
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('rx_session_token', data.token);
        setSessionToken(data.token);
        if (data.user) {
          const u = data.user;
          const uObj = {
            id: String(u.id),
            name: u.name || 'Пользователь',
            photoUrl: null,
            initials: (u.name || 'RX').slice(0, 2).toUpperCase()
          };
          setTgUser(uObj);
          try { localStorage.setItem('rx_last_tg_user', JSON.stringify(uObj)); } catch(e){}
          if (u.balance !== undefined) setBalance(u.balance);
          if (u.totalTurnover !== undefined) setTotalTurnover(u.totalTurnover);
          if (u.cashback !== undefined) setAccumulatedCashback(u.cashback);
          if (u.wagerRequired !== undefined) setWagerRequired(u.wagerRequired);
          if (Array.isArray(u.history)) setHistoryItems(u.history);
        }
        setIsAdmin(Boolean(data.isAdmin));
        setIsAuthModalOpen(false);
        showToast(`Вход выполнен (ID: ${userId})`);
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      return { success: false, error: e.message };
    }
  };

  const logout = async () => {
    const token = sessionToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('rx_session_token') : '');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
      } catch (e) {}
    }
    try {
      localStorage.removeItem('rx_session_token');
      localStorage.removeItem('rx_profile_cache');
    } catch (e) {}
    setSessionToken('');
    showToast('Сессия обновлена 🔄');
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  return (
    <AppContext.Provider value={{
      balance,
      setBalance,
      wagerRequired,
      setWagerRequired,
      depositBonusPercent,
      setDepositBonusPercent,
      addBalance,
      syncBalance,
      hasAgreedToTerms,
      setHasAgreedToTerms,
      confirmTermsAgreement,
      activeTab,
      setActiveTab,
      activeGame,
      setActiveGame,
      activeModal,
      setActiveModal,
      isClosingModal,
      closeModal,
      redeemPromocode,
      accumulatedCashback,
      setAccumulatedCashback,
      syncCashback,
      processBetForCashback,
      claimCashback,
      passLevel,
      setPassLevel,
      passXP,
      setPassXP,
      claimedPassLevels,
      getPassRewardForLevel,
      claimPassLevel,
      claimAllPassRewards,
      buyPassLevel,
      processBetForPass,
      totalTurnover,
      setTotalTurnover,
      userStats,
      setUserStats,
      referralStats,
      setReferralStats,
      recordGameBet,
      claimedTasks,
      claimTask,
      toast,
      showToast,
      tgUser,
      setTgUser,
      historyItems,
      setHistoryItems,
      userRankXP: totalTurnover,
      setUserRankXP: setTotalTurnover,
      getCurrentRankInfo,
      RANKS_CONFIG,
      isDbLoaded,
      isAppReady,
      setIsAppReady,
      userRtp,
      setUserRtp,
      // Authentication (Non-JWT)
      sessionToken,
      isAuthModalOpen,
      setIsAuthModalOpen,
      login,
      register,
      devLogin,
      logout,
      isAuthenticated: Boolean(sessionToken || (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData)),
      getAuthHeaders,
      // Admin API & State
      adminSettings,
      setAdminSettings,
      updateAdminSettings,
      clearCrashNextMult,
      promocodes,
      addPromocode,
      deletePromocode,
      togglePromocode,
      isAdmin,
      setIsAdmin,
      isAdminAuthed,
      setAdminAuthed,
      setUserRankLevel,
      setUserPassLevel,
      addCustomTransaction,
      clearHistory
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
