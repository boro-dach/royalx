import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { SearchIcon } from '@/shared/ui/Icons';

export default function MainTab() {
  const { setActiveGame } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const games = [
    {
      id: 'mines',
      tag: 'КЛАССИКА',
      title: 'МИНЫ',
      highlight: 'до 1000×',
      subtext: 'Безопасные клетки',
      image: '/cards/Mines.png'
    },
    {
      id: 'dice',
      tag: 'EXPRESS',
      title: 'КУБ',
      highlight: 'быстрый раунд',
      subtext: 'Быстрый бросок',
      image: '/cards/Dice.png'
    },
    {
      id: 'bj',
      tag: 'КАРТЫ',
      title: 'БЛЭКДЖЕК',
      highlight: '21 без лишнего',
      subtext: 'Раздача и стратегия',
      image: '/cards/Blackjack.png'
    },
    {
      id: 'crash',
      tag: 'LIVE',
      title: 'КРАШ',
      highlight: 'лови момент',
      subtext: 'Своевременный вывод',
      image: '/cards/Crash.png'
    },
    {
      id: 'upgrade',
      tag: 'HOT',
      title: 'АПГРЕЙДЕР',
      highlight: 'до 500×',
      subtext: 'Умножение баланса',
      image: '/cards/Upgrader.png'
    },
    {
      id: 'boxes',
      tag: 'NEW',
      title: 'БОКСЫ',
      highlight: 'от 0.25 до 500 USDT',
      subtext: '6 уровней кейсов',
      image: '/cards/Boxes.png'
    }
  ];

  const filteredGames = games.filter(g => 
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGameClick = (gameId) => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.HapticFeedback) {
      try {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      } catch (e) {}
    }
    setActiveGame(gameId);
  };

  return (
    <div className="main-content">
      {/* Search Input */}
      <div className="search-container">
        <span className="search-icon">
          <SearchIcon size={16} color="#8a8f99" />
        </span>
        <input 
          type="text" 
          className="search-input" 
          placeholder="Поиск любимых игр..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Games Section */}
      <div className="section-title">Игры</div>

      {/* 2x2 Grid */}
      <div className="games-grid">
        {filteredGames.length === 0 ? (
          <div className="no-games-found">
            <span>Ничего не найдено по запросу «{searchQuery}»</span>
          </div>
        ) : (
          filteredGames.map(game => (
            <div 
              key={game.id} 
              className="game-card"
              onClick={() => handleGameClick(game.id)}
              role="button"
              tabIndex={0}
              aria-label={game.title}
            >
              {game.image ? (
                <img 
                  src={game.image} 
                  alt={game.title} 
                  className="game-card-img" 
                  decoding="async" 
                />
              ) : (
                <>
                  <div>
                    <div className="game-tag">{game.tag}</div>
                    <div className="game-title">{game.title}</div>
                    <div className="game-highlight">{game.highlight}</div>
                  </div>
                  <div className="game-subtext">{game.subtext}</div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
