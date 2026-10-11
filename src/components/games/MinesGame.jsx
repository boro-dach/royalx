import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { bjAudio } from '../../utils/blackjackAudio';
import { CloseIcon, TetherIcon } from '../common/Icons';
import GameHeader from './GameHeader';
import './Games.css';

// Preload authentic Apple sticker assets in cache immediately
if (typeof window !== 'undefined') {
  const _imgGem = new Image();
  _imgGem.src = '/apple-gem.png';
  const _imgBomb = new Image();
  _imgBomb.src = '/apple-bomb.png';
}

const GRID_SIZE = 25;
const MINE_PRESETS = [2, 3, 5, 10, 24];

function calculateMultiplier(minesCount, gemsFound) {
  if (gemsFound <= 0) return 1.0;
  let mult = 1.0;
  for (let i = 0; i < gemsFound; i++) {
    mult *= (GRID_SIZE - i) / (GRID_SIZE - minesCount - i);
  }
  return parseFloat((mult * 0.98).toFixed(2));
}

// Minimalist star icon for closed tiles matching the reference
function StarIcon() {
  return (
    <svg 
      className="mines-star-icon"
      width="32" 
      height="32" 
      viewBox="0 0 24 24" 
      fill="currentColor"
    >
      <path d="M12 2.5l2.8 6.1 6.7.7-5 4.6 1.4 6.6-5.9-3.4-5.9 3.4 1.4-6.6-5-4.6 6.7-.7L12 2.5z" strokeLinejoin="round" />
    </svg>
  );
}

const STORAGE_KEY = 'royalx_mines_history_v4';

function getMultiplierColor(mult, isWin) {
  if (!isWin || mult <= 0) return '#ff4d4d'; // Красный (проигрыш 0x)
  if (mult < 2.0) return '#00e699';          // Зеленый (до 2x)
  if (mult < 5.0) return '#22c55e';          // Изумрудный (2x - 5x)
  if (mult < 10.0) return '#a855f7';         // Фиолетовый (5x - 10x)
  if (mult < 25.0) return '#f43f5e';         // Розовый (10x - 25x)
  return '#ffb703';                          // Золотой (25x+)
}

function getMultiplierBg(mult, isWin) {
  if (!isWin || mult <= 0) return 'rgba(255, 77, 77, 0.12)';
  if (mult < 2.0) return 'rgba(0, 230, 153, 0.12)';
  if (mult < 5.0) return 'rgba(34, 197, 94, 0.12)';
  if (mult < 10.0) return 'rgba(168, 85, 247, 0.12)';
  if (mult < 25.0) return 'rgba(244, 63, 94, 0.12)';
  return 'rgba(255, 183, 3, 0.15)';
}

function getMultiplierBorder(mult, isWin) {
  if (!isWin || mult <= 0) return 'rgba(255, 77, 77, 0.3)';
  if (mult < 2.0) return 'rgba(0, 230, 153, 0.3)';
  if (mult < 5.0) return 'rgba(34, 197, 94, 0.3)';
  if (mult < 10.0) return 'rgba(168, 85, 247, 0.3)';
  if (mult < 25.0) return 'rgba(244, 63, 94, 0.3)';
  return 'rgba(255, 183, 3, 0.4)';
}

