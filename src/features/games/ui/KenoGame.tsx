import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '@/context/AppContext';
import { bjAudio } from '@/shared/lib/blackjackAudio';
import { TetherIcon } from '@/shared/ui/Icons';
import GameHeader from './GameHeader';
import BetControls from './BetControls';
import './Games.css';
import './NewGames.css';

// Keno Paytables for 1 to 10 selected numbers: { matchesCount: multiplier }
const KENO_PAYOUTS: Record<number, Record<number, number>> = {
  1: { 1: 3.80 },
  2: { 1: 1.70, 2: 5.20 },
  3: { 1: 1.10, 2: 2.70, 3: 24.00 },
  4: { 2: 1.80, 3: 5.00, 4: 80.00 },
  5: { 2: 1.40, 3: 3.50, 4: 14.00, 5: 280.00 },
  6: { 3: 2.50, 4: 7.00, 5: 65.00, 6: 550.00 },
  7: { 3: 1.80, 4: 4.50, 5: 25.00, 6: 180.00, 7: 700.00 },
  8: { 4: 3.00, 5: 12.00, 6: 60.00, 7: 350.00, 8: 850.00 },
  9: { 4: 2.20, 5: 7.00, 6: 30.00, 7: 120.00, 8: 500.00, 9: 950.00 },
  10: { 4: 1.60, 5: 4.50, 6: 18.00, 7: 80.00, 8: 250.00, 9: 700.00, 10: 1000.00 }
};

interface KenoResult {
  isWin: boolean;
  matchedCount: number;
  multiplier: number;
  winAmount: number;
}

interface KenoHistoryItem {
  id: number;
  matched: number;
  pickCount: number;
  mult: number;
  isWin: boolean;
}

interface KenoGameProps {
  onBack: () => void;
}

