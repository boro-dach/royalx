import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { bjAudio } from '../../utils/blackjackAudio';
import { ArrowLeftIcon, CloseIcon, TetherIcon } from '../common/Icons';
import confetti from 'canvas-confetti';
import GameHeader from './GameHeader';
import './Games.css';

// Color palettes tailored to the gift boxes
export const BOX_THEMES = {
  pink: {
    bg: 'linear-gradient(180deg, #df2e84 0%, #aa145e 100%)',
    border: '#f472b6',
    boxFront: '#e12b82',
    boxSide: '#b91363',
    boxTop: '#f472b6',
    lidFront: '#f783c2',
    lidSide: '#cb1770',
    lidTop: '#fce7f3',
    ribbon: '#ffffff',
    ribbonSide: '#fbcfe8',
    bow: '#ffffff',
    bowStroke: '#f472b6',
    emblem: 'clover',
    emblemColor: '#fbcfe8'
  },
  blue: {
    bg: 'linear-gradient(180deg, #0284c7 0%, #034f7c 100%)',
    border: '#38bdf8',
    boxFront: '#0284c7',
    boxSide: '#0369a1',
    boxTop: '#38bdf8',
    lidFront: '#38bdf8',
    lidSide: '#0275b1',
    lidTop: '#bae6fd',
    ribbon: '#0b3b5b',
    ribbonSide: '#082f49',
    bow: '#0284c7',
    bowStroke: '#075985',
    emblem: 'clover',
    emblemColor: '#38bdf8'
  },
  green: {
    bg: 'linear-gradient(180deg, #4dae1d 0%, #2f730c 100%)',
    border: '#84cc16',
    boxFront: '#52b71e',
    boxSide: '#3d9113',
    boxTop: '#86efac',
    lidFront: '#86efac',
    lidSide: '#439e17',
    lidTop: '#dcfce7',
    ribbon: '#ffffff',
    ribbonSide: '#d9f99d',
    bow: '#ffffff',
    bowStroke: '#65a30d',
    emblem: 'clover',
    emblemColor: '#84cc16'
  },
  bronze: {
    bg: 'linear-gradient(180deg, #d27961 0%, #994732 100%)',
    border: '#fca5a5',
    boxFront: '#d27961',
    boxSide: '#b25842',
    boxTop: '#fca5a5',
    lidFront: '#fca5a5',
    lidSide: '#be634c',
    lidTop: '#ffe4e6',
    ribbon: '#ffffff',
    ribbonSide: '#ffedd5',
    bow: '#ffffff',
    bowStroke: '#ea580c',
    emblem: 'tag',
    emblemColor: '#fed7aa'
  },
  silver: {
    bg: 'linear-gradient(180deg, #8a959f 0%, #59646e 100%)',
    border: '#cbd5e1',
    boxFront: '#8a959f',
    boxSide: '#6d7882',
    boxTop: '#cbd5e1',
    lidFront: '#cbd5e1',
    lidSide: '#78848e',
    lidTop: '#f1f5f9',
    ribbon: '#ffffff',
    ribbonSide: '#e2e8f0',
    bow: '#ffffff',
    bowStroke: '#94a3b8',
    emblem: 'tag',
    emblemColor: '#cbd5e1'
  },
  gold: {
    bg: 'linear-gradient(180deg, #d8a834 0%, #9a7211 100%)',
    border: '#fde047',
    boxFront: '#d8a834',
    boxSide: '#b8891f',
    boxTop: '#fde047',
    lidFront: '#fde047',
    lidSide: '#c19223',
    lidTop: '#fef9c3',
    ribbon: '#ffffff',
    ribbonSide: '#fef08a',
    bow: '#ffffff',
    bowStroke: '#ca8a04',
    emblem: 'tag',
    emblemColor: '#fde047'
  }
};

