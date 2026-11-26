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
    desc: 'Угадай цифру, диапазон или комбо',
    minMult: 1.95,
    maxMult: 28.0,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Основные', cols: 2 },
      { id: 'exact', label: 'Числа 1–6', cols: 3 },
      { id: 'combo', label: 'Комбо', cols: 2 }
    ],
    outcomes: [
      { key: 'even',   label: 'Чёт',          mult: 1.95, tab: 'main' },
      { key: 'odd',    label: 'Нечёт',        mult: 1.95, tab: 'main' },
      { key: 'under',  label: 'Меньше (1–3)', mult: 1.95, tab: 'main' },
      { key: 'over',   label: 'Больше (4–6)', mult: 1.95, tab: 'main' },
      { key: '1',      label: '1 ⚀',          mult: 5.80, tab: 'exact' },
      { key: '2',      label: '2 ⚁',          mult: 5.80, tab: 'exact' },
      { key: '3',      label: '3 ⚂',          mult: 5.80, tab: 'exact' },
      { key: '4',      label: '4 ⚃',          mult: 5.80, tab: 'exact' },
      { key: '5',      label: '5 ⚄',          mult: 5.80, tab: 'exact' },
      { key: '6',      label: '6 ⚅',          mult: 5.80, tab: 'exact' },
      { key: 'low2',   label: '1–2 Низ',      mult: 2.85, tab: 'combo' },
      { key: 'mid2',   label: '3–4 Центр',    mult: 2.85, tab: 'combo' },
      { key: 'high2',  label: '5–6 Верх',     mult: 2.85, tab: 'combo' },
      { key: 'ladder', label: 'Лесенка',      mult: 2.20, mult3: 5.20, minThrows: 2, tab: 'combo' },
      { key: 'double', label: 'Совпадение',   mult: 5.50, mult3: 28.0, minThrows: 2, tab: 'combo' },
    ]
  },
  {
    id: 'football',
    emoji: '⚽️',
    title: 'Футбол',
    desc: 'Гол, штанга, девятка или чёт/нечёт',
    minMult: 1.65,
    maxMult: 4.60,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Основные', cols: 2 },
      { id: 'more', label: 'Точные и Чёт', cols: 2 }
    ],
    outcomes: [
      { key: 'goal',       label: 'Гол (3–5)',      mult: 1.65, tab: 'main' },
      { key: 'miss',       label: 'Мимо (1–2)',     mult: 2.40, tab: 'main' },
      { key: 'top_corner', label: 'В девятку (5)',  mult: 4.60, tab: 'main' },
      { key: 'post',       label: 'Штанга (2)',     mult: 4.60, tab: 'main' },
      { key: 'mid_goal',   label: 'По центру (3–4)',mult: 2.40, tab: 'more' },
      { key: 'even',       label: 'Чёт (2,4)',      mult: 2.40, tab: 'more' },
      { key: 'odd',        label: 'Нечёт (1,3,5)',  mult: 1.65, tab: 'more' },
    ]
  },
  {
    id: 'basketball',
    emoji: '🏀',
    title: 'Баскетбол',
    desc: 'Попадание, от щита или чистый бросок',
    minMult: 1.65,
    maxMult: 4.50,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Основные', cols: 2 },
      { id: 'more', label: 'Точные и Чёт', cols: 2 }
    ],
    outcomes: [
      { key: 'score',  label: 'Попадание (4–5)', mult: 2.35, tab: 'main' },
      { key: 'miss',   label: 'Мимо (1–3)',      mult: 1.65, tab: 'main' },
      { key: 'swish',  label: 'Чистый (5)',      mult: 4.50, tab: 'main' },
      { key: 'rim',    label: 'От щита (4)',     mult: 4.50, tab: 'main' },
      { key: 'exact3', label: 'Обод (3)',        mult: 4.50, tab: 'more' },
      { key: 'even',   label: 'Чёт (2,4)',       mult: 2.35, tab: 'more' },
      { key: 'odd',    label: 'Нечёт (1,3,5)',   mult: 1.65, tab: 'more' },
    ]
  },
  {
    id: 'darts',
    emoji: '🎯',
    title: 'Дартс',
    desc: 'Куда попадёт дротик?',
    minMult: 1.50,
    maxMult: 5.00,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Основные', cols: 2 },
      { id: 'more', label: 'Кольца и Чёт', cols: 2 }
    ],
    outcomes: [
      { key: 'hit',      label: 'Попадание (2–5)', mult: 1.50, tab: 'main' },
      { key: 'miss',     label: 'Мимо (1)',        mult: 5.00, tab: 'main' },
      { key: 'bullseye', label: 'Яблочко (6)',     mult: 5.00, tab: 'main' },
      { key: 'inner',    label: 'Внутр. (4–5)',    mult: 2.80, tab: 'main' },
      { key: 'outer',    label: 'Внешнее (2–3)',   mult: 2.50, tab: 'more' },
      { key: 'even',     label: 'Чёт (2,4,6)',     mult: 1.95, tab: 'more' },
      { key: 'odd',      label: 'Нечёт (1,3,5)',   mult: 1.95, tab: 'more' },
      { key: 'ladder',   label: 'Лесенка',         mult: 2.20, mult3: 5.20, minThrows: 2, tab: 'more' },
    ]
  },
  {
    id: 'bowling',
    emoji: '🎳',
    title: 'Боулинг',
    desc: 'Сколько кеглей собьёт шар?',
    minMult: 1.70,
    maxMult: 4.00,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Основные', cols: 2 },
      { id: 'more', label: 'Чёт / Комбо', cols: 2 }
    ],
    outcomes: [
      { key: 'pins4',   label: '4+ кегли',     mult: 1.70, tab: 'main' },
      { key: 'pins5',   label: '5–6 кеглей',   mult: 2.80, tab: 'main' },
      { key: 'strike',  label: 'Страйк (6/6)', mult: 4.00, tab: 'main' },
      { key: 'gutter',  label: 'Гаттер (1–2)', mult: 2.85, tab: 'main' },
      { key: 'partial', label: '3–5 кеглей',   mult: 1.85, tab: 'more' },
      { key: 'even',    label: 'Чёт (2,4,6)',  mult: 1.95, tab: 'more' },
      { key: 'odd',     label: 'Нечёт (1,3,5)',mult: 1.95, tab: 'more' },
      { key: 'ladder',  label: 'Лесенка',      mult: 2.20, mult3: 5.20, minThrows: 2, tab: 'more' },
    ]
  },
  {
    id: 'slots',
    emoji: '🎰',
    title: 'Слоты',
    desc: 'Крути барабан! До ×25',
    minMult: 1.80,
    maxMult: 25.00,
    color: '#00e699',
    tabs: [],
    outcomes: [
      { key: 'spin', label: 'Крутить барабан', mult: null, isAuto: true }
    ]
  },
];

