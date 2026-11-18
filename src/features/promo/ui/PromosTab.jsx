import React from 'react';
import { useApp } from '@/context/AppContext';
import { InfoIcon, TetherIcon } from '@/shared/ui/Icons';

export default function PromosTab() {
  const { accumulatedCashback, claimCashback, getCurrentRankInfo } = useApp();
  const rankInfo = getCurrentRankInfo ? getCurrentRankInfo() : null;
  const current = rankInfo?.current || { cashbackPercent: 2.0, fullName: 'Бронза' };

  return (
    <div className="main-content promos-container">
      {/* Main Cashback Card */}
      <div className="cashback-card-clean">
        <div className="cashback-card-header">
          <span className="cashback-badge-green">
            {current.cashbackPercent}% КЭШБЭК
          </span>
          <span 
            className="cashback-date-text" 
            style={{ 
              color: '#00e699', 
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🟢 Вывод открыт 24/7
          </span>
        </div>

        <div>
          <div className="cashback-card-title">
            Кэшбэк до 8% с проигрышей
          </div>
          <div className="cashback-card-subtext">
            Ваш текущий ранг: {current.fullName} ({current.cashbackPercent}% кэшбэк) • Выплата без вейджера 24/7
          </div>
        </div>

        {/* Accumulated Cashback Balance */}
        <div className="cashback-accumulated-box">
          <div>
            <div className="cashback-accumulated-label">
              Накоплено кэшбэка
            </div>
            <div className="cashback-accumulated-value" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <TetherIcon size={20} />
              {accumulatedCashback.toFixed(2)}
            </div>
            <div style={{ fontSize: '11px', color: '#8c93a8', marginTop: '3px', fontWeight: '500' }}>
              Мин. вывод: 1.00 USDT • <span style={{ color: '#00e699', fontWeight: '700' }}>
                Без вейджера
              </span>
            </div>
          </div>

          <button 
            className="cashback-claim-btn-main"
            onClick={claimCashback}
            disabled={accumulatedCashback < 1}
            style={{
              opacity: (accumulatedCashback < 1) ? 0.6 : 1,
              cursor: (accumulatedCashback < 1) ? 'not-allowed' : 'pointer'
            }}
          >
            Забрать
          </button>
        </div>
      </div>

      {/* Rules & Info Card */}
      <div className="cashback-rules-card">
        <div className="cashback-rules-header">
          <div className="cashback-rules-header-left">
            <InfoIcon size={16} color="var(--accent-cyan)" />
            <span className="cashback-rules-title">Как рассчитывается кэшбэк</span>
          </div>
          <span className="cashback-rules-tag">Правила</span>
        </div>

        <div className="cashback-rules-list">
          <div className="cashback-rule-item">
            <div className="cashback-rule-bullet-wrap">
              <span className="cashback-rule-bullet-dot" />
            </div>
            <div className="cashback-rule-text">
              Учитываются любые ставки в играх от <span className="cashback-rule-highlight">0.15 USDT</span>
            </div>
          </div>

          <div className="cashback-rule-item">
            <div className="cashback-rule-bullet-wrap">
              <span className="cashback-rule-bullet-dot" />
            </div>
            <div className="cashback-rule-text">
              Процент кэшбэка растёт с вашим рангом: от <span className="cashback-rule-highlight">2.0%</span> до <span className="cashback-rule-highlight">8.0%</span> (макс. на 10 ранге)
            </div>
          </div>

          <div className="cashback-rule-item">
            <div className="cashback-rule-bullet-wrap">
              <span className="cashback-rule-bullet-dot" />
            </div>
            <div className="cashback-rule-text">
              При каждом проигрышном раунде ваш процент мгновенно начисляется в копилку
            </div>
          </div>

          <div className="cashback-rule-item">
            <div className="cashback-rule-bullet-wrap">
              <span className="cashback-rule-bullet-dot" />
            </div>
            <div className="cashback-rule-text">
              Вывод накопившегося кэшбэка доступен от <span className="cashback-rule-highlight">1.00 USDT</span> без вейджера прямо на баланс <span className="cashback-rule-highlight" style={{ color: '#00e699', fontWeight: '800' }}>В ЛЮБОЕ ВРЕМЯ</span> (круглосуточно 24/7)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