// 3D Isometric Gift Box Component
export function GiftBox3D({ theme = 'pink', size = 84 }) {
  const t = BOX_THEMES[theme] || BOX_THEMES.pink;
  const isTag = t.emblem === 'tag';

  return (
    <svg 
      width={size} 
      height={Math.round(size * 0.9)} 
      viewBox="0 0 100 90" 
      fill="none"
      style={{ display: 'block', margin: '0 auto', filter: 'drop-shadow(0 8px 14px rgba(0,0,0,0.45))' }}
    >
      {/* Soft Ground Shadow */}
      <ellipse cx="50" cy="80" rx="34" ry="7" fill="rgba(0,0,0,0.35)" />

      {/* Main Cube Body */}
      {/* Front-Left Face */}
      <polygon points="18,38 50,54 50,79 18,63" fill={t.boxFront} />
      {/* Front-Right Face */}
      <polygon points="50,54 82,38 82,63 50,79" fill={t.boxSide} />

      {/* Vertical Ribbon Left */}
      <polygon points="31,44 38,48 38,73 31,69" fill={t.ribbon} />
      {/* Vertical Ribbon Right */}
      <polygon points="62,48 69,44 69,69 62,73" fill={t.ribbonSide} />

      {/* 3D Overhanging Lid */}
      {/* Lid Front-Left Rim */}
      <polygon points="14,35 50,52 50,57 14,40" fill={t.lidFront} />
      {/* Lid Front-Right Rim */}
      <polygon points="50,52 86,35 86,40 50,57" fill={t.lidSide} />
      {/* Lid Top Face */}
      <polygon points="50,19 86,35 50,52 14,35" fill={t.lidTop} />

      {/* Cross Ribbons on Lid Top */}
      <polygon points="30,26 36,29 70,44 64,41" fill={t.ribbon} />
      <polygon points="46,21 53,24 53,49 46,46" fill={t.ribbonSide} />

      {/* Center Tied Bow */}
      {/* Left Loop */}
      <path 
        d="M50 20 C38 8, 18 6, 24 17 C28 23, 44 22, 50 20 Z" 
        fill={t.bow} 
        stroke={t.bowStroke} 
        strokeWidth="1.2" 
      />
      <path 
        d="M48 19 C38 11, 26 9, 29 16 C32 19, 43 19, 48 19 Z" 
        fill={t.bowStroke} 
        opacity="0.35" 
      />

      {/* Right Loop */}
      <path 
        d="M50 20 C62 8, 82 6, 76 17 C72 23, 56 22, 50 20 Z" 
        fill={t.bow} 
        stroke={t.bowStroke} 
        strokeWidth="1.2" 
      />
      <path 
        d="M52 19 C62 11, 74 9, 71 16 C68 19, 57 19, 52 19 Z" 
        fill={t.bowStroke} 
        opacity="0.35" 
      />

      {/* Bow Center Knot */}
      <ellipse cx="50" cy="20.5" rx="5" ry="4.5" fill={t.bow} stroke={t.bowStroke} strokeWidth="1" />

      {/* Hanging Gift Tag or Lucky Clover */}
      {isTag ? (
        <g>
          {/* Ribbon String */}
          <line x1="50" y1="36" x2="46" y2="44" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" />
          {/* Tag Body */}
          <polygon points="43,44 38,50 43,56 48,50" fill={t.emblemColor} stroke="#ffffff" strokeWidth="0.9" />
          <circle cx="44.5" cy="47" r="1.2" fill="#ffffff" />
        </g>
      ) : (
        /* Lucky 4-leaf clover on front-left face */
        <g transform="translate(34, 58) scale(0.7)">
          <circle cx="-3.5" cy="-3.5" r="3.2" fill={t.emblemColor} />
          <circle cx="3.5" cy="-3.5" r="3.2" fill={t.emblemColor} />
          <circle cx="-3.5" cy="3.5" r="3.2" fill={t.emblemColor} />
          <circle cx="3.5" cy="3.5" r="3.2" fill={t.emblemColor} />
          <circle cx="0" cy="0" r="1.5" fill="#ffffff" opacity="0.6" />
        </g>
      )}
    </svg>
  );
}

