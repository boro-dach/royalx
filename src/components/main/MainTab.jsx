import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SearchIcon } from '../common/Icons';

export default function MainTab() {
  const { setActiveGame } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const games = [
    {
      id: 'mines',
      tag: 'КЛАССИКА',
      title: 'МИНЫ',
      highlight: 'до 1000×',
      subtext: 'Безопасные клетки'
    },
    {
      id: 'dice',
      tag: 'EXPRESS',
      title: 'КУБ',
      highlight: 'быстрый раунд',
      subtext: 'Быстрый бросок'
    },
    {
      id: 'bj',
      tag: 'КАРТЫ',
      title: 'БЛЭКДЖЕК',
      highlight: '21 без лишнего',
      subtext: 'Раздача и стратегия'
    },
    {
      id: 'crash',
      tag: 'LIVE',
      title: 'КРАШ',
      highlight: 'лови момент',
      subtext: 'Своевременный вывод'
    },
    {
      id: 'upgrade',
      tag: 'HOT',
      title: 'АПГРЕЙДЕР',
      highlight: 'до 500×',
      subtext: 'Умножение баланса'
    },
    {
      id: 'boxes',
      tag: 'NEW',
      title: 'БОКСЫ',
      highlight: 'от 0.25 до 200 USDT',
      subtext: '5 уровней кейсов'
    }
  ];

  const filteredGames = games.filter(g => 
    g.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        {filteredGames.map(game => (
          <div 
            key={game.id} 
            className="game-card"
            onClick={() => setActiveGame(game.id)}
          >
            <div>
              <div className="game-tag">{game.tag}</div>
              <div className="game-title">{game.title}</div>
              <div className="game-highlight">{game.highlight}</div>
            </div>
            <div className="game-subtext">{game.subtext}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
