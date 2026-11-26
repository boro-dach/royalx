import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '@/context/AppContext';
import { bjAudio } from '@/shared/lib/blackjackAudio';
import { TetherIcon } from '@/shared/ui/Icons';
import GameHeader from './GameHeader';
import BetControls from './BetControls';
import './Games.css';
import './NewGames.css';

type CoinSide = 'heads' | 'tails';

interface StreakStep {
  streak: number;
  mult: number;
}

interface CoinFlipResult {
  isWin: boolean;
  landedSide: CoinSide;
  mult: number;
}

interface CoinFlipGameProps {
  onBack: () => void;
}

const STREAK_LADDER: StreakStep[] = [
  { streak: 1, mult: 1.96 },
  { streak: 2, mult: 3.84 },
  { streak: 3, mult: 7.52 },
  { streak: 4, mult: 14.75 },
  { streak: 5, mult: 28.90 },
  { streak: 6, mult: 56.60 },
  { streak: 7, mult: 110.00 },
];

export default function CoinFlipGame({ onBack }: CoinFlipGameProps) {
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

  const [selectedSide, setSelectedSide] = useState<CoinSide>('heads'); // 'heads' (Орёл) | 'tails' (Решка)
  const [betAmount, setBetAmount] = useState<number>(1);
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [coinSide, setCoinSide] = useState<CoinSide>('heads'); // currently landed side
  const [rotationDegrees, setRotationDegrees] = useState<number>(0);
  const [inStreak, setInStreak] = useState<boolean>(false);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [lastResult, setLastResult] = useState<CoinFlipResult | null>(null);
  const [history, setHistory] = useState<CoinSide[]>(['heads', 'tails', 'heads', 'heads', 'tails']);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    };
  }, []);

  const triggerHaptic = (style: any = 'medium') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try { window.Telegram.WebApp.HapticFeedback.impactOccurred(style); } catch (e) {}
    }
  };

  const currentMult = inStreak && currentStreak > 0
    ? (STREAK_LADDER[currentStreak - 1]?.mult || parseFloat((Math.pow(1.96, currentStreak)).toFixed(2)))
    : 1.96;

  // Single or Streak flip
  const handleFlip = () => {
    if (isFlipping) return;
    const bet = parseFloat(String(betAmount));

    if (!inStreak) {
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
    }

    setIsFlipping(true);
    setLastResult(null);
    triggerHaptic('heavy');
    bjAudio.playChip();

    // Determine target side respecting RTP
    const forceWin = adminSettings?.globalRtp === 'win' || userRtp === 'win';
    const forceLose = adminSettings?.globalRtp === 'lose' || userRtp === 'lose';

    let target: CoinSide = Math.random() < 0.5 ? 'heads' : 'tails';
    let isWin = target === selectedSide;

    if (forceWin) {
      target = selectedSide;
      isWin = true;
    } else if (forceLose) {
      target = selectedSide === 'heads' ? 'tails' : 'heads';
      isWin = false;
    }

    // Spin coin 1440 deg + 0 for heads, 180 for tails
    const extraSpins = 1440;
    const finalRot = target === 'heads' ? extraSpins : extraSpins + 180;
    setRotationDegrees(prev => prev + finalRot);

    // Animation takes 1.1s
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    flipTimerRef.current = setTimeout(() => {
      finishFlip(target, isWin, bet);
    }, 1100);
  };

  const finishFlip = (landedSide: CoinSide, isWin: boolean, bet: number) => {
    setIsFlipping(false);
    setCoinSide(landedSide);
    setHistory(prev => [landedSide, ...prev.slice(0, 9)]);

    if (isWin) {
      const nextStreak = currentStreak + 1;
      const streakObj = STREAK_LADDER[nextStreak - 1] || { mult: parseFloat((Math.pow(1.96, nextStreak)).toFixed(2)) };
      const stepMult = streakObj.mult;

      setCurrentStreak(nextStreak);
      setInStreak(true);
      setLastResult({ isWin: true, landedSide, mult: stepMult });

      triggerHaptic('success');
      bjAudio.playWin();

      if (nextStreak >= 2) {
        try {
          confetti({
            particleCount: 45,
            spread: 55,
            origin: { y: 0.6 },
            colors: ['#fbbf24', '#f59e0b', '#ffffff', '#00e699']
          });
        } catch (e) {}
      }
    } else {
      // Loss
      setIsFlipping(false);
      setInStreak(false);
      setCurrentStreak(0);
      setLastResult({ isWin: false, landedSide, mult: 0 });

      triggerHaptic('error');
      bjAudio.playLose();

      if (processBetForCashback) processBetForCashback(bet);
      if (processBetForPass) processBetForPass(bet);

      recordGameBet({
        game: 'Coin Flip',
        betAmount: bet,
        winAmount: 0,
        isWin: false,
        multiplier: 0
      });
      showToast(`Выпал ${landedSide === 'heads' ? 'Орёл' : 'Решка'}! Раунд окончен.`);
    }
  };

  // Cashout in Streak mode
  const handleCashout = () => {
    if (!inStreak || currentStreak === 0 || isFlipping) return;
    const bet = parseFloat(String(betAmount));
    const winAmount = parseFloat((bet * currentMult).toFixed(2));

    setInStreak(false);
    setCurrentStreak(0);
    setLastResult(null);

    triggerHaptic('success');
    bjAudio.playWin();

    if (processBetForPass) processBetForPass(bet);

    recordGameBet({
      game: 'Coin Flip',
      betAmount: bet,
      winAmount,
      isWin: true,
      multiplier: currentMult
    });

    showToast(`🎉 Выигрыш забран! +$${winAmount.toFixed(2)} USDT (×${currentMult})`);

    try {
      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.6 },
        colors: ['#00e699', '#fbbf24', '#38bdf8']
      });
    } catch (e) {}
  };

  const streakWinAmount = parseFloat((parseFloat(String(betAmount || 0)) * currentMult).toFixed(2));

  return (
    <div className="game-screen" style={{ overflowY: 'auto' }}>
      <GameHeader title="Орёл-Решка 🪙" onBack={onBack} />

      <div className="new-game-container">
        {/* History trail */}
        <div className="coin-history-row">
          <span className="coin-history-label">История:</span>
          <div className="coin-history-pills">
            {history.map((side, idx) => (
              <span
                key={idx}
                className={`coin-history-pill ${side}`}
                title={side === 'heads' ? 'Орёл' : 'Решка'}
              >
                {side === 'heads' ? '🦅' : '🪙'}
              </span>
            ))}
          </div>
        </div>

        {/* 3D Coin Stage */}
        <div className="coin-stage">
          <div className="coin-flipper-perspective">
            <div
              className={`coin-3d ${isFlipping ? 'flipping' : ''}`}
              style={{
                transform: `rotateY(${rotationDegrees}deg)`
              }}
            >
              {/* Heads Face */}
              <div className="coin-face coin-front">
                <div className="coin-face-inner">
                  <span className="coin-icon">🦅</span>
                  <span className="coin-title">ОРЁЛ</span>
                  <span className="coin-stars">★ ★ ★</span>
                </div>
              </div>

              {/* Tails Face */}
              <div className="coin-face coin-back">
                <div className="coin-face-inner">
                  <span className="coin-icon">👑</span>
                  <span className="coin-title">РЕШКА</span>
                  <span className="coin-stars">ROYAL X</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current streak badge */}
          {inStreak && (
            <div className="coin-streak-indicator">
              Стрик: <span>{currentStreak} подряд</span> (×{currentMult})
            </div>
          )}

          {/* Status Result Badge */}
          {lastResult && (
            <div className={`coin-result-badge ${lastResult.isWin ? 'win' : 'loss'}`}>
              <div className="coin-result-title">
                {lastResult.isWin
                  ? `Выпал ${lastResult.landedSide === 'heads' ? 'Орёл' : 'Решка'}! ×${lastResult.mult}`
                  : `Выпал ${lastResult.landedSide === 'heads' ? 'Орёл' : 'Решка'}`
                }
              </div>
            </div>
          )}
        </div>

        {/* Choice Selector: Heads or Tails */}
        <div className="coin-choice-section">
          <div className="coin-choice-title">Выберите сторону</div>
          <div className="coin-choice-grid">
            <button
              type="button"
              disabled={isFlipping}
              className={`coin-choice-btn heads ${selectedSide === 'heads' ? 'active' : ''}`}
              onClick={() => { setSelectedSide('heads'); triggerHaptic('light'); }}
            >
              <span className="coin-choice-emoji">🦅</span>
              <div className="coin-choice-info">
                <span className="coin-choice-name">Орёл</span>
                <span className="coin-choice-mult">×1.96</span>
              </div>
            </button>

            <button
              type="button"
              disabled={isFlipping}
              className={`coin-choice-btn tails ${selectedSide === 'tails' ? 'active' : ''}`}
              onClick={() => { setSelectedSide('tails'); triggerHaptic('light'); }}
            >
              <span className="coin-choice-emoji">👑</span>
              <div className="coin-choice-info">
                <span className="coin-choice-name">Решка</span>
                <span className="coin-choice-mult">×1.96</span>
              </div>
            </button>
          </div>
        </div>

        {/* Streak / Cashout or Bet Controls */}
        {inStreak ? (
          <div className="coin-streak-actions">
            <button
              type="button"
              disabled={isFlipping}
              className="coin-streak-flip-btn"
              onClick={handleFlip}
            >
              {isFlipping ? 'Монета в воздухе...' : `Бросить ещё раз (Следующий ×${(currentMult * 1.96).toFixed(2)})`}
            </button>

            <button
              type="button"
              disabled={isFlipping}
              className="coin-cashout-btn"
              onClick={handleCashout}
            >
              <span>Забрать выигрыш</span>
              <span className="coin-cashout-amt">
                <TetherIcon size={14} /> ${streakWinAmount.toFixed(2)}
              </span>
            </button>
          </div>
        ) : (
          <>
            <BetControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              balance={balance}
              disabled={isFlipping}
            />

            <button
              type="button"
              disabled={isFlipping || betAmount <= 0 || betAmount > balance}
              onClick={handleFlip}
              className="coin-flip-btn"
            >
              {isFlipping ? (
                <span>Монета в воздухе...</span>
              ) : (
                <>
                  <span>Подбросить монету</span>
                  <span className="coin-flip-amt">
                    (<TetherIcon size={14} /> {betAmount})
                  </span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
