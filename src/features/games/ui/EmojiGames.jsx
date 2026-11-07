import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import GameHeader from './GameHeader';
import BetControls from './BetControls';
import { bjAudio } from '@/shared/lib/blackjackAudio';
import { TetherIcon } from '@/shared/ui/Icons';
import './Games.css';

const GAMES = [
  { id: 'dice', title: 'Кости', emoji: '🎲' },
  { id: 'bowling', title: 'Боулинг', emoji: '🎳' },
  { id: 'darts', title: 'Дартс', emoji: '🎯' },
  { id: 'basketball', title: 'Баскетбол', emoji: '🏀' },
  { id: 'football', title: 'Футбол', emoji: '⚽' },
  { id: 'slots', title: 'Слоты', emoji: '🎰' },
];

const GAME_OUTCOMES = {
  dice: [
    { key: 'under', label: 'Меньше (1-3)', mult: 'x1.95' },
    { key: 'over', label: 'Больше (4-6)', mult: 'x1.95' },
    { key: 'even', label: 'Чётное', mult: 'x1.95' },
    { key: 'odd', label: 'Нечётное', mult: 'x1.95' },
    { key: '1', label: 'Точно 1', mult: 'x5.80' },
    { key: '2', label: 'Точно 2', mult: 'x5.80' },
    { key: '3', label: 'Точно 3', mult: 'x5.80' },
    { key: '4', label: 'Точно 4', mult: 'x5.80' },
    { key: '5', label: 'Точно 5', mult: 'x5.80' },
    { key: '6', label: 'Точно 6', mult: 'x5.80' },
  ],
  bowling: [
    { key: 'strike', label: 'Страйк (все кегли)', mult: 'x4.00' },
    { key: 'pins4', label: 'Сбить 4+ кеглей', mult: 'x1.90' },
  ],
  darts: [
    { key: 'bullseye', label: 'Яблочко (центр)', mult: 'x5.00' },
    { key: 'hit', label: 'Попадание в мишень', mult: 'x1.50' },
  ],
  basketball: [
    { key: 'score', label: 'Попадание в корзину', mult: 'x1.95' },
  ],
  football: [
    { key: 'goal', label: 'Гол в ворота', mult: 'x1.95' },
  ],
  slots: [
    { key: 'spin', label: 'Крутить (Джекпот 777)', mult: 'до x25' },
  ]
};

const DICE_FACES = ['', '⚀ 1', '⚁ 2', '⚂ 3', '⚃ 4', '⚄ 5', '⚅ 6'];

