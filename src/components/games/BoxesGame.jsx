import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { bjAudio } from '../../utils/blackjackAudio';
import { ArrowLeftIcon, CloseIcon, TetherIcon } from '../common/Icons';
import confetti from 'canvas-confetti';
import GameHeader from './GameHeader';
import './Games.css';

import homelessBanner from '../../assets/boxes/homeless.png';
import schoolBanner from '../../assets/boxes/school.png';
import studentBanner from '../../assets/boxes/student.png';
import richBanner from '../../assets/boxes/rich.png';
import oligarchBanner from '../../assets/boxes/oligarch.png';
import millionaireBanner from '../../assets/boxes/millionaire.png';

// Teal Diamond Badge Icon (matching user's badge)
export function GemBadgeIcon({ size = 16 }) {
  return (
    <span
      className="box-gem-badge"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        minWidth: `${size}px`,
        minHeight: `${size}px`,
        borderRadius: '50%',
        background: '#00a89d',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
        flexShrink: 0
      }}
    >
      <svg width={Math.round(size * 0.62)} height={Math.round(size * 0.62)} viewBox="0 0 24 24" fill="none">
        <path d="M6 3L2 9L12 21L22 9L18 3H6Z" fill="#ffffff" fillOpacity="0.32" stroke="#ffffff" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M2 9H22" stroke="#ffffff" strokeWidth="2" />
        <path d="M12 21L7.5 9L10 3" stroke="#ffffff" strokeWidth="1.8" />
        <path d="M12 21L16.5 9L14 3" stroke="#ffffff" strokeWidth="1.8" />
      </svg>
    </span>
  );
}

