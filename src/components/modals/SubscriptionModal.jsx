import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { APP_CONFIG } from '../../config';
import './SubscriptionModal.css';

export default function SubscriptionModal() {
  const { 
    isAppReady, 
    isDbLoaded, 
    hasAgreedToTerms, 
    isSubscribed, 
    checkSubscription, 
    isAdmin, 
    tgUser 
  } = useApp();

  const [checking, setChecking] = useState(false);

  // 1. Wait until loading screen finishes
  if (!isAppReady) return null;

  // 2. Wait until database profile is loaded
  if (!isDbLoaded) return null;

  // 3. Wait until terms agreement is finished first
  if (hasAgreedToTerms !== true) return null;

  // 4. Admins or already subscribed users bypass the gate
  const isUserAdmin = Boolean(isAdmin);
  if (isSubscribed === true || isUserAdmin) return null;

  const handleOpenChannel = (e) => {
    e.preventDefault();
    const url = APP_CONFIG.channelUrl;
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(url);
    } else if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleVerify = async () => {
    if (checking) return;
    setChecking(true);
    try {
      await checkSubscription();
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="sub-modal-overlay">
      <div className="sub-modal-card">
        {/* Header */}
        <div className="sub-header">
          <div className="sub-brand">
            ROYAL <span>X</span>
          </div>
          <h2 className="sub-title">Обязательная подписка</h2>
          <p className="sub-subtitle">
            Для доступа к играм, пополнениям и выводу средств подпишитесь на наш официальный Telegram-канал:
          </p>
        </div>

        {/* Channel Preview Card */}
        <div className="sub-channel-card" onClick={handleOpenChannel}>
          <div className="sub-channel-icon-wrap">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M21.5 2.5L2 10.5L9.5 14L18 6.5L12 15.5L18.5 21.5L21.5 2.5Z" fill="#00e699" fillOpacity="0.2" stroke="#00e699" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="sub-channel-info">
            <div className="sub-channel-badge">ОФИЦИАЛЬНЫЙ КАНАЛ</div>
            <div className="sub-channel-name">Royal X Channel</div>
            <div className="sub-channel-handle">@{APP_CONFIG.channelUsername}</div>
          </div>
          <button 
            type="button" 
            className="sub-channel-btn" 
            onClick={handleOpenChannel}
          >
            Подписаться ↗
          </button>
        </div>

        {/* Benefits notice */}
        <div className="sub-benefits">
          <div className="sub-benefit-item">
            <span className="sub-benefit-dot"></span>
            <span>Ежедневные промокоды и ваучеры</span>
          </div>
          <div className="sub-benefit-item">
            <span className="sub-benefit-dot"></span>
            <span>Розыгрыши баланса и уведомления о джекпотах</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          className={`sub-btn ${checking ? 'loading' : ''}`}
          disabled={checking}
          onClick={handleVerify}
        >
          {checking ? (
            <span className="sub-spinner-wrap">
              <span className="sub-spinner"></span>
              Проверка подписки...
            </span>
          ) : (
            'Проверить подписку'
          )}
        </button>

        <div className="sub-footer-note">
          После вступления в канал нажмите кнопку «Проверить подписку» для разблокировки интерфейса.
        </div>
      </div>
    </div>
  );
}
