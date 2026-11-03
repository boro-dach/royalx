import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SearchIcon, CloseIcon, ChevronRightIcon, Wheel3DIcon, FireBadgeIcon } from '@/shared/ui/Icons';

export default function MainTab() {
  const { setActiveGame, setActiveTab, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

  // Popular games carousel
  const popularGames = [
    {
      id: 'dice',
      badge: 'Популярное',
      title: 'Кости',
      subtitle: 'Игра',
      image: '/cards/Dice.png'
    },
    {
      id: 'mines',
      badge: 'Популярное',
      title: 'Мины',
      subtitle: 'Игра',
      image: '/cards/Mines.png'
    },
    {
      id: 'boxes',
      badge: 'Популярное',
      title: 'Боксы',
      subtitle: 'Игра',
      image: '/cards/Boxes.png'
    },
    {
      id: 'bj',
      badge: 'Популярное',
      title: 'Блэкджек',
      subtitle: 'Игра',
      image: '/cards/Blackjack.png'
    }
  ];

  // Compact quick rows
  const compactGames = [
    { id: 'keno', title: 'Кено', icon: '🧿', isSoon: true },
    { id: 'hilo', title: 'Hi-Lo', icon: '🌈', isSoon: true },
    { id: 'wheel', title: 'Wheel', icon: '🎡', isSoon: true },
    { id: 'rb', title: 'R&B', icon: '🪬', isSoon: true },
    { id: 'coin', title: 'Орёл-Решка', icon: '🪙', isSoon: true }
  ];

  // Exclusive games
  const exclusiveGames = [
    {
      id: 'crash',
      badge: 'Fast',
      badgeType: 'fast',
      title: 'Краш',
      subtitle: 'Игра',
      image: '/cards/Crash.png'
    },
    {
      id: 'upgrade',
      badge: 'Luck',
      badgeType: 'luck',
      title: 'Upgrader',
      subtitle: 'Игра',
      image: '/cards/Upgrader.png'
    },
    {
      id: 'boxes',
      badge: 'VIP',
      badgeType: 'vip',
      title: 'Боксы',
      subtitle: 'Игра',
      image: '/cards/Boxes.png'
    }
  ];

  // All catalog for search
  const allCatalog = [
    ...popularGames,
    ...exclusiveGames.filter(g => !popularGames.some(p => p.id === g.id)),
    { id: 'keno', title: 'Кено', subtitle: 'Скоро', image: null, isSoon: true },
    { id: 'hilo', title: 'Hi-Lo', subtitle: 'Скоро', image: null, isSoon: true },
    { id: 'wheel', title: 'Wheel', subtitle: 'Скоро', image: null, isSoon: true },
    { id: 'rb', title: 'R&B', subtitle: 'Скоро', image: null, isSoon: true },
    { id: 'coin', title: 'Орёл-Решка', subtitle: 'Скоро', image: null, isSoon: true }
  ];

  const handleLaunchGame = (gameId, isSoon = false, title = '') => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      } catch (e) {}
    }
    if (isSoon) {
      if (showToast) showToast(`Игра «${title || 'Новинка'}» скоро появится в RoyalX! 🚀`);
      return;
    }
    setActiveGame(gameId);
  };

  const handleScrollCarousel = (e) => {
    const el = e.currentTarget;
    const scrollLeft = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll > 0) {
      const ratio = scrollLeft / maxScroll;
      setActiveCarouselIndex(ratio > 0.5 ? 1 : 0);
    }
  };

  const cleanQuery = searchQuery.trim().toLowerCase();
  const searchResults = cleanQuery
    ? allCatalog.filter(g => g.title.toLowerCase().includes(cleanQuery))
    : [];

  return (
    <div className="main-content">
      {/* 1. Full-Width Capsule Search Input */}
      <div className="search-capsule-container">
        <span className="search-capsule-icon">
          <SearchIcon size={18} color="#72788d" />
        </span>
        <input 
          type="text" 
          className="search-capsule-input" 
          placeholder="Найти игру" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            type="button" 
            className="search-clear-btn" 
            onClick={() => setSearchQuery('')}
            aria-label="Очистить поиск"
          >
            <CloseIcon size={14} color="#8a90a2" />
          </button>
        )}
      </div>

      {/* If Search is Active -> Show Filtered Results */}
      {cleanQuery ? (
        <div className="search-results-section">
          <div className="section-header-title">
            Результаты поиска ({searchResults.length})
          </div>
          {searchResults.length === 0 ? (
            <div className="no-games-found">
              <span>Ничего не найдено по запросу «{searchQuery}»</span>
            </div>
          ) : (
            <div className="search-results-grid">
              {searchResults.map((game) => (
                <div 
                  key={game.id} 
                  className="game-card-vertical"
                  onClick={() => handleLaunchGame(game.id, game.isSoon, game.title)}
                  role="button"
                  tabIndex={0}
                >
                  {game.badge && (
                    <div className="game-card-badge">
                      <FireBadgeIcon size={10} />
                      <span>{game.badge}</span>
                    </div>
                  )}
                  <div className="game-card-visual">
                    {game.image ? (
                      <img src={game.image} alt={game.title} className="game-card-thumb" />
                    ) : (
                      <div className="game-card-thumb-placeholder">{game.icon || '🎲'}</div>
                    )}
                  </div>
                  <div className="game-card-footer">
                    <div className="game-card-title">{game.title}</div>
                    <div className="game-card-subtitle">{game.subtitle || 'Игра'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 2. Wheel of Bonuses Banner */}
          <div 
            className="bonus-banner-card"
            onClick={() => setActiveTab && setActiveTab('earn')}
            role="button"
            tabIndex={0}
          >
            <div className="bonus-banner-left">
              <div className="bonus-banner-icon-box">
                <Wheel3DIcon size={44} />
              </div>
              <div className="bonus-banner-info">
                <div className="bonus-banner-title">Колесо бонусов</div>
                <div className="bonus-banner-desc">
                  Добавь @RoyalX_Win в имя — крути раз в 6 часов, приз до 10$
                </div>
              </div>
            </div>
            <button 
              type="button" 
              className="bonus-banner-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (setActiveTab) setActiveTab('earn');
              }}
            >
              Приписка
            </button>
          </div>

          {/* 3. "🔥 Популярные игры за 24 часа" */}
          <section className="home-section">
            <div className="section-header-title">
              <span className="section-emoji">🔥</span> Популярные игры за 24 часа
            </div>

            <div 
              className="popular-carousel-scroll"
              onScroll={handleScrollCarousel}
            >
              {popularGames.map((game) => (
                <div 
                  key={game.id}
                  className="game-card-vertical popular-card"
                  onClick={() => handleLaunchGame(game.id, false, game.title)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="game-card-badge">
                    <FireBadgeIcon size={11} />
                    <span>{game.badge}</span>
                  </div>

                  <div className="game-card-visual">
                    <img 
                      src={game.image} 
                      alt={game.title} 
                      className="game-card-thumb" 
                      loading="eager"
                    />
                  </div>

                  <div className="game-card-footer">
                    <div className="game-card-title">{game.title}</div>
                    <div className="game-card-subtitle">{game.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Indicators */}
            <div className="carousel-dots-indicator">
              <span className={`dot-pill ${activeCarouselIndex === 0 ? 'active' : ''}`} />
              <span className={`dot-pill ${activeCarouselIndex === 1 ? 'active' : ''}`} />
            </div>
          </section>

          {/* 4. Compact Game Quick Row Buttons (2-col grid) */}
          <section className="home-section compact-section">
            <div className="compact-games-grid">
              {compactGames.map((game) => (
                <div 
                  key={game.id}
                  className={`compact-game-pill ${game.id === 'coin' ? 'pill-full-width' : ''}`}
                  onClick={() => handleLaunchGame(game.id, game.isSoon, game.title)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="compact-pill-left">
                    <span className="compact-game-icon">{game.icon}</span>
                    <span className="compact-game-title">{game.title}</span>
                  </div>
                  <span className="compact-chevron">
                    <ChevronRightIcon size={16} color="#5e6578" />
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* 5. "🏅 Эксклюзивные игры" */}
          <section className="home-section">
            <div className="section-header-title">
              <span className="section-emoji">🏅</span> Эксклюзивные игры
            </div>

            <div className="exclusive-games-grid">
              {exclusiveGames.map((game) => (
                <div 
                  key={game.id}
                  className="game-card-vertical exclusive-card"
                  onClick={() => handleLaunchGame(game.id, false, game.title)}
                  role="button"
                  tabIndex={0}
                >
                  <div className={`game-card-badge badge-${game.badgeType}`}>
                    <span>{game.badge}</span>
                  </div>

                  <div className="game-card-visual">
                    <img 
                      src={game.image} 
                      alt={game.title} 
                      className="game-card-thumb" 
                      loading="lazy"
                    />
                  </div>

                  <div className="game-card-footer">
                    <div className="game-card-title">{game.title}</div>
                    <div className="game-card-subtitle">{game.subtitle}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
