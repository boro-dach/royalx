import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '@/context/AppContext';
import { bjAudio } from '@/shared/lib/blackjackAudio';
import { CloseIcon, TetherIcon } from '@/shared/ui/Icons';
import GameHeader from './GameHeader';
import './Games.css';
import './BlackjackGame.css';

const SUITS = [
  { symbol: '♠', color: '#1a1d20', name: 'spades' },
  { symbol: '♣', color: '#1a1d20', name: 'clubs' },
  { symbol: '♥', color: '#e53935', name: 'hearts' },
  { symbol: '♦', color: '#e53935', name: 'diamonds' }
];

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
  const deck = [];
  // 6 decks for classic casino shoe
  for (let d = 0; d < 6; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          id: `${d}-${suit.symbol}-${rank}-${Math.random()}`,
          rank,
          suit: suit.symbol,
          color: suit.color
        });
      }
    }
  }
  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function calculateScore(cards) {
  let score = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.hidden) continue;
    if (card.rank === 'A') {
      aces += 1;
      score += 11;
    } else if (['K', 'Q', 'J'].includes(card.rank)) {
      score += 10;
    } else {
      score += parseInt(card.rank, 10);
    }
  }

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

// Single Card View
function PlayingCard({ card, isOverlap, overlapMargin }) {
  if (card.hidden) {
    return (
      <div 
        className={`bj-card bj-card-back ${isOverlap ? 'bj-card-overlap' : ''}`}
        style={isOverlap && overlapMargin ? { marginLeft: overlapMargin } : {}}
      >
        <div className="bj-card-back-pattern">
          <div className="bj-card-back-icon">♠</div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`bj-card ${isOverlap ? 'bj-card-overlap' : ''}`}
      style={isOverlap && overlapMargin ? { marginLeft: overlapMargin } : {}}
    >
      {/* Top Left Corner */}
      <div className="bj-card-corner top-left" style={{ color: card.color }}>
        <span className="bj-card-rank">{card.rank}</span>
        <span className="bj-card-suit">{card.suit}</span>
      </div>

      {/* Center Suit */}
      <div className="bj-card-center" style={{ color: card.color }}>
        <span className="bj-card-center-suit">{card.suit}</span>
      </div>

      {/* Bottom Right Inverted Corner */}
      <div className="bj-card-corner bottom-right" style={{ color: card.color }}>
        <span className="bj-card-rank">{card.rank}</span>
        <span className="bj-card-suit">{card.suit}</span>
      </div>
    </div>
  );
}

