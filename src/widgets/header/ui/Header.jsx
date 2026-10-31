import React from 'react';
import { useApp } from '@/context/AppContext';
import { PlusIcon, ArrowUpIcon, TetherIcon } from '@/shared/ui/Icons';

export default function Header() {
  const { balance, setActiveModal } = useApp();

  return (
    <div className="header-wrapper">
      {/* Main App Top Header */}
      <header className="top-header">
        <div className="logo-container">
          <img src="/logo-icon.png" alt="RoyalX" className="logo-img" decoding="async" />
          <div className="logo-text">
            ROYAL<span className="highlight-x">X</span>
          </div>
        </div>

        {/* Balance Pill with Deposit (+) and Withdraw (↑) Action Buttons */}
        <div className="balance-pill">
          <TetherIcon size={28} />
          <span className="balance-amount">{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <div className="balance-actions-group">
            <button 
              className="balance-add-btn" 
              title="Пополнение"
              onClick={() => setActiveModal('deposit')}
            >
              <PlusIcon size={13} color="#05140d" />
            </button>
            <button 
              className="balance-withdraw-btn" 
              title="Вывод средств"
              onClick={() => setActiveModal('withdraw')}
            >
              <ArrowUpIcon size={13} color="#ffffff" />
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}
