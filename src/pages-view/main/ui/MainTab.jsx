import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SearchIcon, CloseIcon, ChevronRightIcon } from '@/shared/ui/Icons';

export default function MainTab() {
  const { setActiveGame, setActiveTab, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

  // Popular games (using ready-made cards)
  const popularGames = [
    {
      id: 'dice',
      title: 'Кости',
      image: '/cards/Dice.png'
    },
    {
      id: 'mines',
      title: 'Мины',
      image: '/cards/Mines.png'
    },
    {
      id: 'boxes',
      title: 'Боксы',
      image: '/cards/Boxes.png'
    },
    {
      id: 'bj',
      title: 'Блэкджек',
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

  // Exclusive games (using ready-made cards)
  const exclusiveGames = [
    {
      id: 'crash',
      title: 'Краш',
      image: '/cards/Crash.png'
    },
    {
      id: 'upgrade',
      title: 'Upgrader',
      image: '/cards/Upgrader.png'
    },
    {
      id: 'boxes',
      title: 'Боксы',
      image: '/cards/Boxes.png'
    }
  ];

  // All catalog for search
  const allCatalog = [
    ...popularGames,
    ...exclusiveGames.filter(g => !popularGames.some(p => p.id === g.id)),
    { id: 'keno', title: 'Кено', image: null, icon: '🧿', isSoon: true },
    { id: 'hilo', title: 'Hi-Lo', image: null, icon: '🌈', isSoon: true },
    { id: 'wheel', title: 'Wheel', image: null, icon: '🎡', isSoon: true },
    { id: 'rb', title: 'R&B', image: null, icon: '🪬', isSoon: true },
    { id: 'coin', title: 'Орёл-Решка', image: null, icon: '🪙', isSoon: true }
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
                  className="game-card-direct"
                  onClick={() => handleLaunchGame(game.id, game.isSoon, game.title)}
                  role="button"
                  tabIndex={0}
                  aria-label={game.title}
                >
                  {game.image ? (
                    <img 
                      src={game.image} 
                      alt={game.title} 
                      className="game-card-direct-img" 
                      decoding="async" 
                    />
                  ) : (
                    <div className="game-card-direct-placeholder">
                      <span className="game-card-placeholder-icon">{game.icon || '🎲'}</span>
                      <span className="game-card-placeholder-title">{game.title}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* 2. "🔥 Популярные игры за 24 часа" */}
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
                  className="game-card-direct"
                  onClick={() => handleLaunchGame(game.id, false, game.title)}
                  role="button"
                  tabIndex={0}
                  aria-label={game.title}
                >
                  <img 
                    src={game.image} 
                    alt={game.title} 
                    className="game-card-direct-img" 
                    loading="eager"
                    decoding="async"
                  />
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
                  className="game-card-direct"
                  onClick={() => handleLaunchGame(game.id, false, game.title)}
                  role="button"
                  tabIndex={0}
                  aria-label={game.title}
                >
                  <img 
                    src={game.image} 
                    alt={game.title} 
                    className="game-card-direct-img" 
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
