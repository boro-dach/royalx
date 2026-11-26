// Synthesized Web Audio API sound effects (Disabled per user request)
class SoundEffects {
  enabled: boolean;
  ctx: AudioContext | null;

  constructor() {
    this.enabled = false;
    this.ctx = null;
  }

  getAudioContext(): null {
    return null;
  }

  playChip(): void {}
  playCard(): void {}
  playWin(): void {}
  playLose(): void {}
  playGem(): void {}
  playExplosion(): void {}
  playDice(): void {}
  playCashout(): void {}
}

export const bjAudio = new SoundEffects();
