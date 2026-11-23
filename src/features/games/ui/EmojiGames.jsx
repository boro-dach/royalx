import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import GameHeader from './GameHeader';
import BetControls from './BetControls';
import { bjAudio } from '@/shared/lib/blackjackAudio';
import { TetherIcon } from '@/shared/ui/Icons';
import TelegramDiceSticker from './TelegramDiceSticker';
import './Games.css';
import './EmojiGames.css';

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

// ─── Compact Redesigned Outcome Picker ────────────────────────────────────────
function OutcomePicker({ game, selectedOutcome, onSelect, isRolling }) {
  const gameId = game.id;

  if (gameId === 'slots') {
    return (
      <div className="emoji-slots-table">
        <div className="emoji-section-header" style={{ marginBottom: '8px' }}>
          <span className="emoji-section-title">Таблица выплат</span>
          <span style={{ fontSize: '11px', color: '#facc15', fontWeight: 800 }}>Макс. ×25</span>
        </div>
        {[
          { symbols: '🍋 🍋 🍋', name: 'Джекпот 777', mult: '×25', color: '#facc15' },
          { symbols: '🍒 🍒 🍒', name: '3 одинаковых', mult: '×5', color: '#f87171' },
          { symbols: '🍊 🍊 🔔', name: '2 одинаковых', mult: '×1.8', color: '#fb923c' },
          { symbols: '🍒 🍊 🍋', name: 'Нет совпадений', mult: '×0', color: '#8a8f99' },
        ].map(tier => (
          <div key={tier.name} className="emoji-slots-row">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="emoji-slots-syms">{tier.symbols}</span>
              <span className="emoji-slots-name">{tier.name}</span>
            </div>
            <span className="emoji-slots-mult" style={{ color: tier.color }}>{tier.mult}</span>
          </div>
        ))}
      </div>
    );
  }

  const selectedObj = game.outcomes.find(o => o.key === selectedOutcome);

  // 1. DICE SPECIAL REDESIGN: 4 Range Pills + 6 Die Face Chips
  if (gameId === 'dice') {
    const rangeOutcomes = game.outcomes.slice(0, 4);
    const dieFaces = [
      { key: '1', die: '⚀', num: 1 },
      { key: '2', die: '⚁', num: 2 },
      { key: '3', die: '⚂', num: 3 },
      { key: '4', die: '⚃', num: 4 },
      { key: '5', die: '⚄', num: 5 },
      { key: '6', die: '⚅', num: 6 },
    ];

    return (
      <div className="emoji-dice-box">
        {/* Ranges Header & Grid */}
        <div className="emoji-section-header">
          <span className="emoji-section-title">Быстрый исход</span>
          {selectedObj && ['under', 'over', 'even', 'odd'].includes(selectedOutcome) && (
            <span className="emoji-section-selected-tag" style={{ color: game.color }}>
              {selectedObj.label} · ×{selectedObj.mult}
            </span>
          )}
        </div>
        <div className="emoji-dice-ranges-grid">
          {rangeOutcomes.map(o => {
            const isSel = selectedOutcome === o.key;
            return (
              <button
                key={o.key}
                type="button"
                disabled={isRolling}
                className={`emoji-outcome-pill ${isSel ? 'active' : ''}`}
                style={{
                  borderColor: isSel ? game.color : undefined,
                  boxShadow: isSel ? `0 0 10px ${game.color}35` : undefined
                }}
                onClick={() => { onSelect(o.key); triggerHaptic('light'); }}
              >
                <span className="emoji-outcome-pill-label">{o.label}</span>
                <span className="emoji-outcome-pill-mult" style={{ color: isSel ? game.color : undefined }}>
                  ×{o.mult}
                </span>
              </button>
            );
          })}
        </div>

        {/* Die Faces Header & Row */}
        <div className="emoji-dice-faces-header">
          <span className="emoji-dice-faces-title">Точное число</span>
          <span className="emoji-dice-faces-mult">×5.80</span>
        </div>
        <div className="emoji-dice-faces-row">
          {dieFaces.map(d => {
            const isSel = selectedOutcome === d.key;
            return (
              <button
                key={d.key}
                type="button"
                disabled={isRolling}
                className={`emoji-die-face-chip ${isSel ? 'active' : ''}`}
                style={{
                  borderColor: isSel ? game.color : undefined,
                  boxShadow: isSel ? `0 0 12px ${game.color}40` : undefined
                }}
                onClick={() => { onSelect(d.key); triggerHaptic('light'); }}
                title={`Точно ${d.num}`}
              >
                <span className="emoji-die-face-icon">{d.die}</span>
                <span className="emoji-die-face-num" style={{ color: isSel ? game.color : undefined }}>{d.num}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. 3-OUTCOMES (Basketball, Football)
  if (game.outcomes.length === 3) {
    return (
      <div className="emoji-outcomes-section">
        <div className="emoji-section-header">
          <span className="emoji-section-title">Выберите исход</span>
          {selectedObj && (
            <span className="emoji-section-selected-tag" style={{ color: game.color }}>
              ×{selectedObj.mult}
            </span>
          )}
        </div>
        <div className="emoji-outcomes-row-3">
          {game.outcomes.map(o => {
            const isSel = selectedOutcome === o.key;
            return (
              <button
                key={o.key}
                type="button"
                disabled={isRolling}
                className={`emoji-outcome-card-3 ${isSel ? 'active' : ''}`}
                style={{
                  borderColor: isSel ? game.color : undefined,
                  background: isSel ? `${game.color}18` : undefined,
                  boxShadow: isSel ? `0 0 12px ${game.color}35` : undefined
                }}
                onClick={() => { onSelect(o.key); triggerHaptic('light'); }}
              >
                <span className="emoji-outcome-card-3-title">{o.label}</span>
                <span
                  className="emoji-outcome-card-3-mult"
                  style={{ color: isSel ? game.color : '#8a8f99' }}
                >
                  ×{o.mult}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. 5-OUTCOMES (Bowling, Darts)
  const regularOutcomes = game.outcomes.slice(0, 4);
  const featuredOutcome = game.outcomes[4]; // strike / bullseye

  return (
    <div className="emoji-outcomes-section">
      <div className="emoji-section-header">
        <span className="emoji-section-title">Выберите исход</span>
        {selectedObj && (
          <span className="emoji-section-selected-tag" style={{ color: game.color }}>
            ×{selectedObj.mult}
          </span>
        )}
      </div>

      <div className="emoji-outcomes-grid-5">
        {regularOutcomes.map(o => {
          const isSel = selectedOutcome === o.key;
          return (
            <button
              key={o.key}
              type="button"
              disabled={isRolling}
              className={`emoji-outcome-pill ${isSel ? 'active' : ''}`}
              style={{
                borderColor: isSel ? game.color : undefined,
                boxShadow: isSel ? `0 0 10px ${game.color}30` : undefined
              }}
              onClick={() => { onSelect(o.key); triggerHaptic('light'); }}
            >
              <span className="emoji-outcome-pill-label">{o.label}</span>
              <span
                className="emoji-outcome-pill-mult"
                style={{ color: isSel ? game.color : undefined }}
              >
                ×{o.mult}
              </span>
            </button>
          );
        })}

        {/* Featured 5th outcome (Full width hero card) */}
        {featuredOutcome && (() => {
          const isSel = selectedOutcome === featuredOutcome.key;
          return (
            <button
              type="button"
              disabled={isRolling}
              className={`emoji-featured-outcome ${isSel ? 'active' : ''}`}
              style={{
                borderColor: isSel ? game.color : 'rgba(255,255,255,0.12)',
                background: isSel ? `${game.color}20` : 'rgba(255,255,255,0.04)',
                boxShadow: isSel ? `0 0 14px ${game.color}40` : undefined
              }}
              onClick={() => { onSelect(featuredOutcome.key); triggerHaptic('light'); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>⭐</span>
                <span style={{
                  fontSize: '12.5px',
                  fontWeight: isSel ? 800 : 700,
                  color: isSel ? '#fff' : '#e2e8f0'
                }}>
                  {featuredOutcome.label}
                </span>
              </div>
              <span style={{
                fontSize: '13px',
                fontWeight: 900,
                color: isSel ? game.color : '#a78bfa',
                background: isSel ? `${game.color}28` : 'rgba(167,139,250,0.15)',
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                ×{featuredOutcome.mult}
              </span>
            </button>
          );
        })()}
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const rollingRef = useRef(false);

  useEffect(() => {
    setSelectedOutcome(game?.outcomes[0]?.key || '');
    setLastResult(null);
    setShowResult(false);
    setIsAnimating(false);
    rollingRef.current = false;
  }, [gameId]);

  if (!game) return null;

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
    setIsAnimating(true);
    setShowResult(false);
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
      setIsRolling(false);

      if (data.success) {
        // Immediately trigger the outcome animation with the exact resulting value!
        // TelegramDiceSticker will play the full throw from start to finish for this outcome.
        setLastResult(data);
        if (typeof data.balance === 'number') setBalance(data.balance);
      } else {
        setIsAnimating(false);
        rollingRef.current = false;
        showToast(data.error || 'Ошибка ставки', true);
      }
    } catch (e) {
      setIsRolling(false);
      setIsAnimating(false);
      rollingRef.current = false;
      showToast('Ошибка сети', true);
    }
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    setShowResult(true);
    rollingRef.current = false;

    if (lastResult?.isWin) {
      triggerHaptic('success');
      bjAudio.playCard();
      showToast(`🎉 Победа! +$${lastResult.winAmount?.toFixed(2)} USDT (×${lastResult.multiplier})`);
    } else if (lastResult) {
      triggerHaptic('error');
    }
  };

  // ── Render ──
  const isSlots = gameId === 'slots';
  const slotsResult = lastResult && isSlots ? getSlotsResult(lastResult.value) : null;
  const isBusy = isRolling || isAnimating;

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

      <div className="emoji-game-container">
        {/* ── Stage ── */}
        <div className="emoji-stage-card">
          <div
            className="emoji-stage-glow"
            style={{
              background: isBusy
                ? `radial-gradient(ellipse at 50% 50%, ${game.color}25 0%, transparent 68%)`
                : showResult && lastResult?.isWin
                  ? `radial-gradient(ellipse at 50% 50%, ${game.color}30 0%, transparent 68%)`
                  : 'transparent'
            }}
          />

          {/* Stage Actor: Real animated Telegram sticker */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <TelegramDiceSticker
              gameId={gameId}
              isRolling={isRolling}
              resultValue={lastResult?.value ?? null}
              isWin={showResult ? (lastResult?.isWin ?? null) : null}
              size={isSlots ? 160 : 140}
              onAnimationComplete={handleAnimationComplete}
            />
            {isSlots && lastResult && slotsResult && showResult && (
              <div style={{
                marginTop: '6px',
                fontSize: '12px',
                fontWeight: 800,
                color: slotsResult.color,
                background: `${slotsResult.color}18`,
                padding: '3px 12px',
                borderRadius: '16px',
                border: `1px solid ${slotsResult.color}40`,
                animation: 'emojiResultAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}>
                {slotsResult.tier} {slotsResult.mult ? `— ${slotsResult.mult}` : ''}
              </div>
            )}
          </div>

          {/* Result or status badge — displays ONLY after the throw animation smoothly finishes */}
          {showResult && lastResult ? (
            <div className={`emoji-result-badge ${lastResult.isWin ? 'win' : 'loss'}`}>
              <div className={lastResult.isWin ? 'emoji-result-win-amount' : 'emoji-result-loss-title'}>
                {lastResult.isWin
                  ? `+$${lastResult.winAmount?.toFixed(2)} USDT (×${lastResult.multiplier})`
                  : 'Не повезло'
                }
              </div>
              <div className="emoji-result-detail">
                {getResultText(gameId, lastResult.value, lastResult.isWin)}
              </div>
            </div>
          ) : isBusy ? (
            <div className="emoji-stage-rolling-text">
              {isSlots ? 'Крутим барабан...' : gameId === 'football' ? 'Удар по мячу...' : gameId === 'darts' ? 'Бросок дротика...' : 'Бросок...'}
            </div>
          ) : (
            <div className="emoji-stage-desc-text">{game.desc}</div>
          )}
        </div>

        {/* ── Redesigned Compact Outcome Picker ── */}
        <OutcomePicker
          game={game}
          selectedOutcome={selectedOutcome}
          onSelect={setSelectedOutcome}
          isRolling={isBusy}
        />

        {/* ── Bet Controls ── */}
        <BetControls
          betAmount={betAmount}
          setBetAmount={setBetAmount}
          balance={balance}
          disabled={isBusy}
        />

        {/* ── Roll button ── */}
        <button
          type="button"
          disabled={isBusy || betAmount <= 0 || betAmount > balance}
          onClick={handleRoll}
          className="emoji-roll-btn"
          style={{
            background: isBusy || betAmount > balance
              ? '#1a1f2c'
              : `linear-gradient(135deg, ${game.color} 0%, ${game.color}cc 100%)`,
            color: isBusy || betAmount > balance ? '#8a8f99' : '#040d0a',
            boxShadow: isBusy || betAmount > balance ? 'none' : `0 6px 20px ${game.color}40`,
          }}
        >
          {isBusy ? (
            <span>{isSlots ? 'Крутим...' : 'Бросок...'}</span>
          ) : showResult ? (
            <>
              <span style={{ fontSize: '18px' }}>{isSlots ? '🎰' : game.emoji}</span>
              <span>Снова!</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '18px' }}>{isSlots ? '🎰' : game.emoji}</span>
              <span>
                {isSlots ? 'Крутить' : gameId === 'dice' ? 'Бросить кубик' : gameId === 'bowling' ? 'Бросить шар' : gameId === 'darts' ? 'Бросить дротик' : gameId === 'basketball' ? 'Бросить мяч' : 'Нанести удар'}
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', opacity: 0.9, fontSize: '13px' }}>
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
