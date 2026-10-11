import React from 'react';
import { useApp } from '../../context/AppContext';
import { TetherIcon } from '../common/Icons';

export default function GameHeader({ title, onBack }) {
  const { balance, setActiveModal } = useApp();

  return (
    <div className="game-header">
      <button className="game-back-btn" onClick={onBack} aria-label="Назад">
        <div className="game-back-icon-circle">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </div>
        <span className="game-header-title">{title}</span>
      </button>

      <div 
        className="game-balance-box" 
        onClick={() => setActiveModal && setActiveModal('deposit')}
        role="button"
        tabIndex={0}
        title="Баланс"
      >
        <TetherIcon size={28} />
        <span className="game-balance-num">
          {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  );
}
