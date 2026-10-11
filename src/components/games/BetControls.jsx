import React from 'react';
import { bjAudio } from '../../utils/blackjackAudio';
import { TetherIcon } from '../common/Icons';

const PRESETS = [0.15, 0.5, 1, 5, 10, 25];

export default function BetControls({ betAmount, setBetAmount, balance, disabled }) {
  const handleSelectPreset = (amt) => {
    if (disabled) return;
    bjAudio.playCard();
    setBetAmount(amt);
  };

  return (
    <>
      {/* Bet Header */}
      <div className="game-chips-header">
        <span className="game-chips-label">РАЗМЕР СТАВКИ</span>
        <span className="game-chips-bet-total" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          СТАВКА: <TetherIcon size={18} /> {betAmount}
        </span>
      </div>

      {/* Quick Amount Presets (Replaces chips in non-blackjack games) */}
      <div className="game-presets-row">
        {PRESETS.map(amt => (
          <button
            key={amt}
            type="button"
            className={`game-preset-btn ${betAmount === amt ? 'active' : ''}`}
            disabled={disabled}
            onClick={() => handleSelectPreset(amt)}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
          >
            <TetherIcon size={14} /> {amt}
          </button>
        ))}
      </div>

      {/* Bet Input & Modifiers Row */}
      <div className="game-controls-row">
        <div className="game-bet-input-box">
          <TetherIcon size={20} />
          <input 
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.15"
            className="game-bet-input"
            value={betAmount === 0 ? '' : betAmount}
            placeholder="0.15"
            disabled={disabled}
            onChange={(e) => {
              const raw = e.target.value;
              if (raw === '') {
                setBetAmount(0);
                return;
              }
              const val = parseFloat(raw);
              if (isNaN(val)) setBetAmount(0);
              else setBetAmount(Math.min(balance, val));
            }}
          />
        </div>

        <div className="game-modifiers-group">
          <button 
            type="button"
            className="game-mod-btn"
            disabled={disabled}
            onClick={() => setBetAmount(prev => Math.max(0.15, parseFloat(((Number(prev) || 0) / 2).toFixed(2))))}
          >
            ½
          </button>
          <button 
            type="button"
            className="game-mod-btn"
            disabled={disabled}
            onClick={() => setBetAmount(prev => Math.min(balance, prev * 2))}
          >
            2X
          </button>
          <button 
            type="button"
            className="game-mod-btn"
            disabled={disabled}
            onClick={() => setBetAmount(Math.min(balance, 1000))}
          >
            MAX
          </button>
          <button 
            type="button"
            className="game-mod-btn"
            disabled={disabled}
            onClick={() => setBetAmount(0)}
          >
            СБРОС
          </button>
        </div>
      </div>
    </>
  );
}
