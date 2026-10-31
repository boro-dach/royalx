import React from 'react';
import { useApp, RANKS_CONFIG } from '@/context/AppContext';
import { CloseIcon, TetherIcon } from '@/shared/ui/Icons';

export default function RanksModal() {
  const { closeModal, isClosingModal, getCurrentRankInfo, totalTurnover } = useApp();
  const { current } = getCurrentRankInfo();

  return (
    <div className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={closeModal}>
      <div className={`modal-container ${isClosingModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">Система Рангов (10 Уровней)</div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        <div className="modal-body-clean" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
          <div className="payment-method-card active" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
            <div style={{ fontSize: '12px', color: '#9da3b4' }}>Ваш текущий статус</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: current.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{current.badge}</span>
              <span>{current.fullName}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#8a8f99', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Общий оборот ставок: <strong style={{ color: '#00e699', display: 'inline-flex', alignItems: 'center', gap: '3px' }}><TetherIcon size={13} /> {(totalTurnover || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            <div style={{ fontSize: '12px', color: '#00e699', marginTop: '4px', fontWeight: '600' }}>
              Кэшбэк на вашем уровне: <strong>{current.cashbackPercent}%</strong> (макс. 8.0% на 10 ранге)
            </div>
          </div>

          <div style={{ fontSize: '13px', fontWeight: '600', color: '#8a8f99', marginTop: '12px', marginBottom: '8px' }}>
            Все уровни привилегий:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {RANKS_CONFIG.map(rank => {
              const isCurrent = current.level === rank.level;
              const isUnlocked = (totalTurnover || 0) >= rank.requiredTurnover;

              return (
                <div 
                  key={rank.level} 
                  className={`menu-item ${isCurrent ? 'active' : ''}`}
                  style={{
                    backgroundColor: isCurrent ? 'rgba(0, 230, 153, 0.08)' : 'var(--bg-card)',
                    border: isCurrent ? `1.5px solid ${rank.color}` : '1px solid var(--border-card)',
                    padding: '12px 14px'
                  }}
                >
                  <div className="menu-item-left" style={{ gap: '12px' }}>
                    <div style={{ fontSize: '24px' }}>{rank.badge}</div>
                    <div>
                      <div className="menu-title" style={{ color: isCurrent ? rank.color : '#fff', fontWeight: '700' }}>
                        {rank.fullName}
                      </div>
                      <div className="menu-sub" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>Оборот: <TetherIcon size={11} /> {rank.requiredTurnover.toLocaleString()}</span>
                        <span style={{ color: '#00e699', fontWeight: '600' }}>• Кэшбэк: {rank.cashbackPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="menu-item-right">
                    {isCurrent ? (
                      <span className="status-badge" style={{ backgroundColor: rank.color, color: '#000', fontWeight: '700' }}>
                        ТЕКУЩИЙ
                      </span>
                    ) : isUnlocked ? (
                      <span className="status-badge" style={{ backgroundColor: '#1a2922', color: '#00e699' }}>
                        ДОСТИГНУТ
                      </span>
                    ) : (
                      <span className="status-badge muted-transparent">
                        🔒 ЛОК
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
