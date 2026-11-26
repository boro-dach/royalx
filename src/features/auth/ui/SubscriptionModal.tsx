import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { APP_CONFIG, MANDATORY_CHANNELS } from '@/shared/config';
import './SubscriptionModal.css';

export default function SubscriptionModal() {
  const { 
    isAppReady, 
    isDbLoaded, 
    hasAgreedToTerms, 
    isSubscribed, 
    checkSubscription, 
    isAdmin, 
    tgUser,
    isAuthModalOpen
  } = useApp();

  const [checking, setChecking] = useState(false);

  // 0. Disable subscription gate in development environment (enabled strictly in production)
  const isDev = process.env.NODE_ENV !== 'production' || 
    (typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.endsWith('.local')
    ));
  if (isDev) return null;

  // 1. Wait until loading screen finishes
  if (!isAppReady) return null;

  // 2. Wait until database profile is loaded
  if (!isDbLoaded) return null;

  // 3. Wait until terms agreement is finished first
  if (hasAgreedToTerms !== true) return null;

  // 4. Admins or already subscribed users bypass the gate
  const isUserAdmin = Boolean(isAdmin);
  if (isSubscribed === true || isUserAdmin) return null;

  // 5. Don't show subscription gate while auth modal is open (standalone login flow)
  if (isAuthModalOpen) return null;

  const handleOpenLink = (url) => (e) => {
    e.preventDefault();
    if (!url) return;
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
          <h2 className="sub-title">Обязательные подписки</h2>
          <p className="sub-subtitle">
            Для доступа к играм, пополнениям и выводу средств необходимо подписаться на наши ресурсы:
          </p>
        </div>

        {/* Channels & Chat List */}
        <div className="sub-channels-list">
          {MANDATORY_CHANNELS.map((item) => (
            <div 
              key={item.id} 
              className={`sub-channel-card card-${item.type}`} 
              onClick={handleOpenLink(item.url)}
            >
              <div className={`sub-channel-icon-wrap icon-${item.type}`}>
                {item.type === 'creator' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#ffb800" fillOpacity="0.2" stroke="#ffb800" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : item.type === 'chat' ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" fill="#00d2ff" fillOpacity="0.2" stroke="#00d2ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M21.5 2.5L2 10.5L9.5 14L18 6.5L12 15.5L18.5 21.5L21.5 2.5Z" fill="#00e699" fillOpacity="0.2" stroke="#00e699" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              <div className="sub-channel-info">
                <div className={`sub-channel-badge badge-${item.type}`}>{item.badge}</div>
                <div className="sub-channel-name">{item.name}</div>
                <div className="sub-channel-handle">{item.handle}</div>
              </div>
              <button 
                type="button" 
                className={`sub-channel-btn btn-${item.type}`} 
                onClick={handleOpenLink(item.url)}
              >
                {item.btnText}
              </button>
            </div>
          ))}
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
          <div className="sub-benefit-item">
            <span className="sub-benefit-dot"></span>
            <span>Живое общение с игроками и создателем</span>
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
              Проверка подписок...
            </span>
          ) : (
            'Проверить подписки'
          )}
        </button>

        <div className="sub-footer-note">
          После вступления во все каналы и чат нажмите кнопку «Проверить подписки» для разблокировки интерфейса.
        </div>
      </div>
    </div>
  );
}
