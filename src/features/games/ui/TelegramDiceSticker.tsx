'use client';

import React, { useState, useEffect, useRef } from 'react';

const GAME_DURATIONS: Record<string, number> = {
  darts: 1600,
  dice: 2800,
  bowling: 2800,
  football: 2800,
  basketball: 2800,
  slots: 2800
};

type AnimPhase = 'idle' | 'waiting' | 'result_anim' | 'result_static';

interface TelegramDiceStickerProps {
  gameId: string;
  isRolling?: boolean;
  resultValue?: number | null;
  isWin?: boolean | null;
  size?: number;
  onAnimationComplete?: (() => void) | null;
}

/**
 * TelegramDiceSticker
 *
 * Seamless animation flow:
 * 1. idle             — static idle frame before roll
 * 2. waiting          — API request in-flight: subtle pulse
 * 3. result_anim      — immediately plays outcome-specific webp animation from frame 0
 * 4. result_static    — freezes on static end frame after duration, triggers onAnimationComplete
 */
export default function TelegramDiceSticker({
  gameId,
  isRolling = false,
  resultValue = null,
  isWin = null,
  size = 140,
  onAnimationComplete = null
}: TelegramDiceStickerProps) {
  // 'idle' | 'waiting' | 'result_anim' | 'result_static'
  const [animPhase, setAnimPhase] = useState<AnimPhase>('idle');
  const [animTimestamp, setAnimTimestamp] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevResultRef = useRef<number | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (isRolling && resultValue === null) {
      setAnimPhase('waiting');
    } else if (resultValue !== null) {
      // Whenever resultValue changes or a fresh roll arrives
      setAnimTimestamp(Date.now());
      setAnimPhase('result_anim');

      const duration = GAME_DURATIONS[gameId] || 2800;
      timerRef.current = setTimeout(() => {
        setAnimPhase('result_static');
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, duration);
    } else {
      setAnimPhase('idle');
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRolling, resultValue, gameId]);

  // Reset to idle on gameId switch
  useEffect(() => {
    if (!isRolling && resultValue === null) {
      setAnimPhase('idle');
    }
  }, [gameId]);

  // ─── Slot machine multi-layer composition ───
  if (gameId === 'slots') {
    const map = [1, 2, 3, 0];
    const val = resultValue || 1;
    const isJackpot = val === 64;

    let leftIdx: number, centerIdx: number, rightIdx: number;
    if (isJackpot) {
      leftIdx = 3;
      centerIdx = 9;
      rightIdx = 15;
    } else {
      leftIdx = 4 + map[(val - 1) & 3];
      centerIdx = 10 + map[((val - 1) >> 2) & 3];
      rightIdx = 16 + map[((val - 1) >> 4) & 3];
    }

    const isSpinning = animPhase === 'result_anim';
    const isWaiting = animPhase === 'waiting';
    const isStatic = animPhase === 'result_static' || animPhase === 'idle';

    const bgSrc = '/stickers/slots/slots_1_static.webp';

    const frameSrc = isSpinning
      ? `/stickers/slots/slots_2.webp?t=${animTimestamp}`
      : isWaiting
      ? '/stickers/slots/slots_2.webp'
      : '/stickers/slots/slots_2_static.webp';

    const leftReelSrc = isSpinning
      ? `/stickers/slots/slots_${leftIdx}.webp?t=${animTimestamp}`
      : isWaiting
      ? '/stickers/slots/slots_8.webp'
      : `/stickers/slots/slots_${leftIdx}_static.webp`;

    const centerReelSrc = isSpinning
      ? `/stickers/slots/slots_${centerIdx}.webp?t=${animTimestamp}`
      : isWaiting
      ? '/stickers/slots/slots_14.webp'
      : `/stickers/slots/slots_${centerIdx}_static.webp`;

    const rightReelSrc = isSpinning
      ? `/stickers/slots/slots_${rightIdx}.webp?t=${animTimestamp}`
      : isWaiting
      ? '/stickers/slots/slots_20.webp'
      : `/stickers/slots/slots_${rightIdx}_static.webp`;

    return (
      <div
        className={`telegram-dice-container slots-machine-container ${isWaiting ? 'is-waiting' : ''} ${isWin ? 'is-win' : ''}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          position: 'relative',
          userSelect: 'none',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: isWin 
            ? 'drop-shadow(0 0 16px rgba(250, 204, 21, 0.45))'
            : isSpinning || isWaiting
            ? 'drop-shadow(0 4px 16px rgba(255, 255, 255, 0.2))'
            : 'drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45))'
        }}
      >
        {/* Layer 1: Slot machine background */}
        <img
          src={bgSrc}
          alt="Slots Background"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 1 }}
        />

        {/* Layer 2: Left reel */}
        <img
          key={`left_${leftReelSrc}_${animTimestamp}`}
          src={leftReelSrc}
          alt="Left Reel"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
        />

        {/* Layer 3: Center reel */}
        <img
          key={`center_${centerReelSrc}_${animTimestamp}`}
          src={centerReelSrc}
          alt="Center Reel"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
        />

        {/* Layer 4: Right reel */}
        <img
          key={`right_${rightReelSrc}_${animTimestamp}`}
          src={rightReelSrc}
          alt="Right Reel"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
        />

        {/* Layer 5: Frame & handle */}
        <img
          key={`frame_${frameSrc}_${animTimestamp}`}
          src={frameSrc}
          alt="Slots Frame"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 3 }}
        />
      </div>
    );
  }

  // ─── Standard dice games: dice, darts, bowling, basketball, football ───
  const folder = gameId;
  let stickerSrc = '';

  if (animPhase === 'result_anim' && resultValue) {
    stickerSrc = `/stickers/${folder}/${folder}_${resultValue}.webp?t=${animTimestamp}`;
  } else if (animPhase === 'result_static' && resultValue) {
    stickerSrc = `/stickers/${folder}/${folder}_${resultValue}_static.webp`;
  } else {
    stickerSrc = `/stickers/${folder}/${folder}_idle_static.webp`;
  }

  const isWaiting = animPhase === 'waiting';

  return (
    <div
      className={`telegram-dice-container ${isWaiting ? 'is-waiting' : ''} ${isWin ? 'is-win' : ''} ${animPhase === 'result_anim' ? 'is-result-anim' : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        pointerEvents: 'none'
      }}
    >
      <img
        key={`${folder}_${animPhase}_${resultValue || 0}_${animTimestamp}`}
        src={stickerSrc}
        alt={gameId}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: isWin
            ? 'drop-shadow(0 0 16px rgba(0, 230, 153, 0.45))'
            : isWaiting
            ? 'drop-shadow(0 4px 16px rgba(255, 255, 255, 0.15))'
            : 'drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45))',
        }}
      />
    </div>
  );
}
