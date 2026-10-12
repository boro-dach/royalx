import React from 'react';
import { useApp } from '../../context/AppContext';
import { APP_CONFIG } from '../../config';
import { CloseIcon, TetherIcon } from '../common/Icons';

export default function ReferralModal() {
  const { closeModal, isClosingModal, tgUser, showToast, referralStats } = useApp();
  const botName = (APP_CONFIG.botUsername && APP_CONFIG.botUsername !== 'RoyalX_Bot') ? APP_CONFIG.botUsername : 'RXcasbot';
  const refLink = `https://t.me/${botName}?start=ref_${tgUser.id || '3982051'}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(refLink);
    showToast('📋 Ссылка скопирована в буфер обмена!');
  };

  const referralsCount = referralStats?.count || 0;
  const referralEarned = referralStats?.earned || 0.00;

  return (
    <div className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={closeModal}>
      <div className={`modal-container ${isClosingModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">Реферальная программа</div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        {/* Hero Top Banner Inside Modal Box */}
        <div className="modal-banner-box">
          <img src="/referral-banner.png" alt="Referral Program" className="modal-banner-img" decoding="async" />
        </div>

        <div className="modal-body-clean">
          <div style={{
            background: 'var(--bg-card-hover)',
            border: '1px solid var(--border-card)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ fontSize: '15px', fontWeight: '600' }}>Приглашай и зарабатывай</div>
            <div style={{ fontSize: '12px', color: '#9da3b4' }}>
              Получай 15% от всех пополнений приглашенных друзей навсегда!
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="menu-item" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
              <div style={{ fontSize: '11px', color: '#9da3b4' }}>Приглашено рефералов</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>{referralsCount} чел.</div>
            </div>
            <div className="menu-item" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
              <div style={{ fontSize: '11px', color: '#9da3b4' }}>Заработано всего</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#00e699', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <TetherIcon size={16} /> {referralEarned.toFixed(2)}
              </div>
            </div>
          </div>

          <div>
            <div className="section-title-sub">Ваша реферальная ссылка</div>
            <div className="promo-input-group">
              <input 
                type="text" 
                className="promo-input" 
                readOnly 
                value={refLink} 
              />
              <button className="promo-submit-btn" onClick={handleCopy}>
                Скопировать
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
