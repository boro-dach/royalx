import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '@/context/AppContext';
import { bjAudio } from '@/shared/lib/blackjackAudio';
import { TetherIcon } from '@/shared/ui/Icons';
import GameHeader from './GameHeader';
import BetControls from './BetControls';
import './Games.css';
import './NewGames.css';

type PocketColor = 'green' | 'red' | 'black';

interface Pocket {
  num: number;
  color: PocketColor;
  label: string;
}

interface BetOption {
  id: string;
  label: string;
  color: string;
  mult: number;
  check: (p: Pocket) => boolean;
}

interface RedBlackResult {
  isWin: boolean;
  winAmount: number;
  pocket: Pocket;
  multiplier: number;
}

interface RedBlackGameProps {
  onBack: () => void;
}

// 37 numbers (European Roulette standard)
const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];

const POCKETS: Pocket[] = Array.from({ length: 37 }, (_, i) => {
  if (i === 0) return { num: 0, color: 'green', label: '0' };
  if (RED_NUMBERS.includes(i)) return { num: i, color: 'red', label: String(i) };
  return { num: i, color: 'black', label: String(i) };
});

const BET_OPTIONS: BetOption[] = [
  { id: 'red', label: 'Красное', color: '#f87171', mult: 2.00, check: p => p.color === 'red' },
  { id: 'zero', label: 'Зеро 0', color: '#10b981', mult: 14.00, check: p => p.num === 0 },
  { id: 'black', label: 'Чёрное', color: '#64748b', mult: 2.00, check: p => p.color === 'black' },
  { id: 'even', label: 'Чётное', color: '#38bdf8', mult: 2.00, check: p => p.num > 0 && p.num % 2 === 0 },
  { id: 'odd', label: 'Нечётное', color: '#38bdf8', mult: 2.00, check: p => p.num % 2 !== 0 },
  { id: 'low', label: '1–18', color: '#a78bfa', mult: 2.00, check: p => p.num >= 1 && p.num <= 18 },
  { id: 'high', label: '19–36', color: '#a78bfa', mult: 2.00, check: p => p.num >= 19 && p.num <= 36 },
];

