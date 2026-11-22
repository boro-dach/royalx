'use client';

import React, { useMemo } from 'react';

/**
 * TelegramDiceSticker
 * Renders the authentic animated Telegram sticker for emoji games (dice, darts, bowling, basketball, football, slots).
 * Instead of CSS emojis, uses official Telegram WebP vector/frame animations extracted from Telegram's dice sticker sets.
 */

export default function TelegramDiceSticker({
  gameId,
  isRolling = false,
  resultValue = null,
  isWin = null,
  size = 140
}) {
  // Compute WebP source
  const src = useMemo(() => {
    const timestamp = isRolling ? `?t=${Date.now()}` : '';

    if (gameId === 'slots') {
      if (isRolling) {
        // Slot machine pull handle + spinning animation
        return `/stickers/slots/slots_2.webp${timestamp}`;
      }
      if (resultValue !== null) {
        if (resultValue === 64) {
          // Jackpot 777 winning background
          return `/stickers/slots/slots_1.webp`;
        }
        // Calculate reels or outcome
        const map = [1, 2, 3, 0];
        const rightIdx = 16 + map[((resultValue - 1) >> 4) & 3];
        return `/stickers/slots/slots_${rightIdx}.webp`;
      }
      // Idle slot machine background
      return `/stickers/slots/slots_1.webp`;
    }

    // Standard dice games: dice, darts, bowling, basketball, football
    const folder = gameId; // 'dice' | 'darts' | 'bowling' | 'basketball' | 'football'

    if (isRolling) {
      // Idle/preview animation loops while throwing
      return `/stickers/${folder}/${folder}_idle.webp${timestamp}`;
    }

    if (resultValue !== null && resultValue >= 1) {
      // Result animation specific to the outcome value (1-6)
      return `/stickers/${folder}/${folder}_${resultValue}.webp${timestamp}`;
    }

    // Default idle state
    return `/stickers/${folder}/${folder}_idle.webp`;
  }, [gameId, isRolling, resultValue]);

  return (
    <div
      className={`telegram-dice-container ${isRolling ? 'is-rolling' : ''} ${isWin ? 'is-win' : ''}`}
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
        key={`${gameId}_${isRolling ? 'rolling' : resultValue}`}
        src={src}
        alt={gameId}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          filter: isWin 
            ? 'drop-shadow(0 0 16px rgba(0, 230, 153, 0.45))'
            : isRolling
            ? 'drop-shadow(0 4px 16px rgba(255, 255, 255, 0.2))'
            : 'drop-shadow(0 4px 14px rgba(0, 0, 0, 0.45))',
          transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      />
    </div>
  );
}
