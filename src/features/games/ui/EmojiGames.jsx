import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import GameHeader from './GameHeader';
import BetControls from './BetControls';
import { bjAudio } from '@/shared/lib/blackjackAudio';
import { TetherIcon } from '@/shared/ui/Icons';
import './Games.css';

// ─── Game configs (must mirror server GAME_CONFIG) ───────────────────────────
const GAMES = [
  {
    id: 'dice',
    emoji: '🎲',
    title: 'Кости',
    desc: 'Угадай цифру или диапазон',
    minMult: 1.95,
    maxMult: 5.80,
    color: '#00e699',
    outcomes: [
      { key: 'under',  label: '1–3 Меньше',      mult: 1.95 },
      { key: 'over',   label: '4–6 Больше',       mult: 1.95 },
      { key: 'even',   label: 'Чётное',           mult: 1.95 },
      { key: 'odd',    label: 'Нечётное',         mult: 1.95 },
      { key: '1',      label: 'Точно 1 ⚀',        mult: 5.80 },
      { key: '2',      label: 'Точно 2 ⚁',        mult: 5.80 },
      { key: '3',      label: 'Точно 3 ⚂',        mult: 5.80 },
      { key: '4',      label: 'Точно 4 ⚃',        mult: 5.80 },
      { key: '5',      label: 'Точно 5 ⚄',        mult: 5.80 },
      { key: '6',      label: 'Точно 6 ⚅',        mult: 5.80 },
    ]
  },
  {
    id: 'bowling',
    emoji: '🎳',
    title: 'Боулинг',
    desc: 'Сколько кеглей собьёт шар?',
    minMult: 1.70,
    maxMult: 5.50,
    color: '#a78bfa',
    outcomes: [
      { key: 'gutter',  label: 'Гаттер (0–2)',     mult: 5.50 },
      { key: 'partial', label: '3–5 кеглей',       mult: 1.80 },
      { key: 'pins4',   label: '4+ кегли',         mult: 1.70 },
      { key: 'pins5',   label: '5–6 кеглей',       mult: 2.80 },
      { key: 'strike',  label: 'Страйк 🎳 (6/6)',  mult: 4.00 },
    ]
  },
  {
    id: 'darts',
    emoji: '🎯',
    title: 'Дартс',
    desc: 'Куда попадёт дротик?',
    minMult: 1.50,
    maxMult: 5.00,
    color: '#f59e0b',
    outcomes: [
      { key: 'miss',     label: 'Мимо (1)',             mult: 5.00 },
      { key: 'outer',    label: 'Внешн. кольцо (2–3)',  mult: 2.50 },
      { key: 'hit',      label: 'Попадание (2–5)',       mult: 1.50 },
      { key: 'inner',    label: 'Внутр. кольцо (4–5)',   mult: 2.80 },
      { key: 'bullseye', label: 'Яблочко 🎯 (6)',         mult: 5.00 },
    ]
  },
  {
    id: 'basketball',
    emoji: '🏀',
    title: 'Баскетбол',
    desc: 'Попадёт ли мяч в корзину?',
    minMult: 1.95,
    maxMult: 4.50,
    color: '#fb923c',
    outcomes: [
      { key: 'miss',  label: 'Мимо (1–3)',              mult: 3.50 },
      { key: 'score', label: 'Попадание 🏀 (4–5)',       mult: 1.95 },
      { key: 'swish', label: 'Чистый бросок 🔥 (5)',     mult: 4.50 },
    ]
  },
  {
    id: 'football',
    emoji: '⚽',
    title: 'Футбол',
    desc: 'Гол или мимо ворот?',
    minMult: 1.95,
    maxMult: 5.00,
    color: '#34d399',
    outcomes: [
      { key: 'miss',       label: 'Мимо (1–2)',           mult: 3.50 },
      { key: 'goal',       label: 'Гол ⚽ (3–5)',          mult: 1.95 },
      { key: 'top_corner', label: 'В девятку 🔥 (5)',      mult: 5.00 },
    ]
  },
  {
    id: 'slots',
    emoji: '🎰',
    title: 'Слоты',
    desc: 'Крути барабан! До x25',
    minMult: 1.80,
    maxMult: 25.00,
    color: '#facc15',
    outcomes: [
      { key: 'spin', label: 'Крутить барабан', mult: null, isAuto: true }
    ]
  },
];

function triggerHaptic(style = 'medium') {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
    try { window.Telegram.WebApp.HapticFeedback.impactOccurred(style); } catch (e) {}
  }
}

