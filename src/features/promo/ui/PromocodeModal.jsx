import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CloseIcon } from '@/shared/ui/Icons';

export default function PromocodeModal() {
  const { closeModal, isClosingModal, redeemPromocode, showToast, depositBonusPercent } = useApp();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim() || isSubmitting) {
      if (!code.trim()) showToast('Введите промокод!', true);
      return;
    }
    setIsSubmitting(true);
    try {
      const ok = await redeemPromocode(code);
      if (ok) {
        setCode('');
        closeModal();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={closeModal}>
      <div className={`modal-container ${isClosingModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">Активация промокода</div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        {/* Hero Top Banner Inside Modal Box */}
        <div className="modal-banner-box">
          <img src="/promocode-banner.png" alt="Promo Code" className="modal-banner-img" decoding="async" />
        </div>

        <div className="modal-body-clean">
          {depositBonusPercent > 0 && (
            <div style={{
              background: 'rgba(0, 230, 153, 0.08)',
              border: '1px solid rgba(0, 230, 153, 0.3)',
              borderRadius: '12px',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>🎁</span>
                <span style={{ fontSize: '12px', color: '#00e699', fontWeight: '600' }}>
                  У вас активен бонус +{depositBonusPercent}% к пополнению!
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#8a8f99' }}>При следующем депе</span>
            </div>
          )}

          <div style={{
            background: 'var(--bg-card-hover)',
            border: '1px solid var(--border-card)',
            borderRadius: '14px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Введите бонусный код</div>
            <div style={{ fontSize: '12px', color: '#9da3b4' }}>
              Денежный бонус на баланс или процент к пополнению счета
            </div>
          </div>

          <div>
            <div className="section-title-sub">Промокод</div>
            <div className="promo-input-group">
              <input 
                type="text" 
                className="promo-input" 
                placeholder="Например: ROYAL100"
                value={code} 
                onChange={e => setCode(e.target.value)}
                disabled={isSubmitting}
              />
              <button 
                className="promo-submit-btn" 
                onClick={handleRedeem}
                disabled={isSubmitting}
                style={{ opacity: isSubmitting ? 0.7 : 1 }}
              >
                {isSubmitting ? 'Проверка...' : 'Активировать'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