export default function MinesGame({ onBack }) {
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

  // Active Session Persistence (Restore active round if player accidentally exits)
  const ACTIVE_SESSION_KEY = 'royalx_mines_active_session_v3';
  const [activeSession] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.gameState === 'playing' && Array.isArray(parsed.tiles)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  const [betAmount, setBetAmount] = useState(activeSession ? activeSession.betAmount : 1);
  const [minesCount, setMinesCount] = useState(activeSession ? activeSession.minesCount : 3);
  const [gameState, setGameState] = useState(activeSession ? 'playing' : 'idle'); // 'idle' | 'playing' | 'won' | 'lost'
  const [tiles, setTiles] = useState(
    activeSession 
      ? activeSession.tiles 
      : Array.from({ length: GRID_SIZE }, (_, i) => ({ id: i, isMine: false, revealed: false }))
  );
  const [gemsFound, setGemsFound] = useState(activeSession ? activeSession.gemsFound : 0);
  const [currentWin, setCurrentWin] = useState(activeSession ? activeSession.currentWin : 0);
  const [showWinBox, setShowWinBox] = useState(false);
  const [isClosingWinBox, setIsClosingWinBox] = useState(false);
  const [winBoxData, setWinBoxData] = useState({ amount: 0, mult: 1 });
  const winBoxTimerRef = useRef(null);
  const historyBarRef = useRef(null);

  // Notify player if an active round was recovered upon entering
  useEffect(() => {
    if (activeSession) {
      showToast('⚡ Активный раунд восстановлен! Вы можете продолжить игру.', false);
    }
  }, []);

  // Sync active round to localStorage on every change
  useEffect(() => {
    if (gameState === 'playing') {
      try {
        localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
          betAmount,
          minesCount,
          tiles,
          gemsFound,
          currentWin,
          gameState: 'playing'
        }));
      } catch (e) {}
    } else {
      try {
        localStorage.removeItem(ACTIVE_SESSION_KEY);
      } catch (e) {}
    }
  }, [gameState, tiles, gemsFound, currentWin, betAmount, minesCount]);

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

  // Persistent round history stored in localStorage - ONLY real user games (no mock data)
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return []; // Starts empty and accumulates user's real games.
  });

  // Automatically scroll history bar so newest outcome on the left is visible
  useEffect(() => {
    if (historyBarRef.current) {
      historyBarRef.current.scrollTo({
        left: 0,
        behavior: 'smooth'
      });
    }
  }, [history]);

  const recordRoundOutcome = (roundMult, isWin) => {
    setHistory(prev => {
      // Newest game arrives to the left of the old game: [newEntry, ...prev]
      const newEntry = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        mult: roundMult,
        isWin
      };
      const updated = [newEntry, ...prev.slice(0, 19)];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Slide-up bottom sheet modal state
  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isClosingBetModal, setIsClosingBetModal] = useState(false);

  const multiplier = calculateMultiplier(minesCount, gemsFound);
  const nextMultiplier = calculateMultiplier(minesCount, gemsFound + 1);

  const closeBetModal = () => {
    setIsClosingBetModal(true);
    setTimeout(() => {
      setIsBetModalOpen(false);
      setIsClosingBetModal(false);
    }, 220);
  };

  // Start new round
  const handleStartGame = () => {
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
    processBetForPass(betAmount, `mines_${Date.now()}`);

    // Place mines randomly
    const mineIndices = new Set();
    while (mineIndices.size < minesCount) {
      const rand = Math.floor(Math.random() * GRID_SIZE);
      mineIndices.add(rand);
    }

    const newTiles = Array.from({ length: GRID_SIZE }, (_, i) => ({
      id: i,
      isMine: mineIndices.has(i),
      revealed: false
    }));

    setTiles(newTiles);
    setGemsFound(0);
    setCurrentWin(0);
    setShowWinBox(false);
    setGameState('playing');
  };

  const handleStartGameFromModal = () => {
    if (balance < betAmount) {
      showToast('❌ Недостаточно средств!', true);
      return;
    }
    if (betAmount < 0.15) {
      showToast('❌ Минимальная ставка $0.15!', true);
      return;
    }
    closeBetModal();
    handleStartGame();
  };

  // Click on tile
  const handleTileClick = (index) => {
    if (gameState !== 'playing') return;
    let currentTiles = [...tiles];
    let tile = currentTiles[index];
    if (tile.revealed) return;

    // Admin God Mode / Personal user RTP override
    const shouldAvoidMine = 
      adminSettings?.minesAlwaysWin || 
      adminSettings?.minesRtp === 'win' || 
      adminSettings?.globalRtp === 'win' || 
      userRtp === 'win';

    const shouldForceMine = 
      adminSettings?.minesRtp === 'lose' || 
      adminSettings?.globalRtp === 'lose' || 
      userRtp === 'lose';

    const isCasinoMode = 
      adminSettings?.globalRtp === 'casino' || 
      adminSettings?.minesRtp === 'casino' || 
      userRtp === 'casino';

    const targetRtp = adminSettings?.targetRtpPercent !== undefined 
      ? Math.max(20, Math.min(98, parseFloat(adminSettings.targetRtpPercent))) 
      : 80;

    let shouldHitMine = shouldForceMine;

    if (!shouldAvoidMine && !shouldForceMine && isCasinoMode) {
      // Smart Casino Profit Algorithm:
      // Controls survival rate based on target RTP (e.g. 80%)
      const nextGems = gemsFound + 1;
      const nextMult = calculateMultiplier(minesCount, nextGems);
      const houseEdge = (100 - targetRtp) / 100; // e.g. 0.20 for 80% RTP

      let mineChance = 0;
      if (nextGems === 1) {
        // 1st click: user gets enticing safe start (10-15% mine chance)
        mineChance = 0.08 + houseEdge * 0.25;
      } else if (nextGems === 2) {
        // 2nd click: moderate risk (25-35% mine chance)
        mineChance = 0.22 + houseEdge * 0.45;
      } else if (nextGems === 3) {
        // 3rd click: house edge activates (50-65% mine chance)
        mineChance = 0.45 + houseEdge * 0.65;
      } else {
        // 4+ clicks: high multipliers, casino secures its net positive profit
        mineChance = Math.min(0.92, 0.60 + (nextGems - 3) * 0.10 + houseEdge * 0.80);
      }

      if (nextMult >= 3.5 && Math.random() < 0.85) {
        mineChance = 0.88;
      }

      if (Math.random() < mineChance) {
        shouldHitMine = true;
      }
    }

    if (tile.isMine && shouldAvoidMine) {
      // Find another unrevealed safe tile to swap with
      const safeIndex = currentTiles.findIndex((t, idx) => idx !== index && !t.isMine && !t.revealed);
      if (safeIndex !== -1) {
        currentTiles[index] = { ...tile, isMine: false };
        currentTiles[safeIndex] = { ...currentTiles[safeIndex], isMine: true };
        tile = currentTiles[index];
      }
    } else if (!tile.isMine && shouldHitMine) {
      const mineIndex = currentTiles.findIndex((t, idx) => idx !== index && t.isMine && !t.revealed);
      if (mineIndex !== -1) {
        currentTiles[index] = { ...tile, isMine: true };
        currentTiles[mineIndex] = { ...currentTiles[mineIndex], isMine: false };
        tile = currentTiles[index];
      } else {
        tile = { ...tile, isMine: true };
        currentTiles[index] = tile;
      }
    }

    if (tile.isMine) {
      // Hit a mine!
      const revealedTiles = currentTiles.map(t => ({ ...t, revealed: true }));
      setTiles(revealedTiles);
      setGameState('lost');
      setShowWinBox(false);
      processBetForCashback(betAmount);
      recordGameBet({
        game: 'Mines',
        betAmount,
        winAmount: 0,
        isWin: false,
        multiplier: 0
      });
      showToast('💥 Взрыв! Раунд проигран', true);
      recordRoundOutcome(0.00, false);
    } else {
      // Found a safe gem!
      currentTiles[index] = { ...tile, revealed: true };
      setTiles(currentTiles);

      const nextGems = gemsFound + 1;
      setGemsFound(nextGems);
      const nextMult = calculateMultiplier(minesCount, nextGems);
      const winAmt = parseFloat((betAmount * nextMult).toFixed(2));
      setCurrentWin(winAmt);

      // Check if all safe gems collected
      const totalSafe = GRID_SIZE - minesCount;
      if (nextGems >= totalSafe) {
        handleCashout(winAmt, nextMult);
      }
    }
  };

  // Cashout current winnings
  const handleCashout = (overrideWin = null, overrideMult = null) => {
    if (gameState !== 'playing' || gemsFound === 0) return;
    const finalMult = overrideMult || multiplier;
    const winAmt = overrideWin || currentWin || parseFloat((betAmount * finalMult).toFixed(2));

    recordGameBet({
      game: 'Mines',
      betAmount,
      winAmount: winAmt,
      isWin: true,
      multiplier: finalMult
    });

    // Reveal rest of board gently
    setTiles(prev => prev.map(t => ({ ...t, revealed: true })));
    setGameState('won');
    setWinBoxData({
      amount: winAmt,
      mult: finalMult
    });
    setShowWinBox(true);

    // Ultra-lightweight 60fps canvas confetti burst without lag
    try {
      confetti({
        particleCount: 45,
        spread: 60,
        startVelocity: 26,
        origin: { y: 0.55 },
        colors: ['#00e699', '#38ef7d', '#00ffc8', '#ffffff', '#ffd200'],
        disableForReducedMotion: true,
        ticks: 200,
        zIndex: 999999
      });
    } catch (e) {}

    showToast(`🎉 Выигрыш +$${winAmt.toFixed(2)} (x${finalMult})!`);
    recordRoundOutcome(finalMult, true);
  };

  // Select mines count
  const handleSelectMinesCount = (count) => {
    if (gameState === 'playing') return;
    setMinesCount(count);
    if (gameState !== 'idle') {
      setTiles(Array.from({ length: GRID_SIZE }, (_, i) => ({ id: i, isMine: false, revealed: false })));
      setGemsFound(0);
      setCurrentWin(0);
      setShowWinBox(false);
      setGameState('idle');
    }
  };

  const handleSafeBack = () => {
    if (gameState === 'playing') {
      showToast('⚡ Раунд сохранен! Вы сможете продолжить его в любой момент.', false);
    }
    onBack();
  };

  return (
    <div className="game-screen">
      {/* Top Header */}
      <GameHeader title="Мины" onBack={handleSafeBack} />

      {/* Main Arena */}
      <div className="game-arena mines-game-arena">
        {/* Top Status Info with Apple stickers on all platforms */}
        <div className="mines-top-info">
          <div className="mines-badge">
            <img src="/apple-bomb.png" alt="Bomb" className="mines-badge-img" draggable={false} />
            <span>{minesCount} мин</span>
          </div>
          <div className="mines-badge">
            <img src="/apple-gem.png" alt="Gem" className="mines-badge-img" draggable={false} />
            <span>{gemsFound} / {GRID_SIZE - minesCount}</span>
          </div>
          <div className="mines-mult-badge">
            x{multiplier.toFixed(2)}
          </div>
        </div>

        {/* 5x5 Mines Grid */}
        <div 
          className="mines-grid-wrapper"
          onClick={() => {
            if (showWinBox) dismissWinBox();
          }}
        >
          <div className="mines-grid">
            {tiles.map((tile, idx) => {
              let tileClass = 'mines-tile';
              let content = null;

              if (tile.revealed) {
                if (tile.isMine) {
                  tileClass += ' revealed-mine';
                  content = <img src="/apple-bomb.png" alt="Bomb" className="mines-emoji-sticker" draggable={false} />;
                } else {
                  tileClass += ' revealed-gem';
                  content = <img src="/apple-gem.png" alt="Gem" className="mines-emoji-sticker" draggable={false} />;
                }
                if (gameState === 'won' && !tile.isMine && gemsFound < GRID_SIZE - minesCount) {
                  tileClass += ' revealed-dimmed';
                }
              } else {
                // Unrevealed tile: star icon matching reference
                content = <StarIcon />;
              }

              return (
                <button
                  key={tile.id}
                  className={tileClass}
                  disabled={gameState !== 'playing' || tile.revealed}
                  onClick={() => handleTileClick(idx)}
                >
                  {content}
                </button>
              );
            })}
          </div>

          {/* Victory Central Result Box */}
          {showWinBox && (
            <div 
              className={`mines-win-box ${isClosingWinBox ? 'closing' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                dismissWinBox();
              }}
            >
              <span className="mines-win-label">Выигрыш</span>
              <span className="mines-win-value">${winBoxData.amount.toFixed(2)}</span>
              <span className="mines-win-multiplier">x{Number(winBoxData.mult.toFixed(2))}</span>
            </div>
          )}
        </div>

        {/* Game History Bar Under Grid, Above Action Button */}
        <div className="mines-history-bar" ref={historyBarRef}>
          {history.map((item, idx) => {
            const mult = item.mult || 0;
            const isWin = item.isWin;
            return (
              <span
                key={item.id || idx}
                className="mines-history-pill"
                style={{
                  color: getMultiplierColor(mult, isWin),
                  backgroundColor: getMultiplierBg(mult, isWin),
                  borderColor: getMultiplierBorder(mult, isWin)
                }}
              >
                {isWin ? `${mult.toFixed(2)}x` : '0.00x'}
              </span>
            );
          })}
        </div>

        {/* Single Main Action Button Under Grid (Lifted & Compact) */}
        <div className="mines-action-bar">
          {gameState === 'playing' ? (
            <button
              className={`mines-bet-trigger-btn ${gemsFound > 0 ? 'cashout-mode' : 'waiting-mode'}`}
              disabled={gemsFound === 0}
              onClick={() => handleCashout()}
            >
              {gemsFound === 0 
                ? 'Откройте клетку' 
                : `Забрать ${(betAmount * multiplier).toFixed(2)} USDT (x${multiplier.toFixed(2)})`}
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

      {/* Slide-Up Bet & Mines Settings Bottom Sheet Modal (Matching New TON Style Design) */}
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
              <span className="crash-ton-title">Сделать ставку</span>
              <button className="crash-ton-close-btn" onClick={closeBetModal}>
                <CloseIcon size={14} color="#8a8d98" />
              </button>
            </div>

            {/* Big Central Display Card: USD Centered Above Digits */}
            <div className="crash-ton-display-card">
              <span className="crash-ton-unit-above">USD</span>
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

            {/* Quick Chips Row for Bet */}
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
                  setBetAmount(prev => Math.max(0.15, parseFloat(((Number(prev) || 0) / 2).toFixed(2))));
                }}
              >
                ½
              </button>
            </div>

            {/* Mines Count Section on the SAME Page */}
            <div className="crash-ton-sub-card">
              <div className="crash-ton-sub-header">
                <span className="crash-ton-sub-label">Количество мин</span>
                <div className="crash-ton-stepper">
                  <button 
                    type="button" 
                    className="crash-ton-step-btn"
                    onClick={() => handleSelectMinesCount(Math.max(1, minesCount - 1))}
                  >–</button>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    className="crash-ton-step-input"
                    value={minesCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        handleSelectMinesCount(Math.max(1, Math.min(24, val)));
                      }
                    }}
                  />
                  <span className="crash-ton-step-x">мин</span>
                  <button 
                    type="button" 
                    className="crash-ton-step-btn"
                    onClick={() => handleSelectMinesCount(Math.min(24, minesCount + 1))}
                  >+</button>
                </div>
              </div>
              <div className="crash-ton-chips-row compact">
                {MINE_PRESETS.map(count => (
                  <button
                    key={count}
                    type="button"
                    className={`crash-ton-chip-pill ${minesCount === count ? 'active-chip' : ''}`}
                    onClick={() => handleSelectMinesCount(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Balance info */}
            <div className="crash-ton-balance-row">
              <span className="crash-ton-balance-title">Баланс:</span>
              <span className="crash-ton-balance-val">
                <TetherIcon size={22} />
                <span>{balance.toFixed(2)}</span>
              </span>
            </div>

            {/* Start Game Action Button */}
            <button
              type="button"
              className="crash-ton-submit-btn"
              disabled={betAmount < 0.15 || betAmount > balance}
              onClick={handleStartGameFromModal}
            >
              {balance < betAmount 
                ? 'Недостаточно средств' 
                : `Начать игру (${betAmount} USDT)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