// 6 Boxes matching the gallery
export const BOXES_CONFIG = [
  {
    id: 'homeless',
    name: 'Бомж',
    theme: 'pink',
    price: 1.0,
    minDrop: 0.25,
    maxDrop: 5.0,
    maxDisplay: '5',
    items: [
      { id: 'h1', name: 'Чекушка', value: 0.25, chance: 45 },
      { id: 'h2', name: 'Бычок', value: 0.50, chance: 26 },
      { id: 'h3', name: 'Доширак', value: 0.80, chance: 15 },
      { id: 'h4', name: 'Шапка', value: 1.50, chance: 8 },
      { id: 'h5', name: 'Бутылка', value: 2.50, chance: 4.5 },
      { id: 'h6', name: 'Клад', value: 5.00, chance: 1.5 }
    ]
  },
  {
    id: 'school',
    name: 'Школьник',
    theme: 'blue',
    price: 5.0,
    minDrop: 1.0,
    maxDrop: 15.0,
    maxDisplay: '15',
    items: [
      { id: 's1', name: 'Пицца', value: 1.00, chance: 42 },
      { id: 's2', name: 'Тетрадь', value: 2.00, chance: 28 },
      { id: 's3', name: 'Шоколадка', value: 4.00, chance: 14 },
      { id: 's4', name: 'Скин', value: 7.50, chance: 9.5 },
      { id: 's5', name: 'Рюкзак', value: 10.00, chance: 5.0 },
      { id: 's6', name: 'Заначка', value: 15.00, chance: 1.5 }
    ]
  },
  {
    id: 'student',
    name: 'Студент',
    theme: 'green',
    price: 10.0,
    minDrop: 5.0,
    maxDrop: 25.0,
    maxDisplay: '25',
    items: [
      { id: 'st1', name: 'Кофе', value: 5.00, chance: 45 },
      { id: 'st2', name: 'Шаурма', value: 7.00, chance: 25 },
      { id: 'st3', name: 'Пельмени', value: 9.00, chance: 15 },
      { id: 'st4', name: 'Зачёт', value: 14.00, chance: 9.0 },
      { id: 'st5', name: 'Курсовая', value: 18.00, chance: 4.5 },
      { id: 'st6', name: 'Стипендия', value: 25.00, chance: 1.5 }
    ]
  },
  {
    id: 'rich',
    name: 'Богатый',
    theme: 'bronze',
    price: 25.0,
    minDrop: 15.0,
    maxDrop: 50.0,
    maxDisplay: '50',
    items: [
      { id: 'r1', name: 'Десерт', value: 15.00, chance: 46 },
      { id: 'r2', name: 'Кошелёк', value: 20.00, chance: 26 },
      { id: 'r3', name: 'Ресторан', value: 24.00, chance: 13 },
      { id: 'r4', name: 'Запонки', value: 35.00, chance: 9.0 },
      { id: 'r5', name: 'Часы', value: 42.00, chance: 4.5 },
      { id: 'r6', name: 'Слиток', value: 50.00, chance: 1.5 }
    ]
  },
  {
    id: 'oligarch',
    name: 'Олигарх',
    theme: 'silver',
    price: 50.0,
    minDrop: 25.0,
    maxDrop: 100.0,
    maxDisplay: '100',
    items: [
      { id: 'o1', name: 'AirPods Max', value: 25.00, chance: 46 },
      { id: 'o2', name: 'iPhone 16', value: 35.00, chance: 25 },
      { id: 'o3', name: 'Золотой слиток', value: 50.00, chance: 14 },
      { id: 'o4', name: 'Rolex Sub', value: 70.00, chance: 9.5 },
      { id: 'o5', name: 'Криптокошелек', value: 85.00, chance: 3.5 },
      { id: 'o6', name: 'Чек на 100', value: 100.00, chance: 2.0 }
    ]
  },
  {
    id: 'millionaire',
    name: 'Миллионер',
    theme: 'gold',
    price: 100.0,
    minDrop: 50.0,
    maxDrop: 250.0,
    maxDisplay: '250',
    items: [
      { id: 'm1', name: 'Сигары VIP', value: 50.00, chance: 46 },
      { id: 'm2', name: 'Шампанское Dom', value: 75.00, chance: 25 },
      { id: 'm3', name: 'Слиток 100г', value: 100.00, chance: 13 },
      { id: 'm4', name: 'Бриллиант 2ct', value: 150.00, chance: 9.5 },
      { id: 'm5', name: 'Спорткар', value: 200.00, chance: 4.5 },
      { id: 'm6', name: 'Джекпот RoyalX', value: 250.00, chance: 2.0 }
    ]
  }
];

const ITEM_CARD_WIDTH = 110;
const ITEM_CARD_GAP = 8;
const ITEM_STRIDE = ITEM_CARD_WIDTH + ITEM_CARD_GAP; // 118px
const REEL_TARGET_INDEX = 36; // Winning item index on reel