// 100% Crisp Vector 3D Gift Box SVG Component
export function GlossyGiftBoxSVG({ box, size = 76 }) {
  if (!box) return null;
  const b = box;
  const h = Math.round(size * 0.88);

  return (
    <svg
      width={size}
      height={h}
      viewBox="0 0 100 88"
      fill="none"
      style={{ display: 'block', margin: '0 auto', filter: `drop-shadow(0 6px 12px ${b.shadow || 'rgba(0,0,0,0.35)'})` }}
    >
      <defs>
        <radialGradient id={`shad_${b.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(0,0,0,0.4)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        <linearGradient id={`front_${b.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={b.boxFront} />
          <stop offset="100%" stopColor={b.boxSide} />
        </linearGradient>
        <linearGradient id={`side_${b.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={b.boxSide} />
          <stop offset="100%" stopColor={b.lidSide} />
        </linearGradient>
        <linearGradient id={`lid_${b.id}`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor={b.lidTop} />
          <stop offset="100%" stopColor={b.lidFront} />
        </linearGradient>
        <linearGradient id={`gloss_${b.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Ground soft shadow */}
      <ellipse cx="50" cy="80" rx="34" ry="6" fill={`url(#shad_${b.id})`} />

      {/* Box Front-Left Face */}
      <polygon points="18,38 50,53 50,78 18,63" fill={`url(#front_${b.id})`} />
      {/* Box Front-Right Face */}
      <polygon points="50,53 82,38 82,63 50,78" fill={`url(#side_${b.id})`} />

      {/* Vertical Ribbon Left */}
      <polygon points="31,44 38,47 38,72 31,69" fill={b.ribbon} />
      {/* Vertical Ribbon Right */}
      <polygon points="62,47 69,44 69,69 62,72" fill={b.ribbonSide} />

      {/* Specular gloss highlight on front */}
      <polygon points="20,40 29,44 29,66 20,62" fill={`url(#gloss_${b.id})`} opacity="0.4" />

      {/* Overhanging Lid: Front-Left Rim */}
      <polygon points="14,35 50,52 50,57 14,40" fill={b.lidFront} />
      {/* Overhanging Lid: Front-Right Rim */}
      <polygon points="50,52 86,35 86,40 50,57" fill={b.lidSide} />
      {/* Overhanging Lid: Top Face */}
      <polygon points="50,18 86,35 50,52 14,35" fill={`url(#lid_${b.id})`} />

      {/* Cross Ribbons on Lid Top */}
      <polygon points="30,26 36,29 70,44 64,41" fill={b.ribbon} />
      <polygon points="46,20 54,24 54,49 46,45" fill={b.ribbonSide} />

      {/* Specular highlight on Lid top */}
      <polygon points="16,35 50,51 46,47 24,36" fill="#ffffff" opacity="0.45" />

      {/* Fluffy Ribbon Bow Loops */}
      {/* Left Bow Loop */}
      <path
        d="M50 20 C35 6, 14 5, 22 17 C26 24, 44 22, 50 20 Z"
        fill={b.bow}
        stroke={b.bowShadow}
        strokeWidth="1.2"
      />
      <path
        d="M48 19 C37 10, 24 9, 28 16 C31 19, 43 19, 48 19 Z"
        fill={b.bowShadow}
        opacity="0.5"
      />

      {/* Right Bow Loop */}
      <path
        d="M50 20 C65 6, 86 5, 78 17 C74 24, 56 22, 50 20 Z"
        fill={b.bow}
        stroke={b.bowShadow}
        strokeWidth="1.2"
      />
      <path
        d="M52 19 C63 10, 76 9, 72 16 C69 19, 57 19, 52 19 Z"
        fill={b.bowShadow}
        opacity="0.5"
      />

      {/* Center Knot */}
      <ellipse cx="50" cy="20.5" rx="5.5" ry="5" fill={b.bow} stroke={b.bowShadow} strokeWidth="1" />
      <ellipse cx="49" cy="19.5" rx="2" ry="1.5" fill="#ffffff" opacity="0.85" />
    </svg>
  );
}

// 6 Boxes matching the gallery banners (100% Vector HTML/CSS + SVG)
export const BOXES_CONFIG = [
  {
    id: 'homeless',
    name: 'Бомж',
    theme: 'pink',
    image: homelessBanner,
    price: 1.0,
    minDrop: 0.25,
    maxDrop: 15.0,
    maxDisplay: '15',
    cardBg: 'linear-gradient(180deg, #d32882 0%, #b21b6a 100%)',
    boxFront: '#f188c0',
    boxSide: '#c83984',
    lidTop: '#ffb9e1',
    lidFront: '#fa80c1',
    lidSide: '#c83984',
    ribbon: '#ffffff',
    ribbonSide: '#fde5f2',
    bow: '#ffffff',
    bowShadow: '#f894cb',
    shadow: 'rgba(70, 4, 35, 0.45)',
    items: [
      { id: 'h1', name: '0.25 USDT', value: 0.25, chance: 42 },
      { id: 'h2', name: '0.50 USDT', value: 0.50, chance: 25 },
      { id: 'h3', name: '1.00 USDT', value: 1.00, chance: 15 },
      { id: 'h4', name: '2.50 USDT', value: 2.50, chance: 10 },
      { id: 'h5', name: '5.00 USDT', value: 5.00, chance: 6 },
      { id: 'h6', name: '15.00 USDT', value: 15.00, chance: 2.0 }
    ]
  },
  {
    id: 'school',
    name: 'Школьник',
    theme: 'blue',
    image: schoolBanner,
    price: 5.0,
    minDrop: 1.0,
    maxDrop: 30.0,
    maxDisplay: '30',
    cardBg: 'linear-gradient(180deg, #0b8cb5 0%, #06698a 100%)',
    boxFront: '#53c0f3',
    boxSide: '#0d89c5',
    lidTop: '#c0e9fd',
    lidFront: '#75d1fc',
    lidSide: '#0d89c5',
    ribbon: '#ffffff',
    ribbonSide: '#e0f4fe',
    bow: '#ffffff',
    bowShadow: '#79d2fc',
    shadow: 'rgba(2, 44, 66, 0.45)',
    items: [
      { id: 's1', name: '1.00 USDT', value: 1.00, chance: 40 },
      { id: 's2', name: '2.50 USDT', value: 2.50, chance: 26 },
      { id: 's3', name: '5.00 USDT', value: 5.00, chance: 16 },
      { id: 's4', name: '10.00 USDT', value: 10.00, chance: 10 },
      { id: 's5', name: '18.00 USDT', value: 18.00, chance: 6 },
      { id: 's6', name: '30.00 USDT', value: 30.00, chance: 2.0 }
    ]
  },
  {
    id: 'student',
    name: 'Студент',
    theme: 'green',
    image: studentBanner,
    price: 10.0,
    minDrop: 5.0,
    maxDrop: 50.0,
    maxDisplay: '50',
    cardBg: 'linear-gradient(180deg, #64af1a 0%, #478c0e 100%)',
    boxFront: '#a5e464',
    boxSide: '#6eb823',
    lidTop: '#dcf9a7',
    lidFront: '#baf373',
    lidSide: '#6eb823',
    ribbon: '#ffffff',
    ribbonSide: '#f4fde4',
    bow: '#ffffff',
    bowShadow: '#bdf57b',
    shadow: 'rgba(34, 62, 7, 0.45)',
    items: [
      { id: 'st1', name: '5.00 USDT', value: 5.00, chance: 42 },
      { id: 'st2', name: '8.00 USDT', value: 8.00, chance: 25 },
      { id: 'st3', name: '12.00 USDT', value: 12.00, chance: 16 },
      { id: 'st4', name: '20.00 USDT', value: 20.00, chance: 9.5 },
      { id: 'st5', name: '32.00 USDT', value: 32.00, chance: 5.5 },
      { id: 'st6', name: '50.00 USDT', value: 50.00, chance: 2.0 }
    ]
  },
  {
    id: 'rich',
    name: 'Богатый',
    theme: 'bronze',
    image: richBanner,
    price: 25.0,
    minDrop: 15.0,
    maxDrop: 100.0,
    maxDisplay: '100',
    cardBg: 'linear-gradient(180deg, #c77265 0%, #a45347 100%)',
    boxFront: '#e79c90',
    boxSide: '#b85f52',
    lidTop: '#fcd3cc',
    lidFront: '#f7aba0',
    lidSide: '#b85f52',
    ribbon: '#ffffff',
    ribbonSide: '#feeeeb',
    bow: '#ffffff',
    bowShadow: '#f8b4ab',
    shadow: 'rgba(64, 23, 17, 0.45)',
    items: [
      { id: 'r1', name: '15.00 USDT', value: 15.00, chance: 44 },
      { id: 'r2', name: '22.00 USDT', value: 22.00, chance: 25 },
      { id: 'r3', name: '35.00 USDT', value: 35.00, chance: 15 },
      { id: 'r4', name: '55.00 USDT', value: 55.00, chance: 9 },
      { id: 'r5', name: '75.00 USDT', value: 75.00, chance: 5 },
      { id: 'r6', name: '100.00 USDT', value: 100.00, chance: 2.0 }
    ]
  },
  {
    id: 'oligarch',
    name: 'Олигарх',
    theme: 'silver',
    image: oligarchBanner,
    price: 50.0,
    minDrop: 25.0,
    maxDrop: 250.0,
    maxDisplay: '250',
    cardBg: 'linear-gradient(180deg, #878c90 0%, #63686d 100%)',
    boxFront: '#cbd3d8',
    boxSide: '#929ca3',
    lidTop: '#f4f6f8',
    lidFront: '#dce1e5',
    lidSide: '#929ca3',
    ribbon: '#ffffff',
    ribbonSide: '#f6f8fa',
    bow: '#ffffff',
    bowShadow: '#dfe4e8',
    shadow: 'rgba(23, 27, 30, 0.45)',
    items: [
      { id: 'o1', name: '25.00 USDT', value: 25.00, chance: 44 },
      { id: 'o2', name: '45.00 USDT', value: 45.00, chance: 25 },
      { id: 'o3', name: '80.00 USDT', value: 80.00, chance: 15 },
      { id: 'o4', name: '130.00 USDT', value: 130.00, chance: 9 },
      { id: 'o5', name: '180.00 USDT', value: 180.00, chance: 5 },
      { id: 'o6', name: '250.00 USDT', value: 250.00, chance: 2.0 }
    ]
  },
  {
    id: 'millionaire',
    name: 'Миллионер',
    theme: 'gold',
    image: millionaireBanner,
    price: 100.0,
    minDrop: 50.0,
    maxDrop: 500.0,
    maxDisplay: '500',
    cardBg: 'linear-gradient(180deg, #dfa91b 0%, #b58308 100%)',
    boxFront: '#f6cb49',
    boxSide: '#ca9612',
    lidTop: '#feefa2',
    lidFront: '#fedd63',
    lidSide: '#ca9612',
    ribbon: '#ffffff',
    ribbonSide: '#fffce8',
    bow: '#ffffff',
    bowShadow: '#fedf6d',
    shadow: 'rgba(66, 47, 3, 0.45)',
    items: [
      { id: 'm1', name: '50.00 USDT', value: 50.00, chance: 44 },
      { id: 'm2', name: '90.00 USDT', value: 90.00, chance: 25 },
      { id: 'm3', name: '150.00 USDT', value: 150.00, chance: 15 },
      { id: 'm4', name: '240.00 USDT', value: 240.00, chance: 9 },
      { id: 'm5', name: '350.00 USDT', value: 350.00, chance: 5 },
      { id: 'm6', name: '500.00 USDT', value: 500.00, chance: 2.0 }
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
          zIndex: 999999,
          colors: ['#00e699', '#00ffc8', '#ffffff']
        });
      } catch (e) {}
    } else {
      try { bjAudio.playChip(); } catch (e) {}
    }

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
                  className="gift-box-card"
                  onClick={() => handleSelectBox(box)}
                >
                  <img
                    src={box.image}
                    alt={box.name}
                    className="gift-box-banner-img"
                    loading="lazy"
                  />
                  <div className="gift-card-box-name">{box.name}</div>
                  <div className="gift-card-box-price">
                    <TetherIcon size={12} />
                    <span>{box.price.toFixed(2)} USDT</span>
                  </div>
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
                        <div className={`rx-reel-tether-icon-box ${boxCount > 1 ? 'compact-multi' : ''}`}>
                          <TetherIcon size={boxCount > 1 ? 30 : 42} />
                        </div>
                        <span className="rx-reel-item-name">{item.name}</span>
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
                  <div key={item.id} className="rx-drop-card">
                    <span className="rx-drop-chance-tag">{item.chance}%</span>
                    <div className="rx-drop-tether-icon-box">
                      <TetherIcon size={38} />
                    </div>
                    <span className="rx-drop-card-val">{item.name}</span>
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
                    <TetherIcon size={64} />
                  </div>
                  <div className="rx-win-item-label">{wonItems[0].name}</div>
                  <div className="rx-win-amount" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    +<TetherIcon size={20} /> {wonItems[0].name}
                  </div>
                </div>
              ) : (
                <div className="rx-win-multi-body">
                  <div className="rx-win-multi-cards">
                    {wonItems.map((item, idx) => (
                      <div key={idx} className="rx-win-mini-card">
                        <div className="rx-win-mini-tether-icon">
                          <TetherIcon size={28} />
                        </div>
                        <div className="rx-win-mini-name">{item.name}</div>
                        <div className="rx-win-mini-val">
                          +<TetherIcon size={13} /> {item.name}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rx-win-total-badge">
                    <span>Общий выигрыш:</span>
                    <span className="rx-win-total-num">
                      +<TetherIcon size={18} /> {wonItems.reduce((s, it) => s + it.value, 0).toFixed(2)} USDT
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
