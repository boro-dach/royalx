import React from 'react';
import { useApp } from '@/context/AppContext';
import { CloseIcon, TetherIcon } from '@/shared/ui/Icons';

export default function StatsModal() {
  const { closeModal, isClosingModal, balance, userStats, historyItems } = useApp();

  const totalDeposits = userStats?.totalDeposits || 0.00;
  const totalWithdrawals = userStats?.totalWithdrawals || 0.00;
  const gamesPlayed = userStats?.gamesPlayed || 0;
  const gamesWon = userStats?.gamesWon || 0;
  const winRate = gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : '0.0';

  // Calculate true net profit across the player's full game history
  // E.g. was -1000, raised 10000 -> net profit is +9000
  const netProfit = (() => {
    // 1. If userStats has tracked netProfit
    if (typeof userStats?.netProfit === 'number' && !isNaN(userStats.netProfit) && gamesPlayed > 0) {
      return userStats.netProfit;
    }

    // 2. Compute by summing all game history items
    if (Array.isArray(historyItems) && historyItems.length > 0) {
      const gameEntries = historyItems.filter(h => h.type === 'game');
      if (gameEntries.length > 0) {
        const sum = gameEntries.reduce((acc, h) => {
          const amt = typeof h.amount === 'number' ? h.amount : parseFloat(h.amount) || 0;
          return acc + amt;
        }, 0);
        return parseFloat(sum.toFixed(2));
      }
    }

    // 3. Fallback only if real deposits were recorded
    if (totalDeposits > 0) {
      return parseFloat(((balance + totalWithdrawals) - totalDeposits).toFixed(2));
    }

    // 4. Default: If no games or deposits yet, net profit is 0.00 (NOT balance!)
    return 0.00;
  })();

  return (
    <div className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={closeModal}>
      <div className={`modal-container ${isClosingModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">Статистика игрока</div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        {/* Hero Top Banner Inside Modal Box */}
        <div className="modal-banner-box">
          <img src="/stats-banner.png" alt="Statistics" className="modal-banner-img" decoding="async" />
        </div>

        <div className="modal-body-clean">
          {/* Main Profit Card */}
          <div className="payment-method-card active" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
            <div style={{ fontSize: '12px', color: '#9da3b4' }}>Чистый профит игрока</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: netProfit >= 0 ? '#00e699' : '#ff4d4d', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>{netProfit >= 0 ? '+' : '-'}</span>
              <TetherIcon size={24} />
              <span>{Math.abs(netProfit).toFixed(2)}</span>
            </div>
          </div>

          {/* Grid Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div className="menu-item" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
              <div style={{ fontSize: '11px', color: '#9da3b4' }}>Процент побед (Винрейт)</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#00e699', marginTop: '4px' }}>{winRate}%</div>
            </div>

            <div className="menu-item" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
              <div style={{ fontSize: '11px', color: '#9da3b4' }}>Сыграно игр</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginTop: '4px' }}>{gamesPlayed} раундов</div>
            </div>

            <div className="menu-item" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
              <div style={{ fontSize: '11px', color: '#9da3b4' }}>Всего пополнений</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <TetherIcon size={16} /> {totalDeposits.toFixed(2)}
              </div>
            </div>

            <div className="menu-item" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
              <div style={{ fontSize: '11px', color: '#9da3b4' }}>Всего выводов</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <TetherIcon size={16} /> {totalWithdrawals.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
