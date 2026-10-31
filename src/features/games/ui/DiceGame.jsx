import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '@/context/AppContext';
import { bjAudio } from '@/shared/lib/blackjackAudio';
import { CloseIcon, TetherIcon } from '@/shared/ui/Icons';
import GameHeader from './GameHeader';
import './Games.css';

const MIN_SUM = 2;
const MAX_SUM = 12;

// Possible sums of 2 dice (2 to 12) out of 36 outcomes
function countOutcomes(cmp, target) {
  let count = 0;
  for (let d1 = 1; d1 <= 6; d1++) {
    for (let d2 = 1; d2 <= 6; d2++) {
      const s = d1 + d2;
      if (cmp === 'under' && s < target) count++;
      if (cmp === 'over' && s > target) count++;
    }
  }
  return count;
}

function rollTwoDice() {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return { d1, d2, sum: d1 + d2 };
}

// Multiplier color tier helper matching Mines & Crash
function getMultiplierColor(mult, isWin) {
  if (isWin === false) return '#ff4d4d';
  const num = typeof mult === 'number' ? mult : parseFloat(mult) || 1.0;
  if (num < 1.50) return '#00e699';
  if (num < 2.00) return '#00cc88';
  if (num < 3.50) return '#ffb800';
  if (num < 6.00) return '#ff6b00';
  if (num < 10.00) return '#ec4899';
  return '#a855f7';
}