// ─── Slots visual result ──────────────────────────────────────────────────────
function getSlotsResult(val) {
  if (val === 64) return { label: '🍋 🍋 🍋', tier: '777 — ДЖЕКПОТ!', mult: '×25', color: '#facc15' };
  if ([1, 22, 43].includes(val)) return { label: '🍒 🍒 🍒', tier: '3 одинаковых', mult: '×5', color: '#f87171' };
  if (val % 16 === 0 || val === 32 || val === 48) return { label: '🍊 🍊 🔔', tier: '2 одинаковых', mult: '×1.8', color: '#fb923c' };
  const syms = ['🍒', '🍊', '🍋', '🍇', '🔔', '⭐', '7️⃣'];
  const s1 = syms[val % syms.length];
  const s2 = syms[(val + 2) % syms.length];
  const s3 = syms[(val + 4) % syms.length];
  return { label: `${s1} ${s2} ${s3}`, tier: 'Нет совпадений', mult: null, color: '#8a8f99' };
}

function getResultText(gameId, val, isWin) {
  switch (gameId) {
    case 'dice':
      return `Выпало: ${['', '1 ⚀', '2 ⚁', '3 ⚂', '4 ⚃', '5 ⚄', '6 ⚅'][val] || val}`;
    case 'bowling':
      if (val === 6) return '🎳 СТРАЙК! Все 6 кеглей!';
      if (val >= 4) return `Сбито ${val} кеглей`;
      return `Только ${val} кегл${val === 1 ? 'я' : 'и'}`;
    case 'darts':
      if (val === 6) return '🎯 ЯБЛОЧКО! Прямо в центр!';
      if (val >= 4) return `Внутреннее кольцо (${val})`;
      if (val >= 2) return `Попадание во внешнее кольцо (${val})`;
      return 'Мимо мишени (1)';
    case 'basketball':
      if (val === 5) return '🔥 ЧИСТЫЙ БРОСОК! Swish!';
      if (val >= 4) return '🏀 Мяч в корзине!';
      return `Мяч не долетел (${val})`;
    case 'football':
      if (val === 5) return '🔥 В ДЕВЯТКУ! Идеальный удар!';
      if (val >= 3) return '⚽ Гол!';
      return `Мяч мимо ворот (${val})`;
    case 'slots':
      return getSlotsResult(val).tier;
    default:
      return `Результат: ${val}`;
  }
}

