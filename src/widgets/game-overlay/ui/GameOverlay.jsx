import React from 'react';
import { useApp } from '@/context/AppContext';
import BlackjackGame from '@/features/games/ui/BlackjackGame';
import MinesGame from '@/features/games/ui/MinesGame';
import DiceGame from '@/features/games/ui/DiceGame';
import CrashGame from '@/features/games/ui/CrashGame';
import UpgradeGame from '@/features/games/ui/UpgradeGame';
import BoxesGame from '@/features/games/ui/BoxesGame';

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
