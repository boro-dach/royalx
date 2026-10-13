import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { bjAudio } from '../../utils/blackjackAudio';
import { CloseIcon, TetherIcon } from '../common/Icons';
import confetti from 'canvas-confetti';
import GameHeader from './GameHeader';
import './Games.css';

const PRESET_MULTIPLIERS = [1.5, 2.0, 3.0, 5.0, 10.0, 20.0, 50.0, 100.0];
const PRESET_CHANCES = [5, 10, 20, 25, 33, 50, 75, 90];

export default function UpgradeGame({ onBack }) {
  const {
    balance,
    syncBalance,
    recordGameBet,
    showToast,
    processBetForCashback,
    processBetForPass,
    adminSettings,
    userRtp,
    historyItems,
    userStats
  } = useApp();

  const [betAmount, setBetAmount] = useState(1);
  const [upgradeMode, setUpgradeMode] = useState('chance'); // 'chance' | 'multiplier'
  const [chancePercent, setChancePercent] = useState(20); // Default to 20% so it's exactly 20% of the circle
  const [multiplier, setMultiplier] = useState(5.0); // 100 / 20 = 5.0x
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [totalRotations, setTotalRotations] = useState(0);
  const [lastResult, setLastResult] = useState(null); // { isWin: boolean, winAmount: number, landedAngle: number }
  const [showWinBox, setShowWinBox] = useState(false);
  const [isClosingWinBox, setIsClosingWinBox] = useState(false);

  // Bottom Sheet Modal (Identical TON Style to Mines, Dice, Crash)
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isClosingBetModal, setIsClosingBetModal] = useState(false);

  // Persistent round history stored in localStorage and synced with profile bets
  const [history, setHistory] = useState(() => {
    let list = [];
    try {
      const saved = localStorage.getItem('royalx_upgrade_history_v3') || localStorage.getItem('royalx_upgrade_history_v2');
      if (saved) {
        list = JSON.parse(saved);
      }
    } catch (e) {}

    if (!Array.isArray(list) || list.length === 0) {
      try {
        const cached = localStorage.getItem('rx_profile_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed.history)) {
            const upgraderBets = parsed.history
              .filter(h => h.title?.includes('Апгрейдер') || h.title?.includes('Upgrader'))
              .map(h => {
                const isWin = h.status === 'ВЫИГРЫШ';
                const match = h.title?.match(/x([\d.]+)/);
                const mult = match ? parseFloat(match[1]) : 2.0;
                return {
                  id: 'h_' + h.id,
                  mult,
                  isWin
                };
              });
            if (upgraderBets.length > 0) return upgraderBets.slice(0, 20);
          }
        }
      } catch (e) {}
    }
    return list || [];
  });

  // Sync if history is empty and historyItems loads from server
  useEffect(() => {
    if (history.length === 0 && Array.isArray(historyItems) && historyItems.length > 0) {
      const upgraderBets = historyItems
        .filter(h => h.title?.includes('Апгрейдер') || h.title?.includes('Upgrader'))
        .map(h => {
          const isWin = h.status === 'ВЫИГРЫШ';
          const match = h.title?.match(/x([\d.]+)/);
          const mult = match ? parseFloat(match[1]) : 2.0;
          return {
            id: 'h_' + h.id,
            mult,
            isWin
          };
        });
      if (upgraderBets.length > 0) {
        setHistory(upgraderBets.slice(0, 20));
        try {
          localStorage.setItem('royalx_upgrade_history_v3', JSON.stringify(upgraderBets.slice(0, 20)));
        } catch (e) {}
      }
    }
  }, [historyItems]);

  const winBoxTimerRef = useRef(null);

  // Calculate Win Chance (0.1 to 75%) - exactly equal to chancePercent!
  // For 20%, winChance is exactly 20.00%, winAngle is exactly 72 degrees (20% of 360 circle)
  const winChance = Math.min(75, Math.max(0.1, parseFloat((Number(chancePercent) || 20).toFixed(2))));
  const winAngle = (winChance / 100) * 360;
  const targetWin = parseFloat((betAmount * multiplier).toFixed(2));

  // Dismiss win box with smooth animation
  const dismissWinBox = () => {
    if (winBoxTimerRef.current) clearTimeout(winBoxTimerRef.current);
    setIsClosingWinBox(true);
    setTimeout(() => {
      setShowWinBox(false);
      setIsClosingWinBox(false);
    }, 200);
  };

  // Auto-dismiss win box after 2.6 seconds
  useEffect(() => {
    if (showWinBox) {
      setIsClosingWinBox(false);
      if (winBoxTimerRef.current) clearTimeout(winBoxTimerRef.current);
      winBoxTimerRef.current = setTimeout(() => {
        dismissWinBox();
      }, 2600);
      return () => {
        if (winBoxTimerRef.current) clearTimeout(winBoxTimerRef.current);
      };
    }
  }, [showWinBox]);

  const closeBetModal = () => {
    setIsClosingBetModal(true);
    setTimeout(() => {
      setIsBetModalOpen(false);
      setIsClosingBetModal(false);
    }, 200);
  };

  const handleSelectChance = (c) => {
    if (isSpinning) return;
    const num = Math.max(0.5, Math.min(75, parseFloat(c)));
    setChancePercent(num);
    const mult = parseFloat((100 / num).toFixed(2));
    setMultiplier(mult);
    try { bjAudio.playChip(); } catch (e) {}
  };

  const handleAdjustChance = (delta) => {
    if (isSpinning) return;
    const next = Math.max(1, Math.min(75, parseFloat(((Number(chancePercent) || 0) + delta).toFixed(1))));
    setChancePercent(next);
    const mult = parseFloat((100 / next).toFixed(2));
    setMultiplier(mult);
    try { bjAudio.playChip(); } catch (e) {}
  };

  const handleSelectMultiplier = (m) => {
    if (isSpinning) return;
    const num = Math.max(1.33, Math.min(500, parseFloat(m)));
    setMultiplier(num);
    const ch = Math.max(0.2, Math.min(75, parseFloat((100 / num).toFixed(2))));
    setChancePercent(ch);
    try { bjAudio.playChip(); } catch (e) {}
  };

  const handleAdjustMultiplier = (delta) => {
    if (isSpinning) return;
    const next = Math.max(1.33, Math.min(500, parseFloat((multiplier + delta).toFixed(1))));
    setMultiplier(next);
    const ch = Math.max(0.2, Math.min(75, parseFloat((100 / next).toFixed(2))));
    setChancePercent(ch);
    try { bjAudio.playChip(); } catch (e) {}
  };

  const handleSpinFromModal = () => {
    if (betAmount < 0.15 || betAmount > balance) return;
    closeBetModal();
    setTimeout(() => {
      executeSpin();
    }, 180);
  };

  const executeSpin = () => {
    if (isSpinning) return;

    if (betAmount <= 0) {
      showToast('❌ Укажите сумму ставки!', true);
      return;
    }

    if (balance < betAmount) {
      showToast('❌ Недостаточно средств на балансе!', true);
      return;
    }

    if (showWinBox) dismissWinBox();
    setIsSpinning(true);

    // 1. Deduct bet from balance and record for turnover/cashback
    const newBal = parseFloat((balance - betAmount).toFixed(2));
    syncBalance(newBal);
    processBetForCashback(betAmount);
    processBetForPass(betAmount);
    try { bjAudio.playChip(); } catch (e) {}

    // 2. Smart Anti-Abuse System:
    // If player has too much profit or consecutive wins in a row, drain them!
    let consecutiveWins = 0;
    for (const h of history) {
      if (h.isWin) consecutiveWins++;
      else break;
    }

    const dep = parseFloat(userStats?.totalDeposits) || 0;
    let promo = 0;
    if (Array.isArray(historyItems)) {
      promo = historyItems.filter(h => h.type === 'promo').reduce((s, h) => s + (parseFloat(h.amount) || 0), 0);
    }
    const baseInvestment = Math.max(5.0, dep + promo);
    const isBigBalancePlus = balance >= baseInvestment * 2.5;

    // Detect if user has consecutive wins or too big plus
    let smartForceLose = false;
    if (consecutiveWins >= 3) {
      // 3 or more wins in a row -> 100% drain
      smartForceLose = true;
    } else if (consecutiveWins >= 2 && (winChance >= 45 || isBigBalancePlus)) {
      // 2 wins in a row with high chance or high balance -> 90% chance to drain
      if (Math.random() < 0.90) smartForceLose = true;
    } else if (isBigBalancePlus && winChance >= 50) {
      // Big plus relative to deposit/promos with high chance -> 80% drain
      if (Math.random() < 0.80) smartForceLose = true;
    }

    // Determine outcome based on probabilities and admin overrides
    const forceLose = adminSettings?.upgraderRtp === 'lose' || adminSettings?.globalRtp === 'lose' || userRtp === 'lose' || smartForceLose;
    const forceWin = !forceLose && (adminSettings?.upgraderRtp === 'win' || adminSettings?.globalRtp === 'win' || userRtp === 'win');
    const isCasinoMode = adminSettings?.upgraderRtp === 'casino' || adminSettings?.globalRtp === 'casino' || userRtp === 'casino';
    const targetRtp = adminSettings?.targetRtpPercent !== undefined ? parseFloat(adminSettings.targetRtpPercent) : 80;

    let isWin = false;
    let landingAngle = 0;

    // Helper: bottom-centered sector needle landing (centered at 180° / 6 o'clock)
    const getWinLanding = () => {
      const half = winAngle / 2;
      const offset = (Math.random() * Math.max(1, winAngle - 6)) - half + 3;
      return (180 + offset + 360) % 360;
    };
    const getLoseLanding = () => {
      const half = winAngle / 2;
      const loseRange = 360 - winAngle;
      const offset = (half + 4) + Math.random() * Math.max(2, loseRange - 8);
      return (180 + offset) % 360;
    };

    if (forceLose) {
      isWin = false;
      landingAngle = getLoseLanding();
    } else if (forceWin) {
      isWin = true;
      landingAngle = getWinLanding();
    } else if (isCasinoMode) {
      const scaledWinChance = Math.max(1, winChance * (targetRtp / 100));
      const willWin = (Math.random() * 100) < scaledWinChance;
      if (willWin) {
        isWin = true;
        landingAngle = getWinLanding();
      } else {
        isWin = false;
        landingAngle = getLoseLanding();
      }
    } else {
      // Anti-farming curve for high chance (prevents 75% spam abuse)
      const effectiveChance = winChance >= 50 ? winChance * 0.88 : winChance;
      const willWin = (Math.random() * 100) < effectiveChance;
      if (willWin) {
        isWin = true;
        landingAngle = getWinLanding();
      } else {
        isWin = false;
        landingAngle = getLoseLanding();
      }
    }

    // 3. Compute continuous rotation angle (5 full spins + landing angle)
    const nextSpins = totalRotations + 5;
    const finalDegree = nextSpins * 360 + landingAngle;

    setTotalRotations(nextSpins);
    setRotationAngle(finalDegree);

    // 4. Resolve after spin completes (3.5s)
    setTimeout(() => {
      setIsSpinning(false);
      setLastResult({ isWin, winAmount: targetWin, landedAngle: landingAngle });
      setShowWinBox(true);

      // Save history
      const newEntry = {
        id: 'u_' + Date.now(),
        mult: multiplier,
        isWin
      };
      setHistory(prev => {
        const updated = [newEntry, ...prev.filter(x => x.id !== newEntry.id).slice(0, 19)];
        try {
          localStorage.setItem('royalx_upgrade_history_v3', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      if (isWin) {
        recordGameBet({
          game: 'Апгрейдер',
          betAmount,
          winAmount: targetWin,
          isWin: true,
          multiplier
        });

        try { bjAudio.playWin(); } catch (e) {}

        try {
          confetti({
            particleCount: 55,
            spread: 70,
            origin: { y: 0.55 },
            zIndex: 999999,
            colors: ['#00e699', '#38ef7d', '#00ffc8', '#ffffff', '#ffd200']
          });
        } catch (e) {}
      } else {
        recordGameBet({
          game: 'Апгрейдер',
          betAmount,
          winAmount: 0,
          isWin: false,
          multiplier: 0
        });

        try { bjAudio.playLose(); } catch (e) {}
      }
    }, 3500);
  };

  // SVG Wheel Parameters (Enlarged for maximum visual impact)
  const radius = 112;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;
  const greenStrokeLength = (winAngle / 360) * circumference;

  return (
    <div className="game-screen">
      {/* Top Header */}
      <GameHeader title="Апгрейдер" onBack={onBack} />

      {/* Main Arena */}
      <div className="game-arena" style={{ justifyContent: 'space-between', paddingBottom: '12px' }}>
        {/* Top History Bar */}
        <div className="upgrader-history-bar" style={{ marginTop: '2px', flexShrink: 0 }}>
          <span className="upgrader-history-label">ИСТОРИЯ</span>
          <div className="upgrader-history-list">
            {history.length > 0 ? (
              history.map(item => (
                <span
                  key={item.id}
                  className={`upgrader-history-pill ${item.isWin ? 'win' : 'lose'}`}
                >
                  {item.isWin ? `x${item.mult.toFixed(1)}` : '0x'}
                </span>
              ))
            ) : (
              <span style={{ fontSize: '11px', color: '#6e7485', padding: '2px 4px' }}>
                Сделайте ставку для начала
              </span>
            )}
          </div>
        </div>

        {/* Central Roulette Wheel Display (Bottom-Up Tachometer Gauge) */}
        <div className="upgrader-wheel-box" style={{ flex: 1, margin: 'auto 0' }}>
          <div className="upgrader-wheel-container">
            {/* Tachometer Gauge Percentage Labels: 100% top, 50% left & right, 0% bottom */}
            <span className="upgrader-gauge-tag tag-top">100%</span>
            <span className="upgrader-gauge-tag tag-left">50%</span>
            <span className="upgrader-gauge-tag tag-right">50%</span>
            <span className="upgrader-gauge-tag tag-bottom">0%</span>

            <svg
              className="upgrader-wheel-svg"
              viewBox="0 0 280 280"
              width="276"
              height="276"
            >
              <defs>
                <linearGradient id="upgradeWinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ff7700" />
                  <stop offset="50%" stopColor="#ffaa00" />
                  <stop offset="100%" stopColor="#ffd000" />
                </linearGradient>

                <filter id="winGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Outer Subtle Gauge Ring */}
              <circle
                cx="140"
                cy="140"
                r="130"
                fill="none"
                stroke="rgba(255, 255, 255, 0.06)"
                strokeWidth="1.2"
              />

              {/* Tachometer Tick Marks around the wheel */}
              {[...Array(60)].map((_, i) => {
                const deg = i * 6;
                const isMajor = deg % 30 === 0;
                const rad = (deg * Math.PI) / 180;
                const r1 = isMajor ? 119 : 123;
                const r2 = 128;
                const x1 = 140 + r1 * Math.cos(rad);
                const y1 = 140 + r1 * Math.sin(rad);
                const x2 = 140 + r2 * Math.cos(rad);
                const y2 = 140 + r2 * Math.sin(rad);
                return (
                  <line
                    key={deg}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isMajor ? "rgba(255, 255, 255, 0.35)" : "rgba(255, 255, 255, 0.09)"}
                    strokeWidth={isMajor ? "1.8" : "1.0"}
                  />
                );
              })}

              {/* Background Losing Track */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="#171922"
                strokeWidth={strokeWidth}
              />

              {/* Winning Sector Arc (centered at 6 o'clock = 90deg, fills bottom-up) */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="url(#upgradeWinGrad)"
                strokeWidth={strokeWidth}
                strokeDasharray={`${greenStrokeLength} ${circumference}`}
                strokeDashoffset="0"
                transform={`rotate(${90 - winAngle / 2} 140 140)`}
                filter={winChance > 1 ? 'url(#winGlow)' : undefined}
                className="upgrader-green-arc"
              />
            </svg>

            {/* Rotating Needle / Arrow in center */}
            <div
              className="upgrader-needle-wrapper"
              style={{
                transform: `rotate(${rotationAngle}deg)`,
                transition: isSpinning
                  ? 'transform 3.5s cubic-bezier(0.12, 0.8, 0.33, 1)'
                  : 'none'
              }}
            >
              <div className="upgrader-needle-arrow">
                <div className="upgrader-needle-tip" />
                <div className="upgrader-needle-shaft" />
              </div>
            </div>

            {/* Center Hub & Display Info */}
            <div className="upgrader-center-hub">
              <div className="upgrader-hub-ring">
                <div className="upgrader-hub-content">
                  <div className="upgrader-hub-main-percent">
                    {winChance.toFixed(2)}%
                  </div>
                  <div className="upgrader-hub-chance-label">
                    {winChance < 30 ? 'низкий шанс' : (winChance < 60 ? 'средний шанс' : 'высокий шанс')}
                  </div>
                  <div className="upgrader-hub-payout-box">
                    <span className="upgrader-hub-target-val">${targetWin.toFixed(2)}</span>
                    <span className="upgrader-hub-mult-tag">x{multiplier.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Result Alert / Celebration Overlay */}
          {showWinBox && !isBetModalOpen && lastResult && (
            <div
              className={`mines-win-box ${lastResult.isWin ? 'win' : 'loss'} ${isClosingWinBox ? 'closing' : ''}`}
              onClick={dismissWinBox}
            >
              <span className="mines-win-label">{lastResult.isWin ? 'Выигрыш' : 'Проигрыш'}</span>
              <span className="mines-win-value">
                {lastResult.isWin ? `+$${lastResult.winAmount.toFixed(2)}` : `-$${betAmount.toFixed(2)}`}
              </span>
              <span className="mines-win-multiplier">
                {lastResult.isWin ? `x${Number(multiplier.toFixed(2))}` : '0.00x'}
              </span>
            </div>
          )}
        </div>

        {/* Current Config Summary Tag */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          margin: '0 auto 10px',
          padding: '6px 14px',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '12px',
          color: '#8a8f99'
        }}>
          <span>Ставка: <b style={{ color: '#ffffff' }}>${betAmount.toFixed(2)}</b></span>
          <span>•</span>
          <span>Множитель: <b style={{ color: '#00e699' }}>x{multiplier.toFixed(2)}</b></span>
          <span>•</span>
          <span>Шанс: <b style={{ color: '#00ccff' }}>{winChance.toFixed(2)}%</b></span>
        </div>

        {/* Single Main Action Button (Matching Mines & Dice Exactly) */}
        <div className="mines-action-bar">
          {isSpinning ? (
            <button className="mines-bet-trigger-btn waiting-mode" disabled>
              Вращение рулетки...
            </button>
          ) : (
            <button
              className="mines-bet-trigger-btn"
              onClick={() => {
                if (showWinBox) dismissWinBox();
                setIsBetModalOpen(true);
              }}
            >
              Сделать ставку
            </button>
          )}
        </div>
      </div>

      {/* Slide-Up Bet & Upgrade Settings Bottom Sheet Modal - ULTRA COMPACT (2X SMALLER) */}
      {isBetModalOpen && (
        <div
          className={`modal-overlay ${isClosingBetModal ? 'closing' : ''} crash-ton-overlay`}
          onClick={closeBetModal}
        >
          <div
            className={`modal-container upgrader-compact-modal ${isClosingBetModal ? 'closing' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header: Title + Close Button */}
            <div className="upg-modal-header">
              <span className="upg-modal-title">Настройка ставки</span>
              <button className="upg-modal-close-btn" onClick={closeBetModal}>
                <CloseIcon size={14} color="#8a8d98" />
              </button>
            </div>

            {/* Input Card */}
            <div className="upg-input-card">
              <span className="upg-input-prefix">
                <TetherIcon size={18} />
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.15"
                className="upg-number-input"
                value={betAmount === 0 ? '' : betAmount}
                placeholder="1.00"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') return setBetAmount(0);
                  const val = parseFloat(raw);
                  if (isNaN(val)) setBetAmount(0);
                  else setBetAmount(Math.min(balance > 0 ? balance : 1000, val));
                }}
              />
            </div>

            {/* Symmetrical Quick Chips Grid (All 5 buttons perfectly even) */}
            <div className="upg-quick-chips-grid">
              {[0.5, 1, 5].map(amt => (
                <button
                  key={amt}
                  type="button"
                  className={`upg-chip-btn ${betAmount === amt ? 'active' : ''}`}
                  onClick={() => {
                    try { bjAudio.playChip(); } catch (e) {}
                    setBetAmount(amt);
                  }}
                >
                  <TetherIcon size={13} /> {amt}
                </button>
              ))}
              <button
                type="button"
                className="upg-chip-btn"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(prev => Math.max(0.15, parseFloat(((Number(prev) || 0) / 2).toFixed(2))));
                }}
              >
                ½
              </button>
              <button
                type="button"
                className="upg-chip-btn"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(prev => Math.min(balance > 0 ? balance : 1000, parseFloat(((Number(prev) || 0) * 2).toFixed(2))));
                }}
              >
                2X
              </button>
            </div>

            {/* Compact Chance & Multiplier Card */}
            <div className="upg-compact-subcard">
              {/* Mode Toggle: Шанс (%) vs Множитель (X) */}
              <div className="upg-mode-toggle">
                <button
                  type="button"
                  className={`upg-toggle-tab ${upgradeMode === 'chance' ? 'active' : ''}`}
                  onClick={() => setUpgradeMode('chance')}
                >
                  Шанс (%)
                </button>
                <button
                  type="button"
                  className={`upg-toggle-tab ${upgradeMode === 'multiplier' ? 'active' : ''}`}
                  onClick={() => setUpgradeMode('multiplier')}
                >
                  Множитель (X)
                </button>
              </div>

              {upgradeMode === 'chance' ? (
                <>
                  <div className="upg-stepper-row">
                    <span className="upg-sub-label">Шанс:</span>
                    <div className="upg-stepper">
                      <button
                        type="button"
                        className="upg-step-btn"
                        onClick={() => handleAdjustChance(-5)}
                      >–</button>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="75"
                        className="upg-step-input"
                        value={chancePercent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const clamped = Math.max(0.5, Math.min(75, val));
                            setChancePercent(clamped);
                            setMultiplier(parseFloat((100 / clamped).toFixed(2)));
                          }
                        }}
                      />
                      <span className="upg-step-unit">%</span>
                      <button
                        type="button"
                        className="upg-step-btn"
                        onClick={() => handleAdjustChance(5)}
                      >+</button>
                    </div>
                  </div>

                  {/* Chance Chips */}
                  <div className="upg-chips-grid">
                    {[10, 20, 25, 33, 50, 75].map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`upg-chance-pill ${Math.abs(chancePercent - c) < 0.6 ? 'active' : ''}`}
                        onClick={() => handleSelectChance(c)}
                      >
                        {c}%
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="upg-stepper-row">
                    <span className="upg-sub-label">Множитель:</span>
                    <div className="upg-stepper">
                      <button
                        type="button"
                        className="upg-step-btn"
                        onClick={() => handleAdjustMultiplier(-0.5)}
                      >–</button>
                      <input
                        type="number"
                        step="0.1"
                        min="1.33"
                        max="500"
                        className="upg-step-input"
                        value={multiplier}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const clamped = Math.max(1.33, Math.min(500, val));
                            setMultiplier(clamped);
                            setChancePercent(Math.min(75, parseFloat((100 / clamped).toFixed(2))));
                          }
                        }}
                      />
                      <span className="upg-step-unit">x</span>
                      <button
                        type="button"
                        className="upg-step-btn"
                        onClick={() => handleAdjustMultiplier(0.5)}
                      >+</button>
                    </div>
                  </div>

                  {/* Multiplier Chips */}
                  <div className="upg-chips-grid">
                    {[1.5, 2.0, 3.0, 5.0, 10.0, 20.0].map(m => (
                      <button
                        key={m}
                        type="button"
                        className={`upg-chance-pill ${Math.abs(multiplier - m) < 0.1 ? 'active' : ''}`}
                        onClick={() => handleSelectMultiplier(m)}
                      >
                        {m}x
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Compact 1-line readout */}
              <div className="upg-readout-line">
                <span>Шанс: <b style={{ color: '#00ccff' }}>{winChance.toFixed(1)}%</b></span>
                <span>•</span>
                <span>Множитель: <b style={{ color: '#00e699' }}>x{multiplier.toFixed(2)}</b></span>
                <span>•</span>
                <span>Выигрыш: <b style={{ color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><TetherIcon size={13} /> {targetWin.toFixed(2)}</b></span>
              </div>
            </div>

            {/* Bottom Row: Balance + Submit */}
            <div className="upg-bottom-row">
              <span className="upg-balance-info" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                Баланс: <TetherIcon size={22} /> <span>{balance.toFixed(2)}</span>
              </span>
              <button
                type="button"
                className="upg-submit-btn"
                disabled={betAmount < 0.15 || (balance > 0 && betAmount > balance)}
                onClick={handleSpinFromModal}
              >
                {balance > 0 && balance < betAmount ? 'Мало средств' : `Крутить (${betAmount.toFixed(2)} USDT)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
