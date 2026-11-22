'use client';

import React, { useState, useEffect, useRef } from 'react';

/**
 * TelegramDiceSticker
 * Renders the authentic animated Telegram sticker for emoji games (dice, darts, bowling, basketball, football, slots).
 * 
 * Rules:
 * 1. Animate throw only when a bet is placed (isRolling = true).
 * 2. When the throw animation finishes, display the static result frame and stop animation.
 * 3. Before the first roll, display a clean static idle sticker.
 * 4. For slots, properly composite all three reels + background + frame as Telegram does:
 *    - Idle: background (slots_1) + frame (slots_2_static) + 3 static reels (slots_4, 10, 16)
 *    - Rolling: background + pull handle (slots_2) + 3 spinning reels (slots_8, 14, 20)
 *    - Result: background (or slots_1 win) + frame + 3 outcome reels corresponding to value (1-64)
 */

export default function TelegramDiceSticker({
  gameId,
  isRolling = false,
  resultValue = null,
  isWin = null,
  size = 140
}) {
  // 'idle' | 'rolling' | 'result_anim' | 'result_static'
  const [animPhase, setAnimPhase] = useState('idle');
  const timerRef = useRef(null);

  // When isRolling turns true, start rolling
  useEffect(() => {
    if (isRolling) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setAnimPhase('rolling');
    } else if (resultValue !== null) {
      // Just received result: play the outcome animation once, then settle to static end frame
      setAnimPhase('result_anim');
      if (timerRef.current) clearTimeout(timerRef.current);
      
      // Duration of the result outcome animation before freezing to static
      const animDuration = gameId === 'slots' ? 1400 : 2000;
      timerRef.current = setTimeout(() => {
        setAnimPhase('result_static');
      }, animDuration);
    } else {
      setAnimPhase('idle');
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isRolling, resultValue, gameId]);

  // Reset to idle on game change
  useEffect(() => {
    if (!isRolling && resultValue === null) {
      setAnimPhase('idle');
    }
  }, [gameId]);

  // ─── Slot machine multi-layer composition ───
  if (gameId === 'slots') {
    // Determine asset indices according to Telegram's official slots specification:
    // 0: background (slots_1)
    // 1: winning background (slots_1_static with win glow)
    // 2: handle pull animation (slots_2) / frame
    // 3..7: left reel options (3 is winning 7, 4..7 non-winning)
    // 8: left reel spin
    // 9..13: center reel options (9 is winning 7, 10..13 non-winning)
    // 14: center reel spin
    // 15..19: right reel options (15 is winning 7, 16..19 non-winning)
    // 20: right reel spin
    const map = [1, 2, 3, 0];
    const val = resultValue || 1;
    const isJackpot = val === 64;

    let leftIdx, centerIdx, rightIdx;
    if (isJackpot) {
      leftIdx = 3;
      centerIdx = 9;
      rightIdx = 15;
    } else {
      leftIdx = 4 + map[(val - 1) & 3];
      centerIdx = 10 + map[((val - 1) >> 2) & 3];
      rightIdx = 16 + map[((val - 1) >> 4) & 3];
    }

    const isSpinning = animPhase === 'rolling';
    const isStatic = animPhase === 'result_static' || animPhase === 'idle';

    const bgSrc = isJackpot && !isSpinning 
      ? '/stickers/slots/slots_1_static.webp'
      : '/stickers/slots/slots_1_static.webp';

    const frameSrc = isSpinning
      ? `/stickers/slots/slots_2.webp?t=${Date.now()}`
      : '/stickers/slots/slots_2_static.webp';

    const leftReelSrc = isSpinning
      ? `/stickers/slots/slots_8.webp?t=${Date.now()}`
      : isStatic
      ? `/stickers/slots/slots_${leftIdx}_static.webp`
      : `/stickers/slots/slots_${leftIdx}.webp?t=${Date.now()}`;

    const centerReelSrc = isSpinning
      ? `/stickers/slots/slots_14.webp?t=${Date.now()}`
      : isStatic
      ? `/stickers/slots/slots_${centerIdx}_static.webp`
      : `/stickers/slots/slots_${centerIdx}.webp?t=${Date.now()}`;

    const rightReelSrc = isSpinning
      ? `/stickers/slots/slots_20.webp?t=${Date.now()}`
      : isStatic
      ? `/stickers/slots/slots_${rightIdx}_static.webp`
      : `/stickers/slots/slots_${rightIdx}.webp?t=${Date.now()}`;

    return (
      <div
        className={`telegram-dice-container slots-machine-container ${isSpinning ? 'is-rolling' : ''} ${isWin ? 'is-win' : ''}`}
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
            : isSpinning
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
          key={`left_${leftReelSrc}`}
          src={leftReelSrc}
          alt="Left Reel"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
        />

        {/* Layer 3: Center reel */}
        <img
          key={`center_${centerReelSrc}`}
          src={centerReelSrc}
          alt="Center Reel"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
        />

        {/* Layer 4: Right reel */}
        <img
          key={`right_${rightReelSrc}`}
          src={rightReelSrc}
          alt="Right Reel"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', zIndex: 2 }}
        />

        {/* Layer 5: Frame & handle */}
        <img
          key={`frame_${frameSrc}`}
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

  if (animPhase === 'rolling') {
    // Active throw animation
    stickerSrc = `/stickers/${folder}/${folder}_idle.webp?t=${Date.now()}`;
  } else if (animPhase === 'result_anim' && resultValue) {
    // Play the full outcome roll animation once
    stickerSrc = `/stickers/${folder}/${folder}_${resultValue}.webp?t=${Date.now()}`;
  } else if (animPhase === 'result_static' && resultValue) {
    // Frozen static outcome frame (no endless loop!)
    stickerSrc = `/stickers/${folder}/${folder}_${resultValue}_static.webp`;
  } else {
    // Before first roll: clean static idle state
    stickerSrc = `/stickers/${folder}/${folder}_idle_static.webp`;
  }

  return (
    <div
      className={`telegram-dice-container ${animPhase === 'rolling' ? 'is-rolling' : ''} ${isWin ? 'is-win' : ''}`}
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
        key={`${folder}_${animPhase}_${resultValue || 0}`}
        src={stickerSrc}
        alt={gameId}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: isWin 
            ? 'drop-shadow(0 0 16px rgba(0, 230, 153, 0.45))'
            : animPhase === 'rolling'
            ? 'drop-shadow(0 4px 16px rgba(255, 255, 255, 0.2))'
            : 'drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45))',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      />
    </div>
  );
}
