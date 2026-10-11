import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';

const ALL_ASSETS = [
  '/logo-icon.png',
  '/logo-dot.png',
  '/topup-banner.png',
  '/top-up-banner.png',
  '/withdraw-banner.png',
  '/stats-banner.png',
  '/referral-banner.png',
  '/promocode-banner.png',
  '/promo-banner.png',
  '/history-banner.png',
  '/autumn-pass-banner.png',
  '/channel-banner.png',
  '/notify-banner.png',
  '/cryptobot-avatar.jpg',
  '/cryptobot.jpg'
];

export default function Preloader() {
  const { isDbLoaded, setIsAppReady } = useApp();
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Загрузка интерфейса...');
  const [isLoading, setIsLoading] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

  // Asset preloading
  useEffect(() => {
    let loadedCount = 0;
    const totalAssets = ALL_ASSETS.length;

    const updateProgress = () => {
      loadedCount++;
      const assetPct = Math.round((loadedCount / totalAssets) * 60);
      setProgress(prev => Math.max(prev, Math.min(65, 15 + assetPct)));

      if (loadedCount >= totalAssets) {
        setAssetsReady(true);
      }
    };

    if (!window.__PRELOADED_IMAGE_CACHE__) {
      window.__PRELOADED_IMAGE_CACHE__ = [];
    }

    ALL_ASSETS.forEach(src => {
      const img = new Image();
      img.onload = updateProgress;
      img.onerror = updateProgress;
      img.src = src;
      window.__PRELOADED_IMAGE_CACHE__.push(img);
    });

    // Asset timeout fallback - snappy load
    const assetTimeout = setTimeout(() => {
      setAssetsReady(true);
    }, 500);

    return () => clearTimeout(assetTimeout);
  }, []);

  // Update status and progress based on DB load state
  useEffect(() => {
    if (!assetsReady) {
      setStatusText('Загрузка интерфейса...');
    } else if (!isDbLoaded) {
      setProgress(prev => Math.max(prev, 85));
      setStatusText('Синхронизация базы данных...');
    } else {
      // Both assets and DB profile loaded!
      setProgress(100);
      setStatusText('Готово');

      const finishTimeout = setTimeout(() => {
        setIsFading(true);
        setTimeout(() => {
          setIsLoading(false);
          if (setIsAppReady) setIsAppReady(true);
        }, 120);
      }, 80);

      return () => clearTimeout(finishTimeout);
    }
  }, [assetsReady, isDbLoaded]);

  // Global safety fallback (max 1.2s) so user never waits
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setProgress(100);
      setIsFading(true);
      setTimeout(() => {
        setIsLoading(false);
        if (setIsAppReady) setIsAppReady(true);
      }, 120);
    }, 1200);

    return () => clearTimeout(safetyTimer);
  }, []);

  if (!isLoading) return null;

  return (
    <div className={`preloader-overlay ${isFading ? 'fading' : ''}`}>
      <div className="preloader-content">
        <div className="preloader-title">
          ROYAL <span className="highlight-x">X</span>
        </div>
        <div className="preloader-subtext">
          {statusText} <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{progress}%</span>
        </div>

        {/* Progress Bar */}
        <div className="preloader-progress-bg">
          <div 
            className="preloader-progress-fill" 
            style={{ 
              width: `${progress}%`,
              transition: 'width 0.25s ease-out'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
}