export default function KenoGame({ onBack }: KenoGameProps) {
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

  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([7, 14, 21, 28, 35]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [betAmount, setBetAmount] = useState<number>(1);
  const [lastResult, setLastResult] = useState<KenoResult | null>(null);
  const [history, setHistory] = useState<KenoHistoryItem[]>([]);
  const animTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalTiles = 40;
  const pickCount = selectedNumbers.length;
  const currentPayouts = KENO_PAYOUTS[pickCount] || {};

  const triggerHaptic = (style: any = 'medium') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try { window.Telegram.WebApp.HapticFeedback.impactOccurred(style); } catch (e) {}
    }
  };

  const handleTileClick = (num: number) => {
    if (isPlaying) return;
    triggerHaptic('light');
    setSelectedNumbers(prev => {
      if (prev.includes(num)) {
        return prev.filter(n => n !== num);
      }
      if (prev.length >= 10) {
        showToast('Максимум 10 чисел!', true);
        return prev;
      }
      return [...prev, num].sort((a, b) => a - b);
    });
  };

  const handleAutoPick = (count: number = 5) => {
    if (isPlaying) return;
    triggerHaptic('medium');
    const nums: number[] = [];
    while (nums.length < count) {
      const rand = Math.floor(Math.random() * totalTiles) + 1;
      if (!nums.includes(rand)) nums.push(rand);
    }
    setSelectedNumbers(nums.sort((a, b) => a - b));
    setLastResult(null);
  };

  const handleClear = () => {
    if (isPlaying) return;
    triggerHaptic('light');
    setSelectedNumbers([]);
    setLastResult(null);
  };

  const handlePlay = () => {
    if (isPlaying) return;
    if (selectedNumbers.length === 0) {
      showToast('Выберите хотя бы 1 число!', true);
      return;
    }
    const bet = parseFloat(String(betAmount));
    if (isNaN(bet) || bet <= 0) {
      showToast('Укажите ставку!', true);
      return;
    }
    if (bet > balance) {
      showToast('Недостаточно средств!', true);
      return;
    }

    setBalance(prev => {
      const next = Math.max(0, parseFloat((prev - bet).toFixed(2)));
      syncBalance(next);
      return next;
    });
    setIsPlaying(true);
    setDrawnNumbers([]);
    setLastResult(null);
    triggerHaptic('heavy');
    bjAudio.playChip();

    // Determine drawn numbers with RTP bias
    const forceWin = adminSettings?.globalRtp === 'win' || userRtp === 'win';
    const forceLose = adminSettings?.globalRtp === 'lose' || userRtp === 'lose';

    const generateDraw = (): number[] => {
      const pool = Array.from({ length: totalTiles }, (_, i) => i + 1);
      const drawn: number[] = [];
      for (let i = 0; i < 10; i++) {
        const idx = Math.floor(Math.random() * pool.length);
        drawn.push(pool.splice(idx, 1)[0]);
      }
      return drawn;
    };

    let finalDrawn = generateDraw();
    if (forceWin || forceLose) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const testDraw = generateDraw();
        const matches = testDraw.filter(n => selectedNumbers.includes(n)).length;
        const mult = currentPayouts[matches] || 0;
        if (forceWin && mult > 0) {
          finalDrawn = testDraw;
          break;
        }
        if (forceLose && mult === 0) {
          finalDrawn = testDraw;
          break;
        }
      }
    }

    // Step-by-step reveal animation (10 numbers, 85ms each)
    let step = 0;
    const revealed: number[] = [];
    if (animTimeoutRef.current) clearInterval(animTimeoutRef.current);
    animTimeoutRef.current = setInterval(() => {
      step++;
      if (step <= finalDrawn.length) {
        revealed.push(finalDrawn[step - 1]);
        setDrawnNumbers([...revealed]);
        triggerHaptic('light');
      } else {
        if (animTimeoutRef.current) clearInterval(animTimeoutRef.current);
        animTimeoutRef.current = null;
        finishRound(finalDrawn, bet);
      }
    }, 85);
  };

  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) clearInterval(animTimeoutRef.current);
    };
  }, []);

  const finishRound = (allDrawn: number[], bet: number) => {
    const matchedCount = allDrawn.filter(n => selectedNumbers.includes(n)).length;
    const multiplier = currentPayouts[matchedCount] || 0;
    const isWin = multiplier > 0;
    const winAmount = parseFloat((bet * multiplier).toFixed(2));

    const resultData: KenoResult = {
      isWin,
      matchedCount,
      multiplier,
      winAmount
    };

    setLastResult(resultData);
    setIsPlaying(false);

    setHistory(prev => [{
      id: Date.now(),
      matched: matchedCount,
      pickCount,
      mult: multiplier,
      isWin
    }, ...prev.slice(0, 19)]);

    if (isWin) {
      triggerHaptic('success');
      bjAudio.playWin();
      showToast(`🎉 Победа! +$${winAmount.toFixed(2)} USDT (${matchedCount}/${pickCount} совпадений ×${multiplier})`);

      if (multiplier >= 3) {
        try {
          confetti({
            particleCount: 45,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#00e699', '#38bdf8', '#fbbf24', '#ffffff']
          });
        } catch (e) {}
      }
    } else {
      triggerHaptic('error');
      bjAudio.playLose();
      if (processBetForCashback) processBetForCashback(bet);
    }

    if (processBetForPass) processBetForPass(bet);

    recordGameBet({
      game: 'Keno',
      betAmount: bet,
      winAmount: isWin ? winAmount : 0,
      isWin,
      multiplier
    });
  };

  useEffect(() => {
    return () => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
    };
  }, []);

  return (
    <div className="game-screen" style={{ overflowY: 'auto' }}>
      <GameHeader title="Кено 🧿" onBack={onBack} />

      <div className="new-game-container">
        {/* Top Status & Controls Bar */}
        <div className="keno-top-bar">
          <div className="keno-picks-badge">
            Выбрано: <span>{pickCount}/10</span>
          </div>

          <div className="keno-quick-actions">
            <button
              type="button"
              disabled={isPlaying}
              className="keno-action-btn"
              onClick={() => handleAutoPick(5)}
            >
              🎲 Авто (5)
            </button>
            <button
              type="button"
              disabled={isPlaying}
              className="keno-action-btn"
              onClick={() => handleAutoPick(10)}
            >
              ⚡ 10
            </button>
            <button
              type="button"
              disabled={isPlaying || pickCount === 0}
              className="keno-action-btn clear"
              onClick={handleClear}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 40-Number Keno Grid */}
        <div className="keno-grid">
          {Array.from({ length: totalTiles }, (_, i) => i + 1).map(num => {
            const isSelected = selectedNumbers.includes(num);
            const isDrawn = drawnNumbers.includes(num);
            const isMatch = isSelected && isDrawn;

            let cellClass = 'keno-cell';
            if (isMatch) cellClass += ' match';
            else if (isDrawn) cellClass += ' drawn';
            else if (isSelected) cellClass += ' selected';

            return (
              <button
                key={num}
                type="button"
                disabled={isPlaying}
                className={cellClass}
                onClick={() => handleTileClick(num)}
              >
                <span>{num}</span>
                {isMatch && <div className="keno-match-sparkle" />}
              </button>
            );
          })}
        </div>

        {/* Live Multipliers Ladder for current pick count */}
        {pickCount > 0 && (
          <div className="keno-ladder-wrap">
            <div className="keno-ladder-title">Таблица совпадений ({pickCount} чисел):</div>
            <div className="keno-ladder-row">
              {Object.entries(currentPayouts).map(([hits, mult]) => {
                const isCurrentHit = lastResult && lastResult.matchedCount === parseInt(hits, 10);
                return (
                  <div
                    key={hits}
                    className={`keno-ladder-item ${isCurrentHit ? 'active' : ''}`}
                  >
                    <div className="keno-ladder-hits">{hits} шт.</div>
                    <div className="keno-ladder-mult">×{mult}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Result banner if round finished */}
        {lastResult && (
          <div className={`keno-result-card ${lastResult.isWin ? 'win' : 'loss'}`}>
            <div className="keno-result-title">
              {lastResult.isWin ? `+$${lastResult.winAmount.toFixed(2)} USDT` : 'Нет совпадений'}
            </div>
            <div className="keno-result-sub">
              Совпало {lastResult.matchedCount} из {pickCount} (×{lastResult.multiplier})
            </div>
          </div>
        )}

        {/* Bet Controls */}
        <BetControls
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          balance={balance}
          disabled={isPlaying}
        />

        {/* Play Action Button */}
        <button
          type="button"
          disabled={isPlaying || pickCount === 0 || betAmount <= 0 || betAmount > balance}
          onClick={handlePlay}
          className="keno-play-btn"
        >
          {isPlaying ? (
            <span>Идет розыгрыш...</span>
          ) : (
            <>
              <span>Играть в Кено</span>
              <span className="keno-play-amount">
                (<TetherIcon size={14} /> {betAmount})
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
