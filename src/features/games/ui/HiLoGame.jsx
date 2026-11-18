import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '@/context/AppContext';
import { bjAudio } from '@/shared/lib/blackjackAudio';
import { TetherIcon } from '@/shared/ui/Icons';
import GameHeader from './GameHeader';
import BetControls from './BetControls';
import './Games.css';
import './NewGames.css';

const SUITS = [
  { symbol: '♠', name: 'spades', color: '#c0c5d0' },
  { symbol: '♥', name: 'hearts', color: '#ff4d4d' },
  { symbol: '♦', name: 'diamonds', color: '#ff4d4d' },
  { symbol: '♣', name: 'clubs', color: '#c0c5d0' },
];

const CARD_RANKS = [
  { val: 2, label: '2' },
  { val: 3, label: '3' },
  { val: 4, label: '4' },
  { val: 5, label: '5' },
  { val: 6, label: '6' },
  { val: 7, label: '7' },
  { val: 8, label: '8' },
  { val: 9, label: '9' },
  { val: 10, label: '10' },
  { val: 11, label: 'J' },
  { val: 12, label: 'Q' },
  { val: 13, label: 'K' },
  { val: 14, label: 'A' },
];

function getRandomCard() {
  const rank = CARD_RANKS[Math.floor(Math.random() * CARD_RANKS.length)];
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { ...rank, suit };
}

// Calculate multipliers for Higher (>=) and Lower (<=)
function calculateStepMultipliers(cardValue) {
  const higherCount = 14 - cardValue + 1; // 2..14 inclusive
  const lowerCount = cardValue - 2 + 1;

  const houseEdge = 0.96;
  const multHigher = Math.max(1.05, parseFloat(((13 / Math.max(1, higherCount)) * houseEdge).toFixed(2)));
  const multLower = Math.max(1.05, parseFloat(((13 / Math.max(1, lowerCount)) * houseEdge).toFixed(2)));

  const higherChance = Math.min(96, Math.max(4, Math.round((higherCount / 13) * 100)));
  const lowerChance = Math.min(96, Math.max(4, Math.round((lowerCount / 13) * 100)));

  return { multHigher, multLower, higherChance, lowerChance };
}

