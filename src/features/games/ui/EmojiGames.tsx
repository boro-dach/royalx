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
const GAMES: any[] = [
  {
    id: 'dice',
    emoji: '🎲',
    title: 'Кости',
    desc: 'Угадай цифру, диапазон или комбо',
    maxThrows: 3,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Основные', cols: 2 },
      { id: 'exact', label: 'Числа 1–6', cols: 3 },
      { id: 'combo', label: 'Комбо', cols: 2 }
    ],
    outcomes: [
      { key: 'even',      label: 'Чёт',          label2: 'Оба чётных', label3: 'Три чётных', mult: 2, mult2: 4, mult3: 8, tab: 'main' },
      { key: 'odd',       label: 'Нечёт',        label2: 'Оба нечёт',  label3: 'Три нечёт',  mult: 2, mult2: 4, mult3: 8, tab: 'main' },
      { key: 'under',     label: 'Меньше',       label2: 'Оба меньше', label3: 'Три меньше', mult: 2, mult2: 4, mult3: 8, tab: 'main' },
      { key: 'over',      label: 'Больше',       label2: 'Оба больше', label3: 'Три больше', mult: 2, mult2: 4, mult3: 8, tab: 'main' },
      { key: 'd1gt2',     label: 'Куб 1 > 2',    mult: 2.4,  throws: [2], tab: 'main' },
      { key: 'd1lt2',     label: 'Куб 1 < 2',    mult: 2.4,  throws: [2], tab: 'main' },
      { key: 'desc',      label: 'Убывание',     mult: 10.8, throws: [3], tab: 'main' },
      { key: 'asc',       label: 'Возрастание',  mult: 10.8, throws: [3], tab: 'main' },
      { key: '1',         label: '1',            mult: 6, mult2: 36, mult3: 216, tab: 'exact' },
      { key: '2',         label: '2',            mult: 6, mult2: 36, mult3: 216, tab: 'exact' },
      { key: '3',         label: '3',            mult: 6, mult2: 36, mult3: 216, tab: 'exact' },
      { key: '4',         label: '4',            mult: 6, mult2: 36, mult3: 216, tab: 'exact' },
      { key: '5',         label: '5',            mult: 6, mult2: 36, mult3: 216, tab: 'exact' },
      { key: '6',         label: '6',            mult: 6, mult2: 36, mult3: 216, tab: 'exact' },
      { key: 'ladder',    label: 'Лесенка',      mult: 2.2,  throws: [1], tab: 'combo' },
      { key: 'sum',       label: 'Сумма',        mult: 12,   mult3: 54, prefix: 'до ', throws: [2, 3], tab: 'combo' },
      { key: 'double',    label: 'Любой дубль',  mult: 6,    throws: [2], tab: 'combo' },
      { key: 'diff',      label: 'Разница',      mult: 18,   prefix: 'до ', throws: [2], tab: 'combo' },
      { key: 'prod_gt18', label: 'Произвед > 18',mult: 4.5,  throws: [2], tab: 'combo' },
      { key: 'triple',    label: 'Любой трипл',  mult: 36,   throws: [3], tab: 'combo' },
      { key: 'duel',      label: 'Дуэль',        mult: 3.92, throws: [3], tab: 'combo' },
      { key: 'straight',  label: 'Стрит',        mult: 9,    throws: [3], tab: 'combo' },
      { key: 'prod_gt108',label: 'Произвед > 108',mult: 12.7,throws: [3], tab: 'combo' },
    ]
  },
  {
    id: 'football',
    emoji: '⚽️',
    title: 'Футбол',
    desc: 'Выбери исход удара',
    maxThrows: 2,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Основные', cols: 2 },
      { id: 'combo', label: 'Комбо (2 бр.)', cols: 2 }
    ],
    outcomes: [
      { key: 'goal_center',      label: 'Гол в центр',      mult: 5,    mult2: 25,   tab: 'main' },
      { key: 'goal_corner',      label: 'Гол в угол',       mult: 5,    mult2: 25,   tab: 'main' },
      { key: 'goal_post',        label: 'Гол от штанги',    mult: 5,    mult2: 25,   tab: 'main' },
      { key: 'goal',             label: 'Любой гол',        mult: 1.66, mult2: 2.77, tab: 'main' },
      { key: 'post',             label: 'Удар об штангу',   mult: 2.5,  mult2: 6.25, tab: 'main' },
      { key: 'miss',             label: 'Промах',           mult: 2.5,  mult2: 6.25, tab: 'main' },
      { key: 'double',           label: 'Любой дубль',      mult: 5,    throws: [2], tab: 'combo' },
      { key: 'goal_miss',        label: 'Гол-Промах',       mult: 4.16, throws: [2], tab: 'combo' },
      { key: 'miss_goal',        label: 'Промах-Гол',       mult: 4.16, throws: [2], tab: 'combo' },
      { key: 'one_goal_one_miss',label: '1 Гол и 1 Промах', mult: 2.08, throws: [2], tab: 'combo' },
    ]
  },
  {
    id: 'basketball',
    emoji: '🏀',
    title: 'Баскетбол',
    desc: 'Выбери исход броска',
    maxThrows: 2,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Основные', cols: 2 },
      { id: 'combo', label: 'Комбо (2 бр.)', cols: 2 }
    ],
    outcomes: [
      { key: 'swish',            label: 'Чистый гол',       mult: 5,    mult2: 25,   tab: 'main' },
      { key: 'spin',             label: 'Прокрут',          mult: 2.5,  mult2: 6.25, tab: 'main' },
      { key: 'stuck',            label: 'Застрял мяч',      mult: 5,    mult2: 25,   tab: 'main' },
      { key: 'goal',             label: 'Любой гол',        mult: 2.5,  mult2: 6.25, tab: 'main' },
      { key: 'bounce',           label: 'Отскок',           mult: 5,    mult2: 25,   tab: 'main' },
      { key: 'miss',             label: 'Промах',           mult: 1.66, mult2: 2.77, tab: 'main' },
      { key: 'double',           label: 'Любой дубль',      mult: 5,    throws: [2], tab: 'combo' },
      { key: 'goal_miss',        label: 'Гол-Промах',       mult: 4.16, throws: [2], tab: 'combo' },
      { key: 'miss_goal',        label: 'Промах-Гол',       mult: 4.16, throws: [2], tab: 'combo' },
      { key: 'one_goal_one_miss',label: '1 Гол и 1 Промах', mult: 2.08, throws: [2], tab: 'combo' },
    ]
  },
  {
    id: 'darts',
    emoji: '🎯',
    title: 'Дартс',
    desc: 'Куда попадёт дротик?',
    maxThrows: 2,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Основные', cols: 2 },
      { id: 'combo', label: 'Комбо (2 бр.)', cols: 2 }
    ],
    outcomes: [
      { key: 'bullseye',       label: '🎯 Центр',           mult: 6,    mult2: 36,   tab: 'main' },
      { key: 'red_sector',     label: '🔴 Сектор',          mult: 3,    mult2: 9,    tab: 'main' },
      { key: 'bounce',         label: 'Отскок',             mult: 6,    mult2: 36,   tab: 'main' },
      { key: 'white_sector',   label: '⚪ Сектор',          mult: 3,    mult2: 9,    tab: 'main' },
      { key: 'any_sector',     label: 'Любой сектор',       mult: 1.5,  mult2: 2.25, tab: 'main' },
      { key: 'red_or_center',  label: '🔴 Сектор / Центр',  mult: 2,    mult2: 4,    tab: 'main' },
      { key: 'white_or_bounce',label: '⚪ Сектор / Отскок', mult: 2,    mult2: 4,    tab: 'main' },
      { key: 'near',           label: 'Рядом',              mult: 4.5,  throws: [2],  tab: 'combo' },
      { key: 'double',         label: 'Любой дубль',        mult: 6,    throws: [2],  tab: 'combo' },
      { key: 'duel',           label: 'Дуэль',              mult: 2.4,  prefix: 'до ', throws: [2], tab: 'combo' },
      { key: 'traffic_light',  label: 'Светофор',           mult: 3,    throws: [2],  tab: 'combo' },
    ]
  },
  {
    id: 'bowling',
    emoji: '🎳',
    title: 'Боулинг',
    desc: 'Сколько кеглей собьёт шар?',
    maxThrows: 2,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Основные', cols: 2 },
      { id: 'combo', label: 'Комбо (2 бр.)', cols: 2 }
    ],
    outcomes: [
      { key: 'strike',    label: '🎳 Страйк',     mult: 6,    mult2: 36,  tab: 'main' },
      { key: 'miss',      label: 'Промах',        mult: 6,    mult2: 36,  tab: 'main' },
      { key: 'pins1',     label: 'Сбито 1 / 6',   mult: 6,    mult2: 36,  tab: 'main' },
      { key: 'pins3',     label: 'Сбито 3 / 6',   mult: 6,    mult2: 36,  tab: 'main' },
      { key: 'pins4',     label: 'Сбито 4 / 6',   mult: 6,    mult2: 36,  tab: 'main' },
      { key: 'pins5',     label: 'Сбито 5 / 6',   mult: 6,    mult2: 36,  tab: 'main' },
      { key: 'no_strike', label: 'Без страйка',   mult: 1.44, throws: [2], tab: 'combo' },
      { key: 'no_miss',   label: 'Без промаха',   mult: 1.44, throws: [2], tab: 'combo' },
      { key: 'double',    label: 'Любой дубль',   mult: 6,    throws: [2], tab: 'combo' },
      { key: 'b1gt2',     label: '🎳 1 > 2',      mult: 2.4,  throws: [2], tab: 'combo' },
      { key: 'b1lt2',     label: '🎳 1 < 2',      mult: 2.4,  throws: [2], tab: 'combo' },
      { key: 'sum',       label: 'Сумма сбитых',  mult: 9,    prefix: 'до ', throws: [2], tab: 'combo' },
    ]
  },
  {
    id: 'slots',
    emoji: '🎰',
    title: 'Слоты',
    desc: 'Выбери комбинацию и крути!',
    maxThrows: 2,
    color: '#00e699',
    tabs: [
      { id: 'main', label: 'Комбинации', cols: 2 }
    ],
    outcomes: [
      { key: 'three_sevens',  label: '7️⃣ 3 Семёрки',       mult: 64,   throws: [1], tab: 'main' },
      { key: 'three_lemons',  label: '🍋 3 Лимона',         mult: 64,   throws: [1], tab: 'main' },
      { key: 'three_grapes',  label: '🍇 3 Винограда',      mult: 64,   throws: [1], tab: 'main' },
      { key: 'three_bars',    label: '🍫 3 Бара',           mult: 64,   throws: [1], tab: 'main' },
      { key: 'any_combo',     label: 'Любая комбинация',    mult: 16,   throws: [1], tab: 'main' },
      { key: 'unique',        label: 'Уникальные символы',  mult: 2.66, mult2: 7.11, tab: 'main' },
      { key: 'exact',         label: 'Точный исход',        mult: 7.11, prefix: 'до ', throws: [1], tab: 'main' },
      { key: 'duel',          label: 'Дуэль',               mult: 5.05, prefix: 'до ', throws: [2], tab: 'main' },
      { key: 'combo',         label: 'Комбо',               mult: 400,  prefix: 'до ', throws: [2], tab: 'main' },
      { key: 'one_two_combo', label: '1-2 Любые комбинации',mult: 8.25, throws: [2], tab: 'main' },
      { key: 'two_combos',    label: '2 Любые комбинации',  mult: 256,  throws: [2], tab: 'main' },
    ]
  },
];

