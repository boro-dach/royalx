import React from 'react';
import { useApp } from '../../context/AppContext';
import { APP_CONFIG } from '../../config';
import { 
  UserIcon, 
  WalletIcon,
  ReferralIcon,
  GiftIcon,
  ClockIcon, 
  HeadphonesIcon, 
  ChevronRightIcon,
  ShieldIcon
} from '../common/Icons';

export default function CabinetTab() {
  const { tgUser, balance, setActiveModal, getCurrentRankInfo, totalTurnover, isAdmin, logout } = useApp();
  const { current, next, progressPercent } = getCurrentRankInfo();

  const isUserAdmin = isAdmin || String(tgUser?.id) === APP_CONFIG.superAdminId;

  const menuItems = [
    ...(isUserAdmin ? [{
      id: 'admin',
      icon: <ShieldIcon size={18} color="#00e699" />,
      title: 'Админ-панель 👑',
      subtext: 'Управление БД, пользователями и играми',
      action: () => setActiveModal('admin')
    }] : []),
    {
      id: 'stats',
      icon: <UserIcon size={18} color="#8a8f99" />,
      title: 'Статистика',
      action: () => setActiveModal('stats')
    },
    {
      id: 'balance',
      icon: <WalletIcon size={18} color="#8a8f99" />,
      title: 'Баланс',
      statusText: `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      statusClass: 'muted-transparent',
      action: () => setActiveModal('deposit')
    },
    {
      id: 'referral',
      icon: <ReferralIcon size={18} color="#8a8f99" />,
      title: 'Реферальная программа',
      subtext: 'Приглашай друзей и получай 15%',
      action: () => setActiveModal('ref')
    },
    {
      id: 'promocode',
      icon: <GiftIcon size={18} color="#8a8f99" />,
      title: 'Промокод',
      subtext: 'Активация бонусов и ваучеров',
      action: () => setActiveModal('promo')
    },
    {
      id: 'history',
      icon: <ClockIcon size={18} color="#8a8f99" />,
      title: 'История операций',
      subtext: 'Пополнения и выплаты',
      action: () => setActiveModal('history')
    },
    {
      id: 'channel',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M21.5 2.5L2 10.5L9.5 14L18 6.5L12 15.5L18.5 21.5L21.5 2.5Z" fill="#00e699" fillOpacity="0.2" stroke="#00e699" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      title: 'Официальный канал',
      subtext: `@${APP_CONFIG.channelUsername} — бонусы и промокоды`,
      action: () => {
        const url = APP_CONFIG.channelUrl;
        if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openTelegramLink) {
          window.Telegram.WebApp.openTelegramLink(url);
        } else if (typeof window !== 'undefined' && window.Telegram?.WebApp?.openLink) {
          window.Telegram.WebApp.openLink(url);
        } else {
          window.open(url, '_blank');
        }
      }
    },
    {
      id: 'support',
      icon: <HeadphonesIcon size={18} color="#8a8f99" />,
      title: 'Поддержка 24/7',
      subtext: 'Онлайн-чат без ожидания',
      action: () => setActiveModal('support')
    }
  ];

  return (
    <div className="main-content">
      {/* User Profile Header Card */}
      <div className="user-profile-card">
        {tgUser.photoUrl ? (
          <img src={tgUser.photoUrl} alt="Avatar" className="avatar-img" />
        ) : (
          <div className="avatar-circle">{tgUser.initials || 'AV'}</div>
        )}
        <div>
          <div className="user-info-name-row">
            <span className="user-name">{tgUser.name || 'AlexVIP_99'}</span>
          </div>
          <div className="user-id-sub">ID: {tgUser.id || '3982051'}</div>
        </div>
      </div>

      {/* Rank Progress Card */}
      <div className="rank-card" onClick={() => setActiveModal('ranks')} style={{ cursor: 'pointer' }}>
        <div className="rank-row">
          <span className="rank-title">{current.fullName}</span>
          <span className="rank-badge-status">{next ? `${progressPercent}%` : 'MAX'}</span>
        </div>
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill" 
            style={{ 
              width: `${progressPercent}%`,
              backgroundColor: current.color || 'var(--accent-cyan)'
            }}
          ></div>
        </div>
        <div className="rank-sub-row">
          <span className="rank-progress-text">
            {next 
              ? `$${(totalTurnover || 0).toLocaleString()} / $${next.requiredTurnover.toLocaleString()}` 
              : 'Максимальный ранг достигнут'}
          </span>
        </div>
      </div>

      {/* Menu List Items */}
      <div className="menu-list">
        {menuItems.map(item => (
          <div key={item.id} className="menu-item" onClick={item.action}>
            <div className="menu-item-left">
              <span className="menu-icon-svg">{item.icon}</span>
              <div>
                <div className="menu-title">{item.title}</div>
                {item.subtext && <div className="menu-sub">{item.subtext}</div>}
              </div>
            </div>
            <div className="menu-item-right">
              {item.statusText && (
                <span className={`status-badge ${item.statusClass}`}>{item.statusText}</span>
              )}
              <ChevronRightIcon size={16} color="#575c66" />
            </div>
          </div>
        ))}
      </div>

      {/* Legal & Agreements Section */}
      <div style={{ marginTop: '20px', marginBottom: '24px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#8a8f99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', paddingLeft: '4px' }}>
          Правовая информация
        </div>
        <div className="menu-list">
          <div 
            className="menu-item"
            onClick={() => {
              const url = APP_CONFIG.termsUrl;
              window.Telegram?.WebApp?.openLink ? window.Telegram.WebApp.openLink(url) : window.open(url, '_blank');
            }}
          >
            <div className="menu-item-left">
              <span className="menu-icon-svg" style={{ color: '#00e699' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </span>
              <div>
                <div className="menu-title">Пользовательское соглашение</div>
                <div className="menu-sub">Условия использования платформы</div>
              </div>
            </div>
            <div className="menu-item-right">
              <ChevronRightIcon size={16} color="#575c66" />
            </div>
          </div>

          <div 
            className="menu-item"
            onClick={() => {
              const url = APP_CONFIG.rulesUrl;
              window.Telegram?.WebApp?.openLink ? window.Telegram.WebApp.openLink(url) : window.open(url, '_blank');
            }}
          >
            <div className="menu-item-left">
              <span className="menu-icon-svg" style={{ color: '#ffb800' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  <line x1="9" y1="7" x2="15" y2="7"></line>
                  <line x1="9" y1="11" x2="15" y2="11"></line>
                </svg>
              </span>
              <div>
                <div className="menu-title">Правила сервиса</div>
                <div className="menu-sub">Правила игр и честной игры</div>
              </div>
            </div>
            <div className="menu-item-right">
              <ChevronRightIcon size={16} color="#575c66" />
            </div>
          </div>

          <div 
            className="menu-item"
            onClick={() => {
              const url = APP_CONFIG.privacyUrl;
              window.Telegram?.WebApp?.openLink ? window.Telegram.WebApp.openLink(url) : window.open(url, '_blank');
            }}
          >
            <div className="menu-item-left">
              <span className="menu-icon-svg" style={{ color: '#38bdf8' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
              </span>
              <div>
                <div className="menu-title">Политика конфиденциальности</div>
                <div className="menu-sub">Защита и безопасность данных</div>
              </div>
            </div>
            <div className="menu-item-right">
              <ChevronRightIcon size={16} color="#575c66" />
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Session Status & Security */}
      <div style={{ marginTop: '16px', marginBottom: '32px' }}>
        <div style={{ fontSize: '11px', fontWeight: '700', color: '#8a8f99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px', paddingLeft: '4px' }}>
          Безопасность и авторизация
        </div>
        <div className="menu-list">
          <div className="menu-item" style={{ cursor: 'default' }}>
            <div className="menu-item-left">
              <span className="menu-icon-svg" style={{ color: '#00efaa' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00efaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
              </span>
              <div>
                <div className="menu-title">Telegram Авторизация</div>
                <div className="menu-sub">Автоматический вход по initData</div>
              </div>
            </div>
            <div className="menu-item-right">
              <span style={{ fontSize: '11px', color: '#00efaa', background: 'rgba(0, 239, 170, 0.1)', padding: '3px 8px', borderRadius: '6px', fontWeight: '600' }}>
                Активна
              </span>
            </div>
          </div>
          <div className="menu-item" onClick={logout}>
            <div className="menu-item-left">
              <span className="menu-icon-svg" style={{ color: '#ff6b6b' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
              </span>
              <div>
                <div className="menu-title" style={{ color: '#ff6b6b' }}>Обновить сессию</div>
                <div className="menu-sub">Сбросить и переподключить сессию</div>
              </div>
            </div>
            <div className="menu-item-right">
              <ChevronRightIcon size={16} color="#575c66" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
