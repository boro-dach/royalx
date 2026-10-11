import React from 'react';
import { useApp } from '../../context/AppContext';
import { APP_CONFIG } from '../../config';
import { CloseIcon, HeadphonesIcon } from '../common/Icons';

export default function SupportModal() {
  const { closeModal, isClosingModal, showToast } = useApp();

  return (
    <div className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={closeModal}>
      <div className={`modal-container ${isClosingModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Служба Поддержки</div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'center', padding: '10px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
            <HeadphonesIcon size={48} color="#00e699" />
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>Онлайн поддержка 24/7</div>
          <div style={{ fontSize: '13px', color: '#8a8f99', lineHeight: '1.5' }}>
            Наши операторы готовы ответить на любые ваши вопросы по играм, выплатам и бонусам.
          </div>
          <button 
            className="banner-btn"
            style={{ width: '100%', padding: '14px', marginTop: '10px' }}
            onClick={() => {
              showToast(`Переход к оператору @${APP_CONFIG.supportUsername}...`);
              const url = APP_CONFIG.supportUrl;
              if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
                window.Telegram.WebApp.openTelegramLink(url);
              } else {
                window.open(url, '_blank');
              }
              closeModal();
            }}
          >
            Связаться с поддержкой (@{APP_CONFIG.supportUsername})
          </button>
        </div>
      </div>
    </div>
  );
}