function getOutcomeLabel(outcome, throwsCount) {
  if (!outcome) return '';
  if (throwsCount === 3 && outcome.label3) return outcome.label3;
  if (throwsCount === 2 && outcome.label2) return outcome.label2;
  return outcome.label;
}

function getEffectiveMult(outcome, throwsCount) {
  if (!outcome || !outcome.mult) return null;
  if (throwsCount === 3 && outcome.mult3) return outcome.mult3;
  if (throwsCount === 2 && outcome.mult2) return outcome.mult2;
  if (outcome.throws && !outcome.throws.includes(throwsCount)) return outcome.mult;
  if (throwsCount === 1 || (outcome.throws && outcome.throws.includes(throwsCount))) return outcome.mult;
  return parseFloat(Math.pow(outcome.mult, throwsCount).toFixed(2));
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

  const isOutcomeAvailable = (o: any, t: number) => !o.throws || o.throws.includes(t);
  const availableTabs = (game.tabs || [{ id: 'main', label: 'Основные', cols: 2 }]).filter(t =>
    game.outcomes.some(o => o.tab === t.id && isOutcomeAvailable(o, throwsCount))
  );

  useEffect(() => {
    if (!availableTabs.some(t => t.id === activeCatTab)) {
      setActiveCatTab(availableTabs[0]?.id || 'main');
    }
  }, [game.id, throwsCount]);

  const currentTab = availableTabs.find(t => t.id === activeCatTab) || availableTabs[0] || { id: 'main', label: 'Основные', cols: 2 };
  const visibleOutcomes = game.outcomes.filter(o => o.tab === currentTab.id && isOutcomeAvailable(o, throwsCount));
  const selectedObj = game.outcomes.find(o => o.key === selectedOutcome);
  const selectedMult = getEffectiveMult(selectedObj, throwsCount);

  return (
    <div className="emoji-outcomes-card">
      {/* Category Tabs + Active Outcome Pill */}
      <div className="emoji-cat-bar">
        <div className="emoji-cat-tabs">
          {availableTabs.map(t => (
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
            {getOutcomeLabel(selectedObj, throwsCount)} · {selectedObj.prefix || ''}×{selectedMult}
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
          return (
            <button
              key={o.key}
              type="button"
              disabled={isRolling}
              className={`emoji-outcome-btn-v2 ${isSel ? 'active' : ''}`}
              onClick={() => {
                onSelect(o.key);
                triggerHaptic('light');
              }}
            >
              <span className="emoji-outcome-v2-label">{getOutcomeLabel(o, throwsCount)}</span>
              <span className="emoji-outcome-v2-mult">
                {o.prefix || ''}×{mult}
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
    if (isBusy) return;
    setThrowsCount(count);
    setLastResult(null);
    setShowResult(false);
    const curOutcome: any = game?.outcomes.find(o => o.key === selectedOutcome);
    if (curOutcome?.throws && !curOutcome.throws.includes(count)) {
      const firstValid = game?.outcomes.find(o => !o.throws || o.throws.includes(count));
      if (firstValid) setSelectedOutcome(firstValid.key);
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
            {Array.from({ length: game.maxThrows || 2 }, (_, i) => i + 1).map(cnt => (
              <button
                key={cnt}
                type="button"
                disabled={isBusy}
                className={`emoji-throw-btn ${throwsCount === cnt ? 'active' : ''}`}
                onClick={() => handleSelectThrows(cnt)}
              >
                {cnt} {cnt === 1 ? 'Бросок' : 'Броска'}
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

          {/* Stage Actor: 1, 2 or 3 animated Telegram stickers with vertical dividers */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: throwsCount === 3 ? '8px' : '12px',
            width: '100%'
          }}>
            {Array.from({ length: throwsCount }).map((_, idx) => {
              const stickerSize = throwsCount === 1
                ? (isSlots ? 160 : 140)
                : throwsCount === 2
                  ? (isSlots ? 118 : 108)
                  : (isSlots ? 90 : 82);
              const stickerVal = Array.isArray(lastResult?.values)
                ? (lastResult.values[idx] ?? null)
                : (idx === 0 ? (lastResult?.value ?? null) : null);
              const itemSlotsRes = isSlots && showResult && stickerVal ? getSlotsResult(stickerVal) : null;

              return (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <div
                      style={{
                        width: '1px',
                        height: `${Math.round(stickerSize * 0.65)}px`,
                        background: 'rgba(255, 255, 255, 0.14)',
                        flexShrink: 0
                      }}
                    />
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <TelegramDiceSticker
                      gameId={gameId}
                      isRolling={isRolling}
                      resultValue={stickerVal}
                      isWin={showResult ? (lastResult?.isWin ?? null) : null}
                      size={stickerSize}
                      onAnimationComplete={idx === 0 ? handleAnimationComplete : null}
                    />
                    {itemSlotsRes && (
                      <div style={{
                        marginTop: '6px',
                        fontSize: throwsCount > 1 ? '10px' : '12px',
                        fontWeight: 800,
                        color: itemSlotsRes.color,
                        background: `${itemSlotsRes.color}18`,
                        padding: throwsCount > 1 ? '2px 8px' : '3px 12px',
                        borderRadius: '16px',
                        border: `1px solid ${itemSlotsRes.color}40`,
                        animation: 'emojiResultAppear 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
                        whiteSpace: 'nowrap'
                      }}>
                        {itemSlotsRes.tier} {itemSlotsRes.mult ? `— ${itemSlotsRes.mult}` : ''}
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
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