export default function BoxesGame({ onBack }) {
  const {
    balance,
    syncBalance,
    recordGameBet,
    showToast,
    processBetForCashback,
    processBetForPass,
    adminSettings,
    userRtp
  } = useApp();

  const [selectedBox, setSelectedBox] = useState(null);
  const [boxCount, setBoxCount] = useState(1); // 1, 2, or 3 boxes at once
  const [isOpening, setIsOpening] = useState(false);
  const [isReelSpinning, setIsReelSpinning] = useState(false);
  const [spinDuration, setSpinDuration] = useState(3.0);
  const [fastOpen, setFastOpen] = useState(false);
  const [reelsItems, setReelsItems] = useState([[], [], []]);
  const [reelsOffsets, setReelsOffsets] = useState([0, 0, 0]);
  const [wonItems, setWonItems] = useState([]);
  const [showResultModal, setShowResultModal] = useState(false);
  const [isClosingResult, setIsClosingResult] = useState(false);

  const reelContainerRef = useRef(null);
  const reelTimerRef = useRef(null);
  const tickIntervalRef = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (reelTimerRef.current) clearTimeout(reelTimerRef.current);
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []);

  // Build random reel items for the box
  const buildReel = (box, winner = null) => {
    const list = [];
    const pool = box.items;
    for (let i = 0; i < 48; i++) {
      if (i === REEL_TARGET_INDEX && winner) {
        list.push(winner);
      } else {
        const rand = pool[Math.floor(Math.random() * pool.length)];
        list.push({ ...rand, uniqueKey: `reel_${i}_${Math.random()}` });
      }
    }
    return list;
  };

  const handleSelectBox = (box) => {
    if (reelTimerRef.current) clearTimeout(reelTimerRef.current);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    setSelectedBox(box);
    setWonItems([]);
    setShowResultModal(false);
    setIsOpening(false);
    setIsReelSpinning(false);
    setReelsOffsets([0, 0, 0]);
    const r1 = buildReel(box);
    const r2 = buildReel(box);
    const r3 = buildReel(box);
    setReelsItems([r1, r2, r3]);
    try { bjAudio.playChip(); } catch (e) {}
  };

  const handleBackToGallery = () => {
    if (isOpening) return;
    if (reelTimerRef.current) clearTimeout(reelTimerRef.current);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    setSelectedBox(null);
    setWonItems([]);
    setShowResultModal(false);
    setIsOpening(false);
    setIsReelSpinning(false);
    setReelsOffsets([0, 0, 0]);
    try { bjAudio.playChip(); } catch (e) {}
  };

  const pickWinningItem = (box) => {
    const forceWin = adminSettings?.boxesRtp === 'win' || adminSettings?.globalRtp === 'win' || userRtp === 'win';
    const forceLose = adminSettings?.boxesRtp === 'lose' || adminSettings?.globalRtp === 'lose' || userRtp === 'lose';
    const isCasinoMode = adminSettings?.boxesRtp === 'casino' || adminSettings?.globalRtp === 'casino' || userRtp === 'casino';
    const targetRtp = adminSettings?.targetRtpPercent !== undefined ? parseFloat(adminSettings.targetRtpPercent) : 80;

    const winningItems = box.items.filter(it => it.value > box.price);
    const losingItems = box.items.filter(it => it.value <= box.price);

    if (forceWin && winningItems.length > 0) {
      return winningItems[Math.floor(Math.random() * winningItems.length)];
    }
    if (forceLose && losingItems.length > 0) {
      return losingItems[Math.floor(Math.random() * losingItems.length)];
    }

    if (isCasinoMode) {
      const shouldWin = (Math.random() * 100) < (targetRtp * 0.25);
      if (shouldWin && winningItems.length > 0) {
        return winningItems[0] || winningItems[Math.floor(Math.random() * winningItems.length)];
      } else if (losingItems.length > 0) {
        return losingItems[Math.floor(Math.random() * losingItems.length)];
      }
    }

    const rand = Math.random() * 100;
    let accumulated = 0;
    for (const item of box.items) {
      accumulated += item.chance;
      if (rand <= accumulated) {
        return item;
      }
    }
    return box.items[0];
  };

  const handleOpenBox = () => {
    if (isOpening || !selectedBox) return;

    const totalBet = parseFloat((selectedBox.price * boxCount).toFixed(2));
    if (balance < totalBet) {
      showToast('Недостаточно средств на балансе!', true);
      return;
    }

    if (showResultModal) {
      setShowResultModal(false);
      setIsClosingResult(false);
      setWonItems([]);
    }

    // Clear any previous running timers
    if (reelTimerRef.current) clearTimeout(reelTimerRef.current);
    if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);

    setIsOpening(true);

    // 1. Deduct cost safely
    const currentBalance = balance;
    const balanceAfterBet = parseFloat((currentBalance - totalBet).toFixed(2));
    syncBalance(balanceAfterBet);
    processBetForCashback(totalBet);
    processBetForPass(totalBet);
    try { bjAudio.playChip(); } catch (e) {}

    // 2. Pick winning items for the number of boxes opened
    const pickedWinners = [];
    for (let i = 0; i < boxCount; i++) {
      pickedWinners.push(pickWinningItem(selectedBox));
    }

    // 3. Rebuild reels with winners placed at REEL_TARGET_INDEX
    const freshReels = pickedWinners.map(w => buildReel(selectedBox, w));
    setReelsItems(freshReels);

    // Reset offsets and disable transitions for instantaneous layout reset
    setIsReelSpinning(false);
    setReelsOffsets(pickedWinners.map(() => 0));

    const containerWidth = reelContainerRef.current ? reelContainerRef.current.offsetWidth : 360;
    const centerPoint = containerWidth / 2;
    const stride = boxCount > 1 ? 103 : ITEM_STRIDE;
    const cardW = boxCount > 1 ? 95 : ITEM_CARD_WIDTH;

    const targetOffsets = pickedWinners.map(() => {
      const jitter = (Math.random() * 26) - 13;
      const cardCenter = (REEL_TARGET_INDEX * stride) + (cardW / 2);
      return Math.max(0, cardCenter - centerPoint + jitter);
    });

    if (fastOpen) {
      // Fast mode: 450ms quick spin
      setSpinDuration(0.45);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsReelSpinning(true);
          setReelsOffsets(targetOffsets);
        });
      });

      reelTimerRef.current = setTimeout(() => {
        finishOpening(pickedWinners, balanceAfterBet, totalBet);
      }, 500);
      return;
    }

    // Normal mode: 3.2s smooth cinematic spin
    setSpinDuration(3.2);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsReelSpinning(true);
        setReelsOffsets(targetOffsets);
      });
    });

    let ticks = 0;
    tickIntervalRef.current = setInterval(() => {
      ticks++;
      try { bjAudio.playChip(); } catch (e) {}
      if (ticks > 24) clearInterval(tickIntervalRef.current);
    }, 125);

    reelTimerRef.current = setTimeout(() => {
      clearInterval(tickIntervalRef.current);
      finishOpening(pickedWinners, balanceAfterBet, totalBet);
    }, 3300);
  };

  const finishOpening = (winnersList, balanceAfterBet, totalBet) => {
    setIsOpening(false);
    setIsReelSpinning(false);
    setWonItems(winnersList);

    const totalWon = parseFloat(winnersList.reduce((sum, item) => sum + item.value, 0).toFixed(2));
    const isProfit = totalWon > totalBet;
    const mult = parseFloat((totalWon / totalBet).toFixed(2));

    // AUTO-CREDIT WIN TO BALANCE IMMEDIATELY VIA recordGameBet
    recordGameBet({
      game: 'Боксы',
      betAmount: totalBet,
      winAmount: totalWon,
      isWin: isProfit,
      multiplier: mult
    });

    if (isProfit) {
      try { bjAudio.playWin(); } catch (e) {}
      try {
        confetti({
          particleCount: 55,
          spread: 75,
          origin: { y: 0.55 },
          colors: ['#00e699', '#00ffc8', '#ffffff']
        });
      } catch (e) {}
    } else {
      try { bjAudio.playChip(); } catch (e) {}
    }

    showToast(`🎉 Зачислено: +${totalWon.toFixed(2)} USDT на баланс!`);
    setShowResultModal(true);
  };

  // Open again: dismiss modal and start next opening
  const handleOpenAgain = () => {
    dismissResultModal();
    setTimeout(() => {
      handleOpenBox();
    }, 220);
  };

  const dismissResultModal = () => {
    setIsClosingResult(true);
    setTimeout(() => {
      setShowResultModal(false);
      setIsClosingResult(false);
      setWonItems([]);
    }, 180);
  };

  return (
    <div className="game-screen">
      {/* Top Header */}
      <GameHeader title="Боксы" onBack={selectedBox ? handleBackToGallery : onBack} />

      {/* Main Arena with Full Smooth Scrollability */}
      <div className="game-arena boxes-scroll-arena">
        
        {/* ================= VIEW 1: VIBRANT 3D GIFT BOXES GALLERY ================= */}
        {!selectedBox && (
          <div className="gift-boxes-gallery">
            {/* Centered Clean Header */}
            <div className="gift-boxes-heading-center">
              <span className="gift-boxes-title-center">Боксы</span>
            </div>

            <div className="gift-boxes-grid-3col">
              {BOXES_CONFIG.map(box => (
                <div
                  key={box.id}
                  className={`gift-box-card ${box.theme}`}
                  onClick={() => handleSelectBox(box)}
                >
                  {/* Subtle Festive Pattern */}
                  <div className="gift-card-snowflakes" />

                  {/* Speech Bubble Pill on top */}
                  <div className="gift-speech-bubble">
                    <span>до</span>
                    <TetherIcon size={12} />
                    <span>{box.maxDisplay}</span>
                  </div>

                  {/* 3D Gift Box Center (Larger size 84) */}
                  <div className="gift-box-wrapper">
                    <GiftBox3D theme={box.theme} size={84} />
                  </div>

                  {/* Bottom Price: Icon BEFORE Amount */}
                  <div className="gift-card-price-row">
                    <TetherIcon size={16} />
                    <span className="gift-card-price-num">{box.price}</span>
                  </div>

                  {/* Box Name Tag */}
                  <div className="gift-card-box-name">{box.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= VIEW 2: OPENING ARENA ================= */}
        {selectedBox && (
          <div className="rx-arena-view">
            {/* Top Back Row: Back to all cases */}
            <div className="rx-arena-top-row">
              <button className="rx-arena-back-link" onClick={handleBackToGallery}>
                <ArrowLeftIcon size={14} color="#ffffff" />
                <span>Все боксы</span>
              </button>
            </div>

            {/* Centered Box Hero Name & Price Pill (под 'Все боксы' строго по центру) */}
            <div className="rx-arena-hero-center">
              <div className="rx-arena-clean-title">{selectedBox.name}</div>
              <div className="rx-arena-clean-price-badge">
                <TetherIcon size={14} />
                <span>{selectedBox.price.toFixed(2)} USDT</span>
              </div>
            </div>

            {/* Horizontal Case Roulette Reels Stack */}
            <div className="rx-reels-stack" ref={reelContainerRef}>
              {Array.from({ length: boxCount }).map((_, rIdx) => (
                <div 
                  key={rIdx} 
                  className={`rx-reel-container ${boxCount > 1 ? 'compact-multi' : ''}`}
                >
                  <div className="rx-reel-pointer top" />
                  <div className="rx-reel-pointer bottom" />
                  <div className="rx-reel-needle" />

                  <div
                    className="rx-reel-tape"
                    style={{
                      transform: `translateX(-${reelsOffsets[rIdx] || 0}px)`,
                      transition: isReelSpinning
                        ? `transform ${spinDuration}s cubic-bezier(0.12, 0.85, 0.28, 1)`
                        : 'none'
                    }}
                  >
                    {(reelsItems[rIdx] || reelsItems[0] || []).map((item, idx) => (
                      <div
                        key={item.uniqueKey || `it_${rIdx}_${idx}`}
                        className={`rx-reel-item-card ${boxCount > 1 ? 'compact-multi' : ''}`}
                      >
                        <GiftBox3D theme={selectedBox.theme} size={boxCount === 3 ? 32 : boxCount === 2 ? 36 : 42} />
                        <span className="rx-reel-item-name">{item.name}</span>
                        <span className="rx-reel-item-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          <TetherIcon size={boxCount > 1 ? 11 : 13} /> {item.value.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Centered Case Count Selector (1, 2, 3 cases) */}
            <div className="rx-case-count-control-center">
              <div className="rx-case-count-tabs-wrapper">
                {[1, 2, 3].map(cnt => (
                  <button
                    key={cnt}
                    type="button"
                    disabled={isOpening}
                    className={`rx-case-count-tab ${boxCount === cnt ? 'active' : ''}`}
                    onClick={() => {
                      if (isOpening) return;
                      setBoxCount(cnt);
                      setReelsOffsets([0, 0, 0]);
                      setIsReelSpinning(false);
                      try { bjAudio.playChip(); } catch (e) {}
                    }}
                  >
                    {cnt} {cnt === 1 ? 'кейс' : 'кейса'}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions Bar: Open Box + Lightning Fast Toggle */}
            <div className="rx-open-action-row">
              <button
                className={`rx-main-open-btn ${isOpening ? 'spinning' : ''}`}
                disabled={isOpening || (balance > 0 && balance < (selectedBox.price * boxCount))}
                onClick={handleOpenBox}
              >
                {isOpening ? (
                  <>
                    <svg className="rx-spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                      <circle cx="12" cy="12" r="9" strokeDasharray="36" strokeDashoffset="14" strokeLinecap="round" />
                    </svg>
                    <span>Открытие...</span>
                  </>
                ) : balance > 0 && balance < (selectedBox.price * boxCount) ? (
                  'Недостаточно средств'
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>{boxCount === 1 ? 'Открыть бокс' : `Открыть ${boxCount} бокса`}</span>
                    <span style={{ opacity: 0.9, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      (<TetherIcon size={15} /> {(selectedBox.price * boxCount).toFixed(2)})
                    </span>
                  </span>
                )}
              </button>

              {/* Fast Open Lightning Toggle Button */}
              <button
                type="button"
                className={`rx-fast-lightning-btn ${fastOpen ? 'active' : ''}`}
                onClick={() => setFastOpen(prev => !prev)}
                title={fastOpen ? 'Быстрое открытие: ВКЛ' : 'Быстрое открытие: ВЫКЛ'}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              </button>
            </div>

            {/* Minimalist Drops List */}
            <div className="rx-box-drops-clean">
              <div className="rx-box-drops-header">
                <span className="rx-box-drops-label">Возможный дроп</span>
                <span className="rx-box-drops-count">{selectedBox.items.length} предметов</span>
              </div>
              <div className="rx-box-drops-grid">
                {selectedBox.items.map(item => (
                  <div key={item.id} className="rx-drop-chip">
                    <span className="rx-drop-chip-name">{item.name}</span>
                    <span className="rx-drop-chip-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                      <TetherIcon size={12} /> {item.value.toFixed(2)}
                    </span>
                    <span className="rx-drop-chip-chance">{item.chance}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Minimalist Win Result Overlay */}
        {showResultModal && wonItems.length > 0 && selectedBox && (
          <div
            className={`modal-overlay ${isClosingResult ? 'closing' : ''}`}
            onClick={dismissResultModal}
          >
            <div
              className={`modal-container rx-win-modal ${isClosingResult ? 'closing' : ''}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="rx-win-header">
                <span className="rx-win-title">
                  {wonItems.reduce((s, it) => s + it.value, 0) >= (selectedBox.price * boxCount) ? 'ВЫИГРЫШ!' : 'РЕЗУЛЬТАТ'}
                </span>
                <button className="modal-close-btn" onClick={dismissResultModal}>
                  <CloseIcon size={16} color="#8a8f99" />
                </button>
              </div>

              {wonItems.length === 1 ? (
                <div className="rx-win-body">
                  <div className="rx-win-icon-wrapper">
                    <GiftBox3D theme={selectedBox.theme} size={70} />
                  </div>
                  <div className="rx-win-item-label">{wonItems[0].name}</div>
                  <div className="rx-win-amount" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                    +<TetherIcon size={20} /> {wonItems[0].value.toFixed(2)}
                  </div>
                </div>
              ) : (
                <div className="rx-win-multi-body">
                  <div className="rx-win-multi-cards">
                    {wonItems.map((item, idx) => (
                      <div key={idx} className="rx-win-mini-card">
                        <GiftBox3D theme={selectedBox.theme} size={44} />
                        <div className="rx-win-mini-name">{item.name}</div>
                        <div className="rx-win-mini-val">
                          +<TetherIcon size={13} /> {item.value.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rx-win-total-badge">
                    <span>Общий выигрыш:</span>
                    <span className="rx-win-total-num">
                      +<TetherIcon size={18} /> {wonItems.reduce((s, it) => s + it.value, 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              <div className="rx-win-buttons">
                {/* Single Primary Action: Открыть еще раз */}
                <button
                  className="rx-win-claim-main-btn"
                  onClick={handleOpenAgain}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <span>Открыть еще раз</span>
                    <span style={{ opacity: 0.85 }}>(<TetherIcon size={15} /> {(selectedBox.price * boxCount).toFixed(2)})</span>
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