export default function BlackjackGame({ onBack }) {
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

  // Active Session Persistence (Restore active hand if player accidentally exits)
  const BJ_ACTIVE_SESSION_KEY = 'royalx_bj_active_session_v3';
  const [activeSession] = useState(() => {
    try {
      const saved = localStorage.getItem(BJ_ACTIVE_SESSION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.gameState === 'player_turn' && Array.isArray(parsed.playerCards) && Array.isArray(parsed.dealerCards)) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  });

  const [dealerCards, setDealerCards] = useState(
    activeSession 
      ? activeSession.dealerCards 
      : [
          { rank: 'Q', suit: '♠', color: '#1a1d20' },
          { rank: 'J', suit: '♣', color: '#1a1d20' }
        ]
  );
  const [playerCards, setPlayerCards] = useState(
    activeSession 
      ? activeSession.playerCards 
      : [
          { rank: '7', suit: '♦', color: '#e53935' },
          { rank: '5', suit: '♦', color: '#e53935' },
          { rank: '6', suit: '♥', color: '#e53935' }
        ]
  );

  const [gameState, setGameState] = useState(activeSession ? 'player_turn' : 'idle'); // 'idle', 'dealing', 'player_turn', 'dealer_turn'
  const [roundResult, setRoundResult] = useState(null);
  const [isClosingResult, setIsClosingResult] = useState(false);
  const resultTimerRef = useRef(null);

  const dismissResult = () => {
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    setIsClosingResult(true);
    setTimeout(() => {
      setRoundResult(null);
      setIsClosingResult(false);
    }, 200);
  };

  useEffect(() => {
    if (roundResult) {
      setIsClosingResult(false);
      if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      resultTimerRef.current = setTimeout(dismissResult, 2600);
      return () => {
        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
      };
    }
  }, [roundResult]);

  const [betAmount, setBetAmount] = useState(1);
  const [lastBet, setLastBet] = useState(15);
  const [activeHandBet, setActiveHandBet] = useState(activeSession ? activeSession.activeHandBet : 15);

  const [isBetModalOpen, setIsBetModalOpen] = useState(false);
  const [isClosingBetModal, setIsClosingBetModal] = useState(false);

  // Notify player if active blackjack hand was recovered
  useEffect(() => {
    if (activeSession) {
      showToast('⚡ Активная раздача Blackjack восстановлена!', false);
    }
  }, []);

  // Sync active blackjack hand to localStorage
  useEffect(() => {
    if (gameState === 'player_turn') {
      try {
        localStorage.setItem(BJ_ACTIVE_SESSION_KEY, JSON.stringify({
          activeHandBet,
          playerCards,
          dealerCards,
          gameState: 'player_turn'
        }));
      } catch (e) {}
    } else {
      try {
        localStorage.removeItem(BJ_ACTIVE_SESSION_KEY);
      } catch (e) {}
    }
  }, [gameState, activeHandBet, playerCards, dealerCards]);

  const deckRef = useRef([]);

  // Ensure deck has plenty of cards
  const getDeck = () => {
    if (!deckRef.current || deckRef.current.length < 20) {
      deckRef.current = createDeck();
    }
    return deckRef.current;
  };

  const drawCard = (hidden = false) => {
    const deck = getDeck();
    const card = deck.pop();
    return { ...card, hidden };
  };

  const openBetModal = () => {
    if (gameState !== 'idle') return;
    if (roundResult) dismissResult();
    setIsBetModalOpen(true);
  };

  const closeBetModal = () => {
    setIsClosingBetModal(true);
    setTimeout(() => {
      setIsBetModalOpen(false);
      setIsClosingBetModal(false);
    }, 200);
  };

  const handleStartDealFromModal = () => {
    if (betAmount < 0.15 || betAmount > balance) return;
    closeBetModal();
    startDeal(betAmount);
  };

  // Start deal with a specific bet
  const startDeal = (amountToBet) => {
    if (balance < amountToBet) {
      showToast('❌ Недостаточно средств!', true);
      return;
    }
    if (amountToBet < 0.15) {
      showToast('❌ Минимальная ставка $0.15!', true);
      return;
    }

    setBalance(prev => {
      const next = Math.max(0, parseFloat((prev - amountToBet).toFixed(2)));
      syncBalance(next);
      return next;
    });
    processBetForPass(amountToBet, `bj_deal_${Date.now()}`);
    setActiveHandBet(amountToBet);
    setLastBet(amountToBet);
    setRoundResult(null);
    setGameState('dealing');

    // Draw initial 4 cards
    const isDealerLucky = 
      adminSettings?.bjDealerWin || 
      adminSettings?.globalRtp === 'casino' || 
      adminSettings?.globalRtp === 'lose' || 
      userRtp === 'lose';

    let pCard1 = drawCard(false);
    let dCard1 = drawCard(false);
    let pCard2 = drawCard(false);
    let dCard2 = drawCard(true); // Dealer hidden hole card

    if (isDealerLucky) {
      // Dealer is guaranteed top cards (10 + 9/10/A)
      dCard1 = Math.random() < 0.5 
        ? { rank: 'A', suit: '♠', color: '#1a1d20' } 
        : { rank: '10', suit: '♦', color: '#ff4d4d' };
      
      const secondRank = Math.random() < 0.35 
        ? (dCard1.rank === 'A' ? 'K' : 'A') 
        : (Math.random() < 0.5 ? '10' : '9');
      
      dCard2 = { 
        rank: secondRank, 
        suit: '♣', 
        color: '#1a1d20', 
        hidden: true 
      };

      // Ensure player does not get natural blackjack
      if (calculateScore([pCard1, pCard2]) === 21) {
        pCard2 = { rank: '7', suit: '♥', color: '#ff4d4d' };
      }
    }

    setPlayerCards([]);
    setDealerCards([]);

    // Staggered card dealing animations with sounds
    setTimeout(() => {
      bjAudio.playCard();
      setPlayerCards([pCard1]);
    }, 120);

    setTimeout(() => {
      bjAudio.playCard();
      setDealerCards([dCard1]);
    }, 380);

    setTimeout(() => {
      bjAudio.playCard();
      setPlayerCards([pCard1, pCard2]);
    }, 640);

    setTimeout(() => {
      bjAudio.playCard();
      setDealerCards([dCard1, dCard2]);

      // Check for Natural Blackjack
      const pScore = calculateScore([pCard1, pCard2]);
      if (pScore === 21) {
        // Reveal dealer card
        const revealedDealer = [dCard1, { ...dCard2, hidden: false }];
        setDealerCards(revealedDealer);
        const dScore = calculateScore(revealedDealer);

        if (dScore === 21) {
          // Push
          setBalance(prev => {
            const next = parseFloat((prev + amountToBet).toFixed(2));
            syncBalance(next);
            return next;
          });
          setRoundResult({
            isWin: 'push',
            type: 'push',
            title: 'Ничья',
            amount: 0,
            mult: 'Возврат'
          });
        } else {
          // Natural Blackjack 3:2 payout!
          const winAmount = amountToBet * 2.5;
          recordGameBet({
            game: 'Blackjack',
            betAmount: amountToBet,
            winAmount,
            isWin: true,
            multiplier: 2.5
          });
          bjAudio.playWin();
          setRoundResult({
            isWin: true,
            type: 'win',
            title: 'Блэкджек!',
            amount: winAmount,
            mult: '3:2'
          });
          try {
            confetti({
              particleCount: 55,
              spread: 70,
              origin: { y: 0.55 },
              zIndex: 999999,
              colors: ['#00e699', '#38ef7d', '#00ffc8', '#ffffff', '#ffd200']
            });
          } catch (e) {}
        }
        setGameState('idle');
      } else {
        setGameState('player_turn');
      }
    }, 900);
  };

  // Player Hits
  const handleHit = () => {
    if (gameState !== 'player_turn') return;
    bjAudio.playCard();

    const isDealerLucky = 
      adminSettings?.bjDealerWin || 
      adminSettings?.globalRtp === 'casino' || 
      adminSettings?.globalRtp === 'lose' || 
      userRtp === 'lose';

    const currentScore = calculateScore(playerCards);
    let newCard = drawCard(false);

    // If dealer mode is on and player has 12+, give bust card with 80% chance
    if (isDealerLucky && currentScore >= 12 && Math.random() < 0.80) {
      newCard = { rank: '10', suit: '♠', color: '#1a1d20' };
    }

    const updatedCards = [...playerCards, newCard];
    setPlayerCards(updatedCards);

    const score = calculateScore(updatedCards);
    if (score > 21) {
      // Player Bust!
      bjAudio.playLose();
      // Reveal dealer card
      setDealerCards(prev => prev.map(c => ({ ...c, hidden: false })));
      recordGameBet({
        game: 'Blackjack',
        betAmount: activeHandBet,
        winAmount: 0,
        isWin: false,
        multiplier: 0
      });
      setRoundResult({
        isWin: false,
        type: 'loss',
        title: 'Проигрыш',
        amount: activeHandBet,
        mult: `Перебор (${score})`
      });
      processBetForCashback(activeHandBet);
      setGameState('idle');
    } else if (score === 21) {
      // Auto-stand on 21
      handleStand(updatedCards);
    }
  };

  // Player Stands
  const handleStand = (currentCards = playerCards, currentBet = activeHandBet) => {
    if (gameState !== 'player_turn') return;
    setGameState('dealer_turn');

    // Reveal dealer hole card
    let currentDealerCards = dealerCards.map(c => ({ ...c, hidden: false }));
    setDealerCards(currentDealerCards);
    bjAudio.playCard();

    const pScore = calculateScore(currentCards);

    // Dealer turn loop
    const runDealerStep = () => {
      const dScore = calculateScore(currentDealerCards);

      const isDealerLucky = 
        adminSettings?.bjDealerWin || 
        adminSettings?.globalRtp === 'casino' || 
        adminSettings?.globalRtp === 'lose' || 
        userRtp === 'lose';

      if (dScore < 17 || (isDealerLucky && dScore <= pScore && dScore < 21)) {
        setTimeout(() => {
          bjAudio.playCard();
          let extraCard = drawCard(false);

          if (isDealerLucky && dScore < 21) {
            // Draw exact winning card to beat player with 20 or 21
            const targetScore = Math.min(21, Math.max(19, pScore + 1));
            const diff = targetScore - dScore;
            if (diff >= 1 && diff <= 10) {
              const ranks = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
              extraCard = { rank: ranks[diff] || 'K', suit: '♠', color: '#1a1d20' };
            }
          }

          currentDealerCards = [...currentDealerCards, extraCard];
          setDealerCards(currentDealerCards);
          runDealerStep();
        }, 550);
      } else {
        const forceDealerBust = adminSettings?.bjDealerBust || adminSettings?.globalRtp === 'win' || userRtp === 'win';
        if (forceDealerBust && dScore <= 21 && dScore >= pScore) {
          setTimeout(() => {
            bjAudio.playCard();
            const extraCard = { rank: 'K', suit: '♠', color: '#1a1d20' };
            currentDealerCards = [...currentDealerCards, extraCard];
            setDealerCards(currentDealerCards);
            runDealerStep();
          }, 550);
          return;
        }

        // Dealer stops, evaluate result
        setTimeout(() => {
          if (dScore > 21) {
            // Dealer Bust -> Player Win
            const winAmount = currentBet * 2;
            recordGameBet({
              game: 'Blackjack',
              betAmount: currentBet,
              winAmount,
              isWin: true,
              multiplier: 2.0
            });
            bjAudio.playWin();
            setRoundResult({
              isWin: true,
              type: 'win',
              title: 'Выигрыш',
              amount: winAmount,
              mult: 'x2.00'
            });
            try {
              confetti({
                particleCount: 55,
                spread: 70,
                origin: { y: 0.55 },
                zIndex: 999999,
                colors: ['#00e699', '#38ef7d', '#00ffc8', '#ffffff', '#ffd200']
              });
            } catch (e) {}
          } else if (dScore > pScore) {
            // Dealer Win
            recordGameBet({
              game: 'Blackjack',
              betAmount: currentBet,
              winAmount: 0,
              isWin: false,
              multiplier: 0
            });
            bjAudio.playLose();
            setRoundResult({
              isWin: false,
              type: 'loss',
              title: 'Проигрыш',
              amount: currentBet,
              mult: `Дилер (${dScore})`
            });
            processBetForCashback(currentBet);
          } else if (pScore > dScore) {
            // Player Win
            const winAmount = currentBet * 2;
            recordGameBet({
              game: 'Blackjack',
              betAmount: currentBet,
              winAmount,
              isWin: true,
              multiplier: 2.0
            });
            bjAudio.playWin();
            setRoundResult({
              isWin: true,
              type: 'win',
              title: 'Выигрыш',
              amount: winAmount,
              mult: 'x2.00'
            });
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
            // Push (Tie)
            setBalance(prev => {
              const next = parseFloat((prev + currentBet).toFixed(2));
              syncBalance(next);
              return next;
            });
            setRoundResult({
              isWin: 'push',
              type: 'push',
              title: 'Ничья',
              amount: 0,
              mult: 'Возврат'
            });
          }
          setGameState('idle');
        }, 300);
      }
    };

    setTimeout(runDealerStep, 500);
  };

  // Player Doubles Down
  const handleDouble = () => {
    if (gameState !== 'player_turn' || playerCards.length !== 2) return;
    if (balance < activeHandBet) {
      showToast('❌ Недостаточно средств для удвоения!', true);
      return;
    }

    setBalance(prev => {
      const next = Math.max(0, parseFloat((prev - activeHandBet).toFixed(2)));
      syncBalance(next);
      return next;
    });
    processBetForPass(activeHandBet, `bj_double_${Date.now()}`);
    const doubledBet = activeHandBet * 2;
    setActiveHandBet(doubledBet);
    setLastBet(doubledBet);

    bjAudio.playCard();
    const newCard = drawCard(false);
    const updatedCards = [...playerCards, newCard];
    setPlayerCards(updatedCards);

    const score = calculateScore(updatedCards);
    if (score > 21) {
      // Bust
      bjAudio.playLose();
      setDealerCards(prev => prev.map(c => ({ ...c, hidden: false })));
      recordGameBet({
        game: 'Blackjack',
        betAmount: doubledBet,
        winAmount: 0,
        isWin: false,
        multiplier: 0
      });
      setRoundResult({
        isWin: false,
        type: 'loss',
        title: 'Проигрыш',
        amount: doubledBet,
        mult: `Перебор (${score})`
      });
      processBetForCashback(doubledBet);
      setGameState('idle');
    } else {
      handleStand(updatedCards, doubledBet);
    }
  };

  const dealerScore = calculateScore(dealerCards);
  const playerScore = calculateScore(playerCards);

  const handleSafeBack = () => {
    if (gameState === 'player_turn') {
      showToast('⚡ Раздача сохранена! Вы сможете продолжить ее в любой момент.', false);
    }
    onBack();
  };

  return (
    <div className="bj-screen">
      {/* Top Header */}
      <GameHeader title="Blackjack" onBack={handleSafeBack} />

      {/* Main Felt Table */}
      <div className="bj-felt-container">
        {/* Felt Arc Ellipse with gold casino text */}
        <div className="bj-felt-arc-container">
          <svg viewBox="0 0 380 90" className="bj-felt-arc-svg">
            <defs>
              <path id="tableArcCurve" d="M 20,25 Q 190,85 360,25" fill="none" />
            </defs>
            <path 
              d="M 20,25 Q 190,85 360,25" 
              fill="none" 
              stroke="rgba(195, 175, 85, 0.28)" 
              strokeWidth="1.2" 
              strokeDasharray="4 4" 
            />
            <text fill="rgba(205, 185, 95, 0.6)" fontSize="9" fontWeight="700" letterSpacing="1.2">
              <textPath href="#tableArcCurve" xlinkHref="#tableArcCurve" startOffset="6%">
                BLACKJACK PAYS 3 TO 2
              </textPath>
              <textPath href="#tableArcCurve" xlinkHref="#tableArcCurve" startOffset="57%">
                DEALER MUST STAND ON 17
              </textPath>
            </text>
          </svg>
        </div>

        {/* Dealer Zone */}
        <div className="bj-dealer-zone">
          <div className="bj-zone-badge">
            <span className="bj-zone-label">ДИЛЕР</span>
            <span className="bj-score-pill">{dealerScore}</span>
          </div>
          <div className="bj-cards-row">
            {dealerCards.map((card, idx) => (
              <PlayingCard 
                key={card.id || idx} 
                card={card} 
                isOverlap={idx > 0} 
                overlapMargin={dealerCards.length > 3 ? '-28px' : '-22px'}
              />
            ))}
          </div>
        </div>

        {/* Central Result Box (Win, Loss or Push like in Mines) */}
        {roundResult && !isBetModalOpen && (
          <div 
            className={`mines-win-box ${roundResult.type} ${isClosingResult ? 'closing' : ''}`}
            onClick={dismissResult}
          >
            <span className="mines-win-label">{roundResult.title}</span>
            <span className="mines-win-value">
              {roundResult.type === 'win'
                ? `+$${roundResult.amount.toFixed(2)}`
                : roundResult.type === 'loss'
                ? `-$${roundResult.amount.toFixed(2)}`
                : `$${roundResult.amount.toFixed(2)}`}
            </span>
            <span className="mines-win-multiplier">
              {roundResult.mult}
            </span>
          </div>
        )}

        {/* Player Zone */}
        <div className="bj-player-zone">
          <div className="bj-cards-row">
            {playerCards.map((card, idx) => (
              <PlayingCard 
                key={card.id || idx} 
                card={card} 
                isOverlap={idx > 0} 
                overlapMargin={playerCards.length > 3 ? '-28px' : '-22px'}
              />
            ))}
          </div>
          <div className="bj-zone-badge">
            <span className="bj-zone-label">ВАША РУКА (${activeHandBet})</span>
            <span className="bj-score-pill">{playerScore}</span>
          </div>
        </div>
      </div>

      {/* Bottom Action Controls */}
      <div className="bj-betting-container">
        {gameState === 'idle' ? (
          <button 
            className="mines-bet-trigger-btn"
            onClick={openBetModal}
          >
            Сделать ставку
          </button>
        ) : (
          <div className="bj-actions-row">
            <button 
              className="bj-btn-stand"
              disabled={gameState !== 'player_turn'}
              onClick={() => handleStand()}
            >
              ХВАТИТ
            </button>
            <button 
              className="bj-btn-double"
              disabled={gameState !== 'player_turn' || playerCards.length !== 2 || balance < activeHandBet}
              onClick={handleDouble}
            >
              УДВОИТЬ
            </button>
            <button 
              className="bj-btn-hit"
              disabled={gameState !== 'player_turn'}
              onClick={handleHit}
            >
              ЕЩЁ
            </button>
          </div>
        )}
      </div>

      {/* Slide-Up Bet Bottom Sheet Modal (Identical to Crash and Mines) */}
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

            {/* Balance info */}
            <div className="crash-ton-balance-row">
              <span className="crash-ton-balance-title">Баланс:</span>
              <span className="crash-ton-balance-val">
                <TetherIcon size={22} />
                <span>{balance.toFixed(2)}</span>
              </span>
            </div>

            {/* Start Deal Action Button */}
            <button
              type="button"
              className="crash-ton-submit-btn"
              disabled={betAmount < 0.15 || betAmount > balance}
              onClick={handleStartDealFromModal}
            >
              {balance < betAmount 
                ? 'Недостаточно средств' 
                : `Раздать карты (${betAmount} USDT)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
