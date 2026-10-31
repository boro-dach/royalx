import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { CloseIcon, TetherIcon } from '@/shared/ui/Icons';

export default function HistoryModal() {
  const { closeModal, isClosingModal, historyItems } = useApp();
  const [filter, setFilter] = useState('all'); // 'all' | 'dep' | 'with' | 'game'

  const filteredItems = historyItems.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'dep') return item.type === 'dep';
    if (filter === 'with') return item.type === 'with' || item.type === 'with_refund';
    if (filter === 'game') return item.type === 'game';
    return true;
  });

  return (
    <div className={`modal-overlay ${isClosingModal ? 'closing' : ''}`} onClick={closeModal}>
      <div className={`modal-container ${isClosingModal ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title">История операций</div>
          <button className="modal-close-btn" onClick={closeModal}>
            <CloseIcon size={15} color="#8a8f99" />
          </button>
        </div>

        {/* Hero Top Banner Inside Modal Box */}
        <div className="modal-banner-box">
          <img src="/history-banner.png" alt="История операций" className="modal-banner-img" loading="eager" />
        </div>

        {/* Filter Sorting Tabs */}
        <div className="modal-tab-toggle" style={{ width: '100%', justifyContent: 'space-around' }}>
          <button 
            className={`modal-tab-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Все
          </button>
          <button 
            className={`modal-tab-btn ${filter === 'dep' ? 'active' : ''}`}
            onClick={() => setFilter('dep')}
          >
            Пополнения
          </button>
          <button 
            className={`modal-tab-btn ${filter === 'with' ? 'active' : ''}`}
            onClick={() => setFilter('with')}
          >
            Выводы
          </button>
          <button 
            className={`modal-tab-btn ${filter === 'game' ? 'active' : ''}`}
            onClick={() => setFilter('game')}
          >
            Игры
          </button>
        </div>

        {/* Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '250px', overflowY: 'auto' }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9da3b4', padding: '20px 0', fontSize: '13px' }}>
              Операций в этой категории нет
            </div>
          ) : (
            filteredItems.map(item => (
              <div key={item.id} className="menu-item" style={{ cursor: 'default', padding: '12px 14px' }}>
                <div>
                  <div className="menu-title" style={{ fontSize: '13px' }}>{item.title}</div>
                  <div className="menu-sub" style={{ fontSize: '11px' }}>{item.time}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ 
                    fontWeight: '600', 
                    fontSize: '14px', 
                    color: item.amount > 0 ? '#00e699' : (item.amount < 0 ? '#ff4d4d' : '#8a8f99'),
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    {item.amount > 0 ? '+' : (item.amount < 0 ? '-' : '')}<TetherIcon size={12} />{Math.abs(item.amount).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#8a8f99', marginTop: '2px' }}>{item.status}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
