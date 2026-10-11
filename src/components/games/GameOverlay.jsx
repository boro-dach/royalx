import React from 'react';
import { useApp } from '../../context/AppContext';
import BlackjackGame from './BlackjackGame';
import MinesGame from './MinesGame';
import DiceGame from './DiceGame';
import CrashGame from './CrashGame';
import UpgradeGame from './UpgradeGame';
import BoxesGame from './BoxesGame';

export default function GameOverlay() {
  const { activeGame, setActiveGame } = useApp();

  if (!activeGame) return null;

  const handleClose = () => setActiveGame(null);

  switch (activeGame) {
    case 'bj':
      return <BlackjackGame onBack={handleClose} />;
    case 'mines':
      return <MinesGame onBack={handleClose} />;
    case 'dice':
      return <DiceGame onBack={handleClose} />;
    case 'crash':
      return <CrashGame onBack={handleClose} />;
    case 'upgrade':
      return <UpgradeGame onBack={handleClose} />;
    case 'boxes':
      return <BoxesGame onBack={handleClose} />;
    default:
      return null;
  }
}