export default function RedBlackGame({ onBack }: RedBlackGameProps) {
  const {
    balance,
    setBalance,
    recordGameBet,
    showToast,
    processBetForCashback,
    processBetForPass,
    adminSettings,
    userRtp
  } = useApp();

  const [selectedBet, setSelectedBet] = useState<string>('red');
  const [betAmount, setBetAmount] = useState<number>(1);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winningPocket, setWinningPocket] = useState<Pocket>(POCKETS[7]);
  const [lastResult, setLastResult] = useState<RedBlackResult | null>(null);
  const [history, setHistory] = useState<Pocket[]>([
    POCKETS[14], POCKETS[7], POCKETS[22], POCKETS[0], POCKETS[31]
  ]);

  const stripRef = useRef<HTMLDivElement | null>(null);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const triggerHaptic = (style: any = 'medium') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try { window.Telegram.WebApp.HapticFeedback.impactOccurred(style); } catch (e) {}
    }
  };

  const selectedBetObj = BET_OPTIONS.find(b => b.id === selectedBet) || BET_OPTIONS[0];

  const handleSpin = () => {
    if (isSpinning) return;
    const bet = parseFloat(String(betAmount));
    if (isNaN(bet) || bet <= 0) {
      showToast('Укажите ставку!', true);
      return;
    }
    if (bet > balance) {
      showToast('Недостаточно средств!', true);
      return;
    }

    setBalance(prev => Math.max(0, parseFloat((prev - bet).toFixed(2))));
    setIsSpinning(true);
    setLastResult(null);
    triggerHaptic('heavy');
    bjAudio.playChip();

    // Determine target pocket respecting RTP
    const forceWin = adminSettings?.globalRtp === 'win' || userRtp === 'win';
    const forceLose = adminSettings?.globalRtp === 'lose' || userRtp === 'lose';

    const targetIdx = Math.floor(Math.random() * POCKETS.length);
    let target = POCKETS[targetIdx];
    let isWin = selectedBetObj.check(target);

    if (forceWin && !isWin) {
      for (let i = 0; i < 40; i++) {
        const test = POCKETS[Math.floor(Math.random() * POCKETS.length)];
        if (selectedBetObj.check(test)) {
          target = test;
          isWin = true;
          break;
        }
      }
    } else if (forceLose && isWin) {
      for (let i = 0; i < 40; i++) {
        const test = POCKETS[Math.floor(Math.random() * POCKETS.length)];
        if (!selectedBetObj.check(test)) {
          target = test;
          isWin = false;
          break;
        }
      }
    }

    setWinningPocket(target);

    // Spin animation duration: 2.2s
    if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    spinTimerRef.current = setTimeout(() => {
      finishSpin(target, isWin, bet);
    }, 2200);
  };

  const finishSpin = (pocket: Pocket, isWin: boolean, bet: number) => {
    const multiplier = selectedBetObj.mult;
    const winAmount = isWin ? parseFloat((bet * multiplier).toFixed(2)) : 0;

    setIsSpinning(false);
    setHistory(prev => [pocket, ...prev.slice(0, 9)]);
    setLastResult({ isWin, winAmount, pocket, multiplier });

    if (isWin) {
      setBalance(prev => parseFloat((prev + winAmount).toFixed(2)));
      triggerHaptic('success');
      bjAudio.playWin();
      showToast(`🎉 Выигрыш! +$${winAmount.toFixed(2)} USDT (×${multiplier})`);

      if (multiplier >= 3) {
        try {
          confetti({
            particleCount: 50,
            spread: 65,
            origin: { y: 0.6 },
            colors: ['#f87171', '#10b981', '#38bdf8', '#fbbf24']
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
      game: 'R&B',
      betAmount: bet,
      winAmount: isWin ? winAmount : 0,
      isWin,
      multiplier: isWin ? multiplier : 0
    });
  };

  return (
    <div className="game-screen" style={{ overflowY: 'auto' }}>
      <GameHeader title="R&B 🪬 (Красное и Чёрное)" onBack={onBack} />

      <div className="new-game-container">
        {/* Recent Results History */}
        <div className="rb-history-row">
          <span className="rb-history-label">История:</span>
          <div className="rb-history-pills">
            {history.map((p, idx) => (
              <span
                key={idx}
                className={`rb-history-pill ${p.color}`}
              >
                {p.num}
              </span>
            ))}
          </div>
        </div>

        {/* Roulette Track Stage */}
        <div className="rb-stage">
          {/* Center Indicator Pointer */}
          <div className="rb-pointer-marker">▼</div>

          {/* Animated Carousel Track */}
          <div className={`rb-track ${isSpinning ? 'spinning' : ''}`}>
            <div className={`rb-pocket-card active-landing ${winningPocket.color}`}>
              <div className="rb-pocket-num">{winningPocket.num}</div>
              <div className="rb-pocket-color-name">
                {winningPocket.color === 'green' ? 'ZERO' : winningPocket.color === 'red' ? 'RED' : 'BLACK'}
              </div>
            </div>
          </div>

          {/* Status Result Badge */}
          {lastResult && (
            <div className={`rb-result-badge ${lastResult.isWin ? 'win' : 'loss'}`}>
              <div className="rb-result-title">
                {lastResult.isWin
                  ? `+$${lastResult.winAmount.toFixed(2)} USDT (×${lastResult.multiplier})`
                  : 'Не выпало'
                }
              </div>
              <div className="rb-result-sub">
                Выпало: {lastResult.pocket.num} ({lastResult.pocket.color === 'green' ? 'Зеро' : lastResult.pocket.color === 'red' ? 'Красное' : 'Чёрное'})
              </div>
            </div>
          )}
        </div>

        {/* Bet Selection Options */}
        <div className="rb-bets-section">
          <div className="rb-section-header">
            <span className="rb-section-title">Выберите сектор</span>
            <span className="rb-section-mult">Множитель: ×{selectedBetObj.mult}</span>
          </div>

          {/* Primary 3 Colors */}
          <div className="rb-primary-bets">
            <button
              type="button"
              disabled={isSpinning}
              className={`rb-color-btn red ${selectedBet === 'red' ? 'active' : ''}`}
              onClick={() => { setSelectedBet('red'); triggerHaptic('light'); }}
            >
              <div className="rb-color-circle red" />
              <div className="rb-color-info">
                <span className="rb-color-name">Красное</span>
                <span className="rb-color-mult">×2.00</span>
              </div>
            </button>

            <button
              type="button"
              disabled={isSpinning}
              className={`rb-color-btn zero ${selectedBet === 'zero' ? 'active' : ''}`}
              onClick={() => { setSelectedBet('zero'); triggerHaptic('light'); }}
            >
              <div className="rb-color-circle zero" />
              <div className="rb-color-info">
                <span className="rb-color-name">Зеро 0</span>
                <span className="rb-color-mult">×14.00</span>
              </div>
            </button>

            <button
              type="button"
              disabled={isSpinning}
              className={`rb-color-btn black ${selectedBet === 'black' ? 'active' : ''}`}
              onClick={() => { setSelectedBet('black'); triggerHaptic('light'); }}
            >
              <div className="rb-color-circle black" />
              <div className="rb-color-info">
                <span className="rb-color-name">Чёрное</span>
                <span className="rb-color-mult">×2.00</span>
              </div>
            </button>
          </div>

          {/* Secondary 4 Range / Parity Bets */}
          <div className="rb-secondary-bets">
            {BET_OPTIONS.slice(3).map(opt => {
              const isSel = selectedBet === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isSpinning}
                  className={`rb-sub-btn ${isSel ? 'active' : ''}`}
                  onClick={() => { setSelectedBet(opt.id); triggerHaptic('light'); }}
                >
                  <span className="rb-sub-name">{opt.label}</span>
                  <span className="rb-sub-mult">×{opt.mult}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bet Controls */}
        <BetControls
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          balance={balance}
          disabled={isSpinning}
        />

        {/* Spin Button */}
        <button
          type="button"
          disabled={isSpinning || betAmount <= 0 || betAmount > balance}
          onClick={handleSpin}
          className="rb-spin-btn"
        >
          {isSpinning ? (
            <span>Колесо вращается...</span>
          ) : (
            <>
              <span>Крутить рулетку</span>
              <span className="rb-spin-amt">
                (<TetherIcon size={14} /> {betAmount})
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