// Real Precision Casino Die Component (Authentic translucent ruby red casino die with flush white pips)
function DieFace({ value, isWin, isRolling }) {
  const pipsMap = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [2, 0], [0, 2], [2, 2]],
    5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]]
  };

  const pips = pipsMap[value] || [[1, 1]];
  const statusClass = isWin === true ? 'win' : isWin === false ? 'loss' : '';

  return (
    <div className={`dice-real-cube ${isRolling ? 'rolling' : ''} ${statusClass}`}>
      {/* 3D Glass specular sheen */}
      <div className="dice-real-sheen" />
      <div className="dice-real-surface">
        {[0, 1, 2].map(r => (
          <div key={r} className="dice-real-row">
            {[0, 1, 2].map(c => {
              const hasPip = pips.some(([pc, pr]) => pc === c && pr === r);
              return (
                <div key={c} className="dice-real-pip-slot">
                  {hasPip && <div className="dice-real-pip" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DiceGame({ onBack }) {
  const {
    balance,
    setBalance,
    syncBalance,
    recordGameBet,
    showToast,
    processBetForCashback,
    processBetForPass,
    adminSettings,
    userRtp
  } = useApp();

  const [betAmount, setBetAmount] = useState(1);
  const [targetNumber, setTargetNumber] = useState(7);
  const [rollMode, setRollMode] = useState('over'); // 'under' (<) or 'over' (>)
  const [isRolling, setIsRolling] = useState(false);
  const [rollResult, setRollResult] = useState({ sum: 7, d1: 3, d2: 4, isWin: null });

  // Persistent round history stored in localStorage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('royalx_dice_history_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'd1', sum: 8, mult: 1.92, isWin: true },
      { id: 'd2', sum: 4, mult: 2.40, isWin: false },
      { id: 'd3', sum: 9, mult: 1.65, isWin: true },
      { id: 'd4', sum: 11, mult: 3.20, isWin: false },
      { id: 'd5', sum: 7, mult: 1.50, isWin: true }
    ];
  });

  // Modal State for TON style bottom sheet
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isClosingBetModal, setIsClosingBetModal] = useState(false);

  // Result Box State (Matching Mines)
  const [showResultBox, setShowResultBox] = useState(false);
  const [isClosingResultBox, setIsClosingResultBox] = useState(false);
  const [resultBoxData, setResultBoxData] = useState({ isWin: false, amount: 0, mult: 1 });
  const resultBoxTimerRef = useRef(null);

  const dismissResultBox = () => {
    if (resultBoxTimerRef.current) clearTimeout(resultBoxTimerRef.current);
    setIsClosingResultBox(true);
    setTimeout(() => {
      setShowResultBox(false);
      setIsClosingResultBox(false);
    }, 200);
  };

  const historyBarRef = useRef(null);

  // Auto-scroll history so newest result on left is always visible
  useEffect(() => {
    if (historyBarRef.current) {
      historyBarRef.current.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    }
  }, [history]);

  // Odds and Multiplier calculation
  const outcomes = countOutcomes(rollMode, targetNumber);
  const winChancePct = parseFloat(((outcomes / 36) * 100).toFixed(1));
  const multiplier = winChancePct > 0
    ? parseFloat((96 / winChancePct).toFixed(2))
    : 99;
  const potentialProfit = parseFloat((betAmount * multiplier).toFixed(2));

  const sliderMin = rollMode === 'under' ? MIN_SUM + 1 : MIN_SUM;
  const sliderMax = rollMode === 'over' ? MAX_SUM - 1 : MAX_SUM;

  const handleSetMode = (mode) => {
    if (isRolling) return;
    setRollMode(mode);
    setTargetNumber(7);
  };

  const openBetModal = () => {
    if (isRolling) return;
    dismissResultBox();
    setIsBetModalOpen(true);
  };

  const closeBetModal = () => {
    setIsClosingBetModal(true);
    setTimeout(() => {
      setIsBetModalOpen(false);
      setIsClosingBetModal(false);
    }, 220);
  };

  // Roll Execution
  const handleRoll = () => {
    if (balance < betAmount) {
      showToast('❌ Недостаточно средств!', true);
      return;
    }
    if (betAmount < 0.15) {
      showToast('❌ Минимальная ставка $0.15!', true);
      return;
    }

    setBalance(prev => {
      const next = Math.max(0, parseFloat((prev - betAmount).toFixed(2)));
      syncBalance(next);
      return next;
    });
    setIsRolling(true);
    bjAudio.playDice();

    // High-speed tumble animation
    let frames = 0;
    const interval = setInterval(() => {
      const anim = rollTwoDice();
      setRollResult({ sum: anim.sum, d1: anim.d1, d2: anim.d2, isWin: null });
      frames++;
      if (frames > 15) {
        clearInterval(interval);
        finalizeRoll();
      }
    }, 50);
  };

  const finalizeRoll = () => {
    let { d1, d2, sum } = rollTwoDice();
    let isWin = rollMode === 'under' ? sum < targetNumber : sum > targetNumber;

    // Admin Overrides & Personal User RTP
    const forceWin = adminSettings?.diceForceResult === 'win' || adminSettings?.globalRtp === 'win' || userRtp === 'win';
    const forceLose = adminSettings?.diceForceResult === 'lose' || adminSettings?.globalRtp === 'lose' || userRtp === 'lose';
    const isCasinoMode = adminSettings?.diceForceResult === 'casino' || adminSettings?.globalRtp === 'casino' || userRtp === 'casino';
    const targetRtp = adminSettings?.targetRtpPercent !== undefined ? parseFloat(adminSettings.targetRtpPercent) : 80;

    let shouldLose = forceLose;
    if (isCasinoMode && isWin && !forceWin) {
      // Scale win chance by target RTP (e.g. 80%)
      const houseCut = (100 - targetRtp) / 100;
      if (Math.random() < houseCut || multiplier > 3.0) {
        shouldLose = true;
      }
    }

    if (forceWin && !isWin) {
      isWin = true;
      if (rollMode === 'under') {
        sum = Math.max(2, targetNumber - 1);
      } else {
        sum = Math.min(12, targetNumber + 1);
      }
      d1 = Math.floor(sum / 2);
      d2 = sum - d1;
    } else if (shouldLose && isWin) {
      isWin = false;
      if (rollMode === 'under') {
        sum = Math.min(12, targetNumber);
      } else {
        sum = Math.max(2, targetNumber);
      }
      d1 = Math.floor(sum / 2);
      d2 = sum - d1;
    }

    setRollResult({ sum, d1, d2, isWin });
    setIsRolling(false);

    // Save history
    const finalMult = isWin ? multiplier : 0.00;
    const newEntry = {
      id: 'd_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      sum,
      mult: finalMult,
      isWin
    };

    setHistory(prev => {
      const updated = [newEntry, ...prev.slice(0, 24)];
      try {
        localStorage.setItem('royalx_dice_history_v2', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (isWin) {
      const winAmt = parseFloat((betAmount * multiplier).toFixed(2));
      recordGameBet({
        game: 'Dice',
        betAmount,
        winAmount: winAmt,
        isWin: true,
        multiplier
      });
      bjAudio.playWin();
      setResultBoxData({
        isWin: true,
        amount: winAmt,
        mult: multiplier
      });
      setIsClosingResultBox(false);
      setShowResultBox(true);
      if (resultBoxTimerRef.current) clearTimeout(resultBoxTimerRef.current);
      resultBoxTimerRef.current = setTimeout(dismissResultBox, 2600);
      try {
        confetti({
          particleCount: 55,
          spread: 70,
          startVelocity: 28,
          origin: { y: 0.55 },
          colors: ['#00e699', '#38ef7d', '#00ffc8', '#ffffff', '#ffd200'],
          zIndex: 999999
        });
      } catch (e) {}
    } else {
      recordGameBet({
        game: 'Dice',
        betAmount,
        winAmount: 0,
        isWin: false,
        multiplier: 0
      });
      bjAudio.playLose();
      processBetForCashback(betAmount);
      setResultBoxData({
        isWin: false,
        amount: betAmount,
        mult: 0
      });
      setIsClosingResultBox(false);
      setShowResultBox(true);
      if (resultBoxTimerRef.current) clearTimeout(resultBoxTimerRef.current);
      resultBoxTimerRef.current = setTimeout(dismissResultBox, 2600);
    }
    processBetForPass(betAmount, `dice_${Date.now()}`);
  };

  const sliderNorm = (targetNumber - sliderMin) / (sliderMax - sliderMin);
  const currentMultColor = getMultiplierColor(multiplier, true);

  return (
    <div className="game-screen dice-custom-screen">
      {/* Top Header with Luxury Balance Box */}
      <GameHeader title="Куб (Dice)" onBack={onBack} />

      {/* Main Single-Screen Layout matching Crash & Mines */}
      <div className="dice-main-layout">
        {/* Dice Arena Card */}
        <div className="dice-arena-card">
          {/* Top Badges Row */}
          <div className="dice-arena-top-info">
            <div className="dice-top-badge">
              <span className="dice-badge-label">ЦЕЛЬ</span>
              <span className="dice-badge-val">
                {rollMode === 'under' ? `< ${targetNumber}` : `> ${targetNumber}`}
              </span>
            </div>
            <div className="dice-top-badge">
              <span className="dice-badge-label">ШАНС</span>
              <span className="dice-badge-val">{winChancePct}%</span>
            </div>
            <div className="dice-top-mult-badge" style={{ color: currentMultColor, borderColor: `${currentMultColor}40` }}>
              x{multiplier.toFixed(2)}
            </div>
          </div>

          {/* Central 3D Dice Display & Outcome */}
          <div className="dice-stage-center">
            {/* 3D Dice Cubes Row */}
            <div className="dice-stage-cubes-row">
              <DieFace value={rollResult.d1} isWin={rollResult.isWin} isRolling={isRolling} />
              <DieFace value={rollResult.d2} isWin={rollResult.isWin} isRolling={isRolling} />
            </div>

            {/* Big Minimalist Outcome Number */}
            <div
              className={`dice-outcome-number ${rollResult.isWin === true ? 'win' : rollResult.isWin === false ? 'loss' : ''} ${isRolling ? 'shuffling' : ''}`}
            >
              {rollResult.sum}
            </div>

            <div className="dice-outcome-subtext">
              {isRolling ? 'Бросаем кубики...' : `${rollResult.d1} + ${rollResult.d2} = ${rollResult.sum}`}
            </div>
          </div>

          {/* Target Controls: Under / Over Segment Selector */}
          <div className="dice-controls-zone">
            <div className="dice-toggle-group">
              <button
                type="button"
                className={`dice-toggle-btn ${rollMode === 'under' ? 'active' : ''}`}
                disabled={isRolling}
                onClick={() => handleSetMode('under')}
              >
                МЕНЬШЕ &lt; {targetNumber}
              </button>
              <button
                type="button"
                className={`dice-toggle-btn ${rollMode === 'over' ? 'active' : ''}`}
                disabled={isRolling}
                onClick={() => handleSetMode('over')}
              >
                БОЛЬШЕ &gt; {targetNumber}
              </button>
            </div>

            {/* Target Slider 2..12 */}
            <div className="dice-slider-box">
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step="1"
                value={targetNumber}
                disabled={isRolling}
                onChange={(e) => setTargetNumber(parseInt(e.target.value, 10))}
                className="dice-minimalist-slider"
                style={{ '--slider-norm': sliderNorm }}
              />
              <div className="dice-slider-ticks">
                {Array.from(
                  { length: sliderMax - sliderMin + 1 },
                  (_, i) => sliderMin + i
                ).map(n => (
                  <span
                    key={n}
                    className={`dice-slider-tick ${n === targetNumber ? 'active' : ''}`}
                    onClick={() => !isRolling && setTargetNumber(n)}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Central Result Box (Win or Loss like in Mines) */}
          {showResultBox && !isBetModalOpen && (
            <div
              className={`mines-win-box ${resultBoxData.isWin ? 'win' : 'loss'} ${isClosingResultBox ? 'closing' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                dismissResultBox();
              }}
            >
              <span className="mines-win-label">{resultBoxData.isWin ? 'Выигрыш' : 'Проигрыш'}</span>
              <span className="mines-win-value">
                {resultBoxData.isWin ? `+$${resultBoxData.amount.toFixed(2)}` : `-$${resultBoxData.amount.toFixed(2)}`}
              </span>
              <span className="mines-win-multiplier">
                {resultBoxData.isWin ? `x${Number(resultBoxData.mult.toFixed(2))}` : '0.00x'}
              </span>
            </div>
          )}
        </div>

        {/* History Pills Bar: Clean minimalist capsules with subtle borders */}
        <div className="dice-history-pills-row" ref={historyBarRef}>
          {history.map((h, idx) => {
            const isWin = h.isWin;
            const mult = h.mult || (isWin ? 1.92 : 0);
            const pillColor = getMultiplierColor(mult, isWin);

            return (
              <div
                key={h.id || `dice-hist-${idx}`}
                className="dice-history-pill"
                style={{
                  color: pillColor
                }}
              >
                {h.sum} • {isWin ? `x${mult.toFixed(2)}` : '0.00x'}
              </div>
            );
          })}
        </div>

        {/* Bottom Action Section */}
        <div className="dice-action-section">
          {/* Compact Bet Selector Bar */}
          <div className="dice-bet-selector-bar">
            <button
              type="button"
              className="dice-bet-display-pill"
              onClick={openBetModal}
              disabled={isRolling}
            >
              <span className="dice-bet-label">СТАВКА</span>
              <span className="dice-bet-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                {betAmount} <TetherIcon size={13} />
              </span>
              <span className="dice-bet-edit-icon-wrap" title="Настроить ставку">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0084ff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="dice-bet-edit-svg">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </span>
            </button>

            <div className="dice-quick-chips">
              <button
                type="button"
                className="dice-quick-chip"
                disabled={isRolling}
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(prev => Math.max(0.15, parseFloat(((Number(prev) || 0) / 2).toFixed(2))));
                }}
              >
                ½
              </button>
              <button
                type="button"
                className="dice-quick-chip"
                disabled={isRolling}
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(prev => Math.min(balance, parseFloat(((Number(prev) || 0) * 2).toFixed(2))));
                }}
              >
                2X
              </button>
              <button
                type="button"
                className="dice-quick-chip"
                disabled={isRolling}
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(balance);
                }}
              >
                MAX
              </button>
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            className="dice-huge-action-btn"
            disabled={isRolling || betAmount < 0.15 || betAmount > balance || outcomes === 0}
            onClick={handleRoll}
          >
            {isRolling ? (
              'БРОСАЕМ...'
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <span>БРОСИТЬ КУБИКИ</span>
                <span style={{ opacity: 0.85, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                  ({betAmount} <TetherIcon size={16} />)
                </span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Slide-Up Bet Modal (Identical TON Style to Crash & Mines) */}
      {isBetModalOpen && (
        <div
          className={`modal-overlay ${isClosingBetModal ? 'closing' : ''} crash-ton-overlay`}
          onClick={closeBetModal}
        >
          <div
            className={`modal-container crash-ton-modal ${isClosingBetModal ? 'closing' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            {/* Header: Centered Title + Round Dark Close Button */}
            <div className="crash-ton-header">
              <span className="crash-ton-title">Настройка ставки</span>
              <button className="crash-ton-close-btn" onClick={closeBetModal}>
                <CloseIcon size={14} color="#8a8d98" />
              </button>
            </div>

            {/* Big Central Display Card: USDT Centered Above Digits */}
            <div className="crash-ton-display-card">
              <span className="crash-ton-unit-above" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <TetherIcon size={15} />
                <span>USDT</span>
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.15"
                className="crash-ton-big-input"
                value={betAmount === 0 ? '' : betAmount}
                placeholder="0.15"
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    setBetAmount(0);
                    return;
                  }
                  const val = parseFloat(raw);
                  if (isNaN(val)) setBetAmount(0);
                  else setBetAmount(Math.min(balance, val));
                }}
              />
            </div>

            {/* Quick Chips Row */}
            <div className="crash-ton-chips-row">
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(0.15);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><TetherIcon size={14} /> 0.15</span>
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(0.5);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><TetherIcon size={14} /> 0.5</span>
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(1);
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><TetherIcon size={14} /> 1</span>
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(prev => Math.min(balance, parseFloat(((Number(prev) || 0) + 5).toFixed(2))));
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>+ <TetherIcon size={14} /> 5</span>
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(prev => Math.max(0.15, parseFloat(((Number(prev) || 0) / 2).toFixed(2))));
                }}
              >
                ½
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(prev => Math.min(balance, parseFloat(((Number(prev) || 0) * 2).toFixed(2))));
                }}
              >
                2X
              </button>
              <button
                type="button"
                className="crash-ton-chip-pill"
                onClick={() => {
                  try { bjAudio.playChip(); } catch (e) {}
                  setBetAmount(balance);
                }}
              >
                МАКС
              </button>
            </div>

            {/* Balance Info Row */}
            <div className="crash-ton-balance-row">
              <span className="crash-ton-balance-title">Баланс:</span>
              <span className="crash-ton-balance-val">
                <TetherIcon size={14} />
                {balance.toFixed(2)}
              </span>
            </div>

            {/* Modal CTA Button */}
            <button
              className="crash-ton-submit-btn dice-ready-btn"
              onClick={closeBetModal}
            >
              <span>ГОТОВО</span>
              <span className="dice-ready-btn-amount">
                ({betAmount} <TetherIcon size={16} />)
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