// ─── Lobby screen ─────────────────────────────────────────────────────────────
function LobbyScreen({ onSelectGame, onBack }) {
  return (
    <div className="game-screen" style={{ overflowY: 'auto' }}>
      <GameHeader title="Эмодзи игры" onBack={onBack} />
      <div style={{ padding: '12px 14px 32px' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          color: '#8a8f99',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: '12px'
        }}>
          Выберите игру
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {GAMES.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => { triggerHaptic('light'); onSelectGame(g.id); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '14px 16px',
                borderRadius: '16px',
                border: `1px solid rgba(255,255,255,0.07)`,
                background: 'rgba(255,255,255,0.03)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              {/* Emoji Icon */}
              <div style={{
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: `${g.color}18`,
                border: `1px solid ${g.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                flexShrink: 0,
              }}>
                {g.emoji}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '3px' }}>
                  {g.title}
                </div>
                <div style={{ fontSize: '12px', color: '#8a8f99' }}>
                  {g.desc}
                </div>
              </div>

              {/* Multipliers */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: g.color,
                  marginBottom: '2px'
                }}>
                  до x{g.maxMult}
                </div>
                <div style={{ fontSize: '10px', color: '#8a8f99' }}>
                  {g.outcomes.length} исход{g.outcomes.length === 1 ? '' : g.outcomes.length <= 4 ? 'а' : 'ов'}
                </div>
              </div>

              {/* Arrow */}
              <div style={{ color: '#8a8f99', fontSize: '14px', flexShrink: 0 }}>›</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Game screen ──────────────────────────────────────────────────────────────
function GameScreen({ gameId, onBack, onBackToLobby }) {
  const { balance, setBalance, showToast, tgUser, getAuthHeaders } = useApp();
  const game = GAMES.find(g => g.id === gameId);

  const [selectedOutcome, setSelectedOutcome] = useState(game?.outcomes[0]?.key || '');
  const [betAmount, setBetAmount] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const rollingRef = useRef(false);

  useEffect(() => {
    setSelectedOutcome(game?.outcomes[0]?.key || '');
    setLastResult(null);
  }, [gameId]);

  if (!game) return null;

  const selectedOutcomeObj = game.outcomes.find(o => o.key === selectedOutcome);

  const handleRoll = async () => {
    if (rollingRef.current) return;
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) {
      showToast('❌ Укажите ставку', true);
      return;
    }
    if (bet > balance) {
      showToast('❌ Недостаточно средств', true);
      return;
    }
    rollingRef.current = true;
    setIsRolling(true);
    setLastResult(null);
    triggerHaptic('heavy');
    bjAudio.playChip();

    try {
      const res = await fetch('/api/games/emoji-roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          game: gameId,
          outcome: selectedOutcome,
          betAmount: bet,
          userId: tgUser?.id || '3982051'
        })
      });
      const data = await res.json();

      setTimeout(() => {
        setIsRolling(false);
        rollingRef.current = false;
        if (data.success) {
          setLastResult(data);
          if (typeof data.balance === 'number') setBalance(data.balance);
          if (data.isWin) {
            triggerHaptic('success');
            bjAudio.playCard();
            showToast(`🎉 Победа! +$${data.winAmount?.toFixed(2)} USDT (×${data.multiplier})`);
          } else {
            triggerHaptic('error');
          }
        } else {
          showToast(data.error || 'Ошибка ставки', true);
        }
      }, 1200);
    } catch (e) {
      setTimeout(() => {
        setIsRolling(false);
        rollingRef.current = false;
        showToast('Ошибка сети', true);
      }, 1000);
    }
  };

  // ── Render ──
  const isSlots = gameId === 'slots';
  const slotsResult = lastResult && isSlots ? getSlotsResult(lastResult.value) : null;

  return (
    <div className="game-screen" style={{ overflowY: 'auto' }}>
      {/* Header with back-to-lobby */}
      <div className="game-header">
        <button className="game-back-btn" onClick={onBackToLobby} aria-label="К списку игр">
          <div className="game-back-icon-circle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="game-header-title">{game.emoji} {game.title}</span>
        </button>

        <div
          className="game-balance-box"
          onClick={() => {}}
          style={{ cursor: 'default' }}
          title="Баланс"
        >
          <TetherIcon size={28} />
          <span className="game-balance-num">
            {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div style={{ padding: '10px 14px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* ── Stage ── */}
        <div style={{
          borderRadius: '18px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '160px',
          justifyContent: 'center',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: isRolling
              ? `radial-gradient(ellipse at 50% 50%, ${game.color}28 0%, transparent 65%)`
              : lastResult?.isWin
                ? `radial-gradient(ellipse at 50% 50%, ${game.color}18 0%, transparent 65%)`
                : 'transparent',
            pointerEvents: 'none',
            transition: 'background 0.4s ease',
          }} />

          {/* Slots symbols */}
          {isSlots && lastResult && slotsResult && !isRolling ? (
            <>
              <div style={{ fontSize: '30px', letterSpacing: '8px', fontWeight: 900 }}>
                {slotsResult.label}
              </div>
              <div style={{
                fontSize: '13px',
                fontWeight: 800,
                color: slotsResult.color,
                background: `${slotsResult.color}18`,
                padding: '4px 14px',
                borderRadius: '20px',
                border: `1px solid ${slotsResult.color}40`,
              }}>
                {slotsResult.tier} {slotsResult.mult ? `— ${slotsResult.mult}` : ''}
              </div>
            </>
          ) : (
            <div style={{
              fontSize: isRolling ? '72px' : '58px',
              lineHeight: 1,
              transform: isRolling ? 'scale(1.1) rotate(12deg)' : 'scale(1)',
              transition: 'all 0.2s ease',
            }}>
              {isRolling ? game.emoji : (lastResult?.isWin ? '🎉' : (lastResult ? '😔' : game.emoji))}
            </div>
          )}

          {/* Result text */}
          {lastResult && !isRolling ? (
            <div style={{
              padding: '6px 16px',
              borderRadius: '20px',
              background: lastResult.isWin ? 'rgba(0,230,153,0.12)' : 'rgba(255,77,77,0.10)',
              border: `1px solid ${lastResult.isWin ? 'rgba(0,230,153,0.3)' : 'rgba(255,77,77,0.25)'}`,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: lastResult.isWin ? '#00e699' : '#ff4d4d' }}>
                {lastResult.isWin
                  ? `+$${lastResult.winAmount?.toFixed(2)} USDT (×${lastResult.multiplier})`
                  : 'Не повезло'
                }
              </div>
              <div style={{ fontSize: '11px', color: '#8a8f99', marginTop: '1px' }}>
                {getResultText(gameId, lastResult.value, lastResult.isWin)}
              </div>
            </div>
          ) : isRolling ? (
            <div style={{ fontSize: '13px', color: '#8a8f99', fontWeight: 600 }}>Бросок...</div>
          ) : (
            <div style={{ fontSize: '12px', color: '#8a8f99' }}>{game.desc}</div>
          )}
        </div>

        {/* ── Outcome picker ── */}
        {!isSlots ? (
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#8a8f99',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              marginBottom: '8px',
            }}>
              Выберите исход
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: game.outcomes.length <= 2 ? 'repeat(2, 1fr)' : game.outcomes.length >= 8 ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
              gap: '8px',
            }}>
              {game.outcomes.map(o => {
                const isSel = selectedOutcome === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    disabled={isRolling}
                    onClick={() => { setSelectedOutcome(o.key); triggerHaptic('light'); }}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '14px',
                      border: isSel ? `1px solid ${game.color}` : '1px solid rgba(255,255,255,0.08)',
                      background: isSel ? `${game.color}18` : 'rgba(255,255,255,0.03)',
                      cursor: isRolling ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{
                      fontSize: '12px',
                      fontWeight: isSel ? 800 : 600,
                      color: isSel ? '#fff' : '#c0c5d0',
                      textAlign: 'center',
                      lineHeight: 1.3,
                    }}>
                      {o.label}
                    </span>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 900,
                      color: isSel ? game.color : '#8a8f99',
                    }}>
                      ×{o.mult}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Slots tier breakdown */
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '12px 14px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#8a8f99', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.6px' }}>
              Таблица выплат
            </div>
            {[
              { symbols: '🍋 🍋 🍋', name: 'Джекпот 777', mult: '×25', color: '#facc15' },
              { symbols: '🍒 🍒 🍒', name: '3 одинаковых', mult: '×5', color: '#f87171' },
              { symbols: '🍊 🍊 🔔', name: '2 одинаковых', mult: '×1.8', color: '#fb923c' },
              { symbols: '🍒 🍊 🍋', name: 'Нет совпадений', mult: '×0', color: '#8a8f99' },
            ].map(tier => (
              <div key={tier.name} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 0',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '15px', letterSpacing: '2px' }}>{tier.symbols}</span>
                  <span style={{ fontSize: '12px', color: '#c0c5d0' }}>{tier.name}</span>
                </div>
                <span style={{ fontSize: '14px', fontWeight: 900, color: tier.color }}>{tier.mult}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Bet Controls ── */}
        <BetControls
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          balance={balance}
          disabled={isRolling}
        />

        {/* ── Roll button ── */}
        <button
          type="button"
          disabled={isRolling || betAmount <= 0 || betAmount > balance}
          onClick={handleRoll}
          style={{
            padding: '15px',
            fontSize: '15px',
            fontWeight: 900,
            borderRadius: '16px',
            border: 'none',
            cursor: isRolling || betAmount > balance ? 'not-allowed' : 'pointer',
            background: isRolling || betAmount > balance
              ? '#1a1f2c'
              : `linear-gradient(135deg, ${game.color} 0%, ${game.color}99 100%)`,
            color: isRolling || betAmount > balance ? '#8a8f99' : '#050a0a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: isRolling || betAmount > balance ? 'none' : `0 8px 24px ${game.color}40`,
            transition: 'all 0.2s ease',
          }}
        >
          {isRolling ? (
            <span>Бросок...</span>
          ) : (
            <>
              <span style={{ fontSize: '18px' }}>{isSlots ? '🎰' : game.emoji}</span>
              <span>
                {isSlots ? 'Крутить' : gameId === 'dice' ? 'Бросить кубик' : gameId === 'bowling' ? 'Бросить шар' : gameId === 'darts' ? 'Бросить дротик' : gameId === 'basketball' ? 'Бросить мяч' : 'Нанести удар'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', opacity: 0.85, fontSize: '13px' }}>
                (<TetherIcon size={14} /> {betAmount})
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Root export ─────────────────────────────────────────────────────────────
export default function EmojiGames({ onBack, initialGame = null }) {
  const [selectedGame, setSelectedGame] = useState(
    initialGame && initialGame !== 'emoji' ? initialGame : null
  );

  if (selectedGame) {
    return (
      <GameScreen
        gameId={selectedGame}
        onBack={onBack}
        onBackToLobby={() => setSelectedGame(null)}
      />
    );
  }

  return (
    <LobbyScreen
      onSelectGame={setSelectedGame}
      onBack={onBack}
    />
  );
}