export default function EmojiGames({ onBack, initialGame = 'dice' }) {
  const { balance, setBalance, showToast, tgUser, getAuthHeaders } = useApp();

  const [activeGameId, setActiveGameId] = useState(
    GAMES.some(g => g.id === initialGame) ? initialGame : 'dice'
  );
  const [selectedOutcome, setSelectedOutcome] = useState('under');
  const [betAmount, setBetAmount] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [displayEmoji, setDisplayEmoji] = useState('🎲');

  // Change outcome default when game changes
  useEffect(() => {
    const list = GAME_OUTCOMES[activeGameId] || [];
    if (list.length > 0) {
      setSelectedOutcome(list[0].key);
    }
    const currentCfg = GAMES.find(g => g.id === activeGameId);
    if (currentCfg) {
      setDisplayEmoji(currentCfg.emoji);
    }
    setLastResult(null);
  }, [activeGameId]);

  const triggerHaptic = (style = 'medium') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
      } catch (e) {}
    }
  };

  const handleRoll = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      showToast('❌ Укажите корректную ставку', true);
      return;
    }
    if (bet > balance) {
      showToast('❌ Недостаточно средств на балансе', true);
      return;
    }

    setIsRolling(true);
    setLastResult(null);
    triggerHaptic('heavy');
    bjAudio.playChip();

    try {
      const res = await fetch('/api/games/emoji-roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          game: activeGameId,
          outcome: selectedOutcome,
          betAmount: bet,
          userId: tgUser?.id || '3982051'
        })
      });

      const data = await res.json();

      // Animate roll for 1.1s for realistic feel
      setTimeout(() => {
        setIsRolling(false);
        if (data.success) {
          setLastResult(data);
          if (typeof data.balance === 'number') {
            setBalance(data.balance);
          }

          if (data.isWin) {
            triggerHaptic('success');
            bjAudio.playCard();
            showToast(`🎉 Победа! Вы выиграли $${data.winAmount.toFixed(2)} USDT (x${data.multiplier})!`);
          } else {
            triggerHaptic('error');
            showToast(`Раунд завершён. Попробуйте ещё раз!`);
          }
        } else {
          showToast(data.error || 'Ошибка ставки', true);
        }
      }, 1100);

    } catch (e) {
      setTimeout(() => {
        setIsRolling(false);
        showToast('Ошибка сети при совершении ставки', true);
      }, 1000);
    }
  };

  const currentGame = GAMES.find(g => g.id === activeGameId) || GAMES[0];
  const outcomes = GAME_OUTCOMES[activeGameId] || [];

  const renderResultBadge = () => {
    if (!lastResult) return null;
    const { isWin, value, multiplier, winAmount } = lastResult;

    let detailText = `Выпало: ${value}`;
    if (activeGameId === 'dice') {
      detailText = `Выпало: ${DICE_FACES[value] || value}`;
    } else if (activeGameId === 'bowling') {
      detailText = value === 6 ? '🎳 СТРАЙК! Все 6 кеглей!' : `Сбито ${value} кеглей`;
    } else if (activeGameId === 'darts') {
      detailText = value === 6 ? '🎯 ЯБЛОЧКО! В центр!' : value >= 2 ? `🎯 Попадание (${value})` : 'Мимо мишени (1)';
    } else if (activeGameId === 'basketball') {
      detailText = value >= 4 ? '🏀 ЧИСТОЕ ПОПАДАНИЕ!' : 'Мимо корзины';
    } else if (activeGameId === 'football') {
      detailText = value >= 3 ? '⚽️ ГОЛ В ДЕВЯТКУ!' : 'Вратарь отбил мяч';
    } else if (activeGameId === 'slots') {
      if (value === 64) detailText = '🎰 ДЖЕКПОТ 777! (x25)';
      else if ([1, 22, 43].includes(value)) detailText = '🎰 3 Одинаковых символа! (x5)';
      else if (value % 16 === 0 || value === 32 || value === 48) detailText = '🎰 2 Одинаковых символа! (x1.8)';
      else detailText = 'Символы не совпали';
    }

    return (
      <div style={{
        marginTop: '10px',
        padding: '8px 14px',
        borderRadius: '12px',
        background: isWin ? 'rgba(0, 230, 153, 0.15)' : 'rgba(255, 77, 77, 0.12)',
        border: `1px solid ${isWin ? 'rgba(0, 230, 153, 0.4)' : 'rgba(255, 77, 77, 0.3)'}`,
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: isWin ? '#00e699' : '#ff4d4d' }}>
          {isWin ? `ВЫИГРЫШ +$${winAmount?.toFixed(2)} USDT (${multiplier}x)` : 'ПРОИГРЫШ'}
        </div>
        <div style={{ fontSize: '11px', color: '#c0c5d0', marginTop: '2px' }}>
          {detailText}
        </div>
      </div>
    );
  };

  return (
    <div className="game-screen" style={{ overflowY: 'auto' }}>
      <GameHeader title="Эмодзи игры" onBack={onBack} />

      {/* Game Selector Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        padding: '10px 14px 6px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        flexShrink: 0
      }}>
        {GAMES.map(g => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              if (isRolling) return;
              setActiveGameId(g.id);
              triggerHaptic('light');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '12px',
              border: activeGameId === g.id ? '1px solid #00e699' : '1px solid rgba(255,255,255,0.08)',
              background: activeGameId === g.id ? 'rgba(0, 230, 153, 0.12)' : 'rgba(255,255,255,0.04)',
              color: activeGameId === g.id ? '#00e699' : '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontSize: '16px' }}>{g.emoji}</span>
            <span>{g.title}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '8px 14px 24px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {/* Animated Game Stage */}
        <div style={{
          background: 'linear-gradient(180deg, rgba(20, 23, 33, 0.9) 0%, rgba(12, 13, 18, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '170px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Background Glow */}
          <div style={{
            position: 'absolute',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: isRolling ? 'radial-gradient(circle, rgba(0,230,153,0.35) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(0,230,153,0.12) 0%, transparent 70%)',
            filter: 'blur(20px)',
            pointerEvents: 'none'
          }} />

          {/* Main Visual */}
          <div style={{
            fontSize: isRolling ? '72px' : '64px',
            transform: isRolling ? 'scale(1.15) rotate(15deg)' : 'scale(1)',
            transition: 'all 0.2s ease',
            animation: isRolling ? 'pulse 0.4s infinite alternate' : 'none',
            lineHeight: 1
          }}>
            {isRolling ? '🎲' : (lastResult?.isWin ? '🎉' : currentGame.emoji)}
          </div>

          <div style={{ fontSize: '15px', fontWeight: 800, color: '#ffffff', marginTop: '12px' }}>
            {isRolling ? 'Бросок выполняется...' : currentGame.title}
          </div>

          <div style={{ fontSize: '11px', color: '#8a8f99', marginTop: '4px' }}>
            {activeGameId === 'slots' ? 'Выигрыш до x25 ставки при 777' : 'Исход полностью синхронизирован с Telegram'}
          </div>

          {renderResultBadge()}
        </div>

        {/* Outcome Selector */}
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
            ВЫБЕРИТЕ ИСХОД
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: outcomes.length > 4 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
            gap: '8px'
          }}>
            {outcomes.map(item => {
              const isSelected = selectedOutcome === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={isRolling}
                  onClick={() => {
                    setSelectedOutcome(item.key);
                    triggerHaptic('light');
                  }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '12px',
                    border: isSelected ? '1px solid #00e699' : '1px solid rgba(255,255,255,0.08)',
                    background: isSelected ? 'rgba(0, 230, 153, 0.15)' : 'rgba(255,255,255,0.03)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: isSelected ? 800 : 600 }}>{item.label}</span>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: '#00e699' }}>{item.mult}</span>
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
          disabled={isRolling}
        />

        {/* Action Button */}
        <button
          type="button"
          className="game-action-btn primary"
          disabled={isRolling || betAmount <= 0 || betAmount > balance}
          onClick={handleRoll}
          style={{
            marginTop: '4px',
            padding: '15px',
            fontSize: '15px',
            fontWeight: 800,
            borderRadius: '14px',
            background: isRolling || betAmount > balance ? '#1a1f2c' : 'linear-gradient(135deg, #00e699 0%, #00b377 100%)',
            color: isRolling || betAmount > balance ? '#8a8f99' : '#05140d',
            border: 'none',
            cursor: isRolling || betAmount > balance ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isRolling || betAmount > balance ? 'none' : '0 8px 24px rgba(0, 230, 153, 0.3)'
          }}
        >
          {isRolling ? (
            'БРОСАЕМ...'
          ) : (
            <>
              <span>{activeGameId === 'slots' ? 'КРУТИТЬ' : 'БРОСИТЬ'}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', opacity: 0.9 }}>
                (<TetherIcon size={16} /> {betAmount})
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