function getEffectiveMult(outcome, throwsCount) {
  if (!outcome || !outcome.mult) return null;
  if (outcome.minThrows) {
    return throwsCount === 3 && outcome.mult3 ? outcome.mult3 : outcome.mult;
  }
  if (throwsCount === 1) return outcome.mult;
  return parseFloat(Math.min(50, Math.pow(outcome.mult, throwsCount) * 0.92).toFixed(2));
}

function triggerHaptic(style: any = 'medium') {
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

// ─── Compact Tabbed Outcome Picker (Many outcomes, clean screen, readable buttons) ───
function OutcomePicker({ game, selectedOutcome, throwsCount, onSelect, onSelectThrows, isRolling }) {
  const [activeCatTab, setActiveCatTab] = useState(game.tabs?.[0]?.id || 'main');

  useEffect(() => {
    setActiveCatTab(game.tabs?.[0]?.id || 'main');
  }, [game.id]);

  if (game.id === 'slots') {
    return (
      <div className="emoji-slots-table">
        <div className="emoji-section-header" style={{ marginBottom: '8px' }}>
          <span className="emoji-section-title">Таблица выплат</span>
          <span style={{ fontSize: '11px', color: '#00e699', fontWeight: 800 }}>Макс. ×25</span>
        </div>
        {[
          { symbols: '🍋 🍋 🍋', name: 'Джекпот 777', mult: '×25', color: '#00e699' },
          { symbols: '🍒 🍒 🍒', name: '3 одинаковых', mult: '×5', color: '#e2e8f0' },
          { symbols: '🍊 🍊 🔔', name: '2 одинаковых', mult: '×1.8', color: '#cbd5e1' },
          { symbols: '🍒 🍊 🍋', name: 'Нет совпадений', mult: '×0', color: '#6b7280' },
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

  const tabs = game.tabs || [{ id: 'main', label: 'Основные', cols: 2 }];
  const currentTab = tabs.find(t => t.id === activeCatTab) || tabs[0];
  const visibleOutcomes = game.outcomes.filter(o => o.tab === currentTab.id);
  const selectedObj = game.outcomes.find(o => o.key === selectedOutcome);
  const selectedMult = getEffectiveMult(selectedObj, throwsCount);

  return (
    <div className="emoji-outcomes-card">
      {/* Category Tabs + Active Outcome Pill */}
      <div className="emoji-cat-bar">
        <div className="emoji-cat-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              disabled={isRolling}
              className={`emoji-cat-tab ${currentTab.id === t.id ? 'active' : ''}`}
              onClick={() => { setActiveCatTab(t.id); triggerHaptic('light'); }}
            >
              {t.label}
            </button>
          ))}
        </div>
        {selectedObj && (
          <span className="emoji-selected-chip">
            {selectedObj.label} · ×{selectedMult}
          </span>
        )}
      </div>

      {/* Outcome Buttons Grid (2 or 3 cols, comfortable 42px height) */}
      <div
        className="emoji-outcomes-grid-dynamic"
        style={{ gridTemplateColumns: `repeat(${currentTab.cols || 2}, 1fr)` }}
      >
        {visibleOutcomes.map(o => {
          const isSel = selectedOutcome === o.key;
          const mult = getEffectiveMult(o, throwsCount);
          const needsMoreThrows = o.minThrows && throwsCount < o.minThrows;
          return (
            <button
              key={o.key}
              type="button"
              disabled={isRolling}
              className={`emoji-outcome-btn-v2 ${isSel ? 'active' : ''} ${needsMoreThrows ? 'requires-multi' : ''}`}
              onClick={() => {
                if (needsMoreThrows && onSelectThrows) {
                  onSelectThrows(o.minThrows);
                }
                onSelect(o.key);
                triggerHaptic('light');
              }}
            >
              <span className="emoji-outcome-v2-label">{o.label}</span>
              <span className="emoji-outcome-v2-mult">
                {needsMoreThrows ? `${o.minThrows}+ бр.` : `×${mult}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Game screen ──────────────────────────────────────────────────────────────
function GameScreen({ gameId, onSelectGame, onBack, onBackToLobby }) {
  const { balance, setBalance, showToast, tgUser, getAuthHeaders } = useApp();
  const game = GAMES.find(g => g.id === gameId);

  const [selectedOutcome, setSelectedOutcome] = useState(game?.outcomes[0]?.key || '');
  const [throwsCount, setThrowsCount] = useState(1);
  const [betAmount, setBetAmount] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);
  const rollingRef = useRef(false);

  useEffect(() => {
    setSelectedOutcome(game?.outcomes[0]?.key || '');
    setThrowsCount(1);
    setLastResult(null);
    setShowResult(false);
    setIsAnimating(false);
    rollingRef.current = false;
  }, [gameId]);

  // If throwsCount drops to 1 while a multi-throw-only outcome is selected, reset to first outcome
  const handleSelectThrows = (count) => {
    setThrowsCount(count);
    const curOutcome: any = game?.outcomes.find(o => o.key === selectedOutcome);
    if (curOutcome?.minThrows && count < curOutcome.minThrows) {
      setSelectedOutcome(game?.outcomes[0]?.key || '');
    }
    triggerHaptic('light');
  };

  if (!game) return null;

  const handleRoll = async () => {
    if (rollingRef.current) return;
    const bet = parseFloat(String(betAmount));
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
          throwsCount,
          betAmount: bet,
          userId: tgUser?.id || '3982051'
        })
      });
      const data = await res.json();
      setIsRolling(false);

      if (data.success) {
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
        {/* ── Top Quick Switcher (6 Emoji Games) + Throw Count (1/2/3) ── */}
        <div className="emoji-top-controls">
          <div className="emoji-game-switcher">
            {GAMES.map(g => (
              <button
                key={g.id}
                type="button"
                disabled={isBusy}
                className={`emoji-switch-btn ${g.id === gameId ? 'active' : ''}`}
                onClick={() => {
                  if (g.id !== gameId && !isBusy) {
                    triggerHaptic('light');
                    onSelectGame(g.id);
                  }
                }}
                title={g.title}
              >
                <span>{g.emoji}</span>
              </button>
            ))}
          </div>

          <div className="emoji-throws-bar">
            {[1, 2, 3].map(cnt => (
              <button
                key={cnt}
                type="button"
                disabled={isBusy}
                className={`emoji-throw-btn ${throwsCount === cnt ? 'active' : ''}`}
                onClick={() => handleSelectThrows(cnt)}
              >
                {cnt} {isSlots ? (cnt === 1 ? 'Спин' : 'Спина') : (cnt === 1 ? 'Бросок' : 'Броска')}
              </button>
            ))}
          </div>
        </div>

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
                {Array.isArray(lastResult.values) && lastResult.values.length > 1
                  ? `Выпало: ${lastResult.values.join(' · ')}`
                  : getResultText(gameId, lastResult.value, lastResult.isWin)
                }
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

        {/* ── Compact Tabbed Outcome Picker ── */}
        <OutcomePicker
          game={game}
          selectedOutcome={selectedOutcome}
          throwsCount={throwsCount}
          onSelect={setSelectedOutcome}
          onSelectThrows={handleSelectThrows}
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
        onSelectGame={setSelectedGame}
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