export default function HiLoGame({ onBack }) {
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

  const [currentCard, setCurrentCard] = useState(() => getRandomCard());
  const [historyCards, setHistoryCards] = useState([]);
  const [inRound, setInRound] = useState(false);
  const [betAmount, setBetAmount] = useState(1);
  const [currentMult, setCurrentMult] = useState(1.0);
  const [streak, setStreak] = useState(0);
  const [skipsLeft, setSkipsLeft] = useState(3);
  const [isFlipping, setIsFlipping] = useState(false);
  const [lastOutcome, setLastOutcome] = useState(null); // 'win' | 'loss' | null

  const triggerHaptic = (style = 'medium') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try { window.Telegram.WebApp.HapticFeedback.impactOccurred(style); } catch (e) {}
    }
  };

  const { multHigher, multLower, higherChance, lowerChance } = calculateStepMultipliers(currentCard.val);

  // Start round
  const handleStartRound = () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      showToast('Укажите ставку!', true);
      return;
    }
    if (bet > balance) {
      showToast('Недостаточно средств!', true);
      return;
    }

    setBalance(prev => Math.max(0, parseFloat((prev - bet).toFixed(2))));
    setInRound(true);
    setCurrentMult(1.0);
    setStreak(0);
    setSkipsLeft(3);
    setLastOutcome(null);
    setHistoryCards([currentCard]);
    triggerHaptic('heavy');
    bjAudio.playChip();
  };

  // Guess Higher or Lower
  const handleGuess = (direction) => {
    if (!inRound || isFlipping) return;
    setIsFlipping(true);
    triggerHaptic('medium');

    const forceWin = adminSettings?.globalRtp === 'win' || userRtp === 'win';
    const forceLose = adminSettings?.globalRtp === 'lose' || userRtp === 'lose';

    let nextCard = getRandomCard();
    let isCorrect = direction === 'higher' ? nextCard.val >= currentCard.val : nextCard.val <= currentCard.val;

    if (forceWin && !isCorrect) {
      for (let i = 0; i < 20; i++) {
        const test = getRandomCard();
        if (direction === 'higher' ? test.val >= currentCard.val : test.val <= currentCard.val) {
          nextCard = test;
          isCorrect = true;
          break;
        }
      }
    } else if (forceLose && isCorrect) {
      for (let i = 0; i < 20; i++) {
        const test = getRandomCard();
        if (direction === 'higher' ? test.val < currentCard.val : test.val > currentCard.val) {
          nextCard = test;
          isCorrect = false;
          break;
        }
      }
    }

    const stepMultiplier = direction === 'higher' ? multHigher : multLower;

    setTimeout(() => {
      setIsFlipping(false);
      setHistoryCards(prev => [nextCard, ...prev.slice(0, 7)]);
      setCurrentCard(nextCard);

      if (isCorrect) {
        const nextMultiplier = parseFloat((currentMult * stepMultiplier).toFixed(2));
        setCurrentMult(nextMultiplier);
        setStreak(prev => prev + 1);
        setLastOutcome('win');
        triggerHaptic('success');
        bjAudio.playCard();
      } else {
        // Round lost
        setLastOutcome('loss');
        setInRound(false);
        triggerHaptic('error');
        bjAudio.playLose();

        const bet = parseFloat(betAmount);
        if (processBetForCashback) processBetForCashback(bet);
        if (processBetForPass) processBetForPass(bet);

        recordGameBet({
          game: 'Hi-Lo',
          betAmount: bet,
          winAmount: 0,
          isWin: false,
          multiplier: 0
        });
        showToast('❌ Карта не подошла! Раунд окончен.');
      }
    }, 380);
  };

  // Skip card
  const handleSkip = () => {
    if (!inRound || skipsLeft <= 0 || isFlipping) return;
    triggerHaptic('light');
    setIsFlipping(true);
    setSkipsLeft(prev => prev - 1);
    setTimeout(() => {
      const newCard = getRandomCard();
      setCurrentCard(newCard);
      setIsFlipping(false);
    }, 280);
  };

  // Cashout
  const handleCashout = () => {
    if (!inRound || streak === 0) return;
    const bet = parseFloat(betAmount);
    const winAmount = parseFloat((bet * currentMult).toFixed(2));

    setBalance(prev => parseFloat((prev + winAmount).toFixed(2)));
    setInRound(false);
    triggerHaptic('success');
    bjAudio.playWin();

    if (processBetForPass) processBetForPass(bet);

    recordGameBet({
      game: 'Hi-Lo',
      betAmount: bet,
      winAmount,
      isWin: true,
      multiplier: currentMult
    });

    showToast(`🎉 Забрали $${winAmount.toFixed(2)} USDT (×${currentMult})!`);

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00e699', '#38bdf8', '#ffd200']
      });
    } catch (e) {}
  };

  const winPayout = parseFloat((parseFloat(betAmount || 0) * currentMult).toFixed(2));

  return (
    <div className="game-screen" style={{ overflowY: 'auto' }}>
      <GameHeader title="Hi-Lo 🌈" onBack={onBack} />

      <div className="new-game-container">
        {/* History of drawn cards trail */}
        <div className="hilo-history-row">
          <div className="hilo-history-label">История:</div>
          <div className="hilo-history-cards">
            {historyCards.slice(1, 6).map((c, idx) => (
              <div key={idx} className="hilo-mini-card" style={{ color: c.suit.color }}>
                <span>{c.label}</span>
                <span>{c.suit.symbol}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Central Stage: The Playing Card */}
        <div className="hilo-stage">
          <div className={`hilo-card-container ${isFlipping ? 'flipping' : ''}`}>
            <div className="hilo-card" style={{ borderColor: currentCard.suit.color }}>
              <div className="hilo-card-corner top-left" style={{ color: currentCard.suit.color }}>
                <span className="hilo-card-rank">{currentCard.label}</span>
                <span className="hilo-card-suit">{currentCard.suit.symbol}</span>
              </div>

              <div className="hilo-card-center" style={{ color: currentCard.suit.color }}>
                {currentCard.suit.symbol}
              </div>

              <div className="hilo-card-corner bottom-right" style={{ color: currentCard.suit.color }}>
                <span className="hilo-card-rank">{currentCard.label}</span>
                <span className="hilo-card-suit">{currentCard.suit.symbol}</span>
              </div>
            </div>
          </div>

          {/* Current multiplier / streak stats */}
          {inRound && (
            <div className="hilo-round-stats">
              <div className="hilo-stat-pill">
                Угадано: <span>{streak} подряд</span>
              </div>
              <div className="hilo-stat-pill mult">
                Множитель: <span>×{currentMult}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        {inRound ? (
          <div className="hilo-actions-box">
            <div className="hilo-guess-grid">
              <button
                type="button"
                disabled={isFlipping}
                className="hilo-guess-btn higher"
                onClick={() => handleGuess('higher')}
              >
                <div className="hilo-guess-arrow">▲</div>
                <div className="hilo-guess-title">Выше или равно</div>
                <div className="hilo-guess-details">
                  <span>{higherChance}%</span> · <span className="hilo-mult-tag">×{multHigher}</span>
                </div>
              </button>

              <button
                type="button"
                disabled={isFlipping}
                className="hilo-guess-btn lower"
                onClick={() => handleGuess('lower')}
              >
                <div className="hilo-guess-arrow">▼</div>
                <div className="hilo-guess-title">Ниже или равно</div>
                <div className="hilo-guess-details">
                  <span>{lowerChance}%</span> · <span className="hilo-mult-tag">×{multLower}</span>
                </div>
              </button>
            </div>

            <div className="hilo-secondary-actions">
              <button
                type="button"
                disabled={isFlipping || skipsLeft <= 0}
                className="hilo-skip-btn"
                onClick={handleSkip}
              >
                Пропустить карту ({skipsLeft})
              </button>

              {streak > 0 && (
                <button
                  type="button"
                  disabled={isFlipping}
                  className="hilo-cashout-btn"
                  onClick={handleCashout}
                >
                  <span>Забрать выигрыш</span>
                  <span className="hilo-cashout-amount">
                    <TetherIcon size={14} /> ${winPayout.toFixed(2)}
                  </span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Pre-round Bet Controls */
          <>
            <BetControls
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              balance={balance}
              disabled={inRound}
            />

            <button
              type="button"
              disabled={betAmount <= 0 || betAmount > balance}
              onClick={handleStartRound}
              className="hilo-start-btn"
            >
              <span>Начать игру Hi-Lo</span>
              <span style={{ opacity: 0.9, fontSize: '13px' }}>
                (<TetherIcon size={14} /> {betAmount})
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
