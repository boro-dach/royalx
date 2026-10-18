import React from 'react';
import { useApp } from '../../context/AppContext';
import { HomeIcon, EarnIcon, GiftIcon, UserIcon } from '../common/Icons';

export default function BottomNav() {
  const { activeTab, setActiveTab } = useApp();

  const tabs = [
    { id: 'main', label: 'Главная', Icon: HomeIcon },
    { id: 'earn', label: 'Заработок', Icon: EarnIcon },
    { id: 'promos', label: 'Акции', Icon: GiftIcon },
    { id: 'cabinet', label: 'Кабинет', Icon: UserIcon }
  ];

  const activeIndex = Math.max(0, tabs.findIndex(t => t.id === activeTab));

  const handleTabClick = (tabId) => {
    if (activeTab === tabId) return;
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.selectionChanged();
      } catch (e) {}
    }
    setActiveTab(tabId);
  };

  return (
    <nav className="bottom-nav-container">
      {/* Smooth sliding translucent green background indicator (without any glow) */}
      <div 
        className="nav-active-pill"
        style={{
          width: `calc((100% - 12px) / ${tabs.length})`,
          transform: `translateX(${activeIndex * 100}%)`
        }}
      />
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.Icon;
        return (
          <div 
            key={tab.id}
            className={`nav-tab ${isActive ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
          >
            <div className="nav-tab-icon">
              <IconComponent size={20} color={isActive ? '#00e699' : '#8a8f99'} />
            </div>
            <span className="nav-tab-label">{tab.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
