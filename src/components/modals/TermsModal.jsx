import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { APP_CONFIG } from '../../config';
import './TermsModal.css';

const LEGAL_DOCS = [
  {
    id: 'terms',
    title: 'Пользовательское соглашение',
    url: APP_CONFIG.termsUrl
  },
  {
    id: 'rules',
    title: 'Правила использования сервиса',
    url: APP_CONFIG.rulesUrl
  },
  {
    id: 'privacy',
    title: 'Политика конфиденциальности',
    url: APP_CONFIG.privacyUrl
  }
];

export default function TermsModal() {
  const { isAppReady, isDbLoaded, hasAgreedToTerms, confirmTermsAgreement } = useApp();
  const [agreed, setAgreed] = useState({
    terms: false,
    rules: false,
    privacy: false
  });

  const handleOpenLink = (e, url) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
      window.Telegram.WebApp.openLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const toggleCheck = (id) => {
    setAgreed(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const allAccepted = agreed.terms && agreed.rules && agreed.privacy;

  const handleSelectAll = (e) => {
    e.preventDefault();
    const nextVal = !allAccepted;
    setAgreed({
      terms: nextVal,
      rules: nextVal,
      privacy: nextVal
    });
  };

  const handleConfirm = () => {
    if (!allAccepted) return;
    confirmTermsAgreement();
  };

  // 1. Wait until loading screen finishes
  if (!isAppReady) return null;

  // 2. Wait until database profile is loaded
  if (!isDbLoaded) return null;

  // 3. Checked directly from DB: if user already agreed in DB, NEVER display again
  if (hasAgreedToTerms === true) return null;

  return (
    <div className="terms-modal-overlay">
      <div className="terms-modal-card">
        {/* Header */}
        <div className="terms-header">
          <div className="terms-brand">
            ROYAL <span>X</span>
          </div>
          <h2 className="terms-title">Соглашения сервиса</h2>
          <p className="terms-subtitle">
            Перед началом игры подтвердите согласие с документами:
          </p>
        </div>

        {/* Quick select bar - level and symmetrical */}
        <div className="terms-quick-bar">
          <span className="terms-quick-label">Обязательные документы</span>
          <button 
            type="button" 
            className="terms-quick-btn" 
            onClick={handleSelectAll}
          >
            {allAccepted ? 'Снять все' : 'Выбрать все'}
          </button>
        </div>

        {/* Perfectly aligned document rows */}
        <div className="terms-list">
          {LEGAL_DOCS.map(doc => {
            const isChecked = agreed[doc.id];
            return (
              <div 
                key={doc.id}
                className={`terms-row ${isChecked ? 'active' : ''}`}
                onClick={() => toggleCheck(doc.id)}
              >
                {/* Left: Custom Checkbox */}
                <div className="terms-checkbox">
                  {isChecked && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </div>

                {/* Middle: Document title */}
                <div className="terms-row-title">
                  {doc.title}
                </div>

                {/* Right: Clean Action Link */}
                <button 
                  type="button"
                  className="terms-link"
                  onClick={(e) => handleOpenLink(e, doc.url)}
                  title="Открыть документ"
                >
                  Читать ↗
                </button>
              </div>
            );
          })}
        </div>

        {/* Action Button - styling matched to Mines bet button */}
        <button
          type="button"
          className={`terms-btn ${allAccepted ? 'active' : 'disabled'}`}
          disabled={!allAccepted}
          onClick={handleConfirm}
        >
          {allAccepted ? 'Подтвердить и войти' : 'Отметьте все 3 документа'}
        </button>
      </div>
    </div>
  );
}
