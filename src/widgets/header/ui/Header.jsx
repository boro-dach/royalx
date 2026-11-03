import React from 'react';
import { useApp } from '@/context/AppContext';
import { WalletIcon } from '@/shared/ui/Icons';

export default function Header() {
  const { balance, setActiveModal, setActiveTab, tgUser } = useApp();

  const formattedBalance = typeof balance === 'number'
    ? (balance % 1 === 0 ? balance.toLocaleString('en-US') : balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    : '0';

  const displayName = tgUser?.name 
    ? tgUser.name.replace(/^@/, '') 
    : (tgUser?.first_name || 'джеймс бонг');

  return (
    <div className="header-wrapper">
      <header className="top-header">
        {/* Left: User Avatar & Greeting */}
        <div 
          className="header-user-group" 
          onClick={() => setActiveTab && setActiveTab('cabinet')}
          role="button"
          tabIndex={0}
          title="Открыть профиль"
        >
          <div className="header-avatar-ring">
            {tgUser?.photoUrl ? (
              <img 
                src={tgUser.photoUrl} 
                alt="Avatar" 
                className="header-avatar-img" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              <div className="header-avatar-fallback">
                {tgUser?.initials || displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="header-user-meta">
            <span className="header-greeting">Привет,</span>
            <span className="header-username">{displayName}</span>
          </div>
        </div>

        {/* Right: Capsule Balance with Wallet Button */}
        <div 
          className="balance-capsule"
          onClick={() => setActiveModal('deposit')}
          role="button"
          tabIndex={0}
          title="Баланс и пополнение"
        >
          <span className="balance-capsule-amount">$ {formattedBalance}</span>
          <button 
            type="button"
            className="balance-wallet-pill"
            aria-label="Кошелёк"
            onClick={(e) => {
              e.stopPropagation();
              setActiveModal('deposit');
            }}
          >
            <WalletIcon size={16} color="#ffffff" />
          </button>
        </div>
      </header>
    </div>
  );
}
